import { getIdentity } from '@/controllers/participantController';
import { fail, ok } from '@/controllers/http';
import { ControllerError } from '@/controllers/activityController';

export const dynamic = 'force-dynamic';

/** Revalida la identidad guardada en localStorage despues de recargar. */
export async function GET(_request: Request, { params }: { params: Promise<{ participantId: string }> }) {
  try {
    const { participantId } = await params;
    const identity = await getIdentity(participantId);
    if (!identity) throw new ControllerError('Identidad no encontrada.', 404);
    return ok(identity);
  } catch (error) {
    return fail(error);
  }
}
