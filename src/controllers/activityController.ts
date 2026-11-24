/**
 * CONTROLADOR DE ACTIVIDAD.
 *
 * Caso de uso del docente antes de la clase: crear la sala, configurar equipos
 * y armar el banco de preguntas. Lo consumen tanto los Server Components de
 * `app/` como los route handlers de `app/api/`.
 */
import { connectDB } from '@/models/db';
import { Activity, newQuestion, type ActivityDoc } from '@/models/Activity';
import { Team, type TeamDoc } from '@/models/Team';
import { Participant } from '@/models/Participant';
import { ScoreEvent } from '@/models/ScoreEvent';
import { generateAdminCode, generateJoinCode, generateTeamCode, normalizeCode } from '@/lib/codes';
import { MAX_TEAM_CAPACITY, SUGGESTED_TEAM_ICONS, SUGGESTED_TEAM_NAMES, colorKeyForIndex } from '@/lib/teams';
import { MAX_BUNDLE_QUESTIONS } from '@/lib/questionBundle';
import { validateQuestion } from './rules';
import { toAdminQuestion, toTeamView } from './presenters';
import type { AdminQuestion, QuestionType, TeamView } from '@/lib/types';

export class ControllerError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ControllerError';
    this.status = status;
  }
}

/* ---------------------------------------------------------------- */
/* Creacion                                                          */
/* ---------------------------------------------------------------- */

const SAMPLE_QUESTIONS = [
  {
    type: 'open' as const,
    prompt: '¿Que principio SOLID se vulnera al forzar a un cliente a depender de metodos que no utiliza?',
    context: 'Interfaces monoliticas vs. interfaces segregadas y cohesivas en diseno orientado a objetos.',
    topic: 'ARQUITECTURA-SOLID-ISP',
    difficulty: 'media' as const,
    suggestedAnswer: 'Interface Segregation Principle (ISP) - Principio de Segregacion de Interfaces',
    evaluationCriteria:
      'El equipo debe explicitar que ninguna clase debe ser forzada a implementar interfaces que no utiliza, recomendando interfaces especificas y delgadas.',
    keywords: ['segregacion', 'interfaces', 'ISP'],
    seconds: 45,
    points: 100,
  },
  {
    type: 'open' as const,
    prompt: '¿Cual es la diferencia fundamental entre el patron Strategy y State en tiempo de ejecucion?',
    context: 'Los equipos deberan resumir el acoplamiento y el control de transiciones en maximo 2 lineas tecnicas.',
    topic: 'PATRONES-GOF',
    difficulty: 'alta' as const,
    suggestedAnswer:
      'Strategy delega comportamiento configurable desde afuera; State cambia el comportamiento segun transiciones internas de estado.',
    evaluationCriteria: 'Palabras clave requeridas: delegacion externa, autotransicion interna.',
    keywords: ['delegacion externa', 'autotransicion interna'],
    seconds: 45,
    points: 100,
  },
  {
    type: 'multiple' as const,
    prompt: '¿Que patron usarias para envolver un servicio de telemetria y agregarle reintentos sin tocar su codigo?',
    topic: 'PATRONES-ESTRUCTURALES',
    difficulty: 'media' as const,
    options: [
      { key: 'A', text: 'Decorator' },
      { key: 'B', text: 'Adapter' },
      { key: 'C', text: 'Singleton' },
      { key: 'D', text: 'Observer' },
    ],
    correctOptionKey: 'A',
    suggestedAnswer: 'Decorator: agrega responsabilidades sin alterar la interfaz original.',
    seconds: 30,
    points: 75,
  },
  {
    type: 'boolean' as const,
    prompt: 'En una arquitectura hexagonal, el dominio puede importar directamente el driver de la base de datos.',
    topic: 'CLEAN-ARCHITECTURE',
    difficulty: 'baja' as const,
    correctOptionKey: 'F',
    suggestedAnswer: 'Falso: el dominio define puertos y la infraestructura los implementa, nunca al reves.',
    seconds: 20,
    points: 50,
  },
];

export interface CreateActivityInput {
  title: string;
  description?: string;
  unit?: string;
  teamCount: number;
  teamCapacity: number;
  withSamples?: boolean;
}

export async function createActivity(input: CreateActivityInput) {
  await connectDB();
  if (!input.title?.trim()) throw new ControllerError('La actividad necesita un titulo.');
  const teamCount = Math.min(Math.max(input.teamCount || 4, 1), 8);
  const teamCapacity = Math.min(Math.max(input.teamCapacity || 5, 1), MAX_TEAM_CAPACITY);

  const activity = await Activity.create({
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    unit: input.unit?.trim() ?? '',
    joinCode: await uniqueJoinCode(),
    adminCode: await uniqueAdminCode(),
    teamCapacity,
    questions: input.withSamples === false ? [] : SAMPLE_QUESTIONS,
  });

  await createTeams(activity, 0, teamCount);
  return activity;
}

