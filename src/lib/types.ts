/**
 * Contrato de tipos compartido entre las tres capas.
 *
 * Este archivo NO importa mongoose: lo consumen igual el servidor (controllers,
 * models) y el navegador (views). Es la frontera que mantiene la vista ignorante
 * de como se persiste el dominio.
 */

export type QuestionType = 'open' | 'multiple' | 'boolean';
export type Difficulty = 'baja' | 'media' | 'alta';
export type ActivityStatus = 'draft' | 'live' | 'finished';
export type Verdict = 'correct' | 'incorrect' | 'pass';
/** Como le fue al equipo en la pregunta que acaba de cerrarse. */
export type RoundOutcome = 'correct' | 'incorrect';
export type Role = 'admin' | 'screen' | 'player';

/**
 * Fases de una pregunta.
 *  idle     -> la pregunta esta cargada pero el cronometro no ha arrancado
 *  running  -> cronometro corriendo, pulsadores habilitados
 *  paused   -> el admin congelo el cronometro
 *  floor    -> un equipo tiene la palabra (solo preguntas abiertas)
 *  revealed -> se muestra la respuesta, el admin decide si avanza
 */
export type RoundPhase = 'idle' | 'running' | 'paused' | 'floor' | 'revealed';

export interface QuestionOption {
  key: string;
  text: string;
}

/** Lo que ve cualquiera: nunca incluye la respuesta correcta. */
export interface PublicQuestion {
  id: string;
  index: number;
  type: QuestionType;
  prompt: string;
  context?: string;
  topic?: string;
  difficulty: Difficulty;
  options: QuestionOption[];
  seconds: number;
  points: number;
  penalty: number;
  reboundSeconds: number;
  lockTeamAfterWrong: boolean;
}

/** Lo que ve solo el admin en su consola. */
export interface AdminQuestion extends PublicQuestion {
  suggestedAnswer: string;
  correctOptionKey: string | null;
  evaluationCriteria: string;
  keywords: string[];
}

export interface TeamMemberView {
  id: string;
  name: string;
  tag: string | null;
  iconKey: string;
  connected: boolean;
}

export interface TeamView {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  colorKey: string;
  joinCode: string;
  capacity: number;
  score: number;
  members: TeamMemberView[];
  /** Ya fallo esta pregunta y no puede volver a pulsar (si la regla esta activa). */
  locked: boolean;
  /** Opcion multiple / verdadero-falso: el equipo ya emitio su respuesta. */
  hasAnswered: boolean;
  /** Respuesta elegida, visible para el admin siempre y para todos al revelar. */
  answerKey: string | null;
  /** Milisegundos de reaccion de la respuesta del equipo en esta pregunta. */
  answerMs: number | null;
  streak: number;
  lastDelta: number | null;
  /*
   * Resultado de la ronda, aparte del delta.
   *
   * Con penalizacion en cero un fallo deja delta 0, que es lo mismo que no
   * haber jugado. El pulsador necesita distinguirlos para festejar o sacudir.
   */
  lastOutcome: RoundOutcome | null;
}

export interface BuzzEntry {
  teamId: string;
  teamName: string;
  teamColorKey: string;
  participantId: string;
  participantName: string;
  /** Milisegundos desde que se habilitaron los pulsadores (reloj del servidor). */
  reactionMs: number;
  /** Diferencia contra el primero de la cola. */
  deltaMs: number;
}

export interface FloorState {
  teamId: string;
  teamName: string;
  teamColorKey: string;
  participantId: string;
  participantName: string;
  reactionMs: number;
  /** Cronometro independiente para la respuesta verbal. */
  remainingMs: number;
  totalMs: number;
}

export interface TimerState {
  remainingMs: number;
  totalMs: number;
  running: boolean;
}

export interface RevealState {
  suggestedAnswer: string;
  correctOptionKey: string | null;
  evaluationCriteria: string;
}

/** Fotografia completa del estado en vivo que se difunde por WebSocket. */
export interface LiveStateView {
  code: string;
  title: string;
  description: string;
  unit: string;
  status: ActivityStatus;
  phase: RoundPhase;
  questionIndex: number;
  totalQuestions: number;
  question: PublicQuestion | AdminQuestion | null;
  timer: TimerState;
  floor: FloorState | null;
  queue: BuzzEntry[];
  teams: TeamView[];
  podiumVisible: boolean;
  /** Solo llega lleno cuando la fase es 'revealed' (o siempre, si eres admin). */
  reveal: RevealState | null;
  buzzersEnabled: boolean;
  connectedCount: number;
  /** Reloj del servidor al construir el snapshot, para reconciliar cronometros. */
  serverTime: number;
}

/** Datos del participante guardados en el navegador para reconectar. */
export interface ParticipantIdentity {
  participantId: string;
  activityCode: string;
  teamId: string;
  name: string;
  tag: string | null;
  iconKey: string;
}

export interface ScoreEventView {
  id: string;
  teamId: string;
  teamName: string;
  questionIndex: number | null;
  delta: number;
  reason: string;
  at: number;
}

/** Resultado final que alimenta el podio. */
export interface PodiumEntry {
  place: number;
  team: TeamView;
  correct: number;
  incorrect: number;
  bestReactionMs: number | null;
}
