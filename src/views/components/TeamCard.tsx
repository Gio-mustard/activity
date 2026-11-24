'use client';

/** Tarjeta de equipo en la pantalla de configuracion: identidad, cupo y acceso directo. */
import { useState } from 'react';
import type { TeamView } from '@/lib/types';
import { AvatarIcon, Icon } from '@/lib/icons';
import { MAX_TEAM_CAPACITY, initials, teamColor } from '@/lib/teams';
import { copyText } from '@/lib/client';
import { Button, Field, Input, Pill, Textarea, cx } from './ui';
import { ColorPicker, IconPicker } from './IconPicker';

export interface TeamPatch {
  name?: string;
  description?: string;
  iconKey?: string;
  colorKey?: string;
  capacity?: number;
}

export function TeamCard({
  team,
  onSave,
  saving,
}: {
  team: TeamView;
  onSave: (patch: TeamPatch) => void;
  saving?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<TeamPatch>({});

  const color = teamColor(team.colorKey);
  const value = <K extends keyof TeamPatch>(key: K): TeamView[K & keyof TeamView] | TeamPatch[K] =>
    draft[key] !== undefined ? draft[key] : (team[key as keyof TeamView] as TeamPatch[K]);

  const full = team.members.length >= team.capacity;

  async function copy() {
    if (await copyText(team.joinCode)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <article className="flex flex-col rounded-lg border-[1.5px] border-outline-variant bg-surface-lowest p-space-md">
      <div className="mb-space-sm flex items-start justify-between gap-2">
        <Pill tone={full ? 'success' : 'neutral'}>
          {team.members.length}/{team.capacity} {full ? 'lleno' : 'miembros'}
        </Pill>
        <button
          type="button"
          aria-label={editing ? 'Cerrar edicion' : `Editar ${team.name}`}
          onClick={() => {
            setEditing((prev) => !prev);
            setDraft({});
          }}
          className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container"
        >
          <Icon name={editing ? 'close' : 'edit'} className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
          style={{ backgroundColor: color.hex, color: color.on }}
        >
          <AvatarIcon iconKey={String(value('iconKey'))} className="h-5 w-5" />
        </span>
        <h3 className="text-headline-sm leading-tight">{String(value('name'))}</h3>
      </div>

      {!editing ? (
        <>
          {team.description ? (
            <p className="mt-2 text-body-sm text-on-surface-variant">{team.description}</p>
          ) : null}

          <div className="mt-space-md flex flex-wrap gap-1.5">
            {team.members.length === 0 ? (
              <span className="text-body-sm text-on-surface-variant">Sin integrantes todavia.</span>
            ) : (
              team.members.map((member) => (
                <span
                  key={member.id}
                  title={`${member.name}${member.tag ? ` · ${member.tag}` : ''}`}
                  className={cx(
                    'grid h-8 w-8 place-items-center rounded-full text-label-sm',
                    member.connected ? '' : 'opacity-50',
                  )}
                  style={{ backgroundColor: color.soft, color: color.hex }}
                >
                  {initials(member.name)}
                </span>
              ))
            )}
          </div>

          <div className="mt-space-md flex items-center justify-between rounded border-[1.5px] border-outline-variant bg-surface-low px-3 py-2">
            <span>
              <span className="block text-label-sm uppercase text-on-surface-variant">Acceso directo</span>
              <span className="font-mono text-label-lg tracking-wider">{team.joinCode}</span>
            </span>
            <button
              type="button"
              aria-label="Copiar codigo del equipo"
              onClick={copy}
              className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container"
            >
              <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <div className="mt-space-md space-y-space-sm">
          <Field label="Nombre">
            <Input
              value={String(value('name') ?? '')}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              maxLength={40}
            />
          </Field>
          <Field label="Descripcion">
            <Textarea
              value={String(value('description') ?? '')}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              maxLength={160}
              className="min-h-16"
            />
          </Field>
          <Field label="Color">
            <ColorPicker
              value={String(value('colorKey'))}
              onChange={(colorKey) => setDraft((d) => ({ ...d, colorKey }))}
            />
          </Field>
          <Field label="Icono">
            <IconPicker
              value={String(value('iconKey'))}
              colorKey={String(value('colorKey'))}
              onChange={(iconKey) => setDraft((d) => ({ ...d, iconKey }))}
            />
          </Field>
          <Field label="Cupo">
            <Input
              type="number"
              min={1}
              max={MAX_TEAM_CAPACITY}
              value={Number(value('capacity'))}
              onChange={(e) => setDraft((d) => ({ ...d, capacity: Number(e.target.value) }))}
              className="tabular"
            />
          </Field>
          <Button
            variant="primary"
            block
            hard
            disabled={saving}
            onClick={() => {
              onSave(draft);
              setEditing(false);
              setDraft({});
            }}
          >
            {saving ? 'Guardando...' : 'Guardar equipo'}
          </Button>
        </div>
      )}
    </article>
  );
}