async function uniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateJoinCode();
    if (!(await Activity.exists({ joinCode: code }))) return code;
  }
  throw new ControllerError('No se pudo generar un codigo de sala libre.', 500);
}

/** El codigo de admin ahora identifica una sala por si solo: debe ser unico. */
async function uniqueAdminCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateAdminCode();
    if (!(await Activity.exists({ adminCode: code }))) return code;
  }
  throw new ControllerError('No se pudo generar un codigo de administrador libre.', 500);
}

async function uniqueTeamCode(name: string, index: number): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateTeamCode(name, index + attempt);
    if (!(await Team.exists({ joinCode: code }))) return code;
  }
  throw new ControllerError('No se pudo generar un codigo de equipo libre.', 500);
}

async function createTeams(activity: ActivityDoc, from: number, to: number) {
  for (let index = from; index < to; index += 1) {
    const name = SUGGESTED_TEAM_NAMES[index % SUGGESTED_TEAM_NAMES.length];
    await Team.create({
      activityId: activity._id,
      name,
      iconKey: SUGGESTED_TEAM_ICONS[index % SUGGESTED_TEAM_ICONS.length],
      colorKey: colorKeyForIndex(index),
      joinCode: await uniqueTeamCode(name, index),
      capacity: activity.teamCapacity,
      order: index,
    });
  }
}

/* ---------------------------------------------------------------- */
/* Lectura                                                           */
/* ---------------------------------------------------------------- */

export async function findByJoinCode(rawCode: string) {
  await connectDB();
  const joinCode = normalizeCode(rawCode);
  return Activity.findOne({ joinCode });
}

/** Busca por codigo de sala o por codigo de equipo; devuelve ambos si aplica. */
export async function resolveAccessCode(rawCode: string) {
  await connectDB();
  const code = normalizeCode(rawCode);
  const activity = await Activity.findOne({ joinCode: code });
  if (activity) return { activity, team: null as TeamDoc | null };

  const team = await Team.findOne({ joinCode: code });
  if (!team) return null;
  const teamActivity = await Activity.findById(team.activityId);
  if (!teamActivity) return null;
  return { activity: teamActivity, team };
}

export interface AdminAccess {
  joinCode: string;
  title: string;
  status: string;
  /** Solo viene lleno cuando lo tecleado ERA el codigo de administrador. */
  adminCode: string | null;
}

/**
 * Resuelve el codigo con el que un docente quiere volver a su sala.
 *
 * Acepta las dos cosas, igual que el campo del participante acepta el codigo
 * de la sala o el del equipo:
 *  - codigo de administrador -> entra directo, el codigo viaja de vuelta
 *  - codigo de la sala       -> lo deja pasar, pero la consola le pedira el
 *                               de administrador antes de mostrar nada
 *
 * El codigo de administrador nunca se devuelve si no fue el que se tecleo.
 */
export async function resolveAdminAccess(rawCode: string): Promise<AdminAccess> {
  await connectDB();
  const code = normalizeCode(rawCode);
  if (!code) throw new ControllerError('Escribe un codigo para continuar.');

  const byAdmin = await Activity.findOne({ adminCode: code });
  if (byAdmin) {
    return { joinCode: byAdmin.joinCode, title: byAdmin.title, status: byAdmin.status, adminCode: byAdmin.adminCode };
  }

  const byRoom = await Activity.findOne({ joinCode: code });
  if (byRoom) {
    return { joinCode: byRoom.joinCode, title: byRoom.title, status: byRoom.status, adminCode: null };
  }

  throw new ControllerError('No encontramos ninguna sala con ese codigo.', 404);
}

/** Valida el codigo de administrador. Lanza 403 si no coincide. */
export async function assertAdmin(joinCode: string, adminCode: string) {
  const activity = await findByJoinCode(joinCode);
  if (!activity) throw new ControllerError('No existe una sala con ese codigo.', 404);
  if (activity.adminCode !== adminCode?.trim().toUpperCase()) {
    throw new ControllerError('Codigo de administrador incorrecto.', 403);
  }
  return activity;
}

export interface ActivitySnapshot {
  id: string;
  title: string;
  description: string;
  unit: string;
  joinCode: string;
  adminCode: string;
  status: string;
  teamCapacity: number;
  questions: AdminQuestion[];
  teams: TeamView[];
  participantCount: number;
}

