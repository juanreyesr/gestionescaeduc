import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activitiesInDateRange,
  activityDateKey,
  generateActivityRegisterHTML,
  generateBoardActivitiesHTML,
  sortActivitiesByDate,
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
