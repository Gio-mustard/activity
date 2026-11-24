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

export function saveIdentity(identity: ParticipantIdentity) {
  try {
    localStorage.setItem(identityKey(identity.activityCode), JSON.stringify(identity));
  } catch {
    /* modo privado o almacenamiento lleno: se sigue sin persistir */
  }
}

export function loadIdentity(code: string): ParticipantIdentity | null {
  try {
    const raw = localStorage.getItem(identityKey(code));
    return raw ? (JSON.parse(raw) as ParticipantIdentity) : null;
  } catch {
    return null;
  }
}

export function clearIdentity(code: string) {
  try {
    localStorage.removeItem(identityKey(code));
  } catch {
    /* noop */
  }
}

/* ---------------- Codigo de administrador ---------------- */

export function saveAdminCode(code: string, adminCode: string) {
  try {
    localStorage.setItem(adminKey(code), adminCode);
  } catch {
    /* noop */
  }
}

export function loadAdminCode(code: string): string | null {
  try {
    return localStorage.getItem(adminKey(code));
  } catch {
    return null;
  }
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
