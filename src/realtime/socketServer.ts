/**
 * ADAPTADOR WebSocket.
 *
 * Traduce eventos de socket.io a llamadas del controlador y difunde el estado
 * resultante. No toma decisiones de negocio: si aqui hay un `if` sobre puntajes
 * o turnos, esta en el lugar equivocado.
 *
 * Cada audiencia recibe su propia version del estado:
 *   admin  -> con respuesta correcta y codigos de equipo
 *   screen -> publico, sin respuestas hasta revelar
 *   team   -> publico + lo que respondio su propio equipo
 */
import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import {
  adjustTeamScore,
  buildState,
  buzz,
  finishActivityLive,
  getRoom,
  goToQuestion,
  nextQuestion,
  pauseTimer,
  peekRoom,
  prevQuestion,
  refreshRoster,
  resetBuzzers,
  resumeTimer,
  revealQuestion,
  setLiveHooks,
  startActivity,
  startQuestion,
  submitAnswer,
  togglePodium,
  verdict,
  addTime,
  type Room,
} from '@/controllers/liveController';
import { ControllerError, findByJoinCode } from '@/controllers/activityController';
import { kickParticipant, moveParticipant, setConnected } from '@/controllers/participantController';
import { normalizeCode } from '@/lib/codes';
import { ROOMS, type AdminCommand, type ClientToServerEvents, type ServerToClientEvents } from './events';

interface SocketData {
  code: string;
  role: 'admin' | 'screen' | 'player';
  participantId: string | null;
  teamId: string | null;
}

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

let io: AppServer | null = null;

/**
 * Socket vivo de cada participante.
 *
 * iOS congela la pagina al pasar a segundo plano y el servidor no se entera
 * hasta que vence el ping, varios segundos despues. Para entonces el alumno ya
 * volvio y abrio un socket nuevo, asi que la desconexion del viejo llegaba
 * tarde y lo marcaba ausente estando presente. Con esto, una desconexion solo
 * cuenta si viene del socket que de verdad esta en uso.
 */
const activeSockets = new Map<string, string>();

