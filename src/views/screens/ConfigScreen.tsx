'use client';

/**
 * PANTALLA: Configuracion de Actividad (vista del docente antes de la clase).
 *
 * Tres bloques: identidad de la actividad + enlace de acceso, equipos de la
 * sesion y banco de preguntas. Todo se guarda via `app/api`, que a su vez
 * llama a `controllers/activityController`.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminGate } from '@/views/components/AdminGate';
import { AdminTabs } from '@/views/components/adminNav';
import { AppFooter, AppHeader, Page } from '@/views/components/brand';
import { QuestionForm } from '@/views/components/QuestionForm';
import { QrPoster } from '@/views/components/QrPoster';
import { TeamCard, type TeamPatch } from '@/views/components/TeamCard';
import { Button, Card, EmptyState, NumberStepper, Pill, SectionTitle, Toast, cx } from '@/views/components/ui';
import { Icon } from '@/lib/icons';
import { api, adminHeaders, copyText, joinUrl, rememberRoom } from '@/lib/client';
import type { ActivitySnapshot } from '@/controllers/activityController';
import type { QuestionInput } from '@/controllers/activityController';
import type { AdminQuestion } from '@/lib/types';

export function ConfigScreen({ code }: { code: string }) {
  return <AdminGate code={code}>{(adminCode) => <ConfigBody code={code} adminCode={adminCode} />}</AdminGate>;
}

function ConfigBody({ code, adminCode }: { code: string; adminCode: string }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<ActivitySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const headers = adminHeaders(adminCode);

  const load = useCallback(async () => {
    const result = await api<ActivitySnapshot>(`/api/activities/${code}`, { headers });
    if (result.ok && result.data) {
      setSnapshot(result.data);
      rememberRoom(code, result.data.title);
    } else {
      setError(result.error ?? 'No se pudo cargar la actividad.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, adminCode]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Envia un cambio y refresca con lo que devuelve el servidor. */
  async function mutate(path: string, init: RequestInit) {
    setSaving(true);
    setError(null);
    const result = await api<ActivitySnapshot>(path, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? 'No se pudo guardar.');
      return false;
    }
    if (result.data) setSnapshot(result.data);
    return true;
  }

  if (!snapshot) {
    return (
      <>
        <AppHeader code={code} />
        <Page>
          <Card>
            <p className="text-body-md text-on-surface-variant">Cargando la actividad...</p>
          </Card>
        </Page>
      </>
    );
  }

  const url = joinUrl(code);
  const live = snapshot.status === 'live';

  return (
    <>
      <AppHeader
        code={code}
        right={
          <>
            <Link href={`/unirse/${code}`} target="_blank">
              <Button size="sm" icon="user" variant="success">
                Vista participante
              </Button>
            </Link>
            <span className="hidden text-right sm:block">
              <span className="block text-label-md leading-tight">Administrador</span>
              <span className="block text-body-sm text-on-surface-variant">Sesion abierta</span>
            </span>
          </>
        }
      >
        <AdminTabs code={code} />
      </AppHeader>

      <Page wide>
        {/* ---------------- Identidad de la actividad ---------------- */}
        <Card className="mb-space-md">
          <div className="flex flex-wrap items-start justify-between gap-space-md">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {snapshot.unit ? <Pill>{snapshot.unit}</Pill> : null}
                <Pill tone={live ? 'success' : 'neutral'}>
                  <span className={cx('inline-block h-2 w-2 rounded-full', live ? 'bg-secondary' : 'bg-outline')} />
                  {live ? 'En vivo' : snapshot.status === 'finished' ? 'Terminada' : 'Borrador / Lista para iniciar'}
                </Pill>
              </div>
              <h1 className="mt-space-sm text-headline-lg-mobile sm:text-headline-lg">{snapshot.title}</h1>
              {snapshot.description ? (
                <p className="mt-1 text-body-md text-on-surface-variant">{snapshot.description}</p>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                hard
                icon="play"
                disabled={snapshot.questions.length === 0}
                onClick={() => router.push(`/admin/${code}/consola`)}
              >
                {live ? 'Volver a la consola' : 'Iniciar dinamica en vivo'}
              </Button>
              <Button
                size="sm"
                icon="refresh"
                onClick={async () => {
                  if (!confirm('Esto pone todos los puntajes en cero y borra el historial. ¿Continuar?')) return;
                  await mutate(`/api/activities/${code}/reset`, { method: 'POST' });
                }}
              >
                Reiniciar puntajes
              </Button>
            </div>
          </div>

          {snapshot.questions.length === 0 ? (
            <p className="mt-space-md rounded border-[1.5px] border-tertiary-container bg-tertiary-fixed px-3 py-2 text-body-sm text-on-tertiary-fixed">
              Agrega al menos una pregunta para poder iniciar la dinamica.
            </p>
          ) : null}
        </Card>

        {/* ---------------- Enlace de acceso ---------------- */}
        <div className="mb-space-lg rounded-lg bg-primary-container p-space-md text-on-primary sm:p-space-lg">
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-on-primary/15">
                <Icon name="link" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-label-sm uppercase tracking-wide opacity-80">Enlace general a la sala</p>
                <p className="truncate font-mono text-headline-sm">{url}</p>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                className="flex-1 sm:flex-none"
                icon={copied ? 'check' : 'copy'}
                onClick={async () => {
                  if (await copyText(url)) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }
                }}
              >
                {copied ? 'Copiado' : 'Copiar enlace'}
              </Button>
              <Button className="flex-1 sm:flex-none" icon="qr" onClick={() => setShowQr(true)}>
                Ver QR gigante
              </Button>
            </div>
          </div>

          <p className="mt-space-md border-t border-on-primary/20 pt-space-sm text-body-sm opacity-90">
            Codigo de administrador: <strong className="font-mono tracking-wider">{snapshot.adminCode}</strong> ·
            guardalo, lo necesitas para abrir la consola en otro dispositivo.
          </p>
        </div>

        {/* ---------------- Equipos ---------------- */}
        <SectionTitle
          icon="users"
          action={
            <div className="flex flex-wrap gap-2">
              <NumberStepper
                label="Equipos"
                value={snapshot.teams.length}
                min={1}
                max={8}
                onChange={(teamCount) =>
                  mutate(`/api/activities/${code}`, { method: 'PATCH', body: JSON.stringify({ teamCount }) })
                }
              />
              <NumberStepper
                label="Cupo"
                value={snapshot.teamCapacity}
                min={1}
                max={20}
                onChange={(teamCapacity) =>
                  mutate(`/api/activities/${code}`, { method: 'PATCH', body: JSON.stringify({ teamCapacity }) })
                }
              />
            </div>
          }
        >
          Equipos de la sesion
        </SectionTitle>

        <div className="mb-space-xl grid gap-space-md sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              saving={saving}
              onSave={(patch: TeamPatch) =>
                mutate(`/api/activities/${code}/teams/${team.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(patch),
                })
              }
            />
          ))}
        </div>

        {/* ---------------- Banco de preguntas ---------------- */}
        <SectionTitle
          icon="puzzle"
          action={
            <Button variant="primary" size="sm" hard icon="plus" onClick={() => setComposing(true)}>
              Agregar pregunta
            </Button>
          }
        >
          Banco de retos ({snapshot.questions.length})
        </SectionTitle>

        {composing ? (
          <div className="mb-space-md">
            <QuestionForm
              saving={saving}
              onCancel={() => setComposing(false)}
              onSubmit={async (input: QuestionInput) => {
                const done = await mutate(`/api/activities/${code}/questions`, {
                  method: 'POST',
                  body: JSON.stringify(input),
                });
                if (done) setComposing(false);
              }}
            />
          </div>
        ) : null}

        {snapshot.questions.length === 0 && !composing ? (
          <EmptyState icon="puzzle" title="Todavia no hay retos">
            Agrega preguntas abiertas para el pulsador, o de opcion multiple y verdadero/falso que se califican solas.
          </EmptyState>
        ) : null}

        <ol className="space-y-space-sm">
          {snapshot.questions.map((question, index) => (
            <li key={question.id}>
              {editingId === question.id ? (
                <QuestionForm
                  initial={question}
                  saving={saving}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (input: QuestionInput) => {
                    const done = await mutate(`/api/activities/${code}/questions/${question.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify(input),
                    });
                    if (done) setEditingId(null);
                  }}
                />
              ) : (
                <QuestionRow
                  question={question}
                  index={index}
                  open={openId === question.id}
                  total={snapshot.questions.length}
                  onToggle={() => setOpenId(openId === question.id ? null : question.id)}
                  onEdit={() => setEditingId(question.id)}
                  onMove={(direction) =>
                    mutate(`/api/activities/${code}/questions/${question.id}`, {
                      method: 'POST',
                      body: JSON.stringify({ direction }),
                    })
                  }
                  onDelete={async () => {
                    if (!confirm(`¿Borrar la pregunta ${index + 1}?`)) return;
                    await mutate(`/api/activities/${code}/questions/${question.id}`, { method: 'DELETE' });
                  }}
                />
              )}
            </li>
          ))}
        </ol>
      </Page>

      <AppFooter />
      {showQr ? <QrPoster url={url} code={code} onClose={() => setShowQr(false)} /> : null}
      {error ? <Toast message={error} onClose={() => setError(null)} /> : null}
    </>
  );
}

