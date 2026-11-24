/**
 * Pruebas del alta de un banco de preguntas desde JSON.
 *
 * Lo que mas importa: que un lote con una pregunta mala no deje la actividad
 * a medio importar. El docente prepara esto antes de la clase y necesita
 * saber si entro o no entro.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;
let activities: typeof import('../src/controllers/activityController');
let bundle: typeof import('../src/lib/questionBundle');

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB = 'amai_import_test';
  await import('../src/models');
  activities = await import('../src/controllers/activityController');
  bundle = await import('../src/lib/questionBundle');
});

after(async () => {
  const mongoose = (await import('mongoose')).default;
  await mongoose.disconnect();
  await mongo.stop();
});

/** Actividad limpia para cada prueba. */
async function sala() {
  return activities.createActivity({
    title: 'Prueba de importacion',
    teamCount: 2,
    teamCapacity: 5,
    withSamples: false,
  });
}

describe('importacion de preguntas', () => {
  it('acepta un objeto con questions', async () => {
    const activity = await sala();
    const { imported } = await activities.importQuestions(activity, {
      version: 1,
      questions: [
        { type: 'open', prompt: 'Explica el patron MVC y para que sirve.' },
        { type: 'boolean', prompt: 'Un WebSocket es bidireccional.', correctOptionKey: 'V' },
      ],
    });
    assert.equal(imported, 2);
    assert.equal(activity.questions.length, 2);
  });

  it('acepta tambien una lista suelta', async () => {
    const activity = await sala();
    const { imported } = await activities.importQuestions(activity, [
      { type: 'open', prompt: 'Para que sirve un indice en una base de datos?' },
    ]);
    assert.equal(imported, 1);
  });

  it('no deja nada a medias si una pregunta viene mal', async () => {
    const activity = await sala();
    await activities.importQuestions(activity, [{ type: 'open', prompt: 'Esta pregunta si es valida.' }]);
    const antes = activity.questions.length;

    await assert.rejects(
      () =>
        activities.importQuestions(activity, [
          { type: 'open', prompt: 'Esta tambien es valida del todo.' },
          { type: 'multiple', prompt: 'Esta no trae opciones.' },
        ]),
      /Pregunta 2/,
    );

    assert.equal(activity.questions.length, antes, 'no debio entrar ninguna de las dos');
  });

  it('rechaza un JSON que no es lista ni trae questions', async () => {
    const activity = await sala();
    await assert.rejects(() => activities.importQuestions(activity, { preguntas: [] }), /lista de preguntas/);
  });

  it('rechaza un lote vacio', async () => {
    const activity = await sala();
    await assert.rejects(() => activities.importQuestions(activity, []), /ninguna pregunta/);
  });

  it('rechaza un lote mas grande que el tope', async () => {
    const activity = await sala();
    const muchas = Array.from({ length: bundle.MAX_BUNDLE_QUESTIONS + 1 }, (_, i) => ({
      type: 'open' as const,
      prompt: `Pregunta numero ${i} del lote gigante.`,
    }));
    await assert.rejects(() => activities.importQuestions(activity, muchas), /demasiadas/);
  });

  it('la plantilla que se le ofrece al docente se puede importar tal cual', async () => {
    const activity = await sala();
    const { imported } = await activities.importQuestions(activity, bundle.QUESTION_BUNDLE_TEMPLATE);
    assert.equal(imported, 3);
    assert.deepEqual(
      activity.questions.map((q) => q.type),
      ['open', 'multiple', 'boolean'],
    );
  });

  it('el banco exportado se vuelve a importar sin tocarlo', async () => {
    const origen = await sala();
    await activities.importQuestions(origen, bundle.QUESTION_BUNDLE_TEMPLATE);
    const snapshot = await activities.getAdminSnapshot(origen);

    const destino = await sala();
    const { imported } = await activities.importQuestions(destino, bundle.bundleFromQuestions(snapshot.questions));

    assert.equal(imported, snapshot.questions.length);
    const copia = await activities.getAdminSnapshot(destino);
    assert.deepEqual(
      copia.questions.map((q) => [q.type, q.prompt, q.points, q.correctOptionKey]),
      snapshot.questions.map((q) => [q.type, q.prompt, q.points, q.correctOptionKey]),
    );
  });
});
