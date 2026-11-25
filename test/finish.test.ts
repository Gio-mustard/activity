/**
 * Pruebas del cierre de sesion.
 *
 * Terminar borra datos, asi que conviene fijar por escrito que borra y que
 * no: los participantes salen y los puntajes vuelven a cero, pero la
 * bitacora se queda, porque es el registro de lo que paso en clase.
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;
let activities: typeof import('../src/controllers/activityController');
let participants: typeof import('../src/controllers/participantController');
let live: typeof import('../src/controllers/liveController');
let models: typeof import('../src/models');

let code: string;

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB = 'amai_finish_test';
  models = await import('../src/models');
  activities = await import('../src/controllers/activityController');
  participants = await import('../src/controllers/participantController');
  live = await import('../src/controllers/liveController');
  live.setLiveHooks({ onState: () => {}, onTick: () => {} });
});

after(async () => {
  const mongoose = (await import('mongoose')).default;
  await mongoose.disconnect();
  await mongo.stop();
});

/** Sala con dos equipos, un alumno en cada uno y una pregunta jugada. */
beforeEach(async () => {
  const activity = await activities.createActivity({
    title: 'Prueba de cierre',
    teamCount: 2,
    teamCapacity: 5,
    withSamples: false,
  });
  code = activity.joinCode;
  await activities.addQuestion(activity, {
    type: 'boolean',
    prompt: 'Terminar la sesion debe sacar a los participantes.',
    correctOptionKey: 'V',
    seconds: 30,
  });

  const snapshot = await activities.getAdminSnapshot(activity);
  for (const [i, team] of snapshot.teams.entries()) {
    await participants.joinTeam({ code, teamId: team.id, name: `Alumno ${i + 1}` });
  }

  const room = await live.getRoom(code);
  await live.startActivity(room);
  await live.adjustTeamScore(room, snapshot.teams[0].id, 50);
});

describe('terminar la sesion', () => {
  it('saca a todos los participantes', async () => {
    const room = await live.getRoom(code);
    assert.equal(room.participants.length, 2, 'la sala debia empezar con dos alumnos');

    await live.finishActivityLive(room);

    const quedan = await models.Participant.countDocuments({ activityId: room.activityId });
    assert.equal(quedan, 0);
    assert.equal(room.participants.length, 0, 'tampoco deben quedar en memoria');
  });

  it('devuelve los equipos a los que avisar', async () => {
    const room = await live.getRoom(code);
    const { teamIds } = await live.finishActivityLive(room);
    assert.equal(teamIds.length, 2, 'hay que avisar a los dos equipos que tenian gente');
  });

  it('pone los puntajes en cero', async () => {
    const room = await live.getRoom(code);
    await live.finishActivityLive(room);
    const equipos = await models.Team.find({ activityId: room.activityId });
    assert.deepEqual(
      equipos.map((t) => t.score),
      [0, 0],
    );
  });

  it('NO borra la bitacora de puntos', async () => {
    const room = await live.getRoom(code);
    const antes = await models.ScoreEvent.countDocuments({ activityId: room.activityId });
    assert.ok(antes > 0, 'la preparacion debio dejar al menos un evento');

    await live.finishActivityLive(room);

    const despues = await models.ScoreEvent.countDocuments({ activityId: room.activityId });
    assert.equal(despues, antes, 'la bitacora es el registro de la clase y se conserva');
  });

  it('deja la actividad lista para volver a empezar', async () => {
    const room = await live.getRoom(code);
    await live.finishActivityLive(room);

    assert.equal(room.activity.status, 'draft');
    assert.equal(room.phase, 'idle');
    assert.equal(room.questionIndex, -1);
    assert.equal(room.podiumVisible, false);

    // Y de verdad se puede arrancar otra vez.
    await live.startActivity(room);
    assert.equal(room.activity.status, 'live');
    assert.equal(room.questionIndex, 0);
  });

  it('acabarse el banco no saca a nadie: el docente todavia muestra el podio', async () => {
    const room = await live.getRoom(code);
    await live.nextQuestion(room); // solo hay una pregunta, asi que cierra el banco

    assert.equal(room.activity.status, 'finished');
    const quedan = await models.Participant.countDocuments({ activityId: room.activityId });
    assert.equal(quedan, 2, 'los alumnos siguen dentro hasta que el docente termine');
    const equipos = await models.Team.find({ activityId: room.activityId });
    assert.ok(
      equipos.some((t) => t.score !== 0),
      'los puntos siguen ahi para el podio',
    );
  });
});

