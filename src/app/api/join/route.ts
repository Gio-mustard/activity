import { joinTeam } from '@/controllers/participantController';
import { notifyRosterChanged } from '@/controllers/liveController';
import { fail, ok, readJson } from '@/controllers/http';

export const dynamic = 'force-dynamic';

/** Alta del participante en un equipo. Devuelve la identidad a guardar en el navegador. */
export async function POST(request: Request) {
  try {
    const body = await readJson<{
      code: string;
      teamId: string;
      name: string;
      tag?: string | null;
      iconKey?: string;
      participantId?: string | null;
    }>(request);

    const identity = await joinTeam(body);
    await notifyRosterChanged(identity.activityCode);
    return ok(identity, 201);
  } catch (error) {
    return fail(error);
  }
}
