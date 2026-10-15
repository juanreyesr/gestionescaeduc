import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clasificarModalidad,
  construirBloques,
  mesesDelPeriodo,
  paginarBloques,
  reunirActividades,
  resumirPorMes,
  textoMes,
} from './informeLabores.js';

test('clasifica la modalidad a partir del lugar', () => {
  assert.equal(clasificarModalidad('Zoom'), 'Virtual');
  assert.equal(clasificarModalidad('Salón Sede central, zona 9'), 'Presencial');
  assert.equal(clasificarModalidad('Híbrido: Sede central y Zoom'), 'Híbrida');
  assert.equal(clasificarModalidad('Auditorio y transmisión por Facebook Live'), 'Híbrida');
  assert.equal(clasificarModalidad(''), 'Virtual');
});

test('une aula y solicitudes sin duplicar, dentro del rango', () => {
  const aula = [
    { id: 1, title: 'Taller de Ansiedad', date: '2026-02-10', location: 'Zoom', participants: '120' },
    { id: 2, title: 'Fuera de rango', date: '2025-12-01', location: 'Zoom', participants: 50 },
  ];
  const publicaciones = [
    { id: 'a', actividad_nombre: 'Taller de ansiedad', actividad_fecha: '10/02/2026', actividad_lugar: 'Zoom' },
    { id: 'b', actividad_nombre: 'Conferencia nueva', actividad_fecha: '5 de marzo de 2026', actividad_lugar: 'Sede central zona 9', ponente_nombre: 'Lic. Ana' },
  ];
  const lista = reunirActividades({ aula, publicaciones, desde: '2026-01-01', hasta: '2026-12-31' });
  assert.deepEqual(lista.map(item => item.clave), ['aula:1', 'pub:b']);
  assert.equal(lista[0].asistentes, 120);
  assert.equal(lista[1].asistentes, null);
  assert.equal(lista[1].modalidad, 'Presencial');
});

test('los ajustes guardados corrigen asistentes, modalidad e inclusión', () => {
  const aula = [{ id: 1, title: 'A', date: '2026-02-10', location: 'Zoom', participants: '' }];
  const [item] = reunirActividades({ aula, desde: '2026-01-01', hasta: '2026-12-31', ajustes: { 'aula:1': { asistentes: 30, modalidad: 'Híbrida', incluir: false } } });
  assert.equal(item.asistentes, 30);
  assert.equal(item.modalidad, 'Híbrida');
  assert.equal(item.incluir, false);
});

test('resume por mes sumando en vivo y certificados del aula', () => {
  const actividades = [
    { clave: 'x', fecha: '2026-02-10', modalidad: 'Virtual', asistentes: 100, incluir: true },
    { clave: 'y', fecha: '2026-02-20', modalidad: 'Presencial', asistentes: null, incluir: true },
    { clave: 'z', fecha: '2026-03-05', modalidad: 'Presencial', asistentes: 40, incluir: false },
  ];
  const { meses, totales } = resumirPorMes({ actividades, certificados: [{ mes: '2026-02', total: 15 }, { mes: '2026-04', total: 7 }], desde: '2026-02-01', hasta: '2026-04-30' });
  assert.deepEqual(meses.map(m => m.mes), ['2026-02', '2026-03', '2026-04']);
  assert.equal(meses[0].total, 115);
  assert.equal(meses[0].sinDato, 1);
  assert.equal(meses[1].actividades.length, 0);
  assert.equal(totales.actividades, 2);
  assert.equal(totales.total, 122);
  assert.match(textoMes(meses[0]), /2 actividades \(1 presencial y 1 virtual\)/);
  assert.match(textoMes(meses[2]), /no se registraron actividades/);
});

test('meses del período cruza de año', () => {
  assert.deepEqual(mesesDelPeriodo('2025-11-15', '2026-02-01'), ['2025-11', '2025-12', '2026-01', '2026-02']);
});

test('la paginación no deja títulos huérfanos y repite el encabezado de tabla', () => {
  const bloques = [
    { html: 'intro' },
    { html: 'mes', conSiguiente: true },
    { html: 'enc', conSiguiente: true, encabezado: true },
    { html: 'fila1', repetir: 'enc' },
    { html: 'fila2', repetir: 'enc' },
    { html: 'esp', espacio: true },
    { html: 'firma', firma: true },
  ];
  const alturas = [500, 60, 20, 30, 30, 10, 200];
  const paginas = paginarBloques(bloques, alturas, 600, () => 20);
  assert.deepEqual(paginas.map(p => p.map(b => b.html)), [
    ['intro'],
    ['mes', 'enc', 'fila1', 'fila2', 'esp', 'firma'],
  ]);
  const cortadas = paginarBloques(bloques, [100, 60, 20, 400, 300, 10, 100], 600, () => 20);
  assert.deepEqual(cortadas.map(p => p.map(b => b.html)), [
    ['intro', 'mes', 'enc', 'fila1'],
    ['enc', 'fila2', 'esp', 'firma'],
  ]);
});

test('el documento termina con la firma del coordinador', () => {
  const resumen = resumirPorMes({ actividades: [], certificados: [], desde: '2026-01-01', hasta: '2026-01-31' });
  const bloques = construirBloques({ resumen, desde: '2026-01-01', hasta: '2026-01-31', fechaInforme: '2026-10-15', firmante: { nombre: 'M. A. Juan José Reyes', cargo: 'Coordinador' } });
  const ultimo = bloques[bloques.length - 1];
  assert.equal(ultimo.firma, true);
  assert.match(ultimo.html, /Juan José Reyes/);
  assert.match(bloques[0].html, /15 de octubre de 2026/);
});
