'use client';

/**
 * CANAL HAPTICO — preparado, todavia quieto.
 *
 * Mismo trato que el sonido: el canal ya esta enchufado al provider, pero no
 * vibra nada hasta que se definan los patrones.
 *
 * PARA IMPLEMENTARLO
 * 1. Definir el patron de cada momento en HAPTIC_PATTERNS, en milisegundos
 *    alternando vibracion y pausa, como espera `navigator.vibrate`.
 * 2. En `play`, llamar a `navigator.vibrate(patron)`.
 * 3. Poner `ready` en true cuando HAPTIC_PATTERNS deje de estar vacio.
 *
 * Lo que conviene saber antes:
 * - Safari en iOS NO soporta `navigator.vibrate`. En iPhone, que es la mitad
 *   del salon, este canal no hara nada por mucho que se implemente; el
 *   feedback que si llega a todos es el visual.
 * - Android exige que la pagina haya recibido un toque antes de vibrar.
 */
import type { FeedbackChannel, FeedbackEvent } from './events';

/** Patron de vibracion por momento, en ms. Vacio = canal quieto. */
export const HAPTIC_PATTERNS: Partial<Record<FeedbackEvent, number | number[]>> = {};

export function createHapticsChannel(): FeedbackChannel {
  return {
    name: 'haptics',
    ready: Object.keys(HAPTIC_PATTERNS).length > 0,
    play() {
      /* Sin patrones todavia: ver la nota de arriba. */
    },
  };
}
