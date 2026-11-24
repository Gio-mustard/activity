import { getAdminSnapshot, resetActivity } from '@/controllers/activityController';
import { dropRoom } from '@/controllers/liveController';
import { fail, ok, requireAdmin } from '@/controllers/http';

export const dynamic = 'force-dynamic';

/** Deja la sala lista para volver a jugarse con los mismos equipos. */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const activity = await requireAdmin(request, code);
    await resetActivity(activity);
    dropRoom(code);
    return ok(await getAdminSnapshot(activity));
  } catch (error) {
    return fail(error);
  }
}
