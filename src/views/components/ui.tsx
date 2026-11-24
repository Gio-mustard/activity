'use client';

/**
 * KIT DE COMPONENTES.
 *
 * Traduce las reglas de DESIGN.md a React: bordes solidos de 1.5-2px, sombras
 * duras sin blur, cero gradientes, pills a radio completo. Si una pantalla
 * necesita un estilo nuevo, se agrega aqui y no suelto en la pantalla.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Icon, type UiIconName } from '@/lib/icons';
import { teamColor } from '@/lib/teams';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ----------------------------- Superficies ----------------------------- */

export function Card({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'muted' | 'accent' | 'success' | 'danger';
}) {
  const tones = {
    default: 'bg-surface-lowest border-outline-variant',
    muted: 'bg-surface-low border-outline-variant',
    accent: 'bg-primary-fixed/40 border-primary-container',
    success: 'bg-secondary-container/35 border-secondary',
    danger: 'bg-error-container/60 border-error',
  } as const;
  return (
    <section className={cx('rounded-lg border-[1.5px] p-space-md sm:p-space-lg', tones[tone], className)}>
      {children}
    </section>
  );
}

export function SectionTitle({ icon, children, action }: { icon?: UiIconName; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-space-md flex items-center justify-between gap-space-sm">
      <h2 className="flex items-center gap-2 text-headline-sm sm:text-headline-md">
        {icon ? <Icon name={icon} className="h-5 w-5 shrink-0 text-primary" /> : null}
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ------------------------------- Botones ------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-container text-on-primary border-primary-container',
  secondary: 'bg-surface-lowest text-on-surface border-outline-variant hover:border-primary-container',
  success: 'bg-secondary text-on-secondary border-secondary',
  danger: 'bg-error text-on-error border-error',
  warning: 'bg-tertiary-container text-on-tertiary border-tertiary-container',
  ghost: 'bg-transparent text-on-surface-variant border-transparent hover:bg-surface-container',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-label-md gap-1.5',
  md: 'px-4 py-2.5 text-label-lg gap-2',
  lg: 'px-5 py-3.5 text-label-lg gap-2.5',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  hard = false,
  block = false,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: UiIconName;
  iconRight?: UiIconName;
  /** Sombra dura con efecto de presion fisica. */
  hard?: boolean;
  block?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center rounded border-2 font-semibold',
        'transition-all disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:shadow-none enabled:hover:translate-y-1 enabled:active:scale-99',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        hard && 'shadow-hard-sm press-hard-sm',
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon ? <Icon name={icon} className="h-4 w-4 shrink-0" /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} className="h-4 w-4 shrink-0" /> : null}
    </button>
  );
}

/* ------------------------------- Badges -------------------------------- */

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'live' | 'outline';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-surface-container text-on-surface-variant border-transparent',
    primary: 'bg-primary-container text-on-primary border-transparent',
    success: 'bg-secondary-container text-on-secondary-fixed border-transparent',
    danger: 'bg-error-container text-on-error-container border-transparent',
    warning: 'bg-tertiary-fixed text-on-tertiary-fixed border-transparent',
    live: 'bg-error text-on-error border-transparent',
    outline: 'bg-surface-lowest text-on-surface border-on-surface',
  } as const;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1 text-label-sm uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return <span className={cx('anim-live-dot inline-block h-2 w-2 rounded-full bg-current', className)} />;
}

export function LiveBadge({ label = 'EN VIVO' }: { label?: string }) {
  return (
    <Pill tone="live">
      <LiveDot />
      {label}
    </Pill>
  );
}

