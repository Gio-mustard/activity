/**
 * CONTROLADOR DE PUNTAJE.
 *
 * Todo movimiento de puntos pasa por aqui y deja un ScoreEvent. El `$inc` es
 * atomico porque dos equipos pueden acertar con milisegundos de diferencia.
 */
import { Team } from '@/models/Team';
import { ScoreEvent, type ScoreEventDoc } from '@/models/ScoreEvent';
import { Participant } from '@/models/Participant';
import { rankTeams } from './rules';
import type { PodiumEntry, ScoreEventView } from '@/lib/types';
import { toTeamView } from './presenters';

export interface ApplyDeltaInput {
  activityId: string;
  teamId: string;
  participantId?: string | null;
  questionIndex?: number | null;
  kind: ScoreEventDoc['kind'];
  delta: number;
  reason?: string;
  reactionMs?: number | null;
  /** Ajustes del contador de aciertos/fallos y la racha. */
  streak?: number;
  countCorrect?: boolean;
  countIncorrect?: boolean;
}

/** Aplica el delta al equipo y lo registra en la bitacora. */
export async function applyDelta(input: ApplyDeltaInput): Promise<number> {
  const inc: Record<string, number> = { score: input.delta };
  if (input.countCorrect) inc.correctCount = 1;
  if (input.countIncorrect) inc.incorrectCount = 1;

  const set: Record<string, number> = {};
  if (input.streak !== undefined) set.streak = input.streak;

  const team = await Team.findByIdAndUpdate(
    input.teamId,
    { $inc: inc, ...(Object.keys(set).length ? { $set: set } : {}) },
    { new: true },
  );

  // El mejor tiempo de reaccion se guarda solo si mejora al anterior.
  if (team && input.reactionMs != null && (team.bestReactionMs == null || input.reactionMs < team.bestReactionMs)) {
    team.bestReactionMs = input.reactionMs;
    await team.save();
  }

  await ScoreEvent.create({
    activityId: input.activityId,
    teamId: input.teamId,
    participantId: input.participantId ?? null,
    questionIndex: input.questionIndex ?? null,
    kind: input.kind,
    delta: input.delta,
    reason: input.reason ?? '',
    reactionMs: input.reactionMs ?? null,
  });

  return team?.score ?? 0;
}

/** Ajuste manual del docente ("me equivoque al calificar"). */
export async function adjustScore(
  activityId: string,
  teamId: string,
  delta: number,
  reason = 'Ajuste manual del docente',
): Promise<number> {
  return applyDelta({ activityId, teamId, delta, kind: 'manual', reason });
}

export async function listScoreEvents(activityId: string, limit = 60): Promise<ScoreEventView[]> {
  const [events, teams] = await Promise.all([
    ScoreEvent.find({ activityId }).sort({ at: -1 }).limit(limit).lean(),
    Team.find({ activityId }).lean(),
  ]);
  const names = new Map(teams.map((t) => [String(t._id), t.name]));
  return events.map((event) => ({
    id: String(event._id),
    teamId: String(event.teamId),
    teamName: names.get(String(event.teamId)) ?? 'Equipo',
    questionIndex: event.questionIndex ?? null,
    delta: event.delta,
    reason: event.reason ?? '',
    at: new Date(event.at).getTime(),
  }));
}

/** Podio final, con desempates resueltos por rules.rankTeams. */
export async function buildPodium(activityId: string): Promise<PodiumEntry[]> {
  const [teams, participants] = await Promise.all([
    Team.find({ activityId }).sort({ order: 1 }),
    Participant.find({ activityId }),
  ]);

  const membersByTeam = new Map<string, typeof participants>();
  for (const participant of participants) {
    const key = String(participant.teamId);
    const bucket = membersByTeam.get(key) ?? [];
    bucket.push(participant);
    membersByTeam.set(key, bucket);
  }

  const rankable = teams.map((team) => ({
    id: String(team._id),
    score: team.score,
    correctCount: team.correctCount,
    bestReactionMs: team.bestReactionMs,
    doc: team,
  }));

  return rankTeams(rankable).map(({ place, team }) => ({
    place,
    team: toTeamView(team.doc, membersByTeam.get(team.id) ?? []),
    correct: team.doc.correctCount,
    incorrect: team.doc.incorrectCount,
    bestReactionMs: team.doc.bestReactionMs,
  }));
}
