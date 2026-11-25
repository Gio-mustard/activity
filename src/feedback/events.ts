/**
 * Catalogo de momentos con feedback.
 *
 * Es una lista cerrada a proposito: los componentes piden un MOMENTO del
 * juego ("acerto"), no un efecto concreto ("suena campana"). Asi se puede
 * cambiar que hace cada momento sin tocar una sola pantalla.
 */
export const FEEDBACK_EVENTS = {
  questionStart: 'Arranca el cronometro de una pregunta',
  buzz: 'El alumno pulsa su boton',
  floor: 'Su equipo toma la palabra',
  correct: 'Su equipo acerto',
  incorrect: 'Su equipo fallo',
  timeUp: 'Se acabo el tiempo de la pregunta',
  podium: 'Se muestra el podio',
} as const;

export type FeedbackEvent = keyof typeof FEEDBACK_EVENTS;

/** Ajustes opcionales de una reproduccion. */
export interface FeedbackOptions {
  /**
   * Elemento al que apuntar el efecto. Por omision, toda la pantalla.
   * Lo usan los canales que necesitan un ancla, como la sacudida.
   */
  target?: HTMLElement | null;
}

/**
 * Un canal es una forma de dar feedback: sonido, vibracion, imagen.
 *
 * El provider los recorre en orden y le pasa el mismo momento a todos. Un
 * canal que no sabe que hacer con un momento simplemente no hace nada; no es
 * su trabajo decidir si el momento existe.
 */
export interface FeedbackChannel {
  readonly name: string;
  /**
   * False mientras el canal no tenga nada que reproducir. El provider lo
   * salta, de modo que un canal a medio construir no estorba.
   */
  readonly ready: boolean;
  play(event: FeedbackEvent, options?: FeedbackOptions): void;
  /** Libera lo que haya reservado (nodos, timers, contextos de audio). */
  dispose?(): void;
}
