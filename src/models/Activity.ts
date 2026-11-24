/**
 * MODELO: Activity (la "sala").
 *
 * Una actividad es a la vez la plantilla (banco de preguntas y configuracion)
 * y la sala en vivo: los equipos se llenan mientras esta en borrador y, al
 * iniciarla, el mismo documento guarda en que pregunta y fase va.
 *
 * El cronometro NO se persiste tick a tick: solo se guardan las transiciones
 * (pregunta iniciada, palabra cedida, veredicto). El conteo fino vive en
 * memoria del servidor (controllers/liveController.ts).
 *
 * Los tipos se declaran a mano en vez de inferirlos del esquema: asi el
 * contrato del modelo se lee de un vistazo y la capa de controladores no
 * depende de los genericos internos de mongoose.
 */
import mongoose, { Schema, Types, type HydratedDocument, type Model } from 'mongoose';
import type { ActivityStatus, Difficulty, QuestionType, RoundPhase } from '@/lib/types';
import { MAX_TEAM_CAPACITY } from '@/lib/teams';

export interface QuestionOptionAttrs {
  key: string;
  text: string;
}

export interface QuestionAttrs {
  _id: Types.ObjectId;
  type: QuestionType;
  prompt: string;
  context: string;
  topic: string;
  difficulty: Difficulty;
  /** Solo para 'multiple'. En 'boolean' se derivan V/F al vuelo. */
  options: QuestionOptionAttrs[];
  correctOptionKey: string | null;
  /** Solo para 'open': lo que el docente usa para validar la respuesta verbal. */
  suggestedAnswer: string;
  evaluationCriteria: string;
  keywords: string[];
  /** Reglas configurables por pregunta. */
  seconds: number;
  points: number;
  penalty: number;
  reboundSeconds: number;
  /** Segundos que tiene el equipo con la palabra para responder de viva voz. */
  floorSeconds: number;
  /** Si falla, el equipo queda bloqueado para esta pregunta. */
  lockTeamAfterWrong: boolean;
}

export interface ActivityDefaults {
  seconds: number;
  points: number;
  penalty: number;
  reboundSeconds: number;
  floorSeconds: number;
  lockTeamAfterWrong: boolean;
}

export interface ActivityLive {
  questionIndex: number;
  phase: RoundPhase;
  podiumVisible: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface ActivityAttrs {
  title: string;
  description: string;
  unit: string;
  /** Codigo que se proyecta para que entren los participantes. */
  joinCode: string;
  /** Codigo privado del docente. Cualquiera que lo tenga entra como admin. */
  adminCode: string;
  status: ActivityStatus;
  teamCapacity: number;
  questions: QuestionAttrs[];
  defaults: ActivityDefaults;
  live: ActivityLive;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ActivityDoc = HydratedDocument<ActivityAttrs>;
export type QuestionDoc = QuestionAttrs;

const OptionSchema = new Schema<QuestionOptionAttrs>(
  {
    key: { type: String, required: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const QuestionSchema = new Schema<QuestionAttrs>({
  type: { type: String, enum: ['open', 'multiple', 'boolean'], default: 'open' },
  prompt: { type: String, required: true, trim: true },
  context: { type: String, default: '', trim: true },
  topic: { type: String, default: '', trim: true },
  difficulty: { type: String, enum: ['baja', 'media', 'alta'], default: 'media' },
  options: { type: [OptionSchema], default: [] },
  correctOptionKey: { type: String, default: null },
  suggestedAnswer: { type: String, default: '', trim: true },
  evaluationCriteria: { type: String, default: '', trim: true },
  keywords: { type: [String], default: [] },
  seconds: { type: Number, default: 45, min: 5, max: 600 },
  points: { type: Number, default: 100, min: 0, max: 10000 },
  penalty: { type: Number, default: 20, min: 0, max: 10000 },
  reboundSeconds: { type: Number, default: 15, min: 0, max: 300 },
  floorSeconds: { type: Number, default: 15, min: 5, max: 300 },
  lockTeamAfterWrong: { type: Boolean, default: true },
});

const LiveSchema = new Schema<ActivityLive>(
  {
    questionIndex: { type: Number, default: -1 },
    phase: { type: String, enum: ['idle', 'running', 'paused', 'floor', 'revealed'], default: 'idle' },
    podiumVisible: { type: Boolean, default: false },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { _id: false },
);

const DefaultsSchema = new Schema<ActivityDefaults>(
  {
    seconds: { type: Number, default: 45 },
    points: { type: Number, default: 100 },
    penalty: { type: Number, default: 20 },
    reboundSeconds: { type: Number, default: 15 },
    floorSeconds: { type: Number, default: 15 },
    lockTeamAfterWrong: { type: Boolean, default: true },
  },
  { _id: false },
);

const ActivitySchema = new Schema<ActivityAttrs>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    unit: { type: String, default: '', trim: true },
    joinCode: { type: String, required: true, unique: true, uppercase: true, index: true },
    adminCode: { type: String, required: true, index: true },
    status: { type: String, enum: ['draft', 'live', 'finished'], default: 'draft', index: true },
    teamCapacity: { type: Number, default: 5, min: 1, max: MAX_TEAM_CAPACITY },
    questions: { type: [QuestionSchema], default: [] },
    defaults: { type: DefaultsSchema, default: () => ({}) },
    live: { type: LiveSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const Activity: Model<ActivityAttrs> =
  (mongoose.models.Activity as Model<ActivityAttrs>) ||
  mongoose.model<ActivityAttrs>('Activity', ActivitySchema);

/** Crea una pregunta con su _id ya asignado, lista para empujarse al arreglo. */
export function newQuestion(attrs: Omit<QuestionAttrs, '_id'>): QuestionAttrs {
  return { _id: new Types.ObjectId(), ...attrs };
}
