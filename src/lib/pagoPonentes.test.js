import test from 'node:test';
import assert from 'node:assert/strict';
import { setOficioExpositores, getOficioExpositores } from './oficioTemplates.js';
import {
  activitiesInMonths,
  activityMonthKey,
  buildPagoLinea,
  buildPagoPonentesCuerpo,
  esOficioPagoPonentes,
  formatHoraActividad,
  getOficioPagoPonentes,
  listActivityMonths,
  monthLabel,
  setOficioPagoPonentes,
  SIN_MES,
  totalPagoPonentes,
} from './pagoPonentes.js';
import { montoPorGrado, parseTarifas } from './tarifario.js';
import { publicationToActivity } from './activitySources.js';

const HISTORIAL = [
  { id: 'a', actividad_nombre: 'Ansiedad hoy', ponente_nombre: 'Ana López', ponente_grado: 'Maestría', actividad_fecha: '2026-08-12', actividad_hora: '18:00' },
  { id: 'b', actividad_nombre: 'Duelo', ponente_nombre: 'Luis Pérez', ponente_grado: 'Licenciatura', actividad_fecha: '20 de agosto de 2026', actividad_hora: '19:30' },
  { id: 'c', actividad_nombre: 'Neurodesarrollo', ponente_nombre: 'Sara Gil', ponente_grado: 'Doctorado', actividad_fecha: '2026-09-03', actividad_hora: '17:00' },
  { id: 'd', actividad_nombre: 'Sin fecha', ponente_nombre: 'Nadie', actividad_fecha: '' },
];

test('agrupa el historial por mes y ordena del más reciente al más antiguo', () => {
  assert.equal(activityMonthKey('20 de agosto de 2026'), '2026-08');
  assert.equal(activityMonthKey(''), '');
  assert.equal(monthLabel('2026-08'), 'agosto de 2026');

  assert.deepEqual(listActivityMonths(HISTORIAL), [
    { key: '2026-09', label: 'septiembre de 2026', total: 1 },
    { key: '2026-08', label: 'agosto de 2026', total: 2 },
    { key: SIN_MES, label: 'Sin fecha reconocida', total: 1 },
  ]);
});

test('reconoce las formas en que se escribe la fecha en el historial', () => {
  // Todas estas se escribieron alguna vez a mano y deben caer en junio de 2026.
  [
    '2026-06-12',
    '2026/06/12',
    '12/06/2026',
    '12-06-2026',
    '12.06.26',
    '12 de junio de 2026',
    '12 de junio del 2026',
    '12 junio 2026',
    'jueves 12 de junio de 2026',
    'del 10 al 12 de junio de 2026',
    '12 de jun. de 2026',
  ].forEach(fecha => assert.equal(activityMonthKey(fecha), '2026-06', `falló con "${fecha}"`));

  // Sin día: no sirve para ordenar, pero sí para agrupar por mes.
  ['junio de 2026', 'junio 2026', '2026-06', '06/2026'].forEach(
    fecha => assert.equal(activityMonthKey(fecha), '2026-06', `falló con "${fecha}"`),
  );

  // Un texto que no es una fecha no se inventa un mes.
  ['', 'por confirmar', 'pendiente'].forEach(
    fecha => assert.equal(activityMonthKey(fecha), '', `falló con "${fecha}"`),
  );
});

test('ninguna actividad queda fuera: las de fecha ilegible caen en su propio grupo', () => {
  const raras = [
    { id: 'r1', actividad_nombre: 'Sin fecha', actividad_fecha: '' },
    { id: 'r2', actividad_nombre: 'Por confirmar', actividad_fecha: 'por confirmar' },
    { id: 'r3', actividad_nombre: 'Junio', actividad_fecha: '12 de junio de 2026' },
  ];
  const meses = listActivityMonths(raras);
  assert.deepEqual(meses.map(mes => mes.key), ['2026-06', SIN_MES]);
  assert.equal(meses.find(mes => mes.key === SIN_MES).total, 2);
  assert.deepEqual(activitiesInMonths(raras, [SIN_MES]).map(item => item.id), ['r2', 'r1']);
  assert.deepEqual(
    activitiesInMonths(raras, ['2026-06', SIN_MES]).map(item => item.id),
    ['r3', 'r2', 'r1'],
  );
});

