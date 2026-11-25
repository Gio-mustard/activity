/**
 * CONTROLADOR EN VIVO: el motor de la dinamica.
 *
 * Mantiene en memoria el estado de cada sala activa (cronometro, cola de
 * pulsaciones, bloqueos) y persiste en Mongo solo las transiciones relevantes.
 * El cronometro NO se guarda tick a tick: seria escribir 4 veces por segundo
 * sin ninguna ganancia.
 *
 * No importa socket.io: avisa al exterior por los hooks `onState`/`onTick` que
 * registra la capa realtime. Asi el motor se puede probar sin levantar sockets.
 */
import { connectDB } from '@/models/db';
import { Activity, type ActivityDoc } from '@/models/Activity';
import { Participant, type ParticipantDoc } from '@/models/Participant';
import { Team, type TeamDoc } from '@/models/Team';
import { normalizeCode } from '@/lib/codes';
import type { BuzzEntry, LiveStateView, RoundPhase, TeamView, Verdict } from '@/lib/types';
import { ControllerError } from './activityController';
import { toAdminQuestion, toPublicQuestion, toTeamView } from './presenters';
import {
  canTeamBuzz,
  deltaForVerdict,
  gradeClosedAnswer,
  nextStreak,
  shouldLockTeam,
  usesBuzzer,
} from './rules';
import { applyDelta } from './scoreController';

const TICK_MS = 200;

interface QueueItem {
  teamId: string;
  participantId: string;
  at: number;
  reactionMs: number;
}

interface TeamAnswer {
  optionKey: string;
  reactionMs: number;
  participantId: string;
}

export interface Room {
  code: string;
  activityId: string;
  activity: ActivityDoc;
  teams: TeamDoc[];
  participants: ParticipantDoc[];

  phase: RoundPhase;
  questionIndex: number;

  /** Reloj del servidor cuando se habilitaron los pulsadores. */
  buzzOpenedAt: number | null;
  mainRemainingMs: number;
  mainTotalMs: number;
  floorRemainingMs: number;
  floorTotalMs: number;

  queue: QueueItem[];
  floorTeamId: string | null;
  lockedTeamIds: Set<string>;
  answers: Map<string, TeamAnswer>;
  lastDeltas: Map<string, number>;

  podiumVisible: boolean;
  timer: NodeJS.Timeout | null;
  lastTickAt: number;
}

export interface Audience {
  role: 'admin' | 'screen' | 'player';
  teamId?: string | null;
}

type StateHook = (code: string) => void;
type TickHook = (code: string, payload: TickPayload) => void;

export interface TickPayload {
  phase: RoundPhase;
  remainingMs: number;
  totalMs: number;
  floorRemainingMs: number;
  floorTotalMs: number;
  serverTime: number;
}

const rooms = new Map<string, Room>();
let onState: StateHook = () => {};
let onTick: TickHook = () => {};

/** La capa realtime registra aqui como difundir. */
export function setLiveHooks(hooks: { onState: StateHook; onTick: TickHook }) {
  onState = hooks.onState;
  onTick = hooks.onTick;
}

/* ================================================================
   Carga y ciclo de vida de la sala en memoria
   ================================================================ */

export function peekRoom(code: string): Room | undefined {
  return rooms.get(normalizeCode(code));
}

