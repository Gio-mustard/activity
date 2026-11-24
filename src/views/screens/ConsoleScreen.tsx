'use client';

/**
 * PANTALLA: Consola en Vivo (la que mira el docente mientras conduce).
 *
 * Es la unica superficie con poder de decision: ve la respuesta correcta,
 * da los veredictos y controla el cronometro. Todo viaja por WebSocket; esta
 * pantalla no calcula puntajes, solo manda intenciones al servidor.
 */
import { useState } from 'react';
import Link from 'next/link';
import { AdminGate } from '@/views/components/AdminGate';
import { AdminTabs } from '@/views/components/adminNav';
import { AppHeader, Page } from '@/views/components/brand';
import { Countdown, CountdownBar } from '@/views/components/Countdown';
import { Scoreboard } from '@/views/components/Scoreboard';
import { Button, Card, ConnectionChip, EmptyState, LiveBadge, Pill, Toast, cx } from '@/views/components/ui';
import { AvatarIcon, Icon } from '@/lib/icons';
import { teamColor } from '@/lib/teams';
import { formatReaction } from '@/controllers/rules';
import { useLiveRoom } from '@/realtime/useLiveRoom';
import type { AdminQuestion } from '@/lib/types';

export function ConsoleScreen({ code }: { code: string }) {
  return <AdminGate code={code}>{(adminCode) => <ConsoleBody code={code} adminCode={adminCode} />}</AdminGate>;
}

