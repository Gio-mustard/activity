'use client';

/** Selector de avatar/icono sobre el diccionario de lib/icons.tsx. */
import { AVATAR_KEYS, AvatarIcon, avatarLabel } from '@/lib/icons';
import { TEAM_COLORS, teamColor } from '@/lib/teams';
import { cx } from './ui';

export function IconPicker({
  value,
  onChange,
  colorKey,
  columns = 7,
}: {
  value: string;
  onChange: (next: string) => void;
  colorKey?: string;
  columns?: number;
}) {
  const color = colorKey ? teamColor(colorKey) : null;
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(44px, 1fr))`, maxWidth: columns * 56 }}
    >
      {AVATAR_KEYS.map((key) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            title={avatarLabel(key)}
            aria-label={avatarLabel(key)}
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={cx(
              'grid aspect-square place-items-center rounded border-2 transition-colors',
              active
                ? 'border-primary-container bg-primary-fixed text-primary'
                : 'border-outline-variant bg-surface-lowest text-on-surface-variant hover:border-primary-container',
            )}
            style={active && color ? { borderColor: color.hex, backgroundColor: color.soft, color: color.hex } : undefined}
          >
            <AvatarIcon iconKey={key} className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TEAM_COLORS.map((color) => (
        <button
          key={color.key}
          type="button"
          title={color.label}
          aria-label={color.label}
          aria-pressed={color.key === value}
          onClick={() => onChange(color.key)}
          className={cx(
            'h-9 w-9 rounded-full border-2 transition-transform',
            color.key === value ? 'border-on-surface scale-110' : 'border-transparent',
          )}
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  );
}
