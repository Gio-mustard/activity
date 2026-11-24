/**
 * Pruebas de la identidad del participante en el navegador.
 *
 * Cubren el caso que dejaba al alumno atrapado: un navegador que no deja
 * escribir en localStorage (Safari en navegacion privada, almacenamiento
 * bloqueado). El servidor ya lo registro, asi que la app tiene que seguir
 * sabiendo quien es aunque no pueda persistirlo.
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

/** localStorage de mentira; `bloqueado` imita a Safari privado. */
function instalarAlmacenamiento({ bloqueado }: { bloqueado: boolean }) {
  const datos = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => {
      if (bloqueado) throw new Error('acceso denegado');
      return datos.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (bloqueado) throw new Error('QuotaExceededError');
      datos.set(k, v);
    },
    removeItem: (k: string) => {
      if (bloqueado) throw new Error('acceso denegado');
      datos.delete(k);
    },
  };
}

const identidad = {
  participantId: 'p1',
  activityCode: 'ABC-1234',
  teamId: 't1',
  name: 'Ana',
  tag: null,
  iconKey: 'terminal',
};

/** Se reimporta en cada prueba para limpiar el respaldo en memoria. */
async function cargarModulo() {
  return import(`../src/lib/client.ts?v=${Math.random()}`);
}

describe('identidad del participante', () => {
  beforeEach(() => instalarAlmacenamiento({ bloqueado: false }));

  it('guarda y recupera cuando el navegador si deja', async () => {
    const client = await cargarModulo();
    client.saveIdentity(identidad);
    assert.deepEqual(client.loadIdentity('ABC-1234'), identidad);
    assert.equal(client.identityIsPersistent(), true);
  });

  it('recupera el lugar aunque el navegador no deje guardar', async () => {
    instalarAlmacenamiento({ bloqueado: true });
    const client = await cargarModulo();
    client.saveIdentity(identidad);

    // Lo que rompia el flujo: aqui devolvia null y el alumno rebotaba
    // al formulario, creando un asiento fantasma en cada intento.
    assert.deepEqual(client.loadIdentity('ABC-1234'), identidad);
    assert.equal(client.identityIsPersistent(), false, 'debe avisar que no persiste');
  });

  it('no confunde salas distintas', async () => {
    const client = await cargarModulo();
    client.saveIdentity(identidad);
    assert.equal(client.loadIdentity('OTRA-0000'), null);
  });

  it('olvida el lugar al salir del equipo', async () => {
    const client = await cargarModulo();
    client.saveIdentity(identidad);
    client.clearIdentity('ABC-1234');
    assert.equal(client.loadIdentity('ABC-1234'), null);
  });

  it('tambien olvida con el almacenamiento bloqueado', async () => {
    instalarAlmacenamiento({ bloqueado: true });
    const client = await cargarModulo();
    client.saveIdentity(identidad);
    client.clearIdentity('ABC-1234');
    assert.equal(client.loadIdentity('ABC-1234'), null);
  });
});