/** Datos completos para la pantalla de configuracion del docente. */
export async function getAdminSnapshot(activity: ActivityDoc): Promise<ActivitySnapshot> {
  const [teams, participants] = await Promise.all([
    Team.find({ activityId: activity._id }).sort({ order: 1 }),
    Participant.find({ activityId: activity._id }),
  ]);

  const byTeam = new Map<string, typeof participants>();
  for (const participant of participants) {
    const key = String(participant.teamId);
    byTeam.set(key, [...(byTeam.get(key) ?? []), participant]);
  }

  return {
    id: String(activity._id),
    title: activity.title,
    description: activity.description ?? '',
    unit: activity.unit ?? '',
    joinCode: activity.joinCode,
    adminCode: activity.adminCode,
    status: activity.status,
    teamCapacity: activity.teamCapacity,
    questions: activity.questions.map((question, index) => toAdminQuestion(question, index)),
    teams: teams.map((team) => toTeamView(team, byTeam.get(String(team._id)) ?? [])),
    participantCount: participants.length,
  };
}

/* ---------------------------------------------------------------- */
/* Edicion de la actividad                                           */
/* ---------------------------------------------------------------- */

export async function updateActivityMeta(
  activity: ActivityDoc,
  patch: { title?: string; description?: string; unit?: string; teamCapacity?: number },
) {
  if (patch.title !== undefined) activity.title = patch.title.trim();
  if (patch.description !== undefined) activity.description = patch.description.trim();
  if (patch.unit !== undefined) activity.unit = patch.unit.trim();
  if (patch.teamCapacity !== undefined) {
    activity.teamCapacity = Math.min(Math.max(patch.teamCapacity, 1), MAX_TEAM_CAPACITY);
    await Team.updateMany({ activityId: activity._id }, { $set: { capacity: activity.teamCapacity } });
  }
  await activity.save();
  return activity;
}

/** Agrega o quita equipos. Nunca borra un equipo que ya tiene integrantes. */
export async function setTeamCount(activity: ActivityDoc, count: number) {
  const target = Math.min(Math.max(count, 1), 8);
  const teams = await Team.find({ activityId: activity._id }).sort({ order: 1 });

  if (target > teams.length) {
    await createTeams(activity, teams.length, target);
    return;
  }

  for (const team of teams.slice(target)) {
    const members = await Participant.countDocuments({ teamId: team._id });
    if (members > 0) {
      throw new ControllerError(
        `No se puede quitar "${team.name}": todavia tiene ${members} integrante(s). Muevelos primero.`,
      );
    }
    await Team.deleteOne({ _id: team._id });
  }
}

export async function updateTeam(
  activity: ActivityDoc,
  teamId: string,
  patch: { name?: string; description?: string; iconKey?: string; colorKey?: string; capacity?: number },
) {
  const team = await Team.findOne({ _id: teamId, activityId: activity._id });
  if (!team) throw new ControllerError('Equipo no encontrado.', 404);
  if (patch.name !== undefined) team.name = patch.name.trim() || team.name;
  if (patch.description !== undefined) team.description = patch.description.trim();
  if (patch.iconKey !== undefined) team.iconKey = patch.iconKey;
  if (patch.colorKey !== undefined) team.colorKey = patch.colorKey;
  if (patch.capacity !== undefined) team.capacity = Math.min(Math.max(patch.capacity, 1), MAX_TEAM_CAPACITY);
  await team.save();
  return team;
}

/* ---------------------------------------------------------------- */
/* Banco de preguntas                                                */
/* ---------------------------------------------------------------- */

export interface QuestionInput {
  type: QuestionType;
  prompt: string;
  context?: string;
  topic?: string;
  difficulty?: 'baja' | 'media' | 'alta';
  options?: { key: string; text: string }[];
  correctOptionKey?: string | null;
  suggestedAnswer?: string;
  evaluationCriteria?: string;
  keywords?: string[];
  seconds?: number;
  points?: number;
  penalty?: number;
  reboundSeconds?: number;
  floorSeconds?: number;
  lockTeamAfterWrong?: boolean;
}

function normalizeQuestion(input: QuestionInput, defaults: ActivityDoc['defaults']) {
  const errors = validateQuestion({
    ...input,
    options: input.options ?? [],
    seconds: input.seconds ?? defaults.seconds,
  });
  if (errors.length) throw new ControllerError(errors.join(' '));

  return {
    type: input.type,
    prompt: input.prompt.trim(),
    context: input.context?.trim() ?? '',
    topic: input.topic?.trim() ?? '',
    difficulty: input.difficulty ?? 'media',
    options: input.type === 'multiple' ? (input.options ?? []) : [],
    correctOptionKey: input.type === 'open' ? null : (input.correctOptionKey ?? null),
    suggestedAnswer: input.suggestedAnswer?.trim() ?? '',
    evaluationCriteria: input.evaluationCriteria?.trim() ?? '',
    keywords: input.keywords ?? [],
    seconds: input.seconds ?? defaults.seconds,
    points: input.points ?? defaults.points,
    penalty: input.penalty ?? defaults.penalty,
    reboundSeconds: input.reboundSeconds ?? defaults.reboundSeconds,
    floorSeconds: input.floorSeconds ?? defaults.floorSeconds,
    lockTeamAfterWrong: input.lockTeamAfterWrong ?? defaults.lockTeamAfterWrong,
  };
}

