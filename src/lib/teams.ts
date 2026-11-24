/**
 * Paleta de equipos y utilidades de identidad visual.
 *
 * DESIGN.md exige contraste AAA sobre cada badge: por eso cada color
 * declara explicitamente su color de texto (`on`).
 */

export interface TeamColor {
  key: string;
  label: string;
  hex: string;
  /** Color de texto sobre el fill solido. */
  on: string;
  /** Fondo tenue para estados seleccionados y filas de marcador. */
  soft: string;
}

export const TEAM_COLORS: TeamColor[] = [
  { key: 'indigo', label: 'Indigo', hex: '#4f46e5', on: '#ffffff', soft: '#eef2ff' },
  { key: 'emerald', label: 'Esmeralda', hex: '#10b981', on: '#ffffff', soft: '#ecfdf5' },
  { key: 'amber', label: 'Ambar', hex: '#f59e0b', on: '#0f172a', soft: '#fffbeb' },
  { key: 'violet', label: 'Violeta', hex: '#8b5cf6', on: '#ffffff', soft: '#f5f3ff' },
  { key: 'blue', label: 'Azul', hex: '#3b82f6', on: '#ffffff', soft: '#eff6ff' },
  { key: 'rose', label: 'Rosa', hex: '#e11d48', on: '#ffffff', soft: '#fff1f2' },
  { key: 'cyan', label: 'Cian', hex: '#0891b2', on: '#ffffff', soft: '#ecfeff' },
  { key: 'lime', label: 'Lima', hex: '#65a30d', on: '#ffffff', soft: '#f7fee7' },
];

const COLOR_MAP = new Map(TEAM_COLORS.map((c) => [c.key, c]));

export function teamColor(key: string | undefined | null): TeamColor {
  return (key && COLOR_MAP.get(key)) || TEAM_COLORS[0];
}

/** Color que corresponde al equipo N, ciclando la paleta. */
export function colorKeyForIndex(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length].key;
}

/** Nombres sugeridos al crear equipos, en el espiritu de los mockups. */
export const SUGGESTED_TEAM_NAMES = [
  'Clean Architecture',
  'Async Await',
  'Git Rebase',
  'Docker Compose',
  'Design Patterns',
  'Unit Testing',
  'Refactoring',
  'Continuous Delivery',
];

export const SUGGESTED_TEAM_ICONS = ['layers', 'bolt', 'branch', 'cube', 'puzzle', 'flask', 'compass', 'rocket'];

/** Iniciales para los avatares apilados del mockup de configuracion. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
