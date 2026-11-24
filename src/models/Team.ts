/**
 * MODELO: Team.
 *
 * Coleccion aparte de Activity para poder actualizar el marcador de un equipo
 * con un `$inc` atomico mientras otros equipos pulsan al mismo tiempo.
 *
 * `joinCode` es unico global: con el, un participante entra directo a este
 * equipo sin pasar por el selector.
 */
import mongoose, { Schema, Types, type HydratedDocument, type Model } from 'mongoose';
import { MAX_TEAM_CAPACITY } from '@/lib/teams';

export interface TeamAttrs {
  activityId: Types.ObjectId;
  name: string;
  description: string;
  /** Clave del diccionario de lib/icons.tsx. Nunca se guarda el SVG. */
  iconKey: string;
  /** Clave de la paleta de lib/teams.ts. */
  colorKey: string;
  joinCode: string;
  capacity: number;
  score: number;
  /** Aciertos consecutivos, para el badge de "racha" del marcador. */
  streak: number;
  correctCount: number;
  incorrectCount: number;
  bestReactionMs: number | null;
  order: number;
}

export type TeamDoc = HydratedDocument<TeamAttrs>;

const TeamSchema = new Schema<TeamAttrs>(
  {
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    iconKey: { type: String, default: 'layers' },
    colorKey: { type: String, default: 'indigo' },
    joinCode: { type: String, required: true, unique: true, uppercase: true, index: true },
    capacity: { type: Number, default: 5, min: 1, max: MAX_TEAM_CAPACITY },
    score: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    bestReactionMs: { type: Number, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Team: Model<TeamAttrs> =
  (mongoose.models.Team as Model<TeamAttrs>) || mongoose.model<TeamAttrs>('Team', TeamSchema);
