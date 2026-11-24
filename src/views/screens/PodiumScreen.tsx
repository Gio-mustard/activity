'use client';

/**
 * PANTALLA: Podio y Resultados.
 *
 * Cierra el ciclo de la dinamica: ranking final, desglose por equipo y la
 * bitacora de cada movimiento de puntaje (incluidos los ajustes manuales).
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGate } from '@/views/components/AdminGate';
import { AdminTabs } from '@/views/components/adminNav';
import { AppFooter, AppHeader, Page } from '@/views/components/brand';
import { PodiumBoard } from '@/views/screens/ScreenView';
import { Button, Card, EmptyState, Pill, SectionTitle, Toast, cx } from '@/views/components/ui';
import { AvatarIcon, Icon } from '@/lib/icons';
import { teamColor } from '@/lib/teams';
import { formatReaction, placeLabel } from '@/controllers/rules';
import { api, adminHeaders } from '@/lib/client';
import { useLiveRoom } from '@/realtime/useLiveRoom';
import type { PodiumEntry, ScoreEventView } from '@/lib/types';

interface PodiumPayload {
  title: string;
  code: string;
  status: string;
  podium: PodiumEntry[];
  events: ScoreEventView[];
}

export function PodiumScreen({ code }: { code: string }) {
  return <AdminGate code={code}>{(adminCode) => <PodiumBody code={code} adminCode={adminCode} />}</AdminGate>;
}

function PodiumBody({ code, adminCode }: { code: string; adminCode: string }) {
  const [payload, setPayload] = useState<PodiumPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { state, command, status, latency } = useLiveRoom({ code, role: 'admin', adminCode });

  const load = useCallback(async () => {
    const result = await api<PodiumPayload>(`/api/podium/${code}`);
    if (result.ok && result.data) setPayload(result.data);
    else setError(result.error ?? 'No se pudieron cargar los resultados.');
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  // Cada cambio en vivo refresca el desglose.
  useEffect(() => {
    if (state) void load();
  }, [state?.teams.map((t) => t.score).join(','), load, state]);

  const finished = payload?.status === 'finished';

  return (
    <>
      <AppHeader
        code={code}
        right={
          <Link href={`/pantalla/${code}`} target="_blank">
            <Button size="sm" icon="projector">
              Proyectar
            </Button>
          </Link>
        }
      >
        <AdminTabs code={code} />
      </AppHeader>

      <Page wide>
        {!payload ? (
          <Card>
            <p className="text-body-md text-on-surface-variant">Cargando resultados...</p>
          </Card>
        ) : payload.podium.length === 0 ? (
          <EmptyState icon="trophy" title="Todavia no hay equipos">
            Crea equipos en la pantalla de configuracion para ver el podio.
          </EmptyState>
        ) : (
          <>
            <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-sm">
              <div>
                <h1 className="text-headline-lg-mobile sm:text-headline-lg">{payload.title}</h1>
                <Pill tone={finished ? 'success' : 'neutral'} className="mt-1.5">
                  {finished ? 'Actividad terminada' : 'En curso'}
                </Pill>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  icon="trophy"
                  variant={state?.podiumVisible ? 'primary' : 'secondary'}
                  onClick={() => command({ type: 'podium:toggle', visible: !state?.podiumVisible })}
                >
                  {state?.podiumVisible ? 'Ocultar en proyector' : 'Mostrar en proyector'}
                </Button>
                {!finished ? (
                  <Button
                    variant="danger"
                    hard
                    icon="flag"
                    onClick={async () => {
                      if (!confirm('¿Terminar la sesion? Ya no se podran dar mas puntos.')) return;
                      await command({ type: 'activity:finish' });
                      await load();
                    }}
                  >
                    Terminar sesion
                  </Button>
                ) : null}
              </div>
            </div>

            <Card className="mb-space-md">
              <PodiumBoard teams={payload.podium.map((entry) => entry.team)} finished={finished} />
            </Card>

            <SectionTitle icon="users">Desglose por equipo</SectionTitle>
            <div className="mb-space-lg grid gap-space-sm sm:grid-cols-2 xl:grid-cols-4">
              {payload.podium.map((entry) => {
                const color = teamColor(entry.team.colorKey);
                return (
                  <article
                    key={entry.team.id}
                    className="rounded-lg border-[1.5px] border-outline-variant bg-surface-lowest p-space-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
                        style={{ backgroundColor: color.hex, color: color.on }}
                      >
                        <AvatarIcon iconKey={entry.team.iconKey} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-label-lg">{entry.team.name}</p>
                        <p className="text-body-sm text-on-surface-variant">{placeLabel(entry.place)} lugar</p>
                      </div>
                    </div>

                    <p className="tabular mt-space-sm font-mono text-headline-lg-mobile">{entry.team.score}</p>

                    <dl className="mt-space-sm space-y-1 border-t-[1.5px] border-outline-variant pt-space-sm text-body-sm">
                      <div className="flex justify-between">
                        <dt className="text-on-surface-variant">Aciertos</dt>
                        <dd className="text-secondary">{entry.correct}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-on-surface-variant">Fallos</dt>
                        <dd className="text-error">{entry.incorrect}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-on-surface-variant">Mejor reaccion</dt>
                        <dd className="font-mono">{formatReaction(entry.bestReactionMs)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-on-surface-variant">Integrantes</dt>
                        <dd>{entry.team.members.length}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <SectionTitle icon="clock">Bitacora de puntajes</SectionTitle>
            {payload.events.length === 0 ? (
              <EmptyState icon="clock" title="Sin movimientos todavia" />
            ) : (
              <ul className="space-y-1.5">
                {payload.events.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border-[1.5px] border-outline-variant bg-surface-lowest px-3 py-2 text-body-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-label-md">{event.teamName}</span>
                    {event.questionIndex !== null ? (
                      <Pill>Pregunta {event.questionIndex + 1}</Pill>
                    ) : null}
                    <span className="text-on-surface-variant">{event.reason}</span>
                    <span
                      className={cx(
                        'tabular ml-auto shrink-0 rounded-full px-2 py-0.5 font-mono text-label-sm',
                        event.delta > 0
                          ? 'bg-secondary-container text-on-secondary-fixed'
                          : event.delta < 0
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {event.delta > 0 ? `+${event.delta}` : event.delta}
                    </span>
                    <span className="shrink-0 text-label-sm text-on-surface-variant">
                      {new Date(event.at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Page>

      <AppFooter connection={{ status, latency }} />
      {error ? <Toast message={error} onClose={() => setError(null)} /> : null}
    </>
  );
}
