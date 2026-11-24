/**
 * REGLAS DE NEGOCIO PURAS.
 *
 * Sin mongoose, sin socket.io, sin React: solo entradas y salidas. Todo lo que
 * decide "cuantos puntos" o "quien va primero" vive aqui para poder probarse
 * con `npm test` y para que la consola del docente y el pulsador del alumno
 * nunca discrepen.
 */
import type { PublicQuestion, QuestionType, Verdict } from '@/lib/types';

export interface ScorableQuestion {
  points: number;
  penalty: number;
  lockTeamAfterWrong: boolean;
}

/** Puntos que gana o pierde un equipo segun el veredicto del docente. */
export function deltaForVerdict(verdict: Verdict, question: ScorableQuestion): number {
  switch (verdict) {
    case 'correct':
      return question.points;
    case 'incorrect':
      // `|| 0` evita el -0 de JavaScript, que la interfaz pintaria como "-0".
      return -question.penalty || 0;
    case 'pass':
      return 0;
  }
}

/** Un equipo queda bloqueado para la pregunta solo si fallo y la regla esta activa. */
export function shouldLockTeam(verdict: Verdict, question: ScorableQuestion): boolean {
  return verdict === 'incorrect' && question.lockTeamAfterWrong;
}

/** La racha se corta al fallar y no se mueve al ceder el turno. */
export function nextStreak(current: number, verdict: Verdict): number {
  if (verdict === 'correct') return current + 1;
  if (verdict === 'incorrect') return 0;
  return current;
}

export interface QueueCandidate {
  teamId: string;
  participantId: string;
  /** Marca de tiempo del SERVIDOR al recibir la pulsacion. */
  at: number;
}

/**
 * Ordena la cola de rebote. Siempre por reloj del servidor: los relojes de los
 * celulares no estan sincronizados y no sirven para desempatar milisegundos.
 * Un equipo solo puede ocupar un lugar: gana el primero de sus integrantes.
 */
export function buildQueue(candidates: QueueCandidate[]): QueueCandidate[] {
  const seen = new Set<string>();
  return [...candidates]
    .sort((a, b) => a.at - b.at)
    .filter((candidate) => {
      if (seen.has(candidate.teamId)) return false;
      seen.add(candidate.teamId);
      return true;
    });
}

/** Un equipo puede pulsar si no fallo antes y no esta ya formado en la cola. */
export function canTeamBuzz(teamId: string, lockedTeamIds: Iterable<string>, queue: QueueCandidate[]): boolean {
  for (const locked of lockedTeamIds) if (locked === teamId) return false;
  return !queue.some((entry) => entry.teamId === teamId);
}

/** Las preguntas cerradas se contestan en el telefono; las abiertas, con el pulsador. */
export function usesBuzzer(type: QuestionType): boolean {
  return type === 'open';
}

export const BOOLEAN_OPTIONS = [
  { key: 'V', text: 'Verdadero' },
  { key: 'F', text: 'Falso' },
];

/** Normaliza las opciones visibles de una pregunta segun su tipo. */
export function optionsForQuestion(type: QuestionType, options: { key: string; text: string }[]) {
  if (type === 'boolean') return BOOLEAN_OPTIONS;
  if (type === 'multiple') return options;
  return [];
}

/** Califica una respuesta cerrada. */
export function gradeClosedAnswer(
  answerKey: string | null,
  correctOptionKey: string | null,
  question: ScorableQuestion,
): { correct: boolean; delta: number } {
  if (!answerKey) return { correct: false, delta: 0 };
  const correct = Boolean(correctOptionKey) && answerKey === correctOptionKey;
  return { correct, delta: correct ? question.points : -question.penalty || 0 };
}

export interface RankableTeam {
  id: string;
  score: number;
  correctCount: number;
  bestReactionMs: number | null;
}

/**
 * Ordena el podio. Desempates, en orden: mas puntos, mas aciertos,
 * mejor tiempo de reaccion. Los empates reales comparten lugar.
 */
export function rankTeams<T extends RankableTeam>(teams: T[]): { place: number; team: T }[] {
  const sorted = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    const aMs = a.bestReactionMs ?? Number.POSITIVE_INFINITY;
    const bMs = b.bestReactionMs ?? Number.POSITIVE_INFINITY;
    return aMs - bMs;
  });

  const out: { place: number; team: T }[] = [];
  sorted.forEach((team, index) => {
    const previous = out[index - 1];
    const tiedWithPrevious =
      previous &&
      previous.team.score === team.score &&
      previous.team.correctCount === team.correctCount &&
      (previous.team.bestReactionMs ?? Infinity) === (team.bestReactionMs ?? Infinity);
    out.push({ place: tiedWithPrevious ? previous.place : index + 1, team });
  });
  return out;
}

/** Texto corto del lugar, como en el marcador de los mockups. */
export function placeLabel(place: number): string {
  return `${place}º`;
}

/** mm:ss para cronometros largos, s.d para reacciones. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : String(s);
}

export function formatReaction(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return '--';
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Valida una pregunta antes de guardarla; devuelve los errores legibles. */
export function validateQuestion(input: Partial<PublicQuestion> & { correctOptionKey?: string | null }): string[] {
  const errors: string[] = [];
  if (!input.prompt || input.prompt.trim().length < 5) {
    errors.push('La pregunta necesita al menos 5 caracteres.');
  }
  if (input.type === 'multiple') {
    const options = input.options ?? [];
    if (options.length < 2) errors.push('Una pregunta de opcion multiple necesita al menos 2 opciones.');
    if (options.some((o) => !o.text.trim())) errors.push('Hay opciones vacias.');
    if (!input.correctOptionKey) errors.push('Marca cual es la opcion correcta.');
    else if (!options.some((o) => o.key === input.correctOptionKey)) {
      errors.push('La opcion correcta no existe entre las opciones.');
    }
  }
  if (input.type === 'boolean' && !['V', 'F'].includes(String(input.correctOptionKey))) {
    errors.push('Indica si la afirmacion es verdadera o falsa.');
  }
  if (input.seconds !== undefined && (input.seconds < 5 || input.seconds > 600)) {
    errors.push('El tiempo debe estar entre 5 y 600 segundos.');
  }
  if (input.points !== undefined && input.points < 0) errors.push('Los puntos no pueden ser negativos.');
  return errors;
}
