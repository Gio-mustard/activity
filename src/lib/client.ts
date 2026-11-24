'use client';

/**
 * Utilidades del navegador: llamadas a la API e identidad persistida.
 *
 * La identidad del participante vive en localStorage para que al recargar o
 * al caerse el wifi vuelva a su mismo asiento sin volver a registrarse.
 */
import type { ParticipantIdentity } from './types';

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    const payload = (await response.json()) as ApiResult<T>;
    if (!response.ok) return { ok: false, error: payload.error ?? `Error ${response.status}` };
    return payload;
  } catch {
    return { ok: false, error: 'No se pudo contactar al servidor. Revisa tu conexion.' };
  }
}

/** Cabecera de autenticacion del docente. */
export function adminHeaders(adminCode: string): HeadersInit {
  return { 'x-admin-code': adminCode };
}

/* ---------------- Identidad del participante ---------------- */

const identityKey = (code: string) => `amai:identity:${code.toUpperCase()}`;
const adminKey = (code: string) => `amai:admin:${code.toUpperCase()}`;

/*
 * Respaldo en memoria.
 *
 * Safari en navegacion privada (y cualquier navegador con el almacenamiento
 * bloqueado) deja que `setItem` lance. Antes eso se tragaba en silencio y el
 * alumno quedaba atrapado: el servidor ya lo habia registrado, pero la
 * pantalla del pulsador no encontraba su identidad y lo devolvia al
 * formulario; al reintentar, el servidor le respondia que su propio nombre ya
 * estaba ocupado por el asiento fantasma que acababa de crear.
 *
 * El respaldo vive lo que vive la pestaña, que es justo lo que dura la clase.
 */
const memoria = new Map<string, string>();
let persistente = true;

/** False si el navegador no logra guardar: al recargar se pierde el lugar. */
export function identityIsPersistent(): boolean {
  return persistente;
}

function escribir(key: string, value: string) {
  memoria.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    persistente = false;
  }
}

function leer(key: string): string | null {
  const enMemoria = memoria.get(key);
  if (enMemoria !== undefined) return enMemoria;
  try {
    return localStorage.getItem(key);
  } catch {
    persistente = false;
    return null;
  }
}

function borrar(key: string) {
  memoria.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function saveIdentity(identity: ParticipantIdentity) {
  escribir(identityKey(identity.activityCode), JSON.stringify(identity));
}

export function loadIdentity(code: string): ParticipantIdentity | null {
  const raw = leer(identityKey(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParticipantIdentity;
  } catch {
    return null;
  }
}

export function clearIdentity(code: string) {
  borrar(identityKey(code));
}

/* ---------------- Codigo de administrador ---------------- */

export function saveAdminCode(code: string, adminCode: string) {
  escribir(adminKey(code), adminCode);
}

export function loadAdminCode(code: string): string | null {
  return leer(adminKey(code));
}

/** Lista de salas que este navegador administra, para la pantalla de inicio. */
export function rememberRoom(code: string, title: string) {
  try {
    const raw = localStorage.getItem('amai:rooms');
    const rooms = raw ? (JSON.parse(raw) as { code: string; title: string }[]) : [];
    const next = [{ code, title }, ...rooms.filter((r) => r.code !== code)].slice(0, 6);
    localStorage.setItem('amai:rooms', JSON.stringify(next));
  } catch {
    /* noop */
  }
}

export function recentRooms(): { code: string; title: string }[] {
  try {
    const raw = localStorage.getItem('amai:rooms');
    return raw ? (JSON.parse(raw) as { code: string; title: string }[]) : [];
  } catch {
    return [];
  }
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/** URL absoluta para compartir con los participantes. */
export function joinUrl(code: string): string {
  if (typeof window === 'undefined') return `/unirse/${code}`;
  return `${window.location.origin}/unirse/${code}`;
}
