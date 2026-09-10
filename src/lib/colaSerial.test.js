import test from 'node:test';
import assert from 'node:assert/strict';
import { crearColaSerial } from './colaSerial.js';

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

test('dos guardados que se solapan no se intercalan', async () => {
  const cola = crearColaSerial();
  const registro = [];

  // Reproduce el patrón que duplicaba los puntos de la agenda: borrar, esperar
  // (la ida y vuelta a la red) y volver a insertar.
  const guardar = (etiqueta, demora) => cola(async () => {
    registro.push(`borra ${etiqueta}`);
    await esperar(demora);
    registro.push(`inserta ${etiqueta}`);
  });

  // El segundo arranca mientras el primero sigue esperando la red.
  await Promise.all([guardar('A', 20), guardar('B', 1)]);

  assert.deepEqual(registro, ['borra A', 'inserta A', 'borra B', 'inserta B']);
});

test('un guardado que falla no deja la cola trabada', async () => {
  const cola = crearColaSerial();
  const registro = [];

  const falla = cola(async () => { throw new Error('sin conexión'); });
  await assert.rejects(falla, /sin conexión/);

  await cola(async () => { registro.push('siguiente'); });
  assert.deepEqual(registro, ['siguiente']);
});

test('respeta el orden en que se pidieron los guardados', async () => {
  const cola = crearColaSerial();
  const registro = [];
  const tareas = [30, 1, 10].map((demora, indice) => cola(async () => {
    await esperar(demora);
    registro.push(indice);
  }));
  await Promise.all(tareas);
  assert.deepEqual(registro, [0, 1, 2]);
});
