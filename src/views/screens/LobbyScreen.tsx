'use client';

/**
 * PANTALLA: ingreso del participante (mobile first).
 *
 * Dos caminos de entrada:
 *  - codigo general de la sala  -> elige equipo
 *  - codigo del equipo          -> entra directo, equipo preseleccionado
 *
 * Antes de entrar se identifica con nombre, etiqueta opcional y avatar.
 * La identidad queda en localStorage para reconectar sin volver a teclear.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarIcon, Icon } from '@/lib/icons';
import { teamColor } from '@/lib/teams';
import { api, loadIdentity, saveIdentity } from '@/lib/client';
import type { LobbyView } from '@/controllers/participantController';
import type { ParticipantIdentity } from '@/lib/types';
import { Logo } from '@/views/components/brand';
import { IconPicker } from '@/views/components/IconPicker';
import { Button, Card, Field, Input, Pill, Toast, cx } from '@/views/components/ui';

const TAGS = ['Frontend', 'Backend', 'DevOps', 'Arquitectura', 'Datos', 'QA'];

export function LobbyScreen({ code }: { code: string }) {
  const router = useRouter();
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [known, setKnown] = useState<ParticipantIdentity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [iconKey, setIconKey] = useState('terminal');
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    api<LobbyView>(`/api/lobby/${code}`).then((result) => {
      if (!result.ok || !result.data) {
        setLoadError(result.error ?? 'No se pudo cargar la sala.');
        return;
      }
      setLobby(result.data);
      setTeamId(result.data.preselectedTeamId ?? null);

      const stored = loadIdentity(result.data.activity.code);
      if (stored) {
        setKnown(stored);
        setName(stored.name);
        setTag(stored.tag);
        setIconKey(stored.iconKey);
        setTeamId(result.data.preselectedTeamId ?? stored.teamId);
      }
    });
  }, [code]);

  async function confirm() {
    if (!lobby || !teamId) return;
    setSaving(true);
    setError(null);

    const result = await api<ParticipantIdentity>('/api/join', {
      method: 'POST',
      body: JSON.stringify({
        code,
        teamId,
        name,
        tag,
        iconKey,
        participantId: known?.participantId ?? null,
      }),
    });

    setSaving(false);
    if (!result.ok || !result.data) {
      setError(result.error ?? 'No se pudo entrar al equipo.');
      return;
    }

    saveIdentity(result.data);
    router.push(`/jugar/${result.data.activityCode}`);
  }

  if (loadError) {
    return (
      <main className="grid min-h-dvh place-items-center p-gutter-mobile">
        <Card className="max-w-sm text-center">
          <Icon name="alert" className="mx-auto h-8 w-8 text-error" />
          <p className="mt-space-sm text-headline-sm">{loadError}</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Revisa el codigo con el administrador de la actividad; se distinguen mayusculas y el guion.
          </p>
          <Button className="mt-space-md" block onClick={() => router.push('/')}>
            Volver al inicio
          </Button>
        </Card>
      </main>
    );
  }

  if (!lobby) {
    return (
      <main className="grid min-h-dvh place-items-center p-gutter-mobile">
        <p className="text-body-md text-on-surface-variant">Cargando la sala...</p>
      </main>
    );
  }

  const selected = lobby.teams.find((team) => team.id === teamId) ?? null;
  const direct = Boolean(lobby.preselectedTeamId);
  const selectedColor = selected ? teamColor(selected.colorKey) : null;
  const full = selected ? selected.members.length >= selected.capacity : false;
  const canSubmit = Boolean(teamId && name.trim() && !saving && (!full || known));

  return (
    <main className="pb-barra-navegador mx-auto w-full max-w-lg px-gutter-mobile py-space-md">
      <div className="mb-space-md flex items-center justify-between gap-2">
        <Logo size="sm" />
        <Pill tone="success">
          <span className="inline-block h-2 w-2 rounded-full bg-secondary" />
          Sala activa
        </Pill>
      </div>

      {/* ---- Cabecera del equipo o de la sala ---- */}
      {direct && selected && selectedColor ? (
        <div
          className="mb-space-md rounded-lg p-space-md"
          style={{ backgroundColor: selectedColor.hex, color: selectedColor.on }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/15 px-2.5 py-1 text-label-sm uppercase">
            <Icon name="link" className="h-3.5 w-3.5" />
            Invitacion directa
          </span>
          <h1 className="mt-space-sm text-headline-lg-mobile leading-tight">{selected.name}</h1>
          <p className="mt-1 text-body-sm opacity-90">{lobby.activity.title}</p>
          <p className="mt-space-md flex items-center justify-between border-t border-current/20 pt-space-sm text-body-sm">
            <span className="flex items-center gap-1.5">
              <Icon name="clock" className="h-4 w-4" />
              {lobby.activity.status === 'live' ? 'Dinamica en curso' : 'Esperando al docente'}
            </span>
            <span className="rounded-full bg-black/15 px-2 py-0.5">
              Cupo {selected.members.length}/{selected.capacity}
            </span>
          </p>
        </div>
      ) : (
        <div className="mb-space-md rounded-lg bg-primary-container p-space-md text-on-primary">
          <p className="text-label-sm uppercase tracking-wide opacity-80">{lobby.activity.unit || 'Dinamica'}</p>
          <h1 className="mt-1 text-headline-lg-mobile leading-tight">{lobby.activity.title}</h1>
          <p className="mt-space-sm font-mono text-label-lg tracking-widest">SALA-{lobby.activity.code}</p>
        </div>
      )}

      {known ? (
        <Card tone="accent" className="mb-space-md">
          <p className="text-body-sm">
            Ya estuviste aqui como <strong>{known.name}</strong>. Si confirmas, vuelves a tu mismo asiento.
          </p>
        </Card>
      ) : null}

      {/* ---- Paso 1: perfil ---- */}
      <Card className="mb-space-md">
        <div className="mb-space-md flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-container text-label-md text-on-primary">
            1
          </span>
          <h2 className="text-headline-sm">Tu perfil</h2>
        </div>

        <div className="space-y-space-md">
          <Field label="Selecciona tu avatar">
            <IconPicker value={iconKey} onChange={setIconKey} colorKey={selected?.colorKey} />
          </Field>

          <Field label="Nombre" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Sofia Benitez"
              maxLength={40}
              autoComplete="name"
            />
          </Field>

          <Field label="Etiqueta" hint="Opcional. Ayuda al docente a saber quien es quien.">
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTag(tag === option ? null : option)}
                  className={cx(
                    'rounded-full border-[1.5px] px-3 py-1.5 text-label-md transition-colors',
                    tag === option
                      ? 'border-primary-container bg-primary-container text-on-primary'
                      : 'border-outline-variant bg-surface-lowest text-on-surface-variant',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      {/* ---- Paso 2: equipo ---- */}
      <Card className="mb-space-md">
        <div className="mb-space-md flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-container text-label-md text-on-primary">
            2
          </span>
          <h2 className="text-headline-sm">{direct ? 'Companeros conectados' : 'Elige tu equipo'}</h2>
        </div>

        {direct && selected ? (
          <ul className="space-y-2">
            <li className="flex items-center gap-2.5 rounded-md border-2 border-dashed border-primary-container bg-primary-fixed/40 px-3 py-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-container text-on-primary">
                <AvatarIcon iconKey={iconKey} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-label-md text-primary">Tu lugar reservado</span>
                <span className="block text-body-sm text-on-surface-variant">{tag ?? 'Sin etiqueta'}</span>
              </span>
              <Pill tone="primary">Tu</Pill>
            </li>
            {selected.members
              .filter((member) => member.id !== known?.participantId)
              .map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-2.5 rounded-md border-[1.5px] border-outline-variant bg-surface-low px-3 py-2.5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-highest">
                    <AvatarIcon iconKey={member.iconKey} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-label-md">{member.name}</span>
                    <span className="block text-body-sm text-on-surface-variant">{member.tag ?? 'Participante'}</span>
                  </span>
                  <Pill tone={member.connected ? 'success' : 'neutral'}>{member.connected ? 'Listo' : 'Fuera'}</Pill>
                </li>
              ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {lobby.teams.map((team) => {
              const color = teamColor(team.colorKey);
              const teamFull = team.members.length >= team.capacity;
              const active = team.id === teamId;
              return (
                <li key={team.id}>
                  <button
                    type="button"
                    disabled={teamFull && team.id !== known?.teamId}
                    onClick={() => setTeamId(team.id)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-md border-2 p-3 text-left transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-45',
                      active ? 'bg-surface-low' : 'border-outline-variant bg-surface-lowest',
                    )}
                    style={active ? { borderColor: color.hex, backgroundColor: color.soft } : undefined}
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
                      style={{ backgroundColor: color.hex, color: color.on }}
                    >
                      <AvatarIcon iconKey={team.iconKey} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label-lg">{team.name}</span>
                      <span className="block truncate text-body-sm text-on-surface-variant">
                        {team.description || `${team.members.length} de ${team.capacity} lugares ocupados`}
                      </span>
                    </span>
                    <span className="shrink-0 text-label-sm text-on-surface-variant">
                      {team.members.length}/{team.capacity}
                    </span>
                    {active ? <Icon name="check" className="h-5 w-5 shrink-0" style={{ color: color.hex }} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Button
        variant="primary"
        size="lg"
        block
        hard
        iconRight="arrowRight"
        disabled={!canSubmit}
        onClick={confirm}
      >
        {saving ? 'Entrando...' : full && !known ? 'Equipo lleno' : 'Confirmar y entrar'}
      </Button>

      <p className="mt-space-sm text-center text-body-sm text-on-surface-variant">
        Activity By Amai · Fundamentos de Ingenieria de Software
      </p>

      {error ? <Toast message={error} onClose={() => setError(null)} /> : null}
    </main>
  );
}