function message(error: unknown): string {
  if (error instanceof ControllerError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrio un error inesperado.';
}

/** Difunde el estado a cada audiencia de la sala. */
function broadcastState(code: string) {
  const room = peekRoom(code);
  if (!room || !io) return;

  io.to(ROOMS.admin(code)).emit('state', buildState(room, { role: 'admin' }));
  io.to(ROOMS.screen(code)).emit('state', buildState(room, { role: 'screen' }));
  for (const team of room.teams) {
    const teamId = String(team._id);
    io.to(ROOMS.team(code, teamId)).emit('state', buildState(room, { role: 'player', teamId }));
  }
}

function broadcastTick(code: string, payload: Parameters<ServerToClientEvents['tick']>[0]) {
  io?.to(ROOMS.all(code)).emit('tick', payload);
}

/** Arranca el servidor de WebSockets sobre el mismo puerto HTTP de Next. */
export function attachRealtime(httpServer: HttpServer): AppServer {
  if (io) return io;

  io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    path: '/api/realtime',
    serveClient: false,
    cors: { origin: true, credentials: true },
    pingInterval: 10000,
    pingTimeout: 8000,
  });

  setLiveHooks({ onState: broadcastState, onTick: broadcastTick });

  io.on('connection', (socket: AppSocket) => {
    socket.on('join', async (payload, ack) => {
      try {
        const code = normalizeCode(payload.code ?? '');
        const room = await getRoom(code);

        if (payload.role === 'admin') {
          const activity = await findByJoinCode(code);
          if (!activity || activity.adminCode !== payload.adminCode?.trim().toUpperCase()) {
            ack({ ok: false, error: 'Codigo de administrador incorrecto.' });
            return;
          }
          socket.data = { code, role: 'admin', participantId: null, teamId: null };
          await socket.join([ROOMS.all(code), ROOMS.admin(code)]);
          ack({ ok: true, data: buildState(room, { role: 'admin' }) });
          return;
        }

        if (payload.role === 'player') {
          const participantId = payload.participantId ?? '';
          await refreshRoster(room);
          const participant = room.participants.find((p) => String(p._id) === participantId);
          if (!participant) {
            ack({ ok: false, error: 'Tu registro ya no esta en esta sala. Vuelve a entrar.' });
            return;
          }
          const teamId = String(participant.teamId);
          socket.data = { code, role: 'player', participantId, teamId };
          activeSockets.set(participantId, socket.id);
          await socket.join([ROOMS.all(code), ROOMS.team(code, teamId)]);
          await setConnected(participantId, true);
          await refreshRoster(room);
          const estado = buildState(room, { role: 'player', teamId });
          ack({ ok: true, data: estado });
          // Ademas del ack, se empuja el estado por el canal normal. Si el ack
          // se pierde (red movil, cambio de transporte), el cliente igual
          // recibe su estado inicial y no se queda en "Conectando...".
          socket.emit('state', estado);
          broadcastState(code);
          return;
        }

        socket.data = { code, role: 'screen', participantId: null, teamId: null };
        await socket.join([ROOMS.all(code), ROOMS.screen(code)]);
        ack({ ok: true, data: buildState(room, { role: 'screen' }) });
      } catch (error) {
        ack({ ok: false, error: message(error) });
      }
    });

    // Responde antes de tocar nada: mide el camino de ida y vuelta, no Mongo.
    socket.on('heartbeat', (ack) => ack());

    socket.on('buzz', async (ack) => {
      try {
        const { code, participantId } = socket.data ?? {};
        if (!code || !participantId) throw new ControllerError('No estas identificado en la sala.', 401);
        const room = await getRoom(code);
        await buzz(room, participantId);
        ack({ ok: true });
      } catch (error) {
        ack({ ok: false, error: message(error) });
      }
    });

    socket.on('answer', async (payload, ack) => {
      try {
        const { code, participantId } = socket.data ?? {};
        if (!code || !participantId) throw new ControllerError('No estas identificado en la sala.', 401);
        const room = await getRoom(code);
        await submitAnswer(room, participantId, payload.optionKey);
        ack({ ok: true });
      } catch (error) {
        ack({ ok: false, error: message(error) });
      }
    });

    socket.on('command', async (payload, ack) => {
      try {
        const { code, role } = socket.data ?? {};
        if (!code || role !== 'admin') throw new ControllerError('Solo el administrador puede hacer esto.', 403);
        const room = await getRoom(code);
        await runAdminCommand(room, payload);
        ack({ ok: true });
      } catch (error) {
        ack({ ok: false, error: message(error) });
      }
    });

    socket.on('disconnect', async () => {
      const { code, participantId } = socket.data ?? {};
      if (!code || !participantId) return;
      // Si el participante ya tiene otro socket, esta desconexion es de una
      // sesion vieja y no debe marcarlo ausente.
      if (activeSockets.get(participantId) !== socket.id) return;
      activeSockets.delete(participantId);
      try {
        await setConnected(participantId, false);
        const room = peekRoom(code);
        if (room) {
          await refreshRoster(room);
          broadcastState(code);
        }
      } catch {
        // Una desconexion no debe tumbar el servidor.
      }
    });
  });

  return io;
}

async function runAdminCommand(room: Room, command: AdminCommand) {
  switch (command.type) {
    case 'activity:start':
      return startActivity(room);
    case 'activity:finish':
      return finishActivityLive(room);
    case 'question:go':
      return goToQuestion(room, command.index);
    case 'question:start':
      return startQuestion(room);
    case 'question:next':
      return nextQuestion(room);
    case 'question:prev':
      return prevQuestion(room);
    case 'question:reveal':
      return revealQuestion(room);
    case 'timer:pause':
      return pauseTimer(room);
    case 'timer:resume':
      return resumeTimer(room);
    case 'timer:add':
      return addTime(room, command.seconds);
    case 'buzzers:reset':
      return resetBuzzers(room);
    case 'verdict':
      return verdict(room, command.verdict);
    case 'podium:toggle':
      return togglePodium(room, command.visible);
    case 'score:adjust':
      return adjustTeamScore(room, command.teamId, command.delta);
    case 'participant:kick': {
      await kickParticipant(room.activity, command.participantId);
      io?.to(ROOMS.all(room.code)).emit('toast', { kind: 'info', message: 'Un participante salio de la sala.' });
      await refreshRoster(room);
      return broadcastState(room.code);
    }
    case 'participant:move': {
      await moveParticipant(room.activity, command.participantId, command.teamId);
      await refreshRoster(room);
      return broadcastState(room.code);
    }
    case 'roster:refresh': {
      await refreshRoster(room);
      return broadcastState(room.code);
    }
  }
}

export function getIo(): AppServer | null {
  return io;
}
