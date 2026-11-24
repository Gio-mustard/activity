'use client';

/**
 * PANTALLA DEL PARTICIPANTE (mobile first).
 *
 * En preguntas abiertas no hay nada que leer ni decidir: un boton enorme que
 * pide la palabra para todo el equipo. En preguntas cerradas, el boton se
 * cambia por las opciones.
 *
 * En escritorio el mismo boton responde a la tecla Enter (o barra espaciadora),
 * y la pantalla lo anuncia: con mouse se pierden decimas contra un pulgar.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarIcon, Icon } from '@/lib/icons';
import { teamColor } from '@/lib/teams';
import { clearIdentity, loadIdentity } from '@/lib/client';
import { formatClock, formatReaction } from '@/controllers/rules';
import { useLiveRoom } from '@/realtime/useLiveRoom';
import { CountdownBar } from '@/views/components/Countdown';
import { Button, Card, LiveBadge, Pill, Toast, cx } from '@/views/components/ui';
import type { ParticipantIdentity } from '@/lib/types';

export function BuzzerScreen({ code }: { code: string }) {
  const router = useRouter();
  const [identity, setIdentity] = useState<ParticipantIdentity | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = loadIdentity(code);
    if (!stored) {
      router.replace(`/unirse/${code}`);
      return;
    }
    setIdentity(stored);
    setChecked(true);
  }, [code, router]);

  if (!checked || !identity) {
    return (
      <main className="grid min-h-dvh place-items-center p-gutter-mobile">
        <p className="text-body-md text-on-surface-variant">Recuperando tu lugar...</p>
      </main>
    );
  }

  return <BuzzerBody code={code} identity={identity} />;
}

function BuzzerBody({ code, identity }: { code: string; identity: ParticipantIdentity }) {
  const router = useRouter();
  const { state, status, error, clock, buzz, answer, latency } = useLiveRoom({
    code,
    role: 'player',
    participantId: identity.participantId,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [pressed, setPressed] = useState(false);

  const team = state?.teams.find((t) => t.id === identity.teamId) ?? null;
  const question = state?.question ?? null;
  const isOpen = question?.type === 'open';
  const queueIndex = state ? state.queue.findIndex((entry) => entry.teamId === identity.teamId) : -1;
  const hasFloor = state?.floor?.teamId === identity.teamId;
  const canBuzz = Boolean(state?.buzzersEnabled && isOpen && team && !team.locked && queueIndex < 0 && !hasFloor);

  const press = useCallback(async () => {
    if (!canBuzz) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 400);
    const result = await buzz();
    if (!result.ok) setActionError(result.error);
  }, [buzz, canBuzz]);

  // Enter / barra espaciadora en escritorio.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName)) return;
      event.preventDefault();
      void press();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  if (status === 'rejected') {
    return (
      <main className="grid min-h-dvh place-items-center p-gutter-mobile">
        <Card className="max-w-sm text-center">
          <Icon name="alert" className="mx-auto h-8 w-8 text-error" />
          <p className="mt-space-sm text-headline-sm">{error ?? 'No pudimos reconectarte.'}</p>
          <Button
            className="mt-space-md"
            variant="primary"
            block
            onClick={() => {
              clearIdentity(code);
              router.replace(`/unirse/${code}`);
            }}
          >
            Volver a entrar
          </Button>
        </Card>
      </main>
    );
  }

  /*
   * Espera con salida. Antes era un texto mudo: si el alta se perdia, el
   * alumno se quedaba mirando "Conectando..." sin saber si era su señal, la
   * sala o la app, y sin nada que tocar.
   */
  if (!state || !team) {
    const conectado = status === 'online';
    return (
      <main className="grid min-h-dvh place-items-center p-gutter-mobile">
        <Card className="w-full max-w-sm text-center">
          <p className="text-headline-sm">
            {conectado ? 'Entrando a tu equipo...' : 'Conectando con la sala...'}
          </p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {conectado
              ? 'Ya hay señal con el servidor; terminando de sincronizar.'
              : 'Revisa tu conexion. Se reintenta solo cada pocos segundos.'}
          </p>
          <Button className="mt-space-md" block icon="refresh" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
          <button
            type="button"
            className="mt-space-sm text-body-sm text-on-surface-variant underline"
            onClick={() => {
              clearIdentity(code);
              router.replace(`/unirse/${code}`);
            }}
          >
            Volver a elegir equipo
          </button>
        </Card>
      </main>
    );
  }

  const color = teamColor(team.colorKey);
  const answered = team.hasAnswered;
  const correctKey = state.phase === 'revealed' ? state.reveal?.correctOptionKey : null;

  return (
    <main className="flex min-h-dvh flex-col bg-surface">
      {/* -------- Encabezado compacto -------- */}
      <header className="flex items-center gap-2 border-b-[1.5px] border-outline-variant bg-surface-lowest px-gutter-mobile py-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary-container text-on-primary">
          <Icon name="brand" className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-lg leading-tight">
            Amai <span className="text-primary">Activity</span>
          </p>
          <p className="font-mono text-label-sm text-on-surface-variant">SALA-{state.code}</p>
        </div>
        {state.status === 'live' ? <LiveBadge /> : <Pill>{state.status === 'finished' ? 'Fin' : 'Espera'}</Pill>}
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: color.soft, color: color.hex }}
          title={identity.name}
        >
          <AvatarIcon iconKey={identity.iconKey} className="h-5 w-5" />
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-space-sm px-gutter-mobile py-space-sm">
        {/* -------- Tira del equipo -------- */}
        <div
          className="flex items-center gap-2.5 rounded-md border-[1.5px] p-2.5"
          style={{ borderColor: color.hex, backgroundColor: color.soft }}
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded"
            style={{ backgroundColor: color.hex, color: color.on }}
          >
            <AvatarIcon iconKey={team.iconKey} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-label-lg leading-tight">{team.name}</p>
            <p className="text-body-sm text-on-surface-variant">
              Ronda {Math.max(1, state.questionIndex + 1)} de {state.totalQuestions}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-surface-lowest px-2.5 py-1">
            <span className="tabular font-mono text-label-lg">{team.score}</span>
            <span className="ml-1 text-label-sm text-on-surface-variant">pts</span>
          </span>
          {team.lastDelta ? (
            <span
              className={cx(
                'anim-flash-in tabular shrink-0 rounded-full px-2 py-1 text-label-sm',
                team.lastDelta > 0 ? 'bg-secondary text-on-secondary' : 'bg-error text-on-error',
              )}
            >
              {team.lastDelta > 0 ? `+${team.lastDelta}` : team.lastDelta}
            </span>
          ) : null}
        </div>

        {/* -------- Pregunta -------- */}
        {question ? (
          <Card className="p-space-md">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone="primary">#{String(state.questionIndex + 1).padStart(2, '0')}</Pill>
              {question.topic ? (
                <span className="font-mono text-label-sm uppercase text-on-surface-variant">{question.topic}</span>
              ) : null}
              <span className="ml-auto flex items-center gap-1.5">
                <Pill tone={clock.mainMs <= 10000 && state.phase === 'running' ? 'danger' : 'neutral'}>
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  {formatClock(clock.mainMs)}s
                </Pill>
                <Pill tone="outline">+{question.points}</Pill>
              </span>
            </div>
            <p className="mt-space-sm text-headline-sm leading-snug">{question.prompt}</p>
            {question.context ? (
              <p className="mt-1 text-body-sm text-on-surface-variant">{question.context}</p>
            ) : null}
            <div className="mt-space-sm">
              <CountdownBar remainingMs={clock.mainMs} totalMs={clock.mainTotalMs} />
            </div>
          </Card>
        ) : (
          <Card className="p-space-md text-center">
            <p className="text-headline-sm">{state.title}</p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Esperando a que el docente inicie la dinamica. No cierres esta pantalla.
            </p>
          </Card>
        )}

        {/* -------- Zona de accion -------- */}
        <div className="flex flex-1 flex-col justify-center py-space-sm">
          {question && !isOpen ? (
            <ClosedAnswers
              options={question.options}
              myAnswer={team.answerKey}
              answered={answered}
              correctKey={correctKey ?? null}
              disabled={state.phase !== 'running' || answered}
              onPick={async (key) => {
                const result = await answer(key);
                if (!result.ok) setActionError(result.error);
              }}
            />
          ) : (
            <BigBuzzer
              canBuzz={canBuzz}
              pressed={pressed}
              hasFloor={hasFloor}
              locked={team.locked}
              queuePosition={queueIndex >= 0 ? queueIndex + 1 : null}
              floorBusy={Boolean(state.floor) && !hasFloor}
              floorMs={clock.floorMs}
              floorTotalMs={clock.floorTotalMs}
              phase={state.phase}
              colorHex={color.hex}
              colorOn={color.on}
              onPress={press}
            />
          )}
        </div>

        {/* -------- Revelacion -------- */}
        {state.phase === 'revealed' && state.reveal?.suggestedAnswer ? (
          <Card tone="success" className="anim-flash-in p-space-md">
            <p className="text-label-sm uppercase text-on-secondary-fixed">Respuesta</p>
            <p className="mt-0.5 text-body-md">{state.reveal.suggestedAnswer}</p>
          </Card>
        ) : null}

        {/* -------- Pie -------- */}
        <footer className="flex items-center gap-2 rounded-md border-[1.5px] border-outline-variant bg-surface-lowest px-3 py-2">
          <div className="flex -space-x-2">
            {team.members.slice(0, 5).map((member) => (
              <span
                key={member.id}
                title={member.name}
                className={cx(
                  'grid h-7 w-7 place-items-center rounded-full border-2 border-surface-lowest',
                  member.connected ? '' : 'opacity-40',
                )}
                style={{ backgroundColor: color.soft, color: color.hex }}
              >
                <AvatarIcon iconKey={member.iconKey} className="h-3.5 w-3.5" />
              </span>
            ))}
          </div>
          <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface-variant">
            {team.members.filter((m) => m.connected).length} de {team.members.length} conectados
          </span>
          <span className="flex shrink-0 items-center gap-1 text-label-sm text-on-surface-variant">
            <Icon name="wifi" className="h-3.5 w-3.5" />
            {status === 'online' ? `${latency ?? '--'} ms` : 'reconectando'}
          </span>
        </footer>
      </div>

      {actionError ? <Toast message={actionError} onClose={() => setActionError(null)} /> : null}
    </main>
  );
}

