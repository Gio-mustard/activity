'use client';

/**
 * Estado real de la conexion con el servidor en tiempo real.
 *
 * Mide lo que de verdad importa para esta app: si el WebSocket esta vivo, no
 * si hay internet ni si el HTTP responde. Una pagina puede cargar perfecto y
 * tener la sincronizacion caida, que es justo el caso que hay que delatar.
 *
 * Si la pantalla ya tiene una sala abierta (`useLiveRoom`), se le pasa su
 * estado y este hook NO abre un segundo socket.
 */
import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from './events';
import type { ConnectionStatus } from './useLiveRoom';

export type { ConnectionStatus };

export interface ServerStatus {
  status: ConnectionStatus;
  /** Ida y vuelta en milisegundos; null si el ultimo latido no volvio. */
  latency: number | null;
}

/** Cada cuanto se vuelve a medir mientras la pagina esta visible. */
const HEARTBEAT_MS = 12_000;
const HEARTBEAT_TIMEOUT_MS = 5_000;

export function useServerStatus(external?: ServerStatus): ServerStatus {
  const [own, setOwn] = useState<ServerStatus>({ status: 'connecting', latency: null });
  const reuseExisting = external !== undefined;

  useEffect(() => {
    if (reuseExisting) return;

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      path: '/api/realtime',
      transports: ['websocket', 'polling'],
      reconnectionDelay: 600,
      reconnectionDelayMax: 5000,
    });

    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const measure = () => {
      if (!socket.connected) return;
      const sentAt = Date.now();
      let settled = false;

      // Si el latido no vuelve, el socket puede seguir "conectado" en el
      // cliente mientras el servidor ya no esta: se reporta sin latencia.
      const timeout = setTimeout(() => {
        if (settled || cancelled) return;
        settled = true;
        setOwn((prev) => ({ ...prev, latency: null }));
      }, HEARTBEAT_TIMEOUT_MS);

      socket.emit('heartbeat', () => {
        if (settled || cancelled) return;
        settled = true;
        clearTimeout(timeout);
        setOwn({ status: 'online', latency: Date.now() - sentAt });
      });
    };

    socket.on('connect', () => {
      if (cancelled) return;
      setOwn({ status: 'online', latency: null });
      measure();
      timer = setInterval(measure, HEARTBEAT_MS);
    });

    const drop = () => {
      if (cancelled) return;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      setOwn({ status: 'offline', latency: null });
    };

    socket.on('disconnect', drop);
    socket.on('connect_error', drop);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [reuseExisting]);

  return external ?? own;
}

/** Texto y color del indicador, en un solo lugar para que no se contradigan. */
export function describeStatus(status: ConnectionStatus): { label: string; tone: 'ok' | 'wait' | 'bad' } {
  switch (status) {
    case 'online':
      return { label: 'Sincronizacion en vivo activa', tone: 'ok' };
    case 'connecting':
      return { label: 'Conectando con el servidor', tone: 'wait' };
    case 'rejected':
      return { label: 'Sin acceso a la sala', tone: 'bad' };
    case 'offline':
    default:
      return { label: 'Sin conexion con el servidor', tone: 'bad' };
  }
}
