/**
 * CONTROLADOR DE PARTICIPANTES.
 *
 * Cubre el caso de uso "entrar a la actividad": por codigo general (eligiendo
 * equipo) o por codigo de equipo (entrada directa). Tambien el mantenimiento
 * que hace el docente en vivo: mover de equipo y expulsar.
 */
import { connectDB } from '@/models/db';
import { Activity, type ActivityDoc } from '@/models/Activity';
import { Team, type TeamDoc } from '@/models/Team';
import { Participant, type ParticipantDoc } from '@/models/Participant';
import { toAvatarKey } from '@/lib/icons';
import { ControllerError, resolveAccessCode } from './activityController';
import { toTeamView } from './presenters';
import type { ParticipantIdentity, TeamView } from '@/lib/types';

export interface LobbyView {
  activity: { id: string; code: string; title: string; description: string; unit: string; status: string };
  /** Si se entro con codigo de equipo, viene preseleccionado. */
  preselectedTeamId: string | null;
  teams: TeamView[];
}

/** Datos de la pantalla de ingreso (mockup 5). */
export async function getLobby(rawCode: string): Promise<LobbyView | null> {
  const resolved = await resolveAccessCode(rawCode);
  if (!resolved) return null;
  const { activity, team } = resolved;

  const [teams, participants] = await Promise.all([
    Team.find({ activityId: activity._id }).sort({ order: 1 }),
    Participant.find({ activityId: activity._id }),
  ]);

  const byTeam = new Map<string, ParticipantDoc[]>();
  for (const participant of participants) {
    const key = String(participant.teamId);
    byTeam.set(key, [...(byTeam.get(key) ?? []), participant]);
  }

  return {
    activity: {
      id: String(activity._id),
      code: activity.joinCode,
      title: activity.title,
      description: activity.description ?? '',
      unit: activity.unit ?? '',
      status: activity.status,
    },
    preselectedTeamId: team ? String(team._id) : null,
    teams: teams.map((t) => toTeamView(t, byTeam.get(String(t._id)) ?? [])),
  };
}

export interface JoinInput {
  code: string;
  teamId: string;
  name: string;
  tag?: string | null;
  iconKey?: string;
  /** Si viene, se reutiliza el participante existente en vez de crear otro. */
  participantId?: string | null;
}

/** Alta (o reincorporacion) de un participante en un equipo. */
export async function joinTeam(input: JoinInput): Promise<ParticipantIdentity> {
  await connectDB();
  const resolved = await resolveAccessCode(input.code);
  if (!resolved) throw new ControllerError('No existe una sala con ese codigo.', 404);
  const { activity } = resolved;

  if (activity.status === 'finished') {
    throw new ControllerError('Esta actividad ya termino.', 409);
  }

  const name = input.name?.trim();
  if (!name) throw new ControllerError('Escribe tu nombre para entrar.');
  if (name.length > 40) throw new ControllerError('El nombre es demasiado largo.');

  const team = await Team.findOne({ _id: input.teamId, activityId: activity._id });
  if (!team) throw new ControllerError('Ese equipo no pertenece a esta sala.', 404);

  // Reconexion: el navegador ya traia una identidad valida de esta sala.
  if (input.participantId) {
    const existing = await Participant.findOne({ _id: input.participantId, activityId: activity._id });
    if (existing) {
      existing.name = name;
      existing.tag = input.tag?.trim() || null;
      existing.iconKey = toAvatarKey(input.iconKey);
      if (String(existing.teamId) !== String(team._id)) {
        await assertCapacity(team);
        existing.teamId = team._id;
      }
      await existing.save();
      return toIdentity(existing, activity);
    }
  }

  await assertCapacity(team);
  await assertUniqueName(team, name);

  const participant = await Participant.create({
    activityId: activity._id,
    teamId: team._id,
    name,
    tag: input.tag?.trim() || null,
    iconKey: toAvatarKey(input.iconKey),
    connected: false,
  });

  return toIdentity(participant, activity);
}

async function assertCapacity(team: TeamDoc) {
  const count = await Participant.countDocuments({ teamId: team._id });
  if (count >= team.capacity) {
    throw new ControllerError(`El equipo "${team.name}" ya esta lleno (${count}/${team.capacity}).`, 409);
  }
}

async function assertUniqueName(team: TeamDoc, name: string) {
  const clash = await Participant.findOne({
    teamId: team._id,
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  });
  if (clash) {
    throw new ControllerError(`Ya hay alguien llamado "${name}" en ese equipo. Agrega tu apellido o inicial.`, 409);
  }
}

function toIdentity(participant: ParticipantDoc, activity: ActivityDoc): ParticipantIdentity {
  return {
    participantId: String(participant._id),
    activityCode: activity.joinCode,
    teamId: String(participant.teamId),
    name: participant.name,
    tag: participant.tag ?? null,
    iconKey: participant.iconKey,
  };
}

/** Recupera la identidad guardada en localStorage tras recargar la pagina. */
export async function getIdentity(participantId: string): Promise<ParticipantIdentity | null> {
  await connectDB();
  const participant = await Participant.findById(participantId);
  if (!participant) return null;
  const activity = await Activity.findById(participant.activityId);
  if (!activity) return null;
  return toIdentity(participant, activity);
}

export async function setConnected(participantId: string, connected: boolean) {
  await Participant.findByIdAndUpdate(participantId, {
    $set: { connected, lastSeenAt: new Date() },
  });
}

/** Marca a todos como desconectados: se usa al arrancar el servidor. */
export async function resetConnections(activityId: string) {
  await Participant.updateMany({ activityId }, { $set: { connected: false } });
}

export async function kickParticipant(activity: ActivityDoc, participantId: string) {
  const result = await Participant.deleteOne({ _id: participantId, activityId: activity._id });
  if (result.deletedCount === 0) throw new ControllerError('Participante no encontrado.', 404);
}

export async function moveParticipant(activity: ActivityDoc, participantId: string, teamId: string) {
  const [participant, team] = await Promise.all([
    Participant.findOne({ _id: participantId, activityId: activity._id }),
    Team.findOne({ _id: teamId, activityId: activity._id }),
  ]);
  if (!participant) throw new ControllerError('Participante no encontrado.', 404);
  if (!team) throw new ControllerError('Equipo no encontrado.', 404);
  await assertCapacity(team);
  participant.teamId = team._id;
  await participant.save();
  return participant;
}