const TYPE_BADGE: Record<string, { label: string; tone: 'neutral' | 'primary' | 'warning' }> = {
  open: { label: 'Abierta · pulsador', tone: 'primary' },
  multiple: { label: 'Opcion multiple', tone: 'neutral' },
  boolean: { label: 'Verdadero / Falso', tone: 'warning' },
};

function QuestionRow({
  question,
  index,
  total,
  open,
  onToggle,
  onEdit,
  onMove,
  onDelete,
}: {
  question: AdminQuestion;
  index: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const badge = TYPE_BADGE[question.type] ?? TYPE_BADGE.open;
  return (
    <article className="rounded-lg border-[1.5px] border-outline-variant bg-surface-lowest">
      <div className="flex flex-wrap items-center gap-space-sm p-space-md">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-primary-container font-mono text-label-md text-on-primary">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={badge.tone}>{badge.label}</Pill>
            {question.topic ? <span className="font-mono text-label-sm text-on-surface-variant">{question.topic}</span> : null}
          </div>
          <p className="mt-1 text-body-md font-semibold">{question.prompt}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Pill>
            <Icon name="clock" className="h-3.5 w-3.5" />
            {question.seconds}s
          </Pill>
          <Pill>{question.points} pts</Pill>
          <button
            type="button"
            aria-label={open ? 'Plegar' : 'Ver detalle'}
            onClick={onToggle}
            className="rounded p-1.5 text-on-surface-variant hover:bg-surface-container"
          >
            <Icon name={open ? 'chevronUp' : 'chevronDown'} className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="space-y-space-sm border-t-[1.5px] border-outline-variant p-space-md">
          {question.context ? <p className="text-body-sm text-on-surface-variant">{question.context}</p> : null}

          {question.options.length > 0 ? (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {question.options.map((option) => (
                <li
                  key={option.key}
                  className={cx(
                    'flex items-center gap-2 rounded border-[1.5px] px-3 py-2 text-body-sm',
                    option.key === question.correctOptionKey
                      ? 'border-secondary bg-secondary-container/40'
                      : 'border-outline-variant',
                  )}
                >
                  <span className="font-mono text-label-md">{option.key}</span>
                  {option.text}
                  {option.key === question.correctOptionKey ? (
                    <Icon name="check" className="ml-auto h-4 w-4 text-secondary" />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {question.suggestedAnswer ? (
            <div className="rounded border-[1.5px] border-secondary bg-secondary-container/35 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-label-sm uppercase text-on-secondary-fixed">
                <Icon name="check" className="h-3.5 w-3.5" />
                Criterio oficial · clave secreta
              </p>
              <p className="text-body-sm">{question.suggestedAnswer}</p>
              {question.evaluationCriteria ? (
                <p className="mt-1 text-body-sm text-on-surface-variant">{question.evaluationCriteria}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon="edit" onClick={onEdit}>
              Editar
            </Button>
            <Button size="sm" icon="chevronUp" disabled={index === 0} onClick={() => onMove(-1)}>
              Subir
            </Button>
            <Button size="sm" icon="chevronDown" disabled={index === total - 1} onClick={() => onMove(1)}>
              Bajar
            </Button>
            <Button size="sm" variant="danger" icon="trash" onClick={onDelete}>
              Borrar
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
