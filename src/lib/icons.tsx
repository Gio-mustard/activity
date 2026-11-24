/**
 * Diccionario central de iconos.
 *
 * En Mongo SOLO se guarda la clave (`iconKey: "terminal"`), nunca el SVG.
 * Asi los avatares se re-estilizan desde aqui sin tocar la base de datos.
 *
 * - AVATAR_ICONS: los 28 avatares que elige el participante y el equipo.
 * - UI_ICONS: glifos de interfaz (chevrons, copiar, reloj...).
 */
import type { SVGProps } from 'react';

/** Primitivas con las que se arma cada icono dentro de un viewBox 24x24. */
type Shape =
  /** Trazo: hereda stroke y grosor del icono. */
  | { k: 'p'; d: string }
  /** Relleno: para glifos que vienen dibujados como silueta, no como linea. */
  | { k: 'f'; d: string }
  | { k: 'c'; cx: number; cy: number; r: number; solid?: boolean }
  | { k: 'r'; x: number; y: number; w: number; h: number; rx?: number };

export type IconDef = { label: string; shapes: Shape[] };

const p = (d: string): Shape => ({ k: 'p', d });
const f = (d: string): Shape => ({ k: 'f', d });
const c = (cx: number, cy: number, r: number, solid = false): Shape => ({ k: 'c', cx, cy, r, solid });
const r = (x: number, y: number, w: number, h: number, rx = 2): Shape => ({ k: 'r', x, y, w, h, rx });

/* ================================================================
   AVATARES (28). El orden define como se pintan en el selector.
   ================================================================ */