test('filtra las actividades de los meses marcados, en orden de fecha', () => {
  const agosto = activitiesInMonths(HISTORIAL, ['2026-08']);
  assert.deepEqual(agosto.map(item => item.id), ['a', 'b']);
  assert.deepEqual(activitiesInMonths(HISTORIAL, []).map(item => item.id), []);
  assert.deepEqual(activitiesInMonths(HISTORIAL, ['2026-08', '2026-09']).map(item => item.id), ['a', 'b', 'c']);
});

test('calcula el monto de cada línea con el tarifario y suma el total', () => {
  const lineas = activitiesInMonths(HISTORIAL, ['2026-08', '2026-09'])
    .map(item => buildPagoLinea(item));

  assert.deepEqual(lineas.map(linea => linea.monto), [2500, 2000, 3000]);
  assert.equal(lineas[0].profesional, 'Ana López');
  assert.equal(lineas[0].hora, '18:00');
  assert.equal(totalPagoPonentes(lineas), 7500);
});

test('el grado indicado en el oficio manda sobre el de la solicitud', () => {
  const linea = buildPagoLinea(HISTORIAL[1], { grado: 'Doctorado' });
  assert.equal(linea.grado, 'Doctorado');
  assert.equal(linea.monto, 3000);
});

test('una actividad sin grado académico queda en cero para completarla a mano', () => {
  const linea = buildPagoLinea({ id: 'x', ponente_nombre: 'Sin grado', actividad_nombre: 'Taller' });
  assert.equal(linea.grado, '');
  assert.equal(linea.monto, 0);
});

test('guarda y recupera el detalle sin romper los demás bloques del oficio', () => {
  const lineas = [buildPagoLinea(HISTORIAL[0]), buildPagoLinea(HISTORIAL[2])];
  const base = 'Justificación original.\n\n### Cronograma resumido\n15 de agosto';
  const conExpositores = setOficioExpositores(base, 'Ana López');
  const guardado = setOficioPagoPonentes(conExpositores, lineas);

  assert.deepEqual(getOficioPagoPonentes({ justificacion: guardado }), lineas);
  assert.equal(getOficioExpositores(guardado), 'Ana López');
  assert.match(guardado, /### Cronograma resumido/);
  assert.equal((guardado.match(/### Pago de honorarios a ponentes/g) || []).length, 1);

  const reescrito = setOficioPagoPonentes(guardado, [lineas[0]]);
  assert.equal(getOficioPagoPonentes(reescrito).length, 1);
  assert.equal((reescrito.match(/### Pago de honorarios a ponentes/g) || []).length, 1);

  const vaciado = setOficioPagoPonentes(reescrito, []);
  assert.deepEqual(getOficioPagoPonentes(vaciado), []);
  assert.equal(getOficioExpositores(vaciado), 'Ana López');
});

test('reconoce el motivo del oficio de pago', () => {
  assert.ok(esOficioPagoPonentes('Solicitud de pago de honorarios a ponentes'));
  assert.ok(esOficioPagoPonentes('Pago de los honorarios de agosto'));
  assert.ok(!esOficioPagoPonentes('Solicitud de salón y equipo audiovisual'));
});

test('el cuerpo anuncia el monto total y remite al detalle de la página siguiente', () => {
  const lineas = [buildPagoLinea(HISTORIAL[0]), buildPagoLinea(HISTORIAL[1])];
  const cuerpo = buildPagoPonentesCuerpo(lineas);
  assert.match(cuerpo, /solicitando el pago de los honorarios para los profesionales y las actividades siguientes/);
  assert.match(cuerpo, /Q\. 4,500\.00/);
  assert.match(cuerpo, /página siguiente/);
});

test('formatea la hora de la actividad para el detalle', () => {
  assert.equal(formatHoraActividad('18:00'), '18:00 hrs.');
  assert.equal(formatHoraActividad('7:05'), '07:05 hrs.');
  assert.equal(formatHoraActividad(''), '');
});

test('el modelo de factura toma el honorario del grado académico', () => {
  const tarifas = parseTarifas('[{"grado":"Maestría","monto":2750}]');
  assert.equal(montoPorGrado('maestria', tarifas), 2750);
  assert.equal(montoPorGrado('Doctorado', tarifas), null);

  assert.equal(publicationToActivity(HISTORIAL[0], tarifas).monto, 'Q. 2,750.00');
  assert.equal(publicationToActivity(HISTORIAL[3], tarifas).monto, '');
  assert.equal(publicationToActivity({ ...HISTORIAL[0], monto: 'Q1.00' }, tarifas).monto, 'Q1.00');
});
