import test from 'node:test';
import assert from 'node:assert/strict';
import { datosInformeAnual, htmlInformeAnual } from './informeAnual.js';

const base = {
  anio: 2026, hoy: '2026-11-10',
  actividades: [
    { id: 'a', actividad: 'Duelo', area: 'Clínico', fecha_iso: '2026-03-10', estado_general: 'Completado', monto: 2500, monto_gastado: 2500, publicacion_id: 'p1', aula_event_id: '77' },
    { id: 'b', actividad: 'Taller presencial', area: 'Educativo', fecha_iso: '2026-08-02', estado_general: 'En proceso', monto: 4000, monto_gastado: 0, presupuesto_detalle: { faltan_extras: true } },
    { id: 'c', actividad: 'Cancelada', area: 'Clínico', fecha: '5 dic 2026', estado_general: 'Cancelado', monto: 1000 },
    { id: 'd', actividad: 'Del año pasado', area: 'Clínico', fecha_iso: '2025-05-01', estado_general: 'Completado', monto: 9999, monto_gastado: 9999 },
  ],
  rubros: [{ id: 'r1', nombre: 'Souvenirs', monto_asignado: 3000 }],
  gastosRubro: [{ rubro_id: 'r1', monto: 500, fecha: '2026-04-01' }, { rubro_id: 'r1', monto: 100, fecha: '2025-04-01' }],
  fondos: [{ monto: 1000, fecha: '2026-06-01' }],
  presAnual: [{ anio: 2026, monto: 20000 }],
  publicaciones: [{ id: 'p1', ponente_nombre: 'Mgtr. Ana', modalidad: 'Virtual' }],
  expedientes: [{ id: 'e1', publicacion_id: 'p1', incluidos_en_cv: [] }],
  documentosExp: [{ expediente_id: 'e1', tipo: 'cv' }, { expediente_id: 'e1', tipo: 'factura' }],
  eventosAula: [{ id: 77, participants: '325' }],
};

test('resume el año con presupuesto, participantes y pendientes', () => {
  const d = datosInformeAnual(base);
  assert.equal(d.resumen.planificadas, 2);
  assert.equal(d.resumen.realizadas, 1);
  assert.equal(d.resumen.canceladas, 1);
  assert.equal(d.resumen.participantes, 325);
  assert.equal(d.resumen.disponible, 21000);
  assert.equal(d.resumen.ejecutado, 3000); // 2500 actividad + 500 rubro del año
  assert.equal(d.resumen.saldo, 18000);
  assert.equal(d.detalle[0].ponente, 'Mgtr. Ana');
  assert.equal(d.detalle[0].expediente, '2/7');
  assert.equal(d.porArea.find(a => a.nombre === 'Clínico').total, 1);
  assert.ok(d.pendientes.some(p => /expediente del ponente incompleto/.test(p)));
  assert.ok(d.pendientes.some(p => /Taller presencial: ya pasó su fecha/.test(p)));
  assert.ok(d.pendientes.some(p => /sin gastos extra/.test(p)));
});

test('genera el documento paginable con membrete', () => {
  const html = htmlInformeAnual(datosInformeAnual(base), { fecha: '10 de noviembre de 2026' });
  assert.match(html, /Informe anual de labores 2026/);
  assert.match(html, /class="flow-page"/);
  assert.match(html, /data-split="rows"/);
  assert.match(html, /Q 18,000\.00/);
});
