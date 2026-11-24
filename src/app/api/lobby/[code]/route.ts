import { getLobby } from '@/controllers/participantController';
import { fail, ok } from '@/controllers/http';
import { ControllerError } from '@/controllers/activityController';

export const dynamic = 'force-dynamic';

/** Datos publicos para la pantalla de ingreso (sala o equipo). */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const lobby = await getLobby(code);
    if (!lobby) throw new ControllerError('No existe una sala con ese codigo.', 404);
    return ok(lobby);
  } catch (error) {
    return fail(error);
  }
}
