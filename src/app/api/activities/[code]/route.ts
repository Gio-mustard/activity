import {
  deleteActivity,
  getAdminSnapshot,
  setTeamCount,
  updateActivityMeta,
} from '@/controllers/activityController';
import { notifyActivityChanged } from '@/controllers/liveController';
import { fail, ok, readJson, requireAdmin } from '@/controllers/http';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ code: string }> };

export async function GET(request: Request, { params }: Ctx) {
  try {
    const { code } = await params;
    const activity = await requireAdmin(request, code);
    return ok(await getAdminSnapshot(activity));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { code } = await params;
    const activity = await requireAdmin(request, code);
    const body = await readJson<{
      title?: string;
      description?: string;
      unit?: string;
      teamCapacity?: number;
      teamCount?: number;
    }>(request);

    if (body.teamCount !== undefined) await setTeamCount(activity, body.teamCount);
    await updateActivityMeta(activity, body);
    await notifyActivityChanged(code);
    return ok(await getAdminSnapshot(activity));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { code } = await params;
    const activity = await requireAdmin(request, code);
    await deleteActivity(activity);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