function ConsoleBody({ code, adminCode }: { code: string; adminCode: string }) {
  const { state, status, error, clock, command, latency } = useLiveRoom({ code, role: 'admin', adminCode });
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(payload: Parameters<typeof command>[0]) {
    const result = await command(payload);
    if (!result.ok) setActionError(result.error);
  }

  if (!state) {
    return (
      <>
        <AppHeader code={code} />
        <Page>
          <Card>
            <p className="text-body-md text-on-surface-variant">
              {status === 'rejected' ? (error ?? 'No se pudo abrir la sala.') : 'Conectando con la sala...'}
            </p>
          </Card>
        </Page>
      </>
    );
  }

  const question = state.question as AdminQuestion | null;
  const isOpenType = question?.type === 'open';
  const phase = state.phase;
  const floorColor = state.floor ? teamColor(state.floor.teamColorKey) : null;

  return (
    <>
      <AppHeader
        code={code}
        right={
          <>
            <ConnectionChip status={status} latency={latency} />
            <Link href={`/pantalla/${code}`} target="_blank">
              <Button size="sm" icon="projector">
                Pantalla publica
              </Button>
            </Link>
          </>
        }
      >
        <AdminTabs code={code} />
      </AppHeader>

      {/* -------- Barra de control -------- */}
      <div className="sticky top-[60px] z-20 border-b-[1.5px] border-outline-variant bg-surface-low">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-gutter-mobile py-2.5 sm:px-gutter">
          {state.status === 'live' ? <LiveBadge /> : <Pill>{state.status === 'finished' ? 'Terminada' : 'Borrador'}</Pill>}
          <Pill tone="outline">
            Ronda {Math.max(1, state.questionIndex + 1)} de {state.totalQuestions}
          </Pill>
          <Pill>{PHASE_LABEL[phase]}</Pill>

          <div className="ml-auto flex flex-wrap gap-2">
            {state.status === 'draft' ? (
              <Button variant="primary" hard icon="play" onClick={() => run({ type: 'activity:start' })}>
                Iniciar dinamica
              </Button>
            ) : null}

            {phase === 'idle' && state.status === 'live' ? (
              <Button variant="primary" hard icon="play" onClick={() => run({ type: 'question:start' })}>
                Mostrar y arrancar
              </Button>
            ) : null}

            {phase === 'running' ? (
              <Button icon="pause" onClick={() => run({ type: 'timer:pause' })}>
                Pausar
              </Button>
            ) : null}

            {phase === 'paused' ? (
              <Button variant="primary" icon="play" onClick={() => run({ type: 'timer:resume' })}>
                Reanudar
              </Button>
            ) : null}

            {state.status === 'live' ? (
              <>
                <Button
                  icon="skip"
                  disabled={state.questionIndex <= 0}
                  onClick={() => run({ type: 'question:prev' })}
                  className="hidden sm:inline-flex"
                >
                  Anterior
                </Button>
                <Button variant="primary" hard iconRight="arrowRight" onClick={() => run({ type: 'question:next' })}>
                  {state.questionIndex + 1 >= state.totalQuestions ? 'Terminar' : 'Siguiente pregunta'}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Page wide>
        {state.status === 'draft' ? (
          <Card className="mb-space-md" tone="accent">
            <h2 className="text-headline-md">La dinamica todavia no empieza</h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              {state.teams.reduce((total, team) => total + team.members.length, 0)} participantes registrados.
              Cuando inicies, se cargara la pregunta 1 y los equipos veran su pulsador.
            </p>
          </Card>
        ) : null}

        <div className="grid gap-space-md xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          {/* ================= Columna principal ================= */}
          <div className="space-y-space-md">
            {!question ? (
              <EmptyState icon="puzzle" title="Sin pregunta activa">
                Inicia la dinamica para cargar la primera pregunta del banco.
              </EmptyState>
            ) : (
              <>
                {/* ---- Pregunta + cronometro ---- */}
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-space-md">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone="primary">Pregunta #{String(state.questionIndex + 1).padStart(2, '0')}</Pill>
                        {question.topic ? (
                          <span className="font-mono text-label-sm text-on-surface-variant">{question.topic}</span>
                        ) : null}
                        <Pill>Dificultad: {question.difficulty}</Pill>
                      </div>
                      <h1 className="mt-space-sm text-headline-md">{question.prompt}</h1>
                      {question.context ? (
                        <p className="mt-1 text-body-sm text-on-surface-variant">{question.context}</p>
                      ) : null}
                    </div>

                    <div className="mx-auto shrink-0 sm:mx-0">
                      <Countdown
                        remainingMs={clock.mainMs}
                        totalMs={clock.mainTotalMs}
                        size={150}
                        running={phase === 'running'}
                      />
                    </div>
                  </div>

                  {/* Guia del moderador: solo existe en esta pantalla. */}
                  <div className="mt-space-md rounded-md border-[1.5px] border-primary-container bg-primary-fixed/50 p-space-md">
                    <p className="mb-1.5 flex items-center gap-1.5 text-label-md text-primary">
                      <Icon name="shield" className="h-4 w-4" />
                      Guia de validacion del moderador
                    </p>
                    <div className="rounded border-[1.5px] border-outline-variant bg-surface-lowest p-3">
                      <p className="text-label-sm uppercase text-on-surface-variant">Respuesta correcta</p>
                      <p className="mt-0.5 font-mono text-body-sm">
                        {question.type === 'open'
                          ? state.reveal?.suggestedAnswer || 'Sin respuesta sugerida'
                          : `${state.reveal?.correctOptionKey ?? '?'} · ${
                              question.options.find((o) => o.key === state.reveal?.correctOptionKey)?.text ??
                              state.reveal?.suggestedAnswer ??
                              ''
                            }`}
                      </p>
                    </div>
                    {state.reveal?.evaluationCriteria ? (
                      <p className="mt-2 text-body-sm text-on-surface-variant">{state.reveal.evaluationCriteria}</p>
                    ) : null}
                  </div>
                </Card>

                {/* ---- Pedido de palabra (preguntas abiertas) ---- */}
                {isOpenType ? (
                  <Card>
                    <div className="mb-space-sm flex flex-wrap items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-headline-sm">
                        <Icon name="hand" className="h-5 w-5 text-primary" />
                        Registro de pedido de palabra
                      </h2>
                      <Pill>{state.queue.length} en cola</Pill>
                    </div>

                    {state.floor && floorColor ? (
                      <div
                        className="rounded-md border-2 p-space-md"
                        style={{ borderColor: floorColor.hex, backgroundColor: floorColor.soft }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <Pill tone="success">Tiene la palabra</Pill>
                            <p className="mt-1.5 text-headline-sm">{state.floor.teamName}</p>
                            <p className="text-body-sm text-on-surface-variant">
                              Pulso {state.floor.participantName} · {formatReaction(state.floor.reactionMs)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="tabular font-mono text-headline-md">
                              {Math.ceil(clock.floorMs / 1000)}s
                            </p>
                            <p className="text-label-sm uppercase text-on-surface-variant">Respuesta verbal</p>
                          </div>
                        </div>
                        <div className="mt-space-sm">
                          <CountdownBar remainingMs={clock.floorMs} totalMs={clock.floorTotalMs} />
                        </div>
                        {clock.floorMs === 0 ? (
                          <p className="mt-2 text-body-sm text-error">
                            Se acabo su tiempo. Da el veredicto cuando termine de hablar.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="rounded-md border-[1.5px] border-dashed border-outline-variant px-3 py-4 text-center text-body-sm text-on-surface-variant">
                        {phase === 'running'
                          ? 'Pulsadores habilitados. Esperando que algun equipo pida la palabra.'
                          : 'Los pulsadores se habilitan al arrancar el cronometro.'}
                      </p>
                    )}

                    {state.queue.length > 1 ? (
                      <ol className="mt-space-md space-y-1.5">
                        <p className="text-label-sm uppercase text-on-surface-variant">En cola para rebote</p>
                        {state.queue.slice(1).map((entry, index) => (
                          <li
                            key={entry.teamId}
                            className="flex items-center gap-2 rounded border-[1.5px] border-outline-variant px-3 py-2"
                          >
                            <span className="text-label-md text-on-surface-variant">{index + 2}º</span>
                            <span className="min-w-0 flex-1 truncate text-label-lg">{entry.teamName}</span>
                            <span className="text-body-sm text-on-surface-variant">{entry.participantName}</span>
                            <span className="tabular font-mono text-label-sm">+{(entry.deltaMs / 1000).toFixed(1)}s</span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </Card>
                ) : (
                  /* ---- Tablero de respuestas cerradas ---- */
                  <Card>
                    <h2 className="mb-space-sm flex items-center gap-2 text-headline-sm">
                      <Icon name="check" className="h-5 w-5 text-primary" />
                      Respuestas de los equipos
                    </h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {state.teams.map((team) => {
                        const correct = team.answerKey === state.reveal?.correctOptionKey;
                        return (
                          <li
                            key={team.id}
                            className={cx(
                              'flex items-center gap-2 rounded-md border-[1.5px] px-3 py-2.5',
                              !team.hasAnswered
                                ? 'border-outline-variant bg-surface-low'
                                : correct
                                  ? 'border-secondary bg-secondary-container/35'
                                  : 'border-error bg-error-container/50',
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate text-label-lg">{team.name}</span>
                            {team.hasAnswered ? (
                              <>
                                <span className="font-mono text-label-lg">{team.answerKey}</span>
                                <span className="text-label-sm text-on-surface-variant">
                                  {formatReaction(team.answerMs)}
                                </span>
                              </>
                            ) : (
                              <span className="text-body-sm text-on-surface-variant">sin responder</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {phase !== 'revealed' ? (
                      <Button
                        variant="primary"
                        hard
                        block
                        className="mt-space-md"
                        icon="check"
                        onClick={() => run({ type: 'question:reveal' })}
                      >
                        Revelar y calificar
                      </Button>
                    ) : null}
                  </Card>
                )}

                {/* ---- Veredicto ---- */}
                <Card>
                  <div className="mb-space-sm flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-headline-sm">
                      <Icon name="trophy" className="h-5 w-5 text-primary" />
                      Veredicto y asignacion de turno
                    </h2>
                    {state.floor ? (
                      <span className="text-body-sm text-on-surface-variant">
                        Accion para: <strong className="text-on-surface">{state.floor.teamName}</strong>
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <VerdictButton
                      variant="success"
                      icon="check"
                      title="Correcto"
                      subtitle={`+${question.points} puntos`}
                      disabled={phase !== 'floor'}
                      onClick={() => run({ type: 'verdict', verdict: 'correct' })}
                    />
                    <VerdictButton
                      variant="danger"
                      icon="close"
                      title="Incorrecto"
                      subtitle={`−${question.penalty} penalizacion`}
                      disabled={phase !== 'floor'}
                      onClick={() => run({ type: 'verdict', verdict: 'incorrect' })}
                    />
                    <VerdictButton
                      variant="primary"
                      icon="refresh"
                      title="Ceder turno"
                      subtitle="Al siguiente en cola"
                      disabled={phase !== 'floor'}
                      onClick={() => run({ type: 'verdict', verdict: 'pass' })}
                    />
                    <VerdictButton
                      variant="warning"
                      icon="clock"
                      title="Tiempo rebote"
                      subtitle={`+${question.reboundSeconds}s adicionales`}
                      disabled={state.status !== 'live'}
                      onClick={() => run({ type: 'timer:add', seconds: question.reboundSeconds })}
                    />
                  </div>

                  <div className="mt-space-md flex flex-wrap items-center justify-between gap-2 border-t-[1.5px] border-outline-variant pt-space-sm">
                    <p className="flex items-start gap-1.5 text-body-sm text-on-surface-variant">
                      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                      Al ceder turno se da la palabra al siguiente equipo sin penalizacion de puntaje.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" icon="refresh" onClick={() => run({ type: 'buzzers:reset' })}>
                        Reiniciar pulsadores
                      </Button>
                      <Button
                        size="sm"
                        variant={state.podiumVisible ? 'primary' : 'secondary'}
                        icon="trophy"
                        onClick={() => run({ type: 'podium:toggle', visible: !state.podiumVisible })}
                      >
                        {state.podiumVisible ? 'Ocultar podio' : 'Mostrar podio'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* ================= Columna lateral ================= */}
          <aside className="space-y-space-md">
            <Card>
              <Scoreboard teams={state.teams} />
              <div className="mt-space-md flex items-center justify-between rounded border-[1.5px] border-outline-variant bg-surface-low px-3 py-2 text-body-sm">
                <span>{state.connectedCount} alumnos conectados</span>
                <span className="text-on-surface-variant">latencia {latency ?? '--'} ms</span>
              </div>
            </Card>

            <Card tone="muted">
              <h3 className="text-label-lg">Ajuste manual de puntaje</h3>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Por si calificaste de mas o de menos. Queda registrado en la bitacora.
              </p>
              <ul className="mt-space-sm space-y-1.5">
                {state.teams.map((team) => (
                  <li key={team.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-body-sm">{team.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => run({ type: 'score:adjust', teamId: team.id, delta: -10 })}
                    >
                      −10
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => run({ type: 'score:adjust', teamId: team.id, delta: 10 })}
                    >
                      +10
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card tone="muted">
              <h3 className="text-label-lg">Integrantes</h3>
              <ul className="mt-space-sm space-y-space-sm">
                {state.teams.map((team) => (
                  <li key={team.id}>
                    <p className="text-label-md" style={{ color: teamColor(team.colorKey).hex }}>
                      {team.name}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {team.members.length === 0 ? (
                        <li className="text-body-sm text-on-surface-variant">Sin integrantes.</li>
                      ) : (
                        team.members.map((member) => (
                          <li key={member.id} className="flex items-center gap-2 text-body-sm">
                            <AvatarIcon iconKey={member.iconKey} className="h-4 w-4 shrink-0" />
                            <span className={cx('min-w-0 flex-1 truncate', !member.connected && 'opacity-50')}>
                              {member.name}
                              {member.tag ? <span className="text-on-surface-variant"> · {member.tag}</span> : null}
                            </span>
                            <button
                              type="button"
                              aria-label={`Sacar a ${member.name}`}
                              className="shrink-0 rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-error"
                              onClick={() => {
                                if (confirm(`¿Sacar a ${member.name} de la sala?`)) {
                                  run({ type: 'participant:kick', participantId: member.id });
                                }
                              }}
                            >
                              <Icon name="close" className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </Page>

      {actionError ? <Toast message={actionError} onClose={() => setActionError(null)} /> : null}
    </>
  );
}

const PHASE_LABEL: Record<string, string> = {
  idle: 'Pregunta cargada',
  running: 'Esperando pulsaciones',
  paused: 'Cronometro en pausa',
  floor: 'Equipo respondiendo',
  revealed: 'Respuesta revelada',
};

function VerdictButton({
  title,
  subtitle,
  icon,
  variant,
  disabled,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: 'check' | 'close' | 'refresh' | 'clock';
  variant: 'success' | 'danger' | 'primary' | 'warning';
  disabled?: boolean;
  onClick: () => void;
}) {
  const styles = {
    success: 'bg-secondary text-on-secondary border-secondary',
    danger: 'bg-error text-on-error border-error',
    primary: 'bg-primary-container text-on-primary border-primary-container',
    warning: 'bg-tertiary-container text-on-tertiary border-tertiary-container',
  } as const;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'press-hard-sm flex flex-col items-center gap-0.5 rounded border-2 px-3 py-3.5 text-center shadow-hard-sm',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
        styles[variant],
      )}
    >
      <span className="flex items-center gap-1.5 text-label-lg">
        <Icon name={icon} className="h-4 w-4" />
        {title}
      </span>
      <span className="font-mono text-label-sm opacity-90">{subtitle}</span>
    </button>
  );
}