export async function getRoom(rawCode: string): Promise<Room> {
  const code = normalizeCode(rawCode);
  const cached = rooms.get(code);
  if (cached) return cached;

  await connectDB();
  const activity = await Activity.findOne({ joinCode: code });
  if (!activity) throw new ControllerError('No existe una sala con ese codigo.', 404);

  const [teams, participants] = await Promise.all([
    Team.find({ activityId: activity._id }).sort({ order: 1 }),
    Participant.find({ activityId: activity._id }),
  ]);

  // Al reiniciar el servidor se pierden los cronometros: la sala vuelve a
  // 'idle' sobre la misma pregunta en vez de reanudar un conteo inventado.
  const persistedPhase = activity.live.phase as RoundPhase;
  const phase: RoundPhase = persistedPhase === 'revealed' ? 'revealed' : 'idle';

  const room: Room = {
    code,
    activityId: String(activity._id),
    activity,
    teams,
    participants,
    phase,
    questionIndex: activity.live.questionIndex ?? -1,
    buzzOpenedAt: null,
    mainRemainingMs: 0,
    mainTotalMs: 0,
    floorRemainingMs: 0,
    floorTotalMs: 0,
    queue: [],
    floorTeamId: null,
    lockedTeamIds: new Set(),
    answers: new Map(),
    lastDeltas: new Map(),
    podiumVisible: activity.live.podiumVisible ?? false,
    timer: null,
    lastTickAt: Date.now(),
  };

  const question = currentQuestion(room);
  if (question) {
    room.mainTotalMs = question.seconds * 1000;
    room.mainRemainingMs = phase === 'revealed' ? 0 : room.mainTotalMs;
  }

  rooms.set(code, room);
  return room;
}

export function dropRoom(code: string) {
  const room = rooms.get(normalizeCode(code));
  if (!room) return;
  stopTimer(room);
  rooms.delete(room.code);
}

/** Relee equipos y participantes (alguien entro, salio o cambio de equipo). */
export async function refreshRoster(room: Room) {
  const [teams, participants] = await Promise.all([
    Team.find({ activityId: room.activityId }).sort({ order: 1 }),
    Participant.find({ activityId: room.activityId }),
  ]);
  room.teams = teams;
  room.participants = participants;
}

/** Punto de entrada desde HTTP: alguien se unio, avisa a la sala si esta viva. */
export async function notifyRosterChanged(code: string) {
  const room = peekRoom(code);
  if (!room) return;
  await refreshRoster(room);
  onState(room.code);
}

/* ================================================================
   Helpers
   ================================================================ */

function currentQuestion(room: Room) {
  if (room.questionIndex < 0) return null;
  return room.activity.questions[room.questionIndex] ?? null;
}

function requireQuestion(room: Room) {
  const question = currentQuestion(room);
  if (!question) throw new ControllerError('No hay una pregunta activa.', 409);
  return question;
}

function teamOfParticipant(room: Room, participantId: string): { team: TeamDoc; participant: ParticipantDoc } {
  const participant = room.participants.find((p) => String(p._id) === participantId);
  if (!participant) throw new ControllerError('No encontramos tu registro en esta sala.', 404);
  const team = room.teams.find((t) => String(t._id) === String(participant.teamId));
  if (!team) throw new ControllerError('Tu equipo ya no existe en esta sala.', 404);
  return { team, participant };
}

function participantName(room: Room, participantId: string): string {
  return room.participants.find((p) => String(p._id) === participantId)?.name ?? 'Participante';
}

function teamById(room: Room, teamId: string): TeamDoc | undefined {
  return room.teams.find((t) => String(t._id) === teamId);
}

async function persistLive(room: Room) {
  room.activity.live.questionIndex = room.questionIndex;
  room.activity.live.phase = room.phase;
  room.activity.live.podiumVisible = room.podiumVisible;
  await room.activity.save();
}

async function reloadTeams(room: Room) {
  room.teams = await Team.find({ activityId: room.activityId }).sort({ order: 1 });
}

/* ================================================================
   Cronometro
   ================================================================ */

function startTimer(room: Room) {
  stopTimer(room);
  room.lastTickAt = Date.now();
  room.timer = setInterval(() => {
    const now = Date.now();
    const elapsed = now - room.lastTickAt;
    room.lastTickAt = now;

    if (room.phase === 'running') {
      room.mainRemainingMs = Math.max(0, room.mainRemainingMs - elapsed);
      if (room.mainRemainingMs === 0) {
        void handleMainTimeout(room);
        return;
      }
    } else if (room.phase === 'floor') {
      if (room.floorRemainingMs === 0) return;
      room.floorRemainingMs = Math.max(0, room.floorRemainingMs - elapsed);
      // Al llegar a cero NO se penaliza solo: el docente da el veredicto.
    } else {
      stopTimer(room);
      return;
    }

    onTick(room.code, tickPayload(room));
  }, TICK_MS);
}

