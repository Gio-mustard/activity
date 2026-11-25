/**
 * CONTRATO DE EVENTOS WebSocket.
 *
 * Es el unico archivo que conocen a la vez el servidor de sockets y el
 * navegador. Si un evento no esta aqui, no existe: TypeScript lo rechaza en
 * ambos lados.
 */
import type { LiveStateView, Role, Verdict } from '@/lib/types';
import type { TickPayload } from '@/controllers/liveController';

export interface JoinPayload {
  code: string;
  role: Role;
  /** Obligatorio para role 'admin'. */
  adminCode?: string;
  /** Obligatorio para role 'player'. */
  participantId?: string;
}

export type AdminCommand =
  | { type: 'activity:start' }
  | { type: 'activity:finish' }
  | { type: 'question:go'; index: number }
  | { type: 'question:start' }
  | { type: 'question:next' }
  | { type: 'question:prev' }
  | { type: 'question:reveal' }
  | { type: 'timer:pause' }
  | { type: 'timer:resume' }
  | { type: 'timer:add'; seconds: number }
  | { type: 'buzzers:reset' }
  | { type: 'verdict'; verdict: Verdict }
  | { type: 'podium:toggle'; visible: boolean }
  | { type: 'score:adjust'; teamId: string; delta: number }
  | { type: 'participant:kick'; participantId: string }
  | { type: 'participant:move'; participantId: string; teamId: string }
  | { type: 'roster:refresh' };

export type Ack<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export interface ToastPayload {
  kind: 'info' | 'success' | 'error';
  message: string;
}

/** Servidor -> navegador. */
export interface ServerToClientEvents {
  state: (state: LiveStateView) => void;
  tick: (payload: TickPayload) => void;
  toast: (payload: ToastPayload) => void;
  /** El docente te saco de la sala. */
  /** `finished` cuando se cerro la sesion; `kicked` cuando fue solo a ese alumno. */
  kicked: (reason?: 'kicked' | 'finished') => void;
}

/** Navegador -> servidor. */
export interface ClientToServerEvents {
  join: (payload: JoinPayload, ack: (response: Ack<LiveStateView>) => void) => void;
  /**
   * Latido para medir si el servidor sigue ahi y con cuanta latencia.
   * No necesita haber entrado a ninguna sala: lo usa el pie de pagina.
   * Se llama `heartbeat` y no `ping` porque socket.io reserva ese nombre.
   */
  heartbeat: (ack: () => void) => void;
  buzz: (ack: (response: Ack) => void) => void;
  answer: (payload: { optionKey: string }, ack: (response: Ack) => void) => void;
  command: (payload: AdminCommand, ack: (response: Ack) => void) => void;
}

/** Nombres de las salas internas de socket.io. */
export const ROOMS = {
  all: (code: string) => `room:${code}`,
  admin: (code: string) => `admin:${code}`,
  screen: (code: string) => `screen:${code}`,
  team: (code: string, teamId: string) => `team:${code}:${teamId}`,
};
