/**
 * MODELO: Participant.
 *
 * El navegador guarda el `_id` en localStorage: si se cae el wifi o recargan
 * la pagina, vuelven a su mismo asiento y su equipo nunca se queda sin pulsador.
 * `connected` lo administra la capa realtime (connect/disconnect del socket).
 */
import mongoose, { Schema, Types, type HydratedDocument, type Model } from 'mongoose';

export interface ParticipantAttrs {
  activityId: Types.ObjectId;
  teamId: Types.ObjectId;
  name: string;
  /** Etiqueta opcional: Frontend, QA, DevOps... */
  tag: string | null;
  iconKey: string;
  connected: boolean;
  lastSeenAt: Date;
  buzzCount: number;
}

export type ParticipantDoc = HydratedDocument<ParticipantAttrs>;

const ParticipantSchema = new Schema<ParticipantAttrs>(
  {
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    tag: { type: String, default: null, trim: true, maxlength: 24 },
    iconKey: { type: String, default: 'terminal' },
    connected: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
    buzzCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ParticipantSchema.index({ activityId: 1, teamId: 1 });

export const Participant: Model<ParticipantAttrs> =
  (mongoose.models.Participant as Model<ParticipantAttrs>) ||
  mongoose.model<ParticipantAttrs>('Participant', ParticipantSchema);
