/**
 * PRESENTADORES: documentos de Mongo -> tipos de vista.
 *
 * Es la aduana entre Model y View. La vista jamas recibe un documento de
 * mongoose, y la respuesta correcta solo cruza esta frontera cuando quien
 * pregunta es el administrador o cuando la pregunta ya fue revelada.
 */
import type { QuestionDoc } from '@/models/Activity';
import type { ParticipantDoc } from '@/models/Participant';
import type { TeamDoc } from '@/models/Team';
import type { AdminQuestion, Difficulty, PublicQuestion, QuestionType, TeamMemberView, TeamView } from '@/lib/types';
import { optionsForQuestion } from './rules';

export function toPublicQuestion(question: QuestionDoc, index: number): PublicQuestion {
  const type = question.type as QuestionType;
  return {
    id: String(question._id),
    index,
    type,
    prompt: question.prompt,
    context: question.context || undefined,
    topic: question.topic || undefined,
    difficulty: question.difficulty as Difficulty,
    options: optionsForQuestion(type, (question.options ?? []).map((o) => ({ key: o.key, text: o.text }))),
    seconds: question.seconds,
    points: question.points,
    penalty: question.penalty,
    reboundSeconds: question.reboundSeconds,
    lockTeamAfterWrong: question.lockTeamAfterWrong,
  };
}

export function toAdminQuestion(question: QuestionDoc, index: number): AdminQuestion {
  return {
    ...toPublicQuestion(question, index),
    suggestedAnswer: question.suggestedAnswer ?? '',
    correctOptionKey: question.correctOptionKey ?? null,
    evaluationCriteria: question.evaluationCriteria ?? '',
    keywords: question.keywords ?? [],
  };
}

export function toMemberView(participant: ParticipantDoc): TeamMemberView {
  return {
    id: String(participant._id),
    name: participant.name,
    tag: participant.tag ?? null,
    iconKey: participant.iconKey,
    connected: participant.connected,
  };
}

export interface TeamViewExtras {
  locked?: boolean;
  hasAnswered?: boolean;
  answerKey?: string | null;
  answerMs?: number | null;
  lastDelta?: number | null;
  /** El codigo de equipo solo se expone al admin y en la pantalla de ingreso. */
  includeJoinCode?: boolean;
}

export function toTeamView(team: TeamDoc, members: ParticipantDoc[], extras: TeamViewExtras = {}): TeamView {
  return {
    id: String(team._id),
    name: team.name,
    description: team.description ?? '',
    iconKey: team.iconKey,
    colorKey: team.colorKey,
    joinCode: extras.includeJoinCode === false ? '' : team.joinCode,
    capacity: team.capacity,
    score: team.score,
    members: members.map(toMemberView),
    locked: extras.locked ?? false,
    hasAnswered: extras.hasAnswered ?? false,
    answerKey: extras.answerKey ?? null,
    answerMs: extras.answerMs ?? null,
    streak: team.streak,
    lastDelta: extras.lastDelta ?? null,
  };
}