function stopTimer(room: Room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
}

export function tickPayload(room: Room): TickPayload {
  return {
    phase: room.phase,
    remainingMs: room.mainRemainingMs,
    totalMs: room.mainTotalMs,
    floorRemainingMs: room.floorRemainingMs,
    floorTotalMs: room.floorTotalMs,
    serverTime: Date.now(),
  };
}

async function handleMainTimeout(room: Room) {
  stopTimer(room);
  await revealQuestion(room);
}

/* ================================================================
   Intenciones del administrador
   ================================================================ */

export async function startActivity(room: Room) {
  if (room.activity.questions.length === 0) {
    throw new ControllerError('Agrega al menos una pregunta antes de iniciar.');
  }
  room.activity.status = 'live';
  room.activity.live.startedAt = new Date();
  await goToQuestion(room, 0, { silent: true });
  await persistLive(room);
  onState(room.code);
}

interface GoOptions {
  silent?: boolean;
}

/** Carga una pregunta en fase 'idle': visible, sin cronometro y sin pulsadores. */
export async function goToQuestion(room: Room, index: number, options: GoOptions = {}) {
  if (index < 0 || index >= room.activity.questions.length) {
    throw new ControllerError('Esa pregunta no existe.', 404);
  }
  stopTimer(room);
  room.questionIndex = index;
  room.phase = 'idle';
  room.queue = [];
  room.floorTeamId = null;
  room.lockedTeamIds.clear();
  room.answers.clear();
  room.lastDeltas.clear();
  room.buzzOpenedAt = null;
  room.podiumVisible = false;

  const question = requireQuestion(room);
  room.mainTotalMs = question.seconds * 1000;
  room.mainRemainingMs = room.mainTotalMs;
  room.floorTotalMs = question.floorSeconds * 1000;
  room.floorRemainingMs = 0;

  await persistLive(room);
  if (!options.silent) onState(room.code);
}

/** Arranca el cronometro y habilita los pulsadores automaticamente. */
export async function startQuestion(room: Room) {
  const question = requireQuestion(room);
  if (room.phase === 'running') return;

  if (room.phase === 'revealed') {
    // Volver a abrir una pregunta ya revelada reinicia su ronda.
    await goToQuestion(room, room.questionIndex, { silent: true });
  }

  room.phase = 'running';
  room.buzzOpenedAt = Date.now();
  if (room.mainRemainingMs <= 0) room.mainRemainingMs = question.seconds * 1000;
  startTimer(room);
  await persistLive(room);
  onState(room.code);
}

export async function pauseTimer(room: Room) {
  if (room.phase !== 'running') return;
  stopTimer(room);
  room.phase = 'paused';
  await persistLive(room);
  onState(room.code);
}

export async function resumeTimer(room: Room) {
  if (room.phase !== 'paused') return;
  room.phase = 'running';
  startTimer(room);
  await persistLive(room);
  onState(room.code);
}

/** Boton "Tiempo Rebote": suma segundos al reloj principal. */
export async function addTime(room: Room, seconds: number) {
  const extra = Math.max(1, Math.min(seconds, 300)) * 1000;
  room.mainRemainingMs += extra;
  room.mainTotalMs = Math.max(room.mainTotalMs, room.mainRemainingMs);

  // Si el tiempo ya se habia agotado, la pregunta vuelve a abrirse.
  if (room.phase === 'revealed' || room.phase === 'idle') {
    room.phase = 'running';
    if (room.buzzOpenedAt === null) room.buzzOpenedAt = Date.now();
    startTimer(room);
  } else if (room.phase === 'running' && !room.timer) {
    startTimer(room);
  }
  await persistLive(room);
  onState(room.code);
}

