/**
 * Generacion y normalizacion de codigos de acceso.
 *
 * Se excluyen caracteres ambiguos (O/0, I/1/L) porque estos codigos se dictan
 * en voz alta o se leen desde un proyector al fondo del salon.
 */

const SAFE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomChunk(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += SAFE_ALPHABET[Math.floor(Math.random() * SAFE_ALPHABET.length)];
  }
  return out;
}

/** Codigo de sala para participantes. Ej: "SALA-FSW-7KQ2" -> aqui "FSW-7KQ2". */
export function generateJoinCode(): string {
  return `${randomChunk(3)}-${randomChunk(4)}`;
}

/** Codigo de administrador: mas largo, no se proyecta nunca. */
export function generateAdminCode(): string {
  return `${randomChunk(4)}-${randomChunk(4)}`;
}

/** Codigo de acceso directo por equipo. Ej: "DEV-CLN2". */
export function generateTeamCode(seed: string, index: number): string {
  const letters = seed
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, SAFE_ALPHABET[index % SAFE_ALPHABET.length]);
  return `${letters}-${randomChunk(3)}`;
}

/** Normaliza lo que el usuario teclea: mayusculas, sin espacios, con guion. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '').replace(/^SALA-/, '');
}
