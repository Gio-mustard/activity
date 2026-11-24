/**
 * Formato del JSON del banco de preguntas.
 *
 * Lo comparten las dos direcciones: el docente exporta su banco con esta
 * forma y vuelve a importarlo tal cual, sin editar nada. Por eso aqui no se
 * guarda ni el id ni el indice, que los pone el servidor.
 *
 * Vive en lib porque lo leen la vista (plantilla y descarga) y el controlador
 * (alta del lote), y ninguno de los dos debe redefinirlo por su cuenta.
 */
import type { AdminQuestion } from './types';

/** Lo que acepta la importacion: una lista suelta o un objeto con `questions`. */
export interface QuestionBundle {
  version?: number;
  questions: unknown[];
}

export const BUNDLE_VERSION = 1;

/** Tope por archivo. Un banco de clase no pasa de unas decenas. */
export const MAX_BUNDLE_QUESTIONS = 100;

/**
 * Ejemplo con los tres tipos y todos los campos escritos.
 *
 * Sirve de plantilla: el docente lo copia, cambia los textos y lo importa.
 * JSON no admite comentarios, asi que la explicacion de cada campo vive en
 * la pantalla, no aqui dentro.
 */
export const QUESTION_BUNDLE_TEMPLATE = {
  version: BUNDLE_VERSION,
  questions: [
    {
      type: 'open',
      prompt: 'Explica para que sirve el patron MVC.',
      context: 'Se responde en voz alta, en dos lineas.',
      topic: 'ARQUITECTURA',
      difficulty: 'media',
      suggestedAnswer: 'Separa los datos, la presentacion y la logica.',
      evaluationCriteria: 'Debe nombrar las tres capas.',
      keywords: ['modelo', 'vista', 'controlador'],
      seconds: 60,
      points: 100,
      penalty: 20,
      reboundSeconds: 15,
      floorSeconds: 25,
      lockTeamAfterWrong: true,
    },
    {
      type: 'multiple',
      prompt: 'Cual capa de MVC guarda la logica de negocio?',
      topic: 'MVC',
      difficulty: 'baja',
      options: [
        { key: 'A', text: 'Modelo' },
        { key: 'B', text: 'Vista' },
        { key: 'C', text: 'Controlador' },
      ],
      correctOptionKey: 'C',
      seconds: 30,
      points: 75,
    },
    {
      type: 'boolean',
      prompt: 'Un WebSocket mantiene la conexion abierta en ambos sentidos.',
      topic: 'REDES',
      correctOptionKey: 'V',
      seconds: 20,
      points: 50,
    },
  ],
};

/** Pasa el banco que ya existe a la forma que acepta la importacion. */
export function bundleFromQuestions(questions: AdminQuestion[]): QuestionBundle {
  return {
    version: BUNDLE_VERSION,
    questions: questions.map((q) => {
      const base: Record<string, unknown> = {
        type: q.type,
        prompt: q.prompt,
        difficulty: q.difficulty,
        seconds: q.seconds,
        points: q.points,
        penalty: q.penalty,
        reboundSeconds: q.reboundSeconds,
        lockTeamAfterWrong: q.lockTeamAfterWrong,
      };
      // Los opcionales solo salen si traen algo, para no ensuciar el archivo.
      if (q.context) base.context = q.context;
      if (q.topic) base.topic = q.topic;
      if (q.type === 'multiple') base.options = q.options;
      if (q.type !== 'open') base.correctOptionKey = q.correctOptionKey;
      if (q.suggestedAnswer) base.suggestedAnswer = q.suggestedAnswer;
      if (q.evaluationCriteria) base.evaluationCriteria = q.evaluationCriteria;
      if (q.keywords.length) base.keywords = q.keywords;
      return base;
    }),
  };
}