export const AVATAR_ICONS = {
  terminal: { label: 'Terminal', shapes: [r(2, 4, 20, 16, 2), p('M7 10l2.5 2.5L7 15'), p('M13 15h4')] },
  code: { label: 'Codigo', shapes: [p('M8 6l-5 6 5 6'), p('M16 6l5 6-5 6')] },
  bug: {
    label: 'Bug',
    shapes: [
      p('M12 7a4 4 0 0 1 4 4v3a4 4 0 0 1-8 0v-3a4 4 0 0 1 4-4z'),
      p('M9 7.5a3 3 0 0 1 6 0'),
      p('M4 11h4M16 11h4M4.5 17l3.5-2M19.5 17L16 15M6 6l2.4 1.8M18 6l-2.4 1.8'),
    ],
  },
  database: {
    label: 'Base de datos',
    shapes: [
      p('M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3z'),
      p('M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6'),
      p('M20 12c0 1.66-3.58 3-8 3s-8-1.34-8-3'),
    ],
  },
  rocket: {
    label: 'Cohete',
    shapes: [
      p('M12 3c2.8 2.6 4.5 6.4 4.5 10.5L12 17l-4.5-3.5C7.5 9.4 9.2 5.6 12 3z'),
      c(12, 9.8, 1.7),
      p('M9 17.5L6.5 21M15 17.5L17.5 21'),
    ],
  },
  branch: { label: 'Rama Git', shapes: [c(6, 6, 2.2), c(6, 18, 2.2), c(18, 7.5, 2.2), p('M6 8.2v7.6'), p('M18 9.7v1.3a4 4 0 0 1-4 4H9')] },
  cpu: {
    label: 'CPU',
    shapes: [r(4, 4, 16, 16, 2.5), r(9, 9, 6, 6, 1), p('M9.5 1.5v2.5M14.5 1.5v2.5M9.5 20v2.5M14.5 20v2.5M1.5 9.5h2.5M1.5 14.5h2.5M20 9.5h2.5M20 14.5h2.5')],
  },
  server: { label: 'Servidor', shapes: [r(3, 4, 18, 7, 1.5), r(3, 13, 18, 7, 1.5), c(7, 7.5, 0.9, true), c(7, 16.5, 0.9, true), p('M11 7.5h6M11 16.5h6')] },
  cloud: { label: 'Nube', shapes: [p('M7 19a4.5 4.5 0 0 1 .4-8.98 6 6 0 0 1 11.3 1.6A3.7 3.7 0 0 1 17.5 19H7z')] },
  shield: { label: 'Escudo', shapes: [p('M12 2.5l7.5 3v5.6c0 4.8-3.2 8.8-7.5 10.4-4.3-1.6-7.5-5.6-7.5-10.4V5.5l7.5-3z'), p('M9 12l2 2 4-4')] },
  key: { label: 'Llave', shapes: [c(8, 15.5, 3.6), p('M10.6 13L20.5 3.1'), p('M17.5 6.1l2.2 2.2M14.6 9l2.2 2.2')] },
  bolt: { label: 'Rayo', shapes: [p('M13.5 2L5 13.5h5.5L9.5 22 19 10.5h-5.8L13.5 2z')] },
  flask: { label: 'Matraz', shapes: [p('M9 2.5h6'), p('M10 2.5v6.2L5.2 18.4A2 2 0 0 0 7 21.5h10a2 2 0 0 0 1.8-3.1L14 8.7V2.5'), p('M7.3 15.5h9.4')] },
  compass: { label: 'Brujula', shapes: [c(12, 12, 9), p('M15.8 8.2l-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1z')] },
  cube: { label: 'Cubo', shapes: [p('M12 2.5l8.5 4.7v9.6L12 21.5 3.5 16.8V7.2L12 2.5z'), p('M3.5 7.2L12 12l8.5-4.8'), p('M12 12v9.5')] },
  layers: { label: 'Capas', shapes: [p('M12 2.5l9 4.7-9 4.7-9-4.7 9-4.7z'), p('M3 12.2l9 4.7 9-4.7'), p('M3 16.8l9 4.7 9-4.7')] },
  puzzle: {
    label: 'Pieza',
    shapes: [p('M10 4.2a2 2 0 1 1 4 0V5.5h2.8a1.2 1.2 0 0 1 1.2 1.2V9.5h1.3a2 2 0 1 1 0 4H18v2.8a1.2 1.2 0 0 1-1.2 1.2H14v-1.3a2 2 0 1 0-4 0V18.5H7.2A1.2 1.2 0 0 1 6 17.3V13.5H4.7a2 2 0 1 1 0-4H6V6.7a1.2 1.2 0 0 1 1.2-1.2H10V4.2z')],
  },
  brain: {
    label: 'Cerebro',
    shapes: [
      p('M12 5.2A3.2 3.2 0 0 0 6.4 3.6 3 3 0 0 0 4.1 8.1a3.4 3.4 0 0 0 .6 5.5A3.2 3.2 0 0 0 8.8 19 3.1 3.1 0 0 0 12 17.2'),
      p('M12 5.2A3.2 3.2 0 0 1 17.6 3.6a3 3 0 0 1 2.3 4.5 3.4 3.4 0 0 1-.6 5.5A3.2 3.2 0 0 1 15.2 19 3.1 3.1 0 0 1 12 17.2'),
      p('M12 5.2v12'),
    ],
  },
  robot: { label: 'Robot', shapes: [p('M12 2v2.5'), c(12, 1.6, 1, true), r(3.5, 5.5, 17, 13, 3), c(9, 11, 1.3, true), c(15, 11, 1.3, true), p('M9.5 15.2h5')] },
  ghost: { label: 'Fantasma', shapes: [p('M5 20.5V11a7 7 0 0 1 14 0v9.5l-2.6-1.9-2.3 1.9-2.1-1.9-2.1 1.9L7.6 18.6 5 20.5z'), c(9.5, 10.5, 1.2, true), c(14.5, 10.5, 1.2, true)] },
  cat: { label: 'Gato', shapes: [p('M4.5 9.5l.8-5.6 4.2 2.8h5l4.2-2.8.8 5.6v4.4a7.5 7.5 0 0 1-15 0V9.5z'), c(9.3, 12, 1.1, true), c(14.7, 12, 1.1, true), p('M10.8 15.4h2.4M3.5 14.5h3M17.5 14.5h3')] },
  owl: {
    label: 'Buho',
    shapes: [p('M4.5 10.5a7.5 7.5 0 0 1 15 0v3a7.5 7.5 0 0 1-15 0v-3z'), p('M5 7.5L4 3l4 2.5M19 7.5L20 3l-4 2.5'), c(9.2, 11, 2.4), c(14.8, 11, 2.4), p('M12 13.2l-1.2 2h2.4l-1.2-2z')],
  },
  star: { label: 'Estrella', shapes: [p('M12 2.8l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9L12 2.8z')] },
  flame: { label: 'Llama', shapes: [p('M12 2.5c3.2 4.2 6.2 6.4 6.2 10.4a6.2 6.2 0 0 1-12.4 0c0-2.1 1-3.3 2.1-4.3.5 1.6 1.6 2.1 2.1 2.1 0-3.1 1-5.3 2-8.2z')] },
  anchor: { label: 'Ancla', shapes: [c(12, 4.5, 2.2), p('M12 6.7V21'), p('M8 10h8'), p('M3.5 14.5a8.5 8.5 0 0 0 17 0')] },
  signal: { label: 'Senal', shapes: [c(12, 18.5, 1.4, true), p('M8.1 14.6a5.5 5.5 0 0 1 7.8 0'), p('M5 11.4a10 10 0 0 1 14 0'), p('M2 8.2a14.5 14.5 0 0 1 20 0')] },
  target: { label: 'Diana', shapes: [c(12, 12, 9), c(12, 12, 5), c(12, 12, 1.4, true)] },
  crown: { label: 'Corona', shapes: [p('M3 7.5l3.8 3.3L12 4l5.2 6.8L21 7.5l-1.8 11H4.8L3 7.5z'), p('M4.8 18.5h14.4')] },

  /* ---- Animales ---- */
  paw: {
    label: 'Huella',
    shapes: [
      c(6.8, 9.2, 1.8),
      c(10.6, 6.6, 1.8),
      c(14.9, 6.8, 1.8),
      c(18.4, 9.8, 1.8),
      p('M12 11c3.3 0 5.6 2.2 5.6 4.6 0 2.1-1.8 3.6-4 3.6-1 0-1.3-.3-1.6-.3s-.6.3-1.6.3c-2.2 0-4-1.5-4-3.6C6.4 13.2 8.7 11 12 11z'),
    ],
  },
  rabbit: {
    label: 'Conejo',
    shapes: [
      p('M8.5 11.5V4.5a1.5 1.5 0 0 1 3 0v6.5'),
      p('M12.5 11V4.5a1.5 1.5 0 0 1 3 0v7'),
      c(12, 15.5, 4.4),
      c(10.3, 15, 0.8, true),
      c(13.7, 15, 0.8, true),
      p('M12 16.6l-.9 1h1.8l-.9-1z'),
      p('M12 17.8v1'),
    ],
  },
  bear: {
    label: 'Oso',
    shapes: [
      c(6.8, 7.6, 2.4),
      c(17.2, 7.6, 2.4),
      c(12, 13.5, 6.4),
      c(12, 15.6, 2.6),
      c(12, 14.2, 0.9, true),
      c(9.4, 11.6, 0.9, true),
      c(14.6, 11.6, 0.9, true),
    ],
  },
  fox: {
    label: 'Zorro',
    shapes: [
      p('M5 7l4.5 3.2a7 7 0 0 1 5 0L19 7c-.5 5-1.6 8.4-2.9 10.6-1.1 1.9-2.5 3.2-4.1 3.2s-3-1.3-4.1-3.2C6.6 15.4 5.5 12 5 7z'),
      c(9.5, 12, 0.85, true),
      c(14.5, 12, 0.85, true),
      c(12, 17.2, 1, true),
      p('M6.6 12.6l2 .6M17.4 12.6l-2 .6'),
    ],
  },
  fish: {
    label: 'Pez',
    shapes: [
      p('M17.8 12c-2.1 3.2-5.2 5-8.3 5S3.3 15.2 1.6 12c1.7-3.2 4.8-5 7.9-5s6.2 1.8 8.3 5z'),
      p('M17.8 12l4.4-3.6v7.2z'),
      c(6, 10.8, 0.9, true),
    ],
  },
  whale: {
    label: 'Ballena',
    shapes: [
      p('M2.5 14a8 5.5 0 1 1 16 0 8 5.5 0 1 1-16 0'),
      p('M18.5 14c1.4-1.8 2.6-2.8 3.5-3.2-.5 1.4-.7 2.5-.7 3.2 0 .7.2 1.8.7 3.2-.9-.4-2.1-1.4-3.5-3.2z'),
      p('M8.6 8.4c-.6-2.2.2-3.9 2.4-4.9'),
      c(11.9, 3.1, 0.9, true),
      c(6.4, 13.6, 0.9, true),
      p('M2.9 16c1.8 1.1 3.7 1.4 5.5 1'),
    ],
  },
  turtle: {
    label: 'Tortuga',
    shapes: [
      p('M4.5 16a7.5 6 0 0 1 15 0z'),
      p('M4.5 16h15'),
      p('M12 10v6M8.2 11.4L6.6 15.6M15.8 11.4l1.6 4.2'),
      c(21, 14.5, 1.8),
      p('M7.5 16v2.6M16.5 16v2.6'),
    ],
  },
  butterfly: {
    label: 'Mariposa',
    shapes: [
      p('M12 8.2v8.4'),
      p('M12 8.2l-2.2-2.8M12 8.2l2.2-2.8'),
      p('M12 9.4C10.2 6 4 5.4 3.4 8.8c-.5 2.8 3.4 4.2 8.6 3.4z'),
      p('M12 9.4C13.8 6 20 5.4 20.6 8.8c.5 2.8-3.4 4.2-8.6 3.4z'),
      p('M12 12.8c-1.6 1.2-6 1.6-6 4.4 0 2.4 4.4 2.6 6-1.6z'),
      p('M12 12.8c1.6 1.2 6 1.6 6 4.4 0 2.4-4.4 2.6-6-1.6z'),
    ],
  },
  bee: {
    label: 'Abeja',
    shapes: [
      p('M12 8.8a3.6 3.6 0 0 1 3.6 3.6v3.4a3.6 3.6 0 0 1-7.2 0v-3.4A3.6 3.6 0 0 1 12 8.8z'),
      p('M8.5 12.6h7M8.6 15.4h6.8'),
      p('M10.2 9.2C7.6 5.8 3.4 7 4.6 9.6c.8 1.8 3.6 1.6 5.6-.4z'),
      p('M13.8 9.2c2.6-3.4 6.8-2.2 5.6.4-.8 1.8-3.6 1.6-5.6-.4z'),
      p('M10.8 8.4L9.4 5.6M13.2 8.4l1.4-2.8'),
    ],
  },
  penguin: {
    label: 'Pinguino',
    shapes: [
      p('M12 3.4c3.4 0 5.8 3 5.8 7.2v4.6c0 3-2.6 5.2-5.8 5.2s-5.8-2.2-5.8-5.2v-4.6c0-4.2 2.4-7.2 5.8-7.2z'),
      p('M6.3 11.2c-.9 1.8-1 4.4-.2 6.3M17.7 11.2c.9 1.8 1 4.4.2 6.3'),
      c(10.2, 8.6, 0.85, true),
      c(13.8, 8.6, 0.85, true),
      p('M10.7 10.6h2.6L12 12.6z'),
      p('M9.4 19.8l-2 1.8M14.6 19.8l2 1.8'),
    ],
  },
  frog: {
    label: 'Rana',
    shapes: [
      c(8.2, 7.6, 2.4),
      c(15.8, 7.6, 2.4),
      c(8.2, 7.6, 0.9, true),
      c(15.8, 7.6, 0.9, true),
      p('M4.4 13.6a7.6 5.6 0 0 1 15.2 0c0 3-3.4 5.4-7.6 5.4s-7.6-2.4-7.6-5.4z'),
      p('M8.4 15.2a4.5 4.5 0 0 0 7.2 0'),
    ],
  },
  snail: {
    label: 'Caracol',
    shapes: [
      p('M14 10.8a1.5 1.5 0 1 1 3 0a2.6 2.6 0 1 1-5.2 0a3.7 3.7 0 1 1 7.4 0a4.6 4.6 0 1 1-9.2 0'),
      p('M19.6 18.4H5c0-2.4 1.8-4.3 4.2-4.6'),
      p('M6.8 15.4L5.4 12.6M9 14.2l-.2-2.6'),
    ],
  },

  /* ---- Planetas y espacio ---- */
  sun: {
    label: 'Sol',
    shapes: [
      c(12, 12, 4.5),
      p('M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8'),
    ],
  },
  moon: {
    label: 'Luna',
    shapes: [p('M15.5 3.2A9 9 0 1 0 20.8 14 7.2 7.2 0 0 1 15.5 3.2z')],
  },
  earth: {
    label: 'Tierra',
    shapes: [c(12, 12, 9), p('M3 12h18'), p('M12 3a4.5 9 0 0 0 0 18 4.5 9 0 0 0 0-18')],
  },
  mars: {
    label: 'Marte',
    shapes: [c(12, 12, 9), p('M6.6 5.4a9 9 0 0 1 9.2-.4'), c(9.4, 10.2, 1.6), c(14.6, 14.4, 2.2), c(8.4, 15.6, 1)],
  },
  jupiter: {
    label: 'Jupiter',
    shapes: [c(12, 12, 9), p('M3.8 8.5h16.4M3 12h18M3.8 15.5h16.4'), c(15, 9.9, 1.7)],
  },
  saturn: {
    label: 'Saturno',
    shapes: [c(12, 12, 4.6), p('M21.4 8.6a10 3 -20 1 0-18.8 6.8 10 3 -20 1 0 18.8-6.8z')],
  },
  comet: {
    label: 'Cometa',
    shapes: [
      c(16.5, 7.5, 3),
      p('M14.4 9.6C10.6 11.8 6.6 15.8 3.4 21'),
      p('M17.4 10.3c-2.2 2.4-4 5.2-5.4 8.6'),
      c(5.4, 9.4, 0.8, true),
      c(9.8, 5.2, 0.7, true),
    ],
  },
  galaxy: {
    label: 'Galaxia',
    shapes: [
      c(12, 12, 1.5, true),
      p('M12 9.6c2.3 0 4.2 1.1 4.2 2.6s-1.9 2.6-4.2 2.6-5.6-1.7-5.6-4.2S9.2 5.5 13 5.5s7.5 2.9 7.5 6.5'),
      p('M12 14.4c-2.3 0-4.2-1.1-4.2-2.6s1.9-2.6 4.2-2.6 5.6 1.7 5.6 4.2S14.8 18.5 11 18.5s-7.5-2.9-7.5-6.5'),
    ],
  },
} as const satisfies Record<string, IconDef>;

