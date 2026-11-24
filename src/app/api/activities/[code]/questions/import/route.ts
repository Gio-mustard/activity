import { getAdminSnapshot, importQuestions } from '@/controllers/activityController';
import { notifyActivityChanged } from '@/controllers/liveController';
import { fail, ok, readJson, requireAdmin } from '@/controllers/http';

export const dynamic = 'force-dynamic';

/** Alta de un lote de preguntas desde un JSON. Todo o nada. */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const activity = await requireAdmin(request, code);
    const { imported } = await importQuestions(activity, await readJson<unknown>(request));
    await notifyActivityChanged(code);
    return ok({ imported, activity: await getAdminSnapshot(activity) }, 201);
  } catch (error) {
    return fail(error);
  }
}