/** Pill de puntaje con numeros tabulares para que no "bailen" al cambiar. */
export function ScorePill({ score, delta }: { score: number; delta?: number | null }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="tabular text-headline-md font-extrabold">{score}</span>
      <span className="text-label-sm text-on-surface-variant">PTS</span>
      {delta ? (
        <span
          className={cx(
            'anim-flash-in tabular ml-1 rounded-full px-2 py-0.5 text-label-sm',
            delta > 0 ? 'bg-secondary-container text-on-secondary-fixed' : 'bg-error-container text-on-error-container',
          )}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------ Formularios ---------------------------- */

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-label-md text-on-surface">
        {label}
        {required ? <span className="text-error">*</span> : null}
      </span>
      {children}
      {hint && !error ? <span className="mt-1 block text-body-sm text-on-surface-variant">{hint}</span> : null}
      {error ? <span className="mt-1 block text-body-sm text-error">{error}</span> : null}
    </label>
  );
}

const CONTROL =
  'w-full rounded border-[1.5px] border-outline-variant bg-surface-lowest px-3 py-2.5 text-body-md text-on-surface ' +
  'placeholder:text-on-surface-variant/60 focus:border-primary-container focus:outline-none';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(CONTROL, 'min-h-24 resize-y', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(CONTROL, 'appearance-none pr-8', className)} {...rest}>
      {children}
    </select>
  );
}

export function NumberStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded border-[1.5px] border-outline-variant bg-surface-lowest px-2 py-1">
      <span className="pl-1 text-label-md text-on-surface-variant">{label}</span>
      <button
        type="button"
        aria-label={`Quitar ${label}`}
        className="rounded-sm px-2 py-0.5 text-label-lg hover:bg-surface-container disabled:opacity-40"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="tabular w-6 text-center text-label-lg">{value}</span>
      <button
        type="button"
        aria-label={`Agregar ${label}`}
        className="rounded-sm px-2 py-0.5 text-label-lg hover:bg-surface-container disabled:opacity-40"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}

/* ------------------------------ Equipos -------------------------------- */

export function TeamDot({ colorKey, className }: { colorKey: string; className?: string }) {
  return (
    <span
      className={cx('inline-block h-2.5 w-2.5 rounded-full', className)}
      style={{ backgroundColor: teamColor(colorKey).hex }}
    />
  );
}

/** Badge solido de identidad de equipo, con contraste garantizado. */
export function TeamBadge({
  name,
  colorKey,
  live,
  className,
}: {
  name: string;
  colorKey: string;
  live?: boolean;
  className?: string;
}) {
  const color = teamColor(colorKey);
  return (
    <span
      className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-label-md', className)}
      style={{ backgroundColor: color.hex, color: color.on }}
    >
      {live ? <LiveDot /> : null}
      {name}
    </span>
  );
}

/* ------------------------------- Varios -------------------------------- */

export function EmptyState({ icon, title, children }: { icon: UiIconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed border-outline-variant px-space-md py-space-xl text-center">
      <Icon name={icon} className="h-8 w-8 text-outline" />
      <p className="text-headline-sm">{title}</p>
      {children ? <div className="max-w-sm text-body-sm text-on-surface-variant">{children}</div> : null}
    </div>
  );
}

export function Toast({ message, tone = 'error', onClose }: { message: string; tone?: 'error' | 'success' | 'info'; onClose?: () => void }) {
  const tones = {
    error: 'bg-error text-on-error',
    success: 'bg-secondary text-on-secondary',
    info: 'bg-inverse-surface text-inverse-on-surface',
  } as const;
  return (
    <div
      role="status"
      className={cx(
        'anim-flash-in fixed inset-x-space-md bottom-space-md z-50 mx-auto flex max-w-md items-center justify-between',
        'gap-3 rounded border-2 border-on-surface px-4 py-3 text-label-md shadow-hard',
        tones[tone],
      )}
    >
      <span>{message}</span>
      {onClose ? (
        <button type="button" onClick={onClose} aria-label="Cerrar aviso" className="shrink-0 opacity-80">
          <Icon name="close" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

/** Estado de la conexion en vivo, con latencia. */
export function ConnectionChip({ status, latency }: { status: string; latency: number | null }) {
  const online = status === 'online';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-1 text-label-sm',
        online ? 'border-secondary/40 bg-secondary-container/40 text-on-secondary-fixed' : 'border-error/40 bg-error-container text-on-error-container',
      )}
    >
      <Icon name="wifi" className="h-3.5 w-3.5" />
      {online ? `${latency ?? '--'} ms` : status === 'connecting' ? 'conectando' : 'sin conexion'}
    </span>
  );
}
