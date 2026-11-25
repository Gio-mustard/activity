'use client';

/**
 * CLIENTE WebSocket para React.
 *
 * Se conecta, mantiene el ultimo estado recibido e interpola el cronometro
 * entre ticks para que el conteo se vea fluido sin inundar la red: el servidor
 * manda la verdad 5 veces por segundo y el navegador rellena los huecos.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { LiveStateView, Role } from '@/lib/types';
import type { TickPayload } from '@/controllers/liveController';
import type { Ack, AdminCommand, ClientToServerEvents, ServerToClientEvents, ToastPayload } from './events';

export type ConnectionStatus = 'connecting' | 'online' | 'offline' | 'rejected';

export interface LiveClock {
  /** Milisegundos del cronometro principal, ya interpolados. */
  mainMs: number;
  mainTotalMs: number;
  /** Cronometro de respuesta verbal del equipo con la palabra. */
  floorMs: number;
  floorTotalMs: number;
  running: boolean;
}

export interface UseLiveRoomParams {
  code: string;
  role: Role;
  adminCode?: string;
  participantId?: string;
  /** Si es false no se conecta (util mientras se carga la identidad). */
  enabled?: boolean;
}

export function useLiveRoom({ code, role, adminCode, participantId, enabled = true }: UseLiveRoomParams) {
  const [state, setState] = useState<LiveStateView | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const tickRef = useRef<{ payload: TickPayload; at: number } | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!enabled || !code) return;
    if (role === 'player' && !participantId) return;
    if (role === 'admin' && !adminCode) return;

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      path: '/api/realtime',
      transports: ['websocket', 'polling'],
      reconnectionDelay: 400,
      reconnectionDelayMax: 2500,
    });
    socketRef.current = socket;

    // Se marca en cuanto llega el primer estado, por el ack o por el canal.
    let recibioEstado = false;

    const sendJoin = () => {
      const startedAt = Date.now();
      socket.emit('join', { code, role, adminCode, participantId }, (response: Ack<LiveStateView>) => {
        setLatency(Date.now() - startedAt);
        if (response.ok) {
          setStatus('online');
          setError(null);
          if (response.data) {
            recibioEstado = true;
            setState(response.data);
            tickRef.current = {
              payload: {
                phase: response.data.phase,
                remainingMs: response.data.timer.remainingMs,
                totalMs: response.data.timer.totalMs,
                floorRemainingMs: response.data.floor?.remainingMs ?? 0,
                floorTotalMs: response.data.floor?.totalMs ?? 0,
                serverTime: response.data.serverTime,
              },
              at: Date.now(),
            };
          }
        } else {
          setStatus('rejected');
          setError(response.error);
        }
      });
    };

    socket.on('connect', sendJoin);
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus('offline'));

    /*
     * El `join` mide de paso la latencia, pero incluye la lectura a Mongo y
     * ademas se queda congelada para siempre. Este latido la refresca con el
     * costo real de la red, que es lo que el docente ve en su consola.
     */
    /*
     * Reintento del alta.
     *
     * El estado inicial llegaba solo en el ack del `join`. En una red movil
     * ese ack se puede perder sin que el socket se caiga, y entonces la
     * pantalla se quedaba en "Conectando..." para siempre: el alumno no veia
     * nada hasta que el docente hacia algo que disparaba una difusion.
     * Mientras no haya estado, se vuelve a pedir.
     */
    const reintento = setInterval(() => {
      if (socket.connected && !recibioEstado) sendJoin();
    }, 3000);

    /*
     * Al volver de segundo plano. iOS congela la pagina y el socket queda
     * medio muerto: se pide el estado otra vez para no seguir mostrando algo
     * viejo (por ejemplo una pregunta que ya paso).
     */
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return;
      if (socket.connected) sendJoin();
      else socket.connect();
    };
    document.addEventListener('visibilitychange', alVolver);

    const beat = setInterval(() => {
      if (!socket.connected) return;
      const sentAt = Date.now();
      socket.emit('heartbeat', () => setLatency(Date.now() - sentAt));
    }, 10_000);

    socket.on('state', (next) => {
      recibioEstado = true;
      setState(next);
      tickRef.current = {
        payload: {
          phase: next.phase,
          remainingMs: next.timer.remainingMs,
          totalMs: next.timer.totalMs,
          floorRemainingMs: next.floor?.remainingMs ?? 0,
          floorTotalMs: next.floor?.totalMs ?? 0,
          serverTime: next.serverTime,
        },
        at: Date.now(),
      };
    });

    socket.on('tick', (payload) => {
      tickRef.current = { payload, at: Date.now() };
    });

    socket.on('toast', (payload) => setToast(payload));
    socket.on('kicked', (reason) => {
      setStatus('rejected');
      // Terminar la clase no es lo mismo que echar a alguien: no suena igual.
      setError(
        reason === 'finished'
          ? 'El docente termino la sesion. Gracias por participar.'
          : 'El docente te saco de la sala.',
      );
    });

    return () => {
      clearInterval(beat);
      clearInterval(reintento);
      document.removeEventListener('visibilitychange', alVolver);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, role, adminCode, participantId, enabled]);

  // Repintado a 10 fps para interpolar el cronometro localmente.
  useEffect(() => {
    const interval = setInterval(() => forceRender((n) => (n + 1) % 1000), 100);
    return () => clearInterval(interval);
  }, []);

  const clock: LiveClock = useMemo(() => {
    const tick = tickRef.current;
    if (!tick) {
      return { mainMs: 0, mainTotalMs: 0, floorMs: 0, floorTotalMs: 0, running: false };
    }
    const elapsed = Date.now() - tick.at;
    const running = tick.payload.phase === 'running';
    const onFloor = tick.payload.phase === 'floor';
    return {
      mainMs: Math.max(0, tick.payload.remainingMs - (running ? elapsed : 0)),
      mainTotalMs: tick.payload.totalMs,
      floorMs: Math.max(0, tick.payload.floorRemainingMs - (onFloor ? elapsed : 0)),
      floorTotalMs: tick.payload.floorTotalMs,
      running,
    };
    // Se recalcula en cada repintado del intervalo de arriba.
  }, [state, tickRef.current?.at, tickRef.current?.payload.phase]);

  const emitWithAck = useCallback(
    <T extends keyof ClientToServerEvents>(event: T, ...args: unknown[]): Promise<Ack> =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket) {
          resolve({ ok: false, error: 'Sin conexion con la sala.' });
          return;
        }
        const timeout = setTimeout(() => resolve({ ok: false, error: 'El servidor no respondio.' }), 5000);
        const callback = (response: Ack) => {
          clearTimeout(timeout);
          resolve(response);
        };
        (socket.emit as (name: string, ...rest: unknown[]) => void)(event as string, ...args, callback);
      }),
    [],
  );

  const buzz = useCallback(() => emitWithAck('buzz'), [emitWithAck]);
  const answer = useCallback((optionKey: string) => emitWithAck('answer', { optionKey }), [emitWithAck]);
  const command = useCallback((payload: AdminCommand) => emitWithAck('command', payload), [emitWithAck]);

  return { state, status, error, toast, clearToast: () => setToast(null), latency, clock, buzz, answer, command };
}
