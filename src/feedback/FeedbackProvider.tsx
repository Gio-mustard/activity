'use client';

/**
 * Punto de entrada del feedback para los componentes.
 *
 * Una pantalla no sabe si un acierto suena, vibra o lanza confeti: pide el
 * momento y ya. Eso permite agregar el sonido mañana sin tocar el pulsador.
 *
 *   const { play } = useFeedback();
 *   play('correct');
 *   play('incorrect', { target: tarjetaRef.current });
 *
 * Fuera del provider el hook devuelve un `play` que no hace nada, en vez de
 * reventar: el feedback es un adorno y jamas debe tumbar una pantalla.
 */
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { FeedbackChannel, FeedbackEvent, FeedbackOptions } from './events';
import { createSoundChannel } from './sound';
import { createHapticsChannel } from './haptics';
import { createVisualChannel } from './visual';

export interface FeedbackApi {
  /** Dispara un momento en todos los canales listos. */
  play: (event: FeedbackEvent, options?: FeedbackOptions) => void;
  /** Que canales estan dando señal ahora mismo. Util para depurar. */
  channels: () => string[];
}

const SILENCIO: FeedbackApi = { play: () => {}, channels: () => [] };

const FeedbackContext = createContext<FeedbackApi>(SILENCIO);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const canales = useRef<FeedbackChannel[] | null>(null);

  if (canales.current === null) {
    canales.current = [createVisualChannel(), createSoundChannel(), createHapticsChannel()];
  }

  useEffect(() => {
    const actuales = canales.current ?? [];
    return () => {
      for (const canal of actuales) canal.dispose?.();
      canales.current = null;
    };
  }, []);

  const api = useMemo<FeedbackApi>(
    () => ({
      play(event, options) {
        for (const canal of canales.current ?? []) {
          if (!canal.ready) continue;
          // Un canal roto no debe arrastrar a los demas ni a la pantalla.
          try {
            canal.play(event, options);
          } catch {
            /* se ignora a proposito */
          }
        }
      },
      channels: () => (canales.current ?? []).filter((c) => c.ready).map((c) => c.name),
    }),
    [],
  );

  return <FeedbackContext.Provider value={api}>{children}</FeedbackContext.Provider>;
}

export function useFeedback(): FeedbackApi {
  return useContext(FeedbackContext);
}
