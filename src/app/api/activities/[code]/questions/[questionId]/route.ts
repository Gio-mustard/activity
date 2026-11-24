import {
  deleteQuestion,
  getAdminSnapshot,
  moveQuestion,
  updateQuestion,
  type QuestionInput,
} from '@/controllers/activityController';
import { notifyActivityChanged } from '@/controllers/liveController';
import { fail, ok, readJson, requireAdmin } from '@/controllers/http';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ code: string; questionId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { code, questionId } = await params;
    const activity = await requireAdmin(request, code);
    await updateQuestion(activity, questionId, await readJson<QuestionInput>(request));
    await notifyActivityChanged(code);
    return ok(await getAdminSnapshot(activity));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { code, questionId } = await params;
    const activity = await requireAdmin(request, code);
    await deleteQuestion(activity, questionId);
    await notifyActivityChanged(code);
    return ok(await getAdminSnapshot(activity));
  } catch (error) {
    return fail(error);
  }
}

/** Reordenar: { direction: -1 | 1 }. */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { code, questionId } = await params;
    const activity = await requireAdmin(request, code);
    const { direction } = await readJson<{ direction: -1 | 1 }>(request);
    await moveQuestion(activity, questionId, direction === -1 ? -1 : 1);
    await notifyActivityChanged(code);
    return ok(await getAdminSnapshot(activity));
  } catch (error) {
    return fail(error);
  }
}
