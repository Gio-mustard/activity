import { getAdminSnapshot, updateTeam } from '@/controllers/activityController';
import { notifyActivityChanged } from '@/controllers/liveController';
import { fail, ok, readJson, requireAdmin } from '@/controllers/http';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string; teamId: string }> }) {
  try {
    const { code, teamId } = await params;
    const activity = await requireAdmin(request, code);
    const body = await readJson<{
      name?: string;
      description?: string;
      iconKey?: string;
      colorKey?: string;
      capacity?: number;
    }>(request);
    await updateTeam(activity, teamId, body);
    await notifyActivityChanged(code);
    return ok(await getAdminSnapshot(activity));
  } catch (error) {
    return fail(error);
  }
}
