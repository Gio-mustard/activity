/** Punto unico de entrada a la capa de modelos. */
export { connectDB, hasDatabaseConfig, dbState, MissingDatabaseConfig } from './db';
export {
  Activity,
  newQuestion,
  type ActivityAttrs,
  type ActivityDoc,
  type QuestionAttrs,
  type QuestionDoc,
} from './Activity';
export { Team, type TeamAttrs, type TeamDoc } from './Team';
export { Participant, type ParticipantAttrs, type ParticipantDoc } from './Participant';
export { ScoreEvent, type ScoreEventAttrs, type ScoreEventDoc, type ScoreEventKind } from './ScoreEvent';