export type AvatarKey = keyof typeof AVATAR_ICONS;
export const AVATAR_KEYS = Object.keys(AVATAR_ICONS) as AvatarKey[];
export const DEFAULT_AVATAR_KEY: AvatarKey = 'terminal';

/** Valida una clave que viene de Mongo o del cliente antes de renderizar. */
export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === 'string' && value in AVATAR_ICONS;
}

/** Normaliza cualquier entrada a una clave valida (fallback al avatar por defecto). */
export function toAvatarKey(value: unknown): AvatarKey {
  return isAvatarKey(value) ? value : DEFAULT_AVATAR_KEY;
}

/* ================================================================
   ICONOS DE INTERFAZ
   ================================================================ */
export const UI_ICONS = {
  check: { label: 'Correcto', shapes: [p('M4.5 12.5l5 5 10-11')] },
  close: { label: 'Cerrar', shapes: [p('M5.5 5.5l13 13M18.5 5.5l-13 13')] },
  chevronRight: { label: 'Siguiente', shapes: [p('M9 5l7 7-7 7')] },
  chevronLeft: { label: 'Anterior', shapes: [p('M15 5l-7 7 7 7')] },
  chevronDown: { label: 'Desplegar', shapes: [p('M5 9l7 7 7-7')] },
  chevronUp: { label: 'Plegar', shapes: [p('M5 15l7-7 7 7')] },
  copy: { label: 'Copiar', shapes: [r(8, 8, 13, 13, 2), p('M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3')] },
  clock: { label: 'Tiempo', shapes: [c(12, 12, 9), p('M12 7v5.5l3.5 2')] },
  users: { label: 'Equipo', shapes: [c(9, 8, 3.3), p('M3 19.5a6 6 0 0 1 12 0'), p('M16 5.5a3.3 3.3 0 0 1 0 6.4'), p('M17 14.5a6 6 0 0 1 4 5')] },
  user: { label: 'Persona', shapes: [c(12, 8, 3.6), p('M5 20.5a7 7 0 0 1 14 0')] },
  play: { label: 'Iniciar', shapes: [p('M7 4.5l12 7.5-12 7.5v-15z')] },
  pause: { label: 'Pausar', shapes: [p('M9 5v14M15 5v14')] },
  plus: { label: 'Agregar', shapes: [p('M12 5v14M5 12h14')] },
  minus: { label: 'Quitar', shapes: [p('M5 12h14')] },
  trash: { label: 'Eliminar', shapes: [p('M4 7h16'), p('M9 7V4.5h6V7'), p('M6 7l1 13h10l1-13'), p('M10.5 11v5.5M13.5 11v5.5')] },
  edit: { label: 'Editar', shapes: [p('M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z')] },
  hand: { label: 'Pedir la palabra', shapes: [p('M9 11V4.8a1.6 1.6 0 0 1 3.2 0V11'), p('M12.2 11V3.6a1.6 1.6 0 0 1 3.2 0V11'), p('M15.4 11.5V6.4a1.6 1.6 0 0 1 3.2 0v8.1a7 7 0 0 1-7 7h-.7a6 6 0 0 1-4.6-2.2L3 14.5a1.7 1.7 0 0 1 2.6-2.2L9 15.5V11')] },
  trophy: { label: 'Podio', shapes: [p('M7 4h10v5a5 5 0 0 1-10 0V4z'), p('M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11'), p('M12 14v3.5M8.5 20.5h7')] },
  projector: { label: 'Proyector', shapes: [r(2.5, 6, 19, 11, 2), c(9, 11.5, 2.8), c(17, 9.5, 1, true), p('M6 19.5v1.5M18 19.5v1.5')] },
  link: { label: 'Enlace', shapes: [p('M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.3'), p('M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5')] },
  settings: { label: 'Configuracion', shapes: [c(12, 12, 3.2), p('M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1L5.3 5.3')] },
  refresh: { label: 'Reiniciar', shapes: [p('M20 12a8 8 0 1 1-2.6-5.9'), p('M20 3.5V9h-5.5')] },
  qr: { label: 'Codigo QR', shapes: [r(3.5, 3.5, 6.5, 6.5, 1), r(14, 3.5, 6.5, 6.5, 1), r(3.5, 14, 6.5, 6.5, 1), p('M14 14h3v3h-3zM19 19h1.5v1.5H19M14 20.5h3')] },
  wifi: { label: 'Conexion', shapes: [c(12, 18.5, 1.4, true), p('M8.1 14.6a5.5 5.5 0 0 1 7.8 0'), p('M5 11.4a10 10 0 0 1 14 0')] },
  arrowRight: { label: 'Continuar', shapes: [p('M4 12h15M13 6l6 6-6 6')] },
  arrowLeft: { label: 'Regresar', shapes: [p('M20 12H5M11 6l-6 6 6 6')] },
  skip: { label: 'Saltar', shapes: [p('M5 5l9 7-9 7V5z'), p('M18 5v14')] },
  flag: { label: 'Terminar', shapes: [p('M5 21V4'), p('M5 5h11l-1.8 3.5L16 12H5')] },
  alert: { label: 'Atencion', shapes: [p('M12 3.5l9.5 16.5H2.5L12 3.5z'), p('M12 10v4'), c(12, 17, 0.9, true)] },
  lock: { label: 'Bloqueado', shapes: [r(4.5, 10.5, 15, 10, 2), p('M8 10.5V7.5a4 4 0 0 1 8 0v3')] },
  puzzle: {
    label: 'Reto',
    shapes: [p('M10 4.2a2 2 0 1 1 4 0V5.5h2.8a1.2 1.2 0 0 1 1.2 1.2V9.5h1.3a2 2 0 1 1 0 4H18v2.8a1.2 1.2 0 0 1-1.2 1.2H14v-1.3a2 2 0 1 0-4 0V18.5H7.2A1.2 1.2 0 0 1 6 17.3V13.5H4.7a2 2 0 1 1 0-4H6V6.7a1.2 1.2 0 0 1 1.2-1.2H10V4.2z')],
  },
  shield: {
    label: 'Validacion',
    shapes: [p('M12 2.5l7.5 3v5.6c0 4.8-3.2 8.8-7.5 10.4-4.3-1.6-7.5-5.6-7.5-10.4V5.5l7.5-3z'), p('M9 12l2 2 4-4')],
  },
  brand: { label: 'Amai Activity', shapes: [f('M9.53,21.1q-1.1-0.9-1.38-2.3q-1.33,0.43-2.68-0.05T3.4,17.1q-0.75-1.2-0.55-2.66T4.15,12Q3.1,11.05 2.89,9.65t0.46-2.6T5.39,5.31Q6.75,4.77 8.1,5.2Q8.38,3.8 9.48,2.9T12,2t2.53,0.9T15.9,5.2q1.4-0.43 2.71,0.07t2.04,1.78q0.68,1.25 0.49,2.61Q20.95,11.02 19.85,12q1.1,0.97 1.31,2.41T20.7,17.1q-0.73,1.27-2.04,1.7t-2.71,0q-0.28,1.4-1.38,2.3T12.05,22T9.53,21.1ZM12.05,20q1.18,0 1.76-1.01T13.8,17l-0.7-1.15q-0.28,0.07-0.53,0.11T12.05,16q-0.25,0-0.51-0.04T11,15.85L10.3,17q-0.6,0.98-0.01,1.99T12.05,20Zm-7-4q0.6,1.02 1.76,1.02T8.55,16L9.2,14.85Q9,14.65 8.83,14.43t-0.3-0.47Q8.4,13.73 8.3,13.49T8.13,13H6.8q-1.18,0-1.75,0.99q-0.58,0.99 0,2.01Zm10.4,0q0.58,1.02 1.74,1.02T18.95,16q0.58-1.03 0-2.01Q18.38,13 17.2,13H15.88q-0.05,0.25-0.16,0.49q-0.11,0.24-0.24,0.46q-0.13,0.25-0.3,0.47T14.8,14.85L15.45,16ZM12,12ZM8.13,11q0.08-0.28 0.19-0.54Q8.43,10.2 8.55,9.98T8.84,9.55T9.2,9.15L8.55,8Q7.98,6.97 6.81,6.97T5.05,8q-0.58,1.02 0,2.01T6.8,11H8.13Zm9.07,0q1.18,0 1.75-0.99q0.58-0.99 0-2.01q-0.6-1.03-1.76-1.03q-1.16,0-1.74,1.03L14.8,9.15q0.2,0.2 0.36,0.4t0.29,0.43t0.24,0.49Q15.8,10.73 15.88,11H17.2ZM10.93,8.15q0.28-0.07 0.54-0.11T12,8q0.28,0 0.54,0.04t0.54,0.11L13.75,7q0.58-0.98 0-1.99T12,4T10.25,5q-0.57,1 0,2l0.68,1.15Zm0,0q0.28-0.07 0.54-0.11T12,8q0.28,0 0.54,0.04t0.54,0.11Q12.8,8.07 12.54,8.04T12,8T11.46,8.04T10.93,8.15Zm-2.4,5.8Q8.4,13.73 8.3,13.49T8.13,13Q8.2,13.25 8.3,13.49q0.1,0.24 0.22,0.46q0.13,0.25 0.3,0.47T9.2,14.85Q9,14.65 8.83,14.43t-0.3-0.47ZM8.13,11q0.08-0.28 0.19-0.54Q8.43,10.2 8.55,9.98T8.84,9.55T9.2,9.15Q9,9.35 8.84,9.55T8.55,9.98T8.31,10.46Q8.2,10.73 8.13,11Zm3.93,5q-0.25,0-0.51-0.04T11,15.85q0.28,0.07 0.54,0.11T12.05,16q0.28,0 0.53-0.04t0.53-0.11q-0.28,0.07-0.53,0.11T12.05,16Zm2.75-1.15q0.2-0.2 0.38-0.43t0.3-0.47q0.13-0.22 0.24-0.46T15.88,13q-0.05,0.25-0.16,0.49q-0.11,0.24-0.24,0.46q-0.13,0.25-0.3,0.47T14.8,14.85ZM15.88,11q-0.07-0.28-0.19-0.54T15.45,9.98T15.16,9.55T14.8,9.15q0.2,0.2 0.36,0.4t0.29,0.43t0.24,0.49Q15.8,10.73 15.88,11Zm-2.46,2.41Q14,12.83 14,12t-0.59-1.41T12,10t-1.41,0.59Q10,11.18 10,12t0.59,1.41T12,14t1.41-0.59Z')] },
  key: { label: 'Codigo de acceso', shapes: [c(8, 15.5, 3.6), p('M10.6 13L20.5 3.1'), p('M17.5 6.1l2.2 2.2M14.6 9l2.2 2.2')] },
  send: { label: 'Enviar', shapes: [p('M21 3L10.5 13.5M21 3l-6.8 18-3.7-7.5L3 10l18-7z')] },
} as const satisfies Record<string, IconDef>;

