/**
 * Formato del JSON del banco de preguntas.
 *
 * Define que acepta la importacion, para que la vista y el controlador no lo
 * interpreten cada uno por su cuenta.
 */

/** Lo que acepta la importacion: una lista suelta o un objeto con `questions`. */
export interface QuestionBundle {
  version?: number;
  questions: unknown[];
}

export const BUNDLE_VERSION = 1;

/** Tope por archivo. Un banco de clase no pasa de unas decenas. */
export const MAX_BUNDLE_QUESTIONS = 100;