/** Limpia la cola de pulsaciones sin tocar el marcador. */
export async function resetBuzzers(room: Room) {
  room.queue = [];
  room.floorTeamId = null;
  room.lockedTeamIds.clear();
  room.floorRemainingMs = 0;
  if (room.phase === 'floor') {
    room.phase = room.mainRemainingMs > 0 ? 'running' : 'revealed';
    if (room.phase === 'running') startTimer(room);
  }
  await persistLive(room);
  onState(room.code);
}

/* ================================================================
   Pulsador (preguntas abiertas)
   ================================================================ */

export async function buzz(room: Room, participantId: string) {
  const question = requireQuestion(room);
  if (!usesBuzzer(question.type as 'open')) {
    throw new ControllerError('Esta pregunta se contesta desde tu pantalla, no con el pulsador.', 409);
  }
  // Se puede pulsar mientras la pregunta corre y tambien mientras otro equipo
  // responde: ahi la pulsacion forma la cola de rebote.
  if (room.phase !== 'running' && room.phase !== 'floor') {
    throw new ControllerError('Los pulsadores no estan habilitados ahora mismo.', 409);
  }

  const { team } = teamOfParticipant(room, participantId);
  const teamId = String(team._id);

  if (!canTeamBuzz(teamId, room.lockedTeamIds, room.queue)) {
    throw new ControllerError('Tu equipo ya participo en esta pregunta.', 409);
  }

  const at = Date.now();
  room.queue.push({
    teamId,
    participantId,
    at,
    reactionMs: Math.max(0, at - (room.buzzOpenedAt ?? at)),
  });

  await Participant.findByIdAndUpdate(participantId, { $inc: { buzzCount: 1 } });

  if (!room.floorTeamId && room.phase === 'running') {
    grantFloor(room, room.queue[0]);
  }
  onState(room.code);
}

function grantFloor(room: Room, item: QueueItem) {
  const question = requireQuestion(room);
  room.floorTeamId = item.teamId;
  room.phase = 'floor';
  room.floorTotalMs = question.floorSeconds * 1000;
  room.floorRemainingMs = room.floorTotalMs;
  startTimer(room);
}

/**
 * Veredicto del docente sobre el equipo que tiene la palabra.
 * correct   -> suma puntos y revela
 * incorrect -> resta, bloquea (si la regla esta activa) y pasa al siguiente
 * pass      -> cede el turno sin penalizacion
 */
export async function verdict(room: Room, value: Verdict) {
  const question = requireQuestion(room);
  if (room.phase !== 'floor' || !room.floorTeamId) {
    throw new ControllerError('Ningun equipo tiene la palabra.', 409);
  }

  const teamId = room.floorTeamId;
  const team = teamById(room, teamId);
  if (!team) throw new ControllerError('Equipo no encontrado.', 404);

  const entry = room.queue.find((q) => q.teamId === teamId);
  const delta = deltaForVerdict(value, question);

  if (delta !== 0) {
    await applyDelta({
      activityId: room.activityId,
      teamId,
      participantId: entry?.participantId ?? null,
      questionIndex: room.questionIndex,
      kind: value === 'correct' ? 'correct' : 'incorrect',
      delta,
      reason: value === 'correct' ? 'Respuesta correcta' : 'Respuesta incorrecta',
      reactionMs: entry?.reactionMs ?? null,
      streak: nextStreak(team.streak, value),
      countCorrect: value === 'correct',
      countIncorrect: value === 'incorrect',
    });
  } else if (value === 'pass') {
    await applyDelta({
      activityId: room.activityId,
      teamId,
      questionIndex: room.questionIndex,
      kind: 'pass',
      delta: 0,
      reason: 'Cedio el turno',
    });
  }

  room.lastDeltas.set(teamId, delta);
  if (shouldLockTeam(value, question)) room.lockedTeamIds.add(teamId);
  room.queue = room.queue.filter((q) => q.teamId !== teamId);
  await reloadTeams(room);

  if (value === 'correct') {
    stopTimer(room);
    room.floorTeamId = null;
    room.floorRemainingMs = 0;
    room.phase = 'revealed';
    await persistLive(room);
    onState(room.code);
    return;
  }

  releaseFloor(room);
  await persistLive(room);
  onState(room.code);
}

