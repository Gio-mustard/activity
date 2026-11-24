'use client';

/**
 * Elementos de marca compartidos: encabezado, pie y el logotipo.
 * Mobile first: el encabezado colapsa a una sola fila en pantallas chicas.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/lib/icons';
import { describeStatus, useServerStatus, type ServerStatus } from '@/realtime/useServerStatus';
import { cx } from './ui';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  // El glifo de marca es una silueta rellena, asi que ocupa mas caja visual que
  // los iconos de trazo: va un paso mas chico que ellos dentro del mismo cuadro.
  const glyph = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={cx('grid place-items-center rounded-md bg-primary-container text-on-primary', box)}>
        <Icon name="brand" className={glyph} />
      </span>
      <span className="text-headline-sm leading-none">
        Amai <span className="text-primary">Activity</span>
      </span>
    </span>
  );
}

export function AppHeader({
  code,
  right,
  children,
}: {
  code?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b-[1.5px] border-outline-variant bg-surface-lowest/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-space-md gap-y-2 px-gutter-mobile py-3 sm:px-gutter">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        {code ? (
          <span className="rounded-full border-[1.5px] border-outline-variant px-2.5 py-1 font-mono text-label-sm tracking-wider">
            SALA-{code}
          </span>
        ) : null}
        {children ? <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">{children}</div> : null}
        {right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null}
      </div>
    </header>
  );
}

/**
 * Pie de pagina con el estado real de la sincronizacion.
 *
 * `connection` es opcional: las pantallas que ya tienen una sala abierta le
 * pasan el estado de su propio socket, y asi no se abre un segundo. Las que no
 * (inicio, crear actividad, configuracion) dejan que el pie lata por su cuenta.
 */
export function AppFooter({ className, connection }: { className?: string; connection?: ServerStatus }) {
  const live = useServerStatus(connection);
  const { label, tone } = describeStatus(live.status);
  const dot = tone === 'ok' ? 'bg-secondary' : tone === 'wait' ? 'bg-tertiary-container' : 'bg-error';

  return (
    <footer
      className={cx(
        'mt-space-xl border-t-[1.5px] border-outline-variant px-gutter-mobile py-space-md sm:px-gutter',
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-start justify-between gap-2 text-body-sm text-on-surface-variant">
        <div className='flex flex-col gap-6'>

          <span className='text-body-md'>
            Activity By Amai · <strong className="text-on-surface">Fundamentos de Ingenieria de Software</strong>
          </span>
          <ul className='flex flex-col gap-2'>
            <li>Sergio manuel morquecho soto</li>
            <li>Angeles medina muniz</li>
            <li>Cesar roberto beltran lopez</li>
            <li>pablo ramiro escamilla acevedo</li>
          </ul>

        </div>
        <span
          className={cx('flex items-center gap-1.5', tone === 'bad' && 'text-error')}
          role="status"
          aria-live="polite"
        >
          <span className={cx('inline-block h-2 w-2 shrink-0 rounded-full', dot, tone === 'wait' && 'anim-live-dot')} />
          {label}
          {live.latency !== null ? <span className="font-mono">· {live.latency} ms</span> : null}
        </span>
      </div>
    </footer>
  );
}

/** Contenedor estandar de pagina. */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main
      className={cx(
        'pb-barra-navegador mx-auto w-full px-gutter-mobile py-space-md sm:px-gutter sm:py-space-lg',
        wide ? 'max-w-[1400px]' : 'max-w-3xl',
      )}
    >
      {children}
    </main>
  );
}