export type UiIconName = keyof typeof UI_ICONS;

/* ================================================================
   Render
   ================================================================ */
function renderShapes(shapes: readonly Shape[]) {
  return shapes.map((s, i) => {
    if (s.k === 'p') return <path key={i} d={s.d} />;
    if (s.k === 'f') return <path key={i} d={s.d} fill="currentColor" stroke="none" />;
    if (s.k === 'c') {
      return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...(s.solid ? { fill: 'currentColor', stroke: 'none' } : {})} />;
    }
    return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} />;
  });
}

type BaseIconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { strokeWidth?: number; title?: string };

function BaseIcon({ shapes, title, strokeWidth = 1.8, ...rest }: BaseIconProps & { shapes: readonly Shape[] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {renderShapes(shapes)}
    </svg>
  );
}

/** Avatar de participante o equipo. Acepta cualquier string y hace fallback seguro. */
export function AvatarIcon({ iconKey, ...rest }: BaseIconProps & { iconKey: string }) {
  const def = AVATAR_ICONS[toAvatarKey(iconKey)];
  return <BaseIcon shapes={def.shapes} {...rest} />;
}

/** Glifo de interfaz. */
export function Icon({ name, ...rest }: BaseIconProps & { name: UiIconName }) {
  return <BaseIcon shapes={UI_ICONS[name].shapes} {...rest} />;
}

/** Etiqueta legible de un avatar, para accesibilidad y tooltips. */
export function avatarLabel(iconKey: string): string {
  return AVATAR_ICONS[toAvatarKey(iconKey)].label;
}