/** Pasa la palabra al siguiente de la cola o devuelve la pregunta a juego. */
function releaseFloor(room: Room) {
  room.floorTeamId = null;
  room.floorRemainingMs = 0;

  const next = room.queue.find((item) => !room.lockedTeamIds.has(item.teamId));
  if (next) {
    grantFloor(room, next);
    return;
  }

  stopTimer(room);
  if (room.mainRemainingMs > 0) {
    room.phase = 'running';
    startTimer(room);
  } else {
    room.phase = 'revealed';
  }
}

/* ================================================================
   Respuestas cerradas (opcion multiple / verdadero-falso)
   ================================================================ */

export async function submitAnswer(room: Room, participantId: string, optionKey: string) {
  const question = requireQuestion(room);
  if (usesBuzzer(question.type as 'open')) {
    throw new ControllerError('Esta pregunta se contesta con el pulsador.', 409);
  }
  if (room.phase !== 'running') {
    throw new ControllerError('La pregunta no esta abierta a respuestas.', 409);
  }

  const { team } = teamOfParticipant(room, participantId);
  const teamId = String(team._id);
  if (room.answers.has(teamId)) {
    throw new ControllerError('Tu equipo ya respondio esta pregunta.', 409);
  }

  const at = Date.now();
  room.answers.set(teamId, {
    optionKey,
    participantId,
    reactionMs: Math.max(0, at - (room.buzzOpenedAt ?? at)),
  });

  // Si todos los equipos con integrantes ya respondieron, se revela sin esperar.
  const activeTeams = room.teams.filter((t) =>
    room.participants.some((p) => String(p.teamId) === String(t._id)),
  );
  if (activeTeams.length > 0 && activeTeams.every((t) => room.answers.has(String(t._id)))) {
    await revealQuestion(room);
    return;
  }

  onState(room.code);
}

/* ================================================================
   Revelar y avanzar
   ================================================================ */

export async function revealQuestion(room: Room) {
  /*
   * Revelar es idempotente a proposito.
   *
   * Una pregunta cerrada se revela sola en cuanto contestan todos los
   * equipos, y el boton "Revelar y calificar" sigue ahi. Sin esta guarda,
   * pulsarlo despues volvia a calificar: cada equipo cobraba sus puntos por
   * duplicado y la bitacora quedaba con dos eventos identicos.
   */
  if (room.phase === 'revealed') return;

  const question = requireQuestion(room);
  stopTimer(room);

  // Las preguntas cerradas se califican solas al revelar.
  if (!usesBuzzer(question.type as 'open')) {
    for (const [teamId, answer] of room.answers.entries()) {
      const team = teamById(room, teamId);
      if (!team) continue;
      const { correct, delta } = gradeClosedAnswer(answer.optionKey, question.correctOptionKey, question);
      room.lastDeltas.set(teamId, delta);
      await applyDelta({
        activityId: room.activityId,
        teamId,
        participantId: answer.participantId,
        questionIndex: room.questionIndex,
        kind: correct ? 'auto-correct' : 'auto-incorrect',
        delta,
        reason: `Respondio ${answer.optionKey}`,
        reactionMs: answer.reactionMs,
        streak: nextStreak(team.streak, correct ? 'correct' : 'incorrect'),
        countCorrect: correct,
        countIncorrect: !correct,
      });
    }
    await reloadTeams(room);
  }

  room.phase = 'revealed';
  room.floorTeamId = null;
  room.floorRemainingMs = 0;
  room.mainRemainingMs = 0;
  await persistLive(room);
  onState(room.code);
}

