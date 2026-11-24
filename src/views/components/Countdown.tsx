'use client';

/**
 * Cronometro circular. El anillo se vacia conforme pasa el tiempo y cambia a
 * ambar bajo 10 segundos y a rojo bajo 5, como pide DESIGN.md para la lectura
 * periferica durante la cuenta regresiva.
 */
import { formatClock } from '@/controllers/rules';
import { cx } from './ui';

export function Countdown({
  remainingMs,
  totalMs,
  size = 180,
  label = 'SEGUNDOS',
  running = true,
}: {
  remainingMs: number;
  totalMs: number;
  size?: number;
  label?: string;
  running?: boolean;
}) {
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  const color = seconds <= 5 ? '#ba1a1a' : seconds <= 10 ? '#885500' : '#4f46e5';

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#dae2fd" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 150ms linear, stroke 300ms ease' }}
        />
      </svg>
      <div className="relative text-center">
        <p
          className={cx('tabular font-extrabold leading-none', !running && 'opacity-55')}
          style={{ fontSize: size * 0.3, color }}
        >
          {formatClock(remainingMs)}
        </p>
        <p className="mt-1 text-label-sm uppercase tracking-widest text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}

/** Barra lineal, para el cronometro de respuesta verbal. */
export function CountdownBar({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const color = seconds <= 3 ? '#ba1a1a' : seconds <= 7 ? '#885500' : '#006c49';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-highest">
      <div
        className="h-full rounded-full"
        style={{ width: `${ratio * 100}%`, backgroundColor: color, transition: 'width 150ms linear' }}
      />
    </div>
  );
}
