/**
 * Prueba de integracion del motor en vivo contra una MongoDB real en memoria.
 *
 * Recorre el caso de uso completo de una ronda: iniciar, pulsar, encolar el
 * rebote, fallar, ceder al siguiente, acertar y calificar una pregunta cerrada.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;
let mod: typeof import('../src/controllers/liveController');
let activities: typeof import('../src/controllers/activityController');
let participants: typeof import('../src/controllers/participantController');
let models: typeof import('../src/models');

let code: string;
let teamAId: string;
let teamBId: string;
let aliceId: string;
let bobId: string;

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB = 'amai_test';

  // Importacion diferida: los modulos leen MONGODB_URI al cargarse.
  models = await import('../src/models');
  activities = await import('../src/controllers/activityController');
  participants = await import('../src/controllers/participantController');
  mod = await import('../src/controllers/liveController');
  mod.setLiveHooks({ onState: () => {}, onTick: () => {} });

  const activity = await activities.createActivity({
    title: 'Prueba de integracion',
    teamCount: 2,
    teamCapacity: 5,
    withSamples: false,
  });
  code = activity.joinCode;

  await activities.addQuestion(activity, {
    type: 'open',
    prompt: '¿Que principio SOLID se vulnera con una interfaz gorda?',
    suggestedAnswer: 'ISP',
    seconds: 45,
    points: 100,
    penalty: 20,
  });
  await activities.addQuestion(activity, {
    type: 'multiple',
    prompt: '¿Que patron envuelve un servicio sin tocarlo?',
    options: [
      { key: 'A', text: 'Decorator' },
      { key: 'B', text: 'Adapter' },
    ],
    correctOptionKey: 'A',
    seconds: 30,
    points: 50,
    penalty: 10,
  });

  const teams = await models.Team.find({ activityId: activity._id }).sort({ order: 1 });
  teamAId = String(teams[0]._id);
  teamBId = String(teams[1]._id);

  aliceId = (await participants.joinTeam({ code, teamId: teamAId, name: 'Alice' })).participantId;
  bobId = (await participants.joinTeam({ code, teamId: teamBId, name: 'Bob' })).participantId;
});

after(async () => {
  const mongoose = (await import('mongoose')).default;
  await mongoose.disconnect();
  await mongo.stop();
});

async function scoreOf(teamId: string) {
  const team = await models.Team.findById(teamId);
  return team?.score ?? 0;
}

describe('ronda con pulsador', () => {
  it('al iniciar carga la primera pregunta en pausa', async () => {
    const room = await mod.getRoom(code);
    await mod.startActivity(room);
    assert.equal(room.questionIndex, 0);
    assert.equal(room.phase, 'idle');
    assert.equal(room.activity.status, 'live');
  });

  it('habilita los pulsadores al arrancar el cronometro', async () => {
    const room = await mod.getRoom(code);
    await mod.startQuestion(room);
    assert.equal(room.phase, 'running');
    assert.ok(room.buzzOpenedAt);
  });

  it('el primero en pulsar toma la palabra para su equipo', async () => {
    const room = await mod.getRoom(code);
    await mod.buzz(room, aliceId);
    assert.equal(room.phase, 'floor');
    assert.equal(room.floorTeamId, teamAId);
    assert.equal(room.queue.length, 1);
  });

  it('otro equipo puede formarse para el rebote mientras el primero responde', async () => {
    const room = await mod.getRoom(code);
    await mod.buzz(room, bobId);
    assert.equal(room.queue.length, 2);
    assert.equal(room.floorTeamId, teamAId, 'la palabra no debe cambiar de dueno');
  });

  it('el mismo equipo no puede pulsar dos veces', async () => {
    const room = await mod.getRoom(code);
    await assert.rejects(() => mod.buzz(room, aliceId), /ya participo/);
  });

  it('al fallar resta, bloquea y pasa la palabra al siguiente de la cola', async () => {
    const room = await mod.getRoom(code);
    await mod.verdict(room, 'incorrect');
    assert.equal(await scoreOf(teamAId), -20);
    assert.ok(room.lockedTeamIds.has(teamAId));
    assert.equal(room.floorTeamId, teamBId);
    assert.equal(room.phase, 'floor');
  });

  it('al acertar suma los puntos y revela la pregunta', async () => {
    const room = await mod.getRoom(code);
    await mod.verdict(room, 'correct');
    assert.equal(await scoreOf(teamBId), 100);
    assert.equal(room.phase, 'revealed');
    assert.equal(room.floorTeamId, null);
  });

  it('deja bitacora de los dos movimientos', async () => {
    const events = await models.ScoreEvent.find({}).sort({ at: 1 });
    assert.equal(events.length, 2);
    assert.equal(events[0].delta, -20);
    assert.equal(events[1].delta, 100);
  });
});

describe('pregunta de opcion multiple', () => {
  it('avanza a la siguiente pregunta limpiando bloqueos', async () => {
    const room = await mod.getRoom(code);
    await mod.nextQuestion(room);
    assert.equal(room.questionIndex, 1);
    assert.equal(room.phase, 'idle');
    assert.equal(room.lockedTeamIds.size, 0);
    assert.equal(room.queue.length, 0);
  });

  it('rechaza el pulsador en una pregunta cerrada', async () => {
    const room = await mod.getRoom(code);
    await mod.startQuestion(room);
    await assert.rejects(() => mod.buzz(room, aliceId), /desde tu pantalla/);
  });

  it('un equipo no puede responder dos veces', async () => {
    const room = await mod.getRoom(code);
    await mod.submitAnswer(room, aliceId, 'A');
    assert.equal(room.phase, 'running', 'no debe revelar hasta que respondan todos');
    await assert.rejects(() => mod.submitAnswer(room, aliceId, 'B'), /ya respondio/);
  });

  it('se califica sola cuando responde el ultimo equipo', async () => {
    const room = await mod.getRoom(code);
    await mod.submitAnswer(room, bobId, 'B');
    assert.equal(room.phase, 'revealed');
    assert.equal(await scoreOf(teamAId), -20 + 50, 'Alice acerto: +50');
    assert.equal(await scoreOf(teamBId), 100 - 10, 'Bob fallo: -10');
  });

  it('con la pregunta ya revelada no se aceptan mas respuestas', async () => {
    const room = await mod.getRoom(code);
    await assert.rejects(() => mod.submitAnswer(room, bobId, 'A'), /no esta abierta/);
  });
});

describe('cierre', () => {
  it('terminar la actividad la marca como finalizada y muestra el podio', async () => {
    const room = await mod.getRoom(code);
    await mod.nextQuestion(room);
    assert.equal(room.activity.status, 'finished');
    assert.equal(room.podiumVisible, true);
  });

  it('el podio ordena por puntaje', async () => {
    const { buildPodium } = await import('../src/controllers/scoreController');
    const room = await mod.getRoom(code);
    const podium = await buildPodium(room.activityId);
    assert.equal(podium[0].team.id, teamBId);
    assert.equal(podium[0].place, 1);
    assert.equal(podium[1].team.id, teamAId);
  });
});