/**
 * Se acabaron las preguntas.
 *
 * No es lo mismo que terminar la sesion: aqui el docente todavia tiene que
 * mostrar el podio, asi que los equipos conservan sus puntos y nadie sale.
 */
export async function closeQuestionBank(room: Room) {
  stopTimer(room);
  room.phase = 'revealed';
  room.podiumVisible = true;
  room.activity.status = 'finished';
  await persistLive(room);
  onState(room.code);
}

export async function nextQuestion(room: Room) {
  if (room.questionIndex + 1 >= room.activity.questions.length) {
    await closeQuestionBank(room);
    return;
  }
  await goToQuestion(room, room.questionIndex + 1);
}

export async function prevQuestion(room: Room) {
  if (room.questionIndex <= 0) return;
  await goToQuestion(room, room.questionIndex - 1);
}

export async function togglePodium(room: Room, visible: boolean) {
  room.podiumVisible = visible;
  await persistLive(room);
  onState(room.code);
}

export async function adjustTeamScore(room: Room, teamId: string, delta: number) {
  await applyDelta({
    activityId: room.activityId,
    teamId,
    questionIndex: room.questionIndex >= 0 ? room.questionIndex : null,
    kind: 'manual',
    delta,
    reason: 'Ajuste manual del docente',
  });
  room.lastDeltas.set(teamId, delta);
  await reloadTeams(room);
  onState(room.code);
}

/**
 * Cierra la sesion de verdad y deja la sala lista para la siguiente.
 *
 * Terminar no terminaba nada: los participantes seguian en sus equipos y la
 * clase siguiente heredaba la sala a medio usar, con los puntajes del grupo
 * anterior. Ahora salen todos, los marcadores vuelven a cero y la actividad
 * regresa a borrador.
 *
 * La bitacora de puntos NO se toca: es el registro de lo que paso, y borrarla
 * es cosa del boton de reiniciar, que avisa de lo que hace.
 *
 * Devuelve a quienes hay que avisar, porque sacarlos de la base no basta:
 * sus pantallas se quedarian mirando una sala que ya no existe.
 */
export async function finishActivityLive(room: Room) {
  stopTimer(room);
  const equiposConGente = [...new Set(room.participants.map((p) => String(p.teamId)))];

  await Promise.all([
    Participant.deleteMany({ activityId: room.activityId }),
    Team.updateMany(
      { activityId: room.activityId },
      { $set: { score: 0, streak: 0, correctCount: 0, incorrectCount: 0, bestReactionMs: null } },
    ),
  ]);

  room.phase = 'idle';
  room.questionIndex = -1;
  room.queue = [];
  room.floorTeamId = null;
  room.lockedTeamIds.clear();
  room.answers.clear();
  room.lastDeltas.clear();
  room.buzzOpenedAt = null;
  room.podiumVisible = false;
  room.mainRemainingMs = 0;
  room.mainTotalMs = 0;
  room.floorRemainingMs = 0;
  room.floorTotalMs = 0;

  room.activity.status = 'draft';
  room.activity.live.finishedAt = new Date();
  await persistLive(room);
  await refreshRoster(room);
  onState(room.code);

  return { teamIds: equiposConGente };
}

/* ================================================================
   Construccion del estado que viaja por el cable
   ================================================================ */

function buildTeamViews(room: Room, audience: Audience): TeamView[] {
  const revealed = room.phase === 'revealed';
  const isAdmin = audience.role === 'admin';

  return room.teams.map((team) => {
    const teamId = String(team._id);
    const members = room.participants.filter((p) => String(p.teamId) === teamId);
    const answer = room.answers.get(teamId);
    // La respuesta de un equipo solo la ven: el propio equipo, el admin, o todos al revelar.
    const canSeeAnswer = isAdmin || revealed || audience.teamId === teamId;

    return toTeamView(team, members, {
      locked: room.lockedTeamIds.has(teamId),
      hasAnswered: Boolean(answer),
      answerKey: answer && canSeeAnswer ? answer.optionKey : null,
      answerMs: answer ? answer.reactionMs : null,
      lastDelta: room.lastDeltas.get(teamId) ?? null,
      includeJoinCode: isAdmin,
    });
  });
}