/* ---------------------------------------------------------------- */

function BigBuzzer({
  canBuzz,
  pressed,
  hasFloor,
  locked,
  queuePosition,
  floorBusy,
  floorMs,
  floorTotalMs,
  phase,
  colorHex,
  colorOn,
  onPress,
}: {
  canBuzz: boolean;
  pressed: boolean;
  hasFloor: boolean;
  locked: boolean;
  queuePosition: number | null;
  floorBusy: boolean;
  floorMs: number;
  floorTotalMs: number;
  phase: string;
  colorHex: string;
  colorOn: string;
  onPress: () => void;
}) {
  // El equipo tiene la palabra: el boton se convierte en su cronometro.
  if (hasFloor) {
    return (
      <div className="anim-flash-in flex flex-col items-center gap-space-md">
        <div
          className="grid aspect-square w-full max-w-[320px] place-items-center rounded-full border-4"
          style={{ borderColor: '#006c49', backgroundColor: '#6cf8bb' }}
        >
          <div className="text-center">
            <Icon name="hand" className="mx-auto h-10 w-10 text-on-secondary-fixed" />
            <p className="mt-2 text-headline-md text-on-secondary-fixed">¡Tienen la palabra!</p>
            <p className="tabular mt-1 font-mono text-headline-xl-mobile text-on-secondary-fixed">
              {Math.ceil(floorMs / 1000)}s
            </p>
            <p className="text-body-sm text-on-secondary-fixed/80">Respondan en voz alta</p>
          </div>
        </div>
        <div className="w-full max-w-[320px]">
          <CountdownBar remainingMs={floorMs} totalMs={floorTotalMs} />
        </div>
      </div>
    );
  }

  const label = locked
    ? 'Ya participaron'
    : queuePosition
      ? `En cola · ${queuePosition}º`
      : floorBusy
        ? '¡Pedir rebote!'
        : '¡Pedir la palabra!'; 

  const hint = locked
    ? 'Su equipo ya respondio esta pregunta'
    : queuePosition
      ? 'Si el equipo de enfrente falla, les toca'
      : floorBusy
        ? 'Otro equipo esta respondiendo: formense para el rebote'
        : phase === 'revealed'
          ? 'Pregunta cerrada'
          : canBuzz
            ? 'Toca rapido para responder'
            : 'Espera a que arranque el cronometro';

  const disabled = !canBuzz;

  return (
    <div className="flex flex-col items-center gap-space-md">
      <div className="relative grid w-full max-w-[340px] place-items-center">
        {canBuzz ? (
          <span
            className="anim-pulse-ring absolute aspect-square w-full rounded-full"
            style={{ backgroundColor: colorHex }}
          />
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={onPress}
          aria-label={label}
          className={cx(
            'relative grid aspect-square w-full touch-manipulation select-none place-items-center rounded-full',
            'border-4 transition-transform duration-75 active:translate-y-1',
            disabled ? 'cursor-not-allowed opacity-55 grayscale' : 'shadow-hard-lg',
            pressed && 'scale-95',
          )}
          style={{
            backgroundColor: locked ? '#dae2fd' : queuePosition ? '#885500' : colorHex,
            borderColor: '#131b2e',
            color: locked ? '#464555' : colorOn,
          }}
        >
          <span className="px-6 text-center">
            <Icon name={locked ? 'lock' : queuePosition ? 'clock' : 'hand'} className="mx-auto h-12 w-12" />
            <span className="mt-2 block text-headline-md leading-tight sm:text-headline-lg">{label}</span>
            <span className="mt-2 inline-block rounded-full bg-black/20 px-3 py-1 text-label-sm">{hint}</span>
          </span>
        </button>
      </div>

      {/* Pista de teclado: solo tiene sentido con teclado fisico. */}
      <p className="hidden items-center gap-1.5 text-body-sm text-on-surface-variant sm:flex">
        <kbd className="rounded border-[1.5px] border-outline-variant bg-surface-lowest px-2 py-0.5 font-mono text-label-sm">
          Enter
        </kbd>
        o
        <kbd className="rounded border-[1.5px] border-outline-variant bg-surface-lowest px-2 py-0.5 font-mono text-label-sm">
          Espacio
        </kbd>
        tambien pulsan, sin mover el mouse.
      </p>
    </div>
  );
}

function ClosedAnswers({
  options,
  myAnswer,
  answered,
  correctKey,
  disabled,
  onPick,
}: {
  options: { key: string; text: string }[];
  myAnswer: string | null;
  answered: boolean;
  correctKey: string | null;
  disabled: boolean;
  onPick: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {answered ? (
        <p className="rounded-md border-[1.5px] border-primary-container bg-primary-fixed/50 px-3 py-2 text-center text-body-sm text-primary">
          Su equipo respondio <strong className="font-mono">{myAnswer}</strong>. Espera la revelacion.
        </p>
      ) : null}

      <ul className="grid gap-2">
        {options.map((option) => {
          const mine = myAnswer === option.key;
          const isCorrect = correctKey === option.key;
          const isWrongPick = correctKey !== null && mine && !isCorrect;
          return (
            <li key={option.key}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(option.key)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-md border-2 p-space-md text-left transition-colors',
                  'disabled:cursor-not-allowed',
                  isCorrect
                    ? 'border-secondary bg-secondary-container/50'
                    : isWrongPick
                      ? 'border-error bg-error-container'
                      : mine
                        ? 'border-primary-container bg-primary-fixed'
                        : 'border-outline-variant bg-surface-lowest disabled:opacity-60',
                )}
              >
                <span
                  className={cx(
                    'grid h-11 w-11 shrink-0 place-items-center rounded font-mono text-label-lg',
                    isCorrect
                      ? 'bg-secondary text-on-secondary'
                      : mine
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-highest text-on-surface',
                  )}
                >
                  {option.key}
                </span>
                <span className="min-w-0 text-body-md">{option.text}</span>
                {isCorrect ? <Icon name="check" className="ml-auto h-5 w-5 shrink-0 text-secondary" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
