import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activitiesInDateRange,
  activityDateKey,
  generateActivityRegisterHTML,
  generateBoardActivitiesHTML,
  sortActivitiesByDate,
  sortActivitiesByDateDesc,
} from './registroActividadesReport.js';

const activities = [
  { actividad_nombre: 'Septiembre', actividad_fecha: '05 de septiembre de 2026', ponente_nombre: 'Ana' },
  { actividad_nombre: 'Agosto', actividad_fecha: '2026-08-26', ponente_nombre: 'Luis' },
  { actividad_nombre: 'Sin fecha', actividad_fecha: '', ponente_nombre: 'María' },
];

test('ordena el historial por la fecha de la actividad y deja pendientes al final', () => {
  assert.deepEqual(sortActivitiesByDate(activities).map(item => item.actividad_nombre), ['Agosto', 'Septiembre', 'Sin fecha']);
  assert.equal(activityDateKey('05 de septiembre de 2026'), '2026-09-05');
  assert.equal(activityDateKey('25 de agosto'), '2026-08-25');
});

test('selecciona las actividades del período inclusivo', () => {
  assert.deepEqual(activitiesInDateRange(activities, '2026-08-26', '2026-08-26').map(item => item.actividad_nombre), ['Agosto']);
});

test('crea un informe visual con fotografía y un informe tabular para Junta Directiva', () => {
  const detail = generateActivityRegisterHTML([{ ...activities[1], actividad_lugar: 'Auditorio', actividad_hora: '18:00', ponente_foto_url: 'https://example.com/foto.jpg' }], { from: '2026-08-01', to: '2026-08-31' });
  const board = generateBoardActivitiesHTML([activities[1]], { from: '2026-08-01', to: '2026-08-31', signerName: 'M. A. Juan J. Reyes' });
  assert.match(detail, /https:\/\/example\.com\/foto\.jpg/);
  assert.match(detail, /Auditorio/);
  assert.match(board, /Junta Directiva/);
  assert.match(board, /M\. A\. Juan J\. Reyes/);
  assert.match(board, /<table/);
  assert.match(board, /table-layout:fixed;font-size:11\.5px;line-height:1\.35/);
});

test('el historial en pantalla va de la más reciente a la más antigua', () => {
  assert.deepEqual(
    sortActivitiesByDateDesc(activities).map(item => item.actividad_nombre),
    ['Septiembre', 'Agosto', 'Sin fecha'],
  );

  // Las que no tienen fecha legible se quedan al final, no saltan al principio
  // como pasaría si solo se invirtiera la lista.
  const mezcladas = [
    { actividad_nombre: 'Por confirmar', actividad_fecha: 'por confirmar' },
    { actividad_nombre: 'Junio', actividad_fecha: '2026-06-01' },
    { actividad_nombre: 'Julio', actividad_fecha: '2026-07-01' },
    { actividad_nombre: 'Vacía', actividad_fecha: '' },
  ];
  assert.deepEqual(
    sortActivitiesByDateDesc(mezcladas).map(item => item.actividad_nombre),
    ['Julio', 'Junio', 'Por confirmar', 'Vacía'],
  );

  // No muta la lista que recibe.
  const original = [...mezcladas];
  sortActivitiesByDateDesc(mezcladas);
  assert.deepEqual(mezcladas, original);
});