function buildQueue(room: Room): BuzzEntry[] {
  const first = room.queue[0];
  return room.queue.map((item) => {
    const team = teamById(room, item.teamId);
    return {
      teamId: item.teamId,
      teamName: team?.name ?? 'Equipo',
      teamColorKey: team?.colorKey ?? 'indigo',
      participantId: item.participantId,
      participantName: participantName(room, item.participantId),
      reactionMs: item.reactionMs,
      deltaMs: first ? item.at - first.at : 0,
    };
  });
}

export function buildState(room: Room, audience: Audience): LiveStateView {
  const question = currentQuestion(room);
  const isAdmin = audience.role === 'admin';
  const revealed = room.phase === 'revealed';

  const floorItem = room.floorTeamId ? room.queue.find((q) => q.teamId === room.floorTeamId) : undefined;
  const floorTeam = room.floorTeamId ? teamById(room, room.floorTeamId) : undefined;

  /*
   * Entre cargar la pregunta y arrancar el cronometro, el docente la lee en
   * voz alta. Si ya estaba en los telefonos, media clase la leia antes y esa
   * lectura sobraba. Se oculta SOLO al participante: el proyector y la
   * consola son del docente, y es el quien decide cuando proyectar.
   */
  const ocultaAlParticipante = audience.role === 'player' && room.phase === 'idle';

  return {
    code: room.code,
    title: room.activity.title,
    description: room.activity.description ?? '',
    unit: room.activity.unit ?? '',
    status: room.activity.status as LiveStateView['status'],
    phase: room.phase,
    questionIndex: room.questionIndex,
    totalQuestions: room.activity.questions.length,
    question:
      question && !ocultaAlParticipante
        ? isAdmin
          ? toAdminQuestion(question, room.questionIndex)
          : toPublicQuestion(question, room.questionIndex)
        : null,
    timer: {
      remainingMs: room.mainRemainingMs,
      totalMs: room.mainTotalMs,
      running: room.phase === 'running',
    },
    floor:
      room.floorTeamId && floorTeam
        ? {
            teamId: room.floorTeamId,
            teamName: floorTeam.name,
            teamColorKey: floorTeam.colorKey,
            participantId: floorItem?.participantId ?? '',
            participantName: floorItem ? participantName(room, floorItem.participantId) : '',
            reactionMs: floorItem?.reactionMs ?? 0,
            remainingMs: room.floorRemainingMs,
            totalMs: room.floorTotalMs,
          }
        : null,
    queue: buildQueue(room),
    teams: buildTeamViews(room, audience),
    podiumVisible: room.podiumVisible,
    reveal:
      question && (isAdmin || revealed)
        ? {
            suggestedAnswer: question.suggestedAnswer ?? '',
            correctOptionKey: question.correctOptionKey ?? null,
            evaluationCriteria: question.evaluationCriteria ?? '',
          }
        : null,
    buzzersEnabled:
      (room.phase === 'running' || room.phase === 'floor') &&
      Boolean(question && usesBuzzer(question.type as 'open')),
    connectedCount: room.participants.filter((p) => p.connected).length,
    serverTime: Date.now(),
  };
}

/**
 * La actividad cambio desde HTTP (se edito una pregunta o un equipo mientras
 * la sala estaba abierta): relee todo y vuelve a difundir.
 */
export async function notifyActivityChanged(code: string) {
  const room = peekRoom(code);
  if (!room) return;
  const fresh = await Activity.findById(room.activityId);
  if (fresh) room.activity = fresh;
  await refreshRoster(room);
  onState(room.code);
}
