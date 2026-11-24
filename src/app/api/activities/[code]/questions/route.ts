import { addQuestion, getAdminSnapshot, type QuestionInput } from '@/controllers/activityController';
import { notifyActivityChanged } from '@/controllers/liveController';
import { fail, ok, readJson, requireAdmin } from '@/controllers/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const activity = await requireAdmin(request, code);
    await addQuestion(activity, await readJson<QuestionInput>(request));
    await notifyActivityChanged(code);
    return ok(await getAdminSnapshot(activity), 201);
  } catch (error) {
    return fail(error);
  }
}
