import { resolveAdminAccess } from '@/controllers/activityController';
import { fail, ok, readJson } from '@/controllers/http';

export const dynamic = 'force-dynamic';

/**
 * Resuelve el codigo con el que el docente vuelve a su sala desde el inicio.
 *
 * Es POST y no GET a proposito: el codigo de administrador es un secreto y no
 * debe acabar en la URL, donde queda en el historial y en los logs del servidor.
 */
export async function POST(request: Request) {
  try {
    const { code } = await readJson<{ code: string }>(request);
    return ok(await resolveAdminAccess(code));
  } catch (error) {
    return fail(error);
  }
}
