/**
 * Pruebas de las reglas puras.
 *
 * No tocan Mongo ni sockets: verifican las decisiones de negocio que el
 * marcador, la consola y el pulsador deben interpretar igual.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildQueue,
  canTeamBuzz,
  deltaForVerdict,
  formatClock,
  formatReaction,
  gradeClosedAnswer,
  nextStreak,
  optionsForQuestion,
  rankTeams,
  shouldLockTeam,
  validateQuestion,
} from '../src/controllers/rules';

const question = { points: 100, penalty: 20, lockTeamAfterWrong: true };

describe('puntaje por veredicto', () => {
  it('suma los puntos de la pregunta al acertar', () => {
    assert.equal(deltaForVerdict('correct', question), 100);
  });

  it('resta la penalizacion al fallar', () => {
    assert.equal(deltaForVerdict('incorrect', question), -20);
  });

  it('ceder el turno no mueve el marcador', () => {
    assert.equal(deltaForVerdict('pass', question), 0);
  });

  it('respeta una penalizacion de cero', () => {
    assert.equal(deltaForVerdict('incorrect', { ...question, penalty: 0 }), 0);
  });
});

describe('bloqueo del equipo', () => {
  it('bloquea al que falla cuando la regla esta activa', () => {
    assert.equal(shouldLockTeam('incorrect', question), true);
  });

  it('no bloquea si el docente desactivo la regla', () => {
    assert.equal(shouldLockTeam('incorrect', { ...question, lockTeamAfterWrong: false }), false);
  });

  it('no bloquea al que acierta ni al que cede', () => {
    assert.equal(shouldLockTeam('correct', question), false);
    assert.equal(shouldLockTeam('pass', question), false);
  });
});

describe('racha', () => {
  it('crece al acertar, se corta al fallar y se congela al ceder', () => {
    assert.equal(nextStreak(2, 'correct'), 3);
    assert.equal(nextStreak(5, 'incorrect'), 0);
    assert.equal(nextStreak(4, 'pass'), 4);
  });
});

describe('cola de pulsaciones', () => {
  it('ordena por reloj del servidor', () => {
    const queue = buildQueue([
      { teamId: 'b', participantId: 'p2', at: 200 },
      { teamId: 'a', participantId: 'p1', at: 100 },
      { teamId: 'c', participantId: 'p3', at: 300 },
    ]);
    assert.deepEqual(
      queue.map((q) => q.teamId),
      ['a', 'b', 'c'],
    );
  });

  it('solo deja al primer integrante de cada equipo', () => {
    const queue = buildQueue([
      { teamId: 'a', participantId: 'p1', at: 100 },
      { teamId: 'a', participantId: 'p2', at: 120 },
      { teamId: 'b', participantId: 'p3', at: 150 },
    ]);
    assert.equal(queue.length, 2);
    assert.equal(queue[0].participantId, 'p1');
  });

  it('un equipo bloqueado o ya formado no puede volver a pulsar', () => {
    const queue = [{ teamId: 'a', participantId: 'p1', at: 100 }];
    assert.equal(canTeamBuzz('a', [], queue), false);
    assert.equal(canTeamBuzz('b', ['b'], queue), false);
    assert.equal(canTeamBuzz('c', ['b'], queue), true);
  });
});

describe('preguntas cerradas', () => {
  it('califica la opcion correcta', () => {
    assert.deepEqual(gradeClosedAnswer('A', 'A', question), { correct: true, delta: 100 });
  });

  it('penaliza la incorrecta', () => {
    assert.deepEqual(gradeClosedAnswer('B', 'A', question), { correct: false, delta: -20 });
  });

  it('no mueve el marcador si el equipo no respondio', () => {
    assert.deepEqual(gradeClosedAnswer(null, 'A', question), { correct: false, delta: 0 });
  });

  it('deriva verdadero/falso sin guardarlas en la base', () => {
    assert.deepEqual(
      optionsForQuestion('boolean', []).map((o) => o.key),
      ['V', 'F'],
    );
    assert.deepEqual(optionsForQuestion('open', [{ key: 'A', text: 'x' }]), []);
  });
});

describe('podio', () => {
  const teams = [
    { id: 'a', score: 300, correctCount: 3, bestReactionMs: 900 },
    { id: 'b', score: 500, correctCount: 5, bestReactionMs: 1200 },
    { id: 'c', score: 300, correctCount: 2, bestReactionMs: 400 },
  ];

  it('ordena por puntaje y desempata por aciertos', () => {
    const ranked = rankTeams(teams);
    assert.deepEqual(
      ranked.map((entry) => entry.team.id),
      ['b', 'a', 'c'],
    );
    assert.deepEqual(
      ranked.map((entry) => entry.place),
      [1, 2, 3],
    );
  });

  it('comparte lugar en un empate exacto', () => {
    const ranked = rankTeams([
      { id: 'a', score: 100, correctCount: 1, bestReactionMs: 500 },
      { id: 'b', score: 100, correctCount: 1, bestReactionMs: 500 },
      { id: 'c', score: 50, correctCount: 0, bestReactionMs: null },
    ]);
    assert.deepEqual(
      ranked.map((entry) => entry.place),
      [1, 1, 3],
    );
  });

  it('un equipo sin reaccion registrada queda detras del que si tiene', () => {
    const ranked = rankTeams([
      { id: 'sin', score: 100, correctCount: 1, bestReactionMs: null },
      { id: 'con', score: 100, correctCount: 1, bestReactionMs: 800 },
    ]);
    assert.equal(ranked[0].team.id, 'con');
  });
});

describe('formato', () => {
  it('muestra segundos sueltos y mm:ss cuando pasa del minuto', () => {
    assert.equal(formatClock(45_000), '45');
    assert.equal(formatClock(90_000), '1:30');
    assert.equal(formatClock(0), '0');
  });

  it('redondea hacia arriba para no mostrar 0 con tiempo restante', () => {
    assert.equal(formatClock(1), '1');
  });

  it('formatea reacciones', () => {
    assert.equal(formatReaction(1234), '1.23s');
    assert.equal(formatReaction(null), '--');
  });
});

describe('validacion de preguntas', () => {
  it('acepta una abierta bien formada', () => {
    assert.deepEqual(validateQuestion({ type: 'open', prompt: 'Explica el principio ISP', seconds: 45 }), []);
  });

  it('exige opcion correcta en opcion multiple', () => {
    const errors = validateQuestion({
      type: 'multiple',
      prompt: 'Elige el patron adecuado',
      options: [
        { key: 'A', text: 'Decorator' },
        { key: 'B', text: 'Adapter' },
      ],
    });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /correcta/);
  });

  it('rechaza una pregunta vacia y un tiempo imposible', () => {
    const errors = validateQuestion({ type: 'open', prompt: 'x', seconds: 2 });
    assert.equal(errors.length, 2);
  });

  it('exige V o F en verdadero/falso', () => {
    const errors = validateQuestion({ type: 'boolean', prompt: 'El dominio importa el driver', correctOptionKey: null });
    assert.match(errors[0], /verdadera o falsa/);
  });
});
