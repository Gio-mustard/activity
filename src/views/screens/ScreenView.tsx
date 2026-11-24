'use client';

/**
 * PANTALLA PUBLICA (proyector).
 *
 * Solo lectura y sin controles: se abre en la salida HDMI del salon. Recibe el
 * estado publico, que nunca incluye la respuesta correcta antes de revelarla.
 * Tipografia grande para lectura desde el fondo del aula.
 */
import { Countdown, CountdownBar } from '@/views/components/Countdown';
import { Logo } from '@/views/components/brand';
import { Card, LiveBadge, Pill, cx } from '@/views/components/ui';
import { AvatarIcon, Icon } from '@/lib/icons';
import { teamColor } from '@/lib/teams';
import { formatReaction, placeLabel } from '@/controllers/rules';
import { sortedTeams } from '@/views/components/Scoreboard';
import { useLiveRoom } from '@/realtime/useLiveRoom';
import type { TeamView } from '@/lib/types';

export function ScreenView({ code }: { code: string }) {
  const { state, status, clock } = useLiveRoom({ code, role: 'screen' });

  if (!state) {
    return (
      <main className="grid min-h-dvh place-items-center p-gutter">
        <p className="text-headline-sm text-on-surface-variant">
          {status === 'rejected' ? 'No existe una sala con ese codigo.' : 'Conectando con la sala...'}
        </p>
      </main>
    );
  }

  const question = state.question;
  const ranked = sortedTeams(state.teams);
  const floorColor = state.floor ? teamColor(state.floor.teamColorKey) : null;
  const showPodium = state.podiumVisible || state.status === 'finished';

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      {/* -------- Encabezado -------- */}
      <header className="border-b-[1.5px] border-outline-variant bg-surface-lowest">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-space-md gap-y-2 px-gutter-mobile py-3 sm:px-gutter">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            {state.status === 'live' ? <LiveBadge /> : null}
            <Pill tone="outline">
              Sala <span className="font-mono">{state.code}</span>
            </Pill>
            <Pill>
              Ronda {Math.max(1, state.questionIndex + 1)} de {state.totalQuestions}
            </Pill>
          </div>
          <span className="ml-auto hidden items-center gap-1.5 text-body-sm text-on-surface-variant sm:flex">
            <Icon name="projector" className="h-4 w-4" />
            Transmision sincronizada en proyector
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-gutter-mobile py-space-md sm:px-gutter">
        {showPodium ? (
          <PodiumBoard teams={state.teams} finished={state.status === 'finished'} />
        ) : !question ? (
          <Card className="grid min-h-[50vh] place-items-center text-center">
            <div>
              <h1 className="text-headline-lg-mobile sm:text-headline-lg">{state.title}</h1>
              <p className="mt-space-sm text-body-lg text-on-surface-variant">
                Esperando a que el docente inicie la dinamica.
              </p>
              <p className="mt-space-lg text-label-sm uppercase tracking-widest text-on-surface-variant">
                Entra con el codigo
              </p>
              <p className="font-mono text-headline-xl-mobile tracking-widest text-primary sm:text-headline-xl">
                {state.code}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-space-md lg:grid-cols-[minmax(0,2.2fr)_minmax(260px,1fr)]">
            {/* ---- Pregunta ---- */}
            <Card className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="primary">Pregunta #{String(state.questionIndex + 1).padStart(2, '0')}</Pill>
                {question.topic ? (
                  <span className="font-mono text-label-sm uppercase text-on-surface-variant">{question.topic}</span>
                ) : null}
              </div>

              <h1 className="mt-space-md text-headline-lg-mobile leading-tight sm:text-headline-lg lg:text-headline-xl">
                {question.prompt}
              </h1>

              {question.context ? (
                <p className="mt-space-md rounded-md border-[1.5px] border-outline-variant bg-surface-low p-space-md text-body-md text-on-surface-variant sm:text-body-lg">
                  {question.context}
                </p>
              ) : null}

              {question.options.length > 0 ? (
                <ul className="mt-space-md grid gap-space-sm sm:grid-cols-2">
                  {question.options.map((option) => {
                    const isCorrect = state.phase === 'revealed' && state.reveal?.correctOptionKey === option.key;
                    return (
                      <li
                        key={option.key}
                        className={cx(
                          'flex items-center gap-3 rounded-md border-2 p-space-md text-body-lg',
                          isCorrect
                            ? 'border-secondary bg-secondary-container/40'
                            : 'border-outline-variant bg-surface-lowest',
                        )}
                      >
                        <span
                          className={cx(
                            'grid h-10 w-10 shrink-0 place-items-center rounded font-mono text-label-lg',
                            isCorrect ? 'bg-secondary text-on-secondary' : 'bg-surface-highest text-on-surface',
                          )}
                        >
                          {option.key}
                        </span>
                        <span className="min-w-0">{option.text}</span>
                        {isCorrect ? <Icon name="check" className="ml-auto h-6 w-6 text-secondary" /> : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {state.phase === 'revealed' && state.reveal?.suggestedAnswer ? (
                <div className="anim-flash-in mt-space-md rounded-md border-2 border-secondary bg-secondary-container/40 p-space-md">
                  <p className="text-label-sm uppercase tracking-wide text-on-secondary-fixed">Respuesta</p>
                  <p className="mt-1 text-headline-sm sm:text-headline-md">{state.reveal.suggestedAnswer}</p>
                </div>
              ) : null}

              <p className="mt-auto flex flex-wrap items-center gap-2 pt-space-md text-body-sm text-on-surface-variant">
                <Icon name="hand" className="h-4 w-4" />
                {question.type === 'open'
                  ? state.buzzersEnabled
                    ? 'Pulsadores habilitados en los telefonos de cada mesa'
                    : 'Los pulsadores se habilitan al arrancar el cronometro'
                  : 'Cada equipo responde desde su telefono'}
                <span className="ml-auto font-mono">
                  {question.points} pts · {question.lockTeamAfterWrong ? '1 intento por equipo' : 'rebote libre'}
                </span>
              </p>
            </Card>

            {/* ---- Cronometro ---- */}
            <Card className="flex flex-col items-center justify-center gap-space-md">
              <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">Tiempo restante</p>
              <Countdown
                remainingMs={clock.mainMs}
                totalMs={clock.mainTotalMs}
                size={220}
                running={state.phase === 'running'}
              />
              <div className="w-full">
                <div className="mb-1 flex justify-between text-label-sm text-on-surface-variant">
                  <span>0s</span>
                  <span className="font-mono uppercase">Limite: {Math.round(clock.mainTotalMs / 1000)}s</span>
                </div>
                <CountdownBar remainingMs={clock.mainMs} totalMs={clock.mainTotalMs} />
              </div>
              {state.phase === 'paused' ? <Pill tone="warning">Cronometro en pausa</Pill> : null}
            </Card>
          </div>
        )}

        {/* -------- Banda del equipo con la palabra -------- */}
        {state.floor && floorColor && !showPodium ? (
          <div
            className="anim-flash-in mt-space-md flex flex-wrap items-center gap-space-md rounded-lg border-2 p-space-md"
            style={{ borderColor: floorColor.hex, backgroundColor: floorColor.soft }}
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-md"
              style={{ backgroundColor: floorColor.hex, color: floorColor.on }}
            >
              <Icon name="hand" className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">¡Pulsador activado!</p>
              <p className="text-headline-md leading-tight sm:text-headline-lg">
                ¡{state.floor.teamName} tiene la palabra!
              </p>
              <p className="text-body-sm text-on-surface-variant">
                Pulso {state.floor.participantName} · {formatReaction(state.floor.reactionMs)}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular font-mono text-headline-lg-mobile sm:text-headline-lg">
                {Math.ceil(clock.floorMs / 1000)}s
              </p>
              <p className="text-label-sm uppercase text-on-surface-variant">Respuesta verbal</p>
            </div>
          </div>
        ) : null}

        {/* -------- Marcador -------- */}
        {!showPodium ? (
          <section className="mt-space-md">
            <h2 className="mb-space-sm flex items-center gap-2 text-headline-sm">
              <Icon name="trophy" className="h-5 w-5 text-primary" />
              Marcador en vivo de la sala
            </h2>
            <div className="grid gap-space-sm sm:grid-cols-2 xl:grid-cols-4">
              {ranked.map(({ place, team }) => (
                <TeamScoreCard key={team.id} team={team.view} place={place} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t-[1.5px] border-outline-variant px-gutter-mobile py-3 sm:px-gutter">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 text-body-sm text-on-surface-variant">
          <span>Activity By Amai · Fundamentos de Ingenieria de Software</span>
          <span className="flex items-center gap-1.5">
            <Icon name="wifi" className="h-4 w-4" />
            {state.connectedCount} conectados
          </span>
        </div>
      </footer>
    </div>
  );
}

function TeamScoreCard({ team, place }: { team: TeamView; place: number }) {
  const color = teamColor(team.colorKey);
  const leader = place === 1 && team.score > 0;
  return (
    <article
      className={cx(
        'rounded-lg border-2 bg-surface-lowest p-space-md',
        leader ? 'border-secondary' : 'border-outline-variant',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Pill tone={leader ? 'success' : 'neutral'}>
          {placeLabel(place)} {leader ? 'lider' : ''}
        </Pill>
        {team.locked ? <Icon name="lock" className="h-4 w-4 text-error" /> : null}
        {team.hasAnswered ? <Icon name="check" className="h-4 w-4 text-secondary" /> : null}
      </div>

      <div className="mt-space-sm flex items-center gap-2.5">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
          style={{ backgroundColor: color.hex, color: color.on }}
        >
          <AvatarIcon iconKey={team.iconKey} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-headline-sm leading-tight">{team.name}</p>
          <p className="text-body-sm text-on-surface-variant">{team.members.length} participantes</p>
        </div>
      </div>

      <div className="mt-space-md flex items-end justify-between border-t-[1.5px] border-outline-variant pt-space-sm">
        <span className="text-label-sm uppercase text-on-surface-variant">Puntaje</span>
        <span className="flex items-baseline gap-1">
          <span className="tabular font-mono text-headline-lg-mobile leading-none">{team.score}</span>
          <span className="text-label-sm text-on-surface-variant">PTS</span>
        </span>
      </div>
      {team.lastDelta ? (
        <p
          className={cx(
            'anim-flash-in mt-1 text-right text-label-md',
            team.lastDelta > 0 ? 'text-secondary' : 'text-error',
          )}
        >
          {team.lastDelta > 0 ? `+${team.lastDelta}` : team.lastDelta} esta ronda
        </p>
      ) : null}
    </article>
  );
}

/** Podio tipo kahoot, con las barras creciendo desde abajo. */
export function PodiumBoard({ teams, finished }: { teams: TeamView[]; finished: boolean }) {
  const ranked = sortedTeams(teams);
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const best = Math.max(1, ...ranked.map((entry) => entry.team.view.score));
  const order = [1, 0, 2]; // 2º, 1º, 3º: el campeon al centro

  return (
    <div className="anim-flash-in">
      <h1 className="text-center text-headline-lg-mobile sm:text-headline-lg">
        {finished ? 'Resultados finales' : 'Podio de la ronda'}
      </h1>

      <div className="mx-auto mt-space-lg flex max-w-3xl items-end justify-center gap-space-sm">
        {order.map((index) => {
          const entry = top[index];
          if (!entry) return null;
          const team = entry.team.view;
          const color = teamColor(team.colorKey);
          const height = 90 + (team.score / best) * 170;
          return (
            <div key={team.id} className="flex min-w-0 flex-1 flex-col items-center">
              <span
                className="mb-2 grid h-12 w-12 place-items-center rounded-md"
                style={{ backgroundColor: color.hex, color: color.on }}
              >
                <AvatarIcon iconKey={team.iconKey} className="h-6 w-6" />
              </span>
              <p className="mb-1 line-clamp-2 text-center text-label-md">{team.name}</p>
              <p className="tabular mb-1.5 font-mono text-headline-md">{team.score}</p>
              <div
                className="anim-rise w-full rounded-t-md border-2 border-b-0"
                style={{ height, backgroundColor: color.soft, borderColor: color.hex }}
              >
                <p className="pt-2 text-center text-headline-md" style={{ color: color.hex }}>
                  {placeLabel(entry.place)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 ? (
        <ul className="mx-auto mt-space-lg max-w-2xl space-y-2">
          {rest.map(({ place, team }) => (
            <li
              key={team.id}
              className="flex items-center gap-3 rounded-md border-[1.5px] border-outline-variant bg-surface-lowest px-3 py-2.5"
            >
              <span className="text-label-md text-on-surface-variant">{placeLabel(place)}</span>
              <span className="min-w-0 flex-1 truncate text-label-lg">{team.view.name}</span>
              <span className="tabular font-mono text-headline-sm">{team.view.score}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