export async function addQuestion(activity: ActivityDoc, input: QuestionInput) {
  activity.questions.push(newQuestion(normalizeQuestion(input, activity.defaults)));
  await activity.save();
  return activity;
}

/**
 * Alta de un lote de preguntas desde un JSON.
 *
 * O entran todas o no entra ninguna: se normaliza el lote completo antes de
 * tocar la actividad. A medio importar, el docente no sabria cuales quedaron
 * ni por donde seguir, y el banco es justo lo que prepara antes de la clase.
 */
export async function importQuestions(activity: ActivityDoc, raw: unknown) {
  const lista = Array.isArray(raw) ? raw : (raw as { questions?: unknown })?.questions;

  if (!Array.isArray(lista)) {
    throw new ControllerError('El JSON debe ser una lista de preguntas o un objeto con la clave "questions".');
  }
  if (lista.length === 0) throw new ControllerError('El JSON no trae ninguna pregunta.');
  if (lista.length > MAX_BUNDLE_QUESTIONS) {
    throw new ControllerError(`Son demasiadas preguntas en un archivo (maximo ${MAX_BUNDLE_QUESTIONS}).`);
  }

  const normalizadas = lista.map((entrada, i) => {
    try {
      return normalizeQuestion(entrada as QuestionInput, activity.defaults);
    } catch (error) {
      const detalle = error instanceof ControllerError ? error.message : 'No se pudo leer.';
      throw new ControllerError(`Pregunta ${i + 1}: ${detalle}`);
    }
  });

  for (const pregunta of normalizadas) activity.questions.push(newQuestion(pregunta));
  await activity.save();
  return { imported: normalizadas.length };
}

export async function updateQuestion(activity: ActivityDoc, questionId: string, input: QuestionInput) {
  const question = activity.questions.find((q) => String(q._id) === questionId);
  if (!question) throw new ControllerError('Pregunta no encontrada.', 404);
  Object.assign(question, normalizeQuestion(input, activity.defaults));
  await activity.save();
  return activity;
}

export async function deleteQuestion(activity: ActivityDoc, questionId: string) {
  const before = activity.questions.length;
  activity.questions = activity.questions.filter((q) => String(q._id) !== questionId);
  if (activity.questions.length === before) throw new ControllerError('Pregunta no encontrada.', 404);
  await activity.save();
  return activity;
}

/** Mueve una pregunta una posicion arriba (-1) o abajo (+1). */
export async function moveQuestion(activity: ActivityDoc, questionId: string, direction: -1 | 1) {
  const index = activity.questions.findIndex((q) => String(q._id) === questionId);
  if (index < 0) throw new ControllerError('Pregunta no encontrada.', 404);
  const target = index + direction;
  if (target < 0 || target >= activity.questions.length) return activity;
  const list = [...activity.questions];
  [list[index], list[target]] = [list[target], list[index]];
  activity.questions = list;
  await activity.save();
  return activity;
}

/* ---------------------------------------------------------------- */
/* Ciclo de vida                                                     */
/* ---------------------------------------------------------------- */

export async function finishActivity(activity: ActivityDoc) {
  activity.status = 'finished';
  activity.live.phase = 'revealed';
  activity.live.podiumVisible = true;
  activity.live.finishedAt = new Date();
  await activity.save();
  return activity;
}

/** Deja la sala lista para volver a jugarse: borra puntajes e historial. */
export async function resetActivity(activity: ActivityDoc) {
  await Promise.all([
    Team.updateMany(
      { activityId: activity._id },
      { $set: { score: 0, streak: 0, correctCount: 0, incorrectCount: 0, bestReactionMs: null } },
    ),
    ScoreEvent.deleteMany({ activityId: activity._id }),
  ]);
  activity.status = 'draft';
  activity.live = { questionIndex: -1, phase: 'idle', podiumVisible: false, startedAt: null, finishedAt: null };
  await activity.save();
  return activity;
}

export async function deleteActivity(activity: ActivityDoc) {
  await Promise.all([
    Team.deleteMany({ activityId: activity._id }),
    Participant.deleteMany({ activityId: activity._id }),
    ScoreEvent.deleteMany({ activityId: activity._id }),
  ]);
  await Activity.deleteOne({ _id: activity._id });
}
