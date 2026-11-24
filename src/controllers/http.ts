/**
 * Utilidades compartidas por los route handlers de `app/api`.
 *
 * Los handlers son adaptadores delgados: parsean la peticion, llaman a un
 * controlador y serializan el resultado. Toda la logica vive en los
 * controladores, nunca aqui.
 */
import { NextResponse } from 'next/server';
import { ControllerError, assertAdmin } from './activityController';
import { MissingDatabaseConfig } from '@/models/db';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: unknown) {
  if (error instanceof MissingDatabaseConfig) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
  if (error instanceof ControllerError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  console.error('[api]', error);
  const detail = error instanceof Error ? error.message : 'Error inesperado';
  return NextResponse.json({ ok: false, error: detail }, { status: 500 });
}

/** Lee el codigo de administrador de la cabecera y valida el acceso a la sala. */
export async function requireAdmin(request: Request, code: string) {
  const adminCode = request.headers.get('x-admin-code') ?? '';
  if (!adminCode) throw new ControllerError('Falta el codigo de administrador.', 401);
  return assertAdmin(code, adminCode);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ControllerError('El cuerpo de la peticion no es JSON valido.');
  }
}
