import { findByJoinCode } from '@/controllers/activityController';
import { buildPodium, listScoreEvents } from '@/controllers/scoreController';
import { fail, ok } from '@/controllers/http';
import { ControllerError } from '@/controllers/activityController';

export const dynamic = 'force-dynamic';

/** Resultados finales: podio y bitacora de puntajes. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const activity = await findByJoinCode(code);
    if (!activity) throw new ControllerError('No existe una sala con ese codigo.', 404);
    const [podium, events] = await Promise.all([
      buildPodium(String(activity._id)),
      listScoreEvents(String(activity._id)),
    ]);
    return ok({
      title: activity.title,
      code: activity.joinCode,
      status: activity.status,
      podium,
      events,
    });
  } catch (error) {
    return fail(error);
  }
}
