/**
 * MODELO: ScoreEvent.
 *
 * Bitacora de cada movimiento de puntaje. Sirve para tres cosas:
 *  1. Reconstruir el marcador si el servidor se reinicia a mitad de clase.
 *  2. Mostrar el historial y el desglose en el podio.
 *  3. Dejar rastro de los ajustes manuales del docente.
 */
import mongoose, { Schema, Types, type HydratedDocument, type Model } from 'mongoose';

export type ScoreEventKind =
  | 'correct'
  | 'incorrect'
  | 'pass'
  | 'auto-correct'
  | 'auto-incorrect'
  | 'manual';

export interface ScoreEventAttrs {
  activityId: Types.ObjectId;
  teamId: Types.ObjectId;
  participantId: Types.ObjectId | null;
  questionIndex: number | null;
  kind: ScoreEventKind;
  delta: number;
  reason: string;
  reactionMs: number | null;
  at: Date;
}

export type ScoreEventDoc = HydratedDocument<ScoreEventAttrs>;

const ScoreEventSchema = new Schema<ScoreEventAttrs>({
  activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  participantId: { type: Schema.Types.ObjectId, ref: 'Participant', default: null },
  questionIndex: { type: Number, default: null },
  kind: {
    type: String,
    enum: ['correct', 'incorrect', 'pass', 'auto-correct', 'auto-incorrect', 'manual'],
    required: true,
  },
  delta: { type: Number, required: true },
  reason: { type: String, default: '' },
  reactionMs: { type: Number, default: null },
  at: { type: Date, default: Date.now },
});

export const ScoreEvent: Model<ScoreEventAttrs> =
  (mongoose.models.ScoreEvent as Model<ScoreEventAttrs>) ||
  mongoose.model<ScoreEventAttrs>('ScoreEvent', ScoreEventSchema);
