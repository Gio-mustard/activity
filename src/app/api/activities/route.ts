import { createActivity } from '@/controllers/activityController';
import { fail, ok, readJson } from '@/controllers/http';

export const dynamic = 'force-dynamic';

/** Crea una sala nueva y devuelve sus dos codigos. */
export async function POST(request: Request) {
  try {
    const body = await readJson<{
      title: string;
      description?: string;
      unit?: string;
      teamCount?: number;
      teamCapacity?: number;
      withSamples?: boolean;
    }>(request);

    const activity = await createActivity({
      title: body.title,
      description: body.description,
      unit: body.unit,
      teamCount: body.teamCount ?? 4,
      teamCapacity: body.teamCapacity ?? 5,
      withSamples: body.withSamples,
    });

    return ok({ joinCode: activity.joinCode, adminCode: activity.adminCode, id: String(activity._id) }, 201);
  } catch (error) {
    return fail(error);
  }
}
