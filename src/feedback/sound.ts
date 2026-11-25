'use client';

/**
 * CANAL DE SONIDO — preparado, todavia mudo.
 *
 * La tuberia esta puesta: el canal existe, recibe los momentos y el provider
 * ya lo recorre. Lo unico que falta son los sonidos, y por eso `ready` es
 * false y `play` no hace nada: un canal vacio no debe fingir que suena.
 *
 * PARA IMPLEMENTARLO
 * 1. Dejar los archivos en `public/sounds/` (ogg o mp3, cortos, normalizados).
 * 2. Apuntarlos en SOUND_FILES; no hace falta uno por momento.
 * 3. En `play`, reproducir el archivo del momento recibido.
 * 4. Poner `ready` en true cuando SOUND_FILES deje de estar vacio.
 *
 * Dos cosas a tener en cuenta al hacerlo, porque muerden:
 * - Los navegadores no dejan sonar nada hasta que el usuario toca la pagina.
 *   El primer toque del alumno (unirse, o el propio pulsador) es el momento
 *   de desbloquear el audio.
 * - En clase hay treinta telefonos juntos: conviene que el docente pueda
 *   apagarlo, y que el volumen por omision sea bajo.
 */
import type { FeedbackChannel, FeedbackEvent } from './events';

/** Ruta del sonido de cada momento. Vacio = canal mudo. */
export const SOUND_FILES: Partial<Record<FeedbackEvent, string>> = {};

export function createSoundChannel(): FeedbackChannel {
  return {
    name: 'sound',
    ready: Object.keys(SOUND_FILES).length > 0,
    play() {
      /* Sin sonidos todavia: ver la nota de arriba. */
    },
  };
}
