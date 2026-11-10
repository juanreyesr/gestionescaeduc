import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AULA_URL_DEFAULT, buscarPlanParecido, eventoAulaDesdePublicacion, extraerEnlace, faltantesPublicacion,
  fechaCorta, fechaLarga, modalidadDe, planDesdePublicacion, presupuestoDePublicacion, publicacionDesdePlan,
} from './sincronizacion.js';

const tarifas = [{ grado: 'Licenciatura', monto: 2000 }, { grado: 'Maestría', monto: 2500 }];
const virtual = {
  id: 'pub-1', actividad_nombre: 'Duelo y pérdida', ponente_nombre: 'Mgtr. Ana Pérez', ponente_grado: 'Maestría',
  actividad_fecha: '20 de agosto de 2026', actividad_hora: '19:00', actividad_lugar: 'Zoom', modalidad: 'Virtual',
  actividad_tipo: 'Conferencia', area: 'Clínico', duracion_horas: 2,
  zoom_detalles: 'Enlace de Zoom:\nhttps://us06web.zoom.us/j/123?pwd=abc\nID: 123',
};

test('fechas y enlaces', () => {
  assert.equal(fechaCorta('2026-08-25'), '25 ago 2026');
  assert.equal(fechaLarga('2026-08-05'), '5 de agosto de 2026');
  assert.equal(extraerEnlace(virtual.zoom_detalles), 'https://us06web.zoom.us/j/123?pwd=abc');
  assert.equal(modalidadDe({ actividad_lugar: 'Salón de la sede central' }), 'Presencial');
  assert.equal(modalidadDe({ actividad_lugar: 'Zoom y aula virtual' }), 'Virtual');
});

test('la publicación virtual crea la actividad de planificación con el honorario', () => {
  const plan = planDesdePublicacion(virtual, tarifas);
  assert.equal(plan.publicacion_id, 'pub-1');
  assert.equal(plan.actividad, 'Duelo y pérdida');
  assert.equal(plan.fecha_iso, '2026-08-20');
  assert.equal(plan.fecha, '20 ago 2026');
  assert.equal(plan.trimestre, 'T3 – Jul/Sep');
  assert.equal(plan.monto, 2500);
  assert.equal(plan.sede_modalidad, 'Virtual · Zoom');
  assert.equal(plan.t2_ponente, 'Mgtr. Ana Pérez');
  assert.equal(plan.estado_general, 'En proceso');
  assert.equal(plan.presupuesto_detalle.requiere_extras, false);
  // Si ya existe, no se pisa el estado general
  assert.equal(planDesdePublicacion(virtual, tarifas, { estado_general: 'Completado' }).estado_general, undefined);
});

test('la presencial pide gastos extra y los suma al presupuesto', () => {
  const presencial = { ...virtual, modalidad: 'Presencial', actividad_lugar: 'Auditorio sede central', gastos_extra: [] };
  assert.equal(presupuestoDePublicacion(presencial, tarifas).faltan_extras, true);
  assert.ok(faltantesPublicacion(presencial, tarifas).faltan.some(f => /Gastos extra/.test(f)));
  const conGastos = { ...presencial, gastos_extra: [{ concepto: 'Alimentación', monto: 1500 }, { concepto: 'Souvenirs', monto: '500' }] };
  const p = presupuestoDePublicacion(conGastos, tarifas);
  assert.equal(p.total, 4500);
  assert.equal(p.faltan_extras, false);
  assert.equal(planDesdePublicacion(conGastos, tarifas).monto, 4500);
});

test('evento del aula: usa el Zoom, o el aula virtual si no hay enlace, y conserva datos del aula', () => {
  const ev = eventoAulaDesdePublicacion(virtual);
  assert.equal(ev.date, '2026-08-20');
  assert.equal(ev.time, '19:00');
  assert.equal(ev.horas, '2');
  assert.equal(ev.meetingLink, 'https://us06web.zoom.us/j/123?pwd=abc');
  const sinZoom = eventoAulaDesdePublicacion({ ...virtual, zoom_detalles: '' }, { id: 9, participants: '120', isFull: true, time: '18:00' });
  assert.equal(sinZoom.meetingLink, AULA_URL_DEFAULT);
  assert.equal(sinZoom.participants, '120');
  assert.equal(sinZoom.isFull, true);
  assert.equal(sinZoom.id, 9);
});

test('faltantes: una publicación completa no pide nada', () => {
  assert.deepEqual(faltantesPublicacion(virtual, tarifas).faltan, []);
  const f = faltantesPublicacion({ actividad_nombre: 'X', actividad_fecha: 'pronto' }, tarifas);
  assert.ok(f.bloqueantes.some(x => /Fecha/.test(x)));
});

test('cambios en planificación regresan a la publicación', () => {
  const cambios = publicacionDesdePlan({ actividad: 'Duelo y pérdida (2a. ed.)', fecha_iso: '2026-09-03', tipo: 'Taller', area: 'Clínico', t2_ponente: 'Mgtr. Ana Pérez', sede_modalidad: 'Presencial · Hotel Barceló' }, virtual);
  assert.deepEqual(cambios, {
    actividad_nombre: 'Duelo y pérdida (2a. ed.)', actividad_fecha: '3 de septiembre de 2026',
    actividad_tipo: 'Taller', modalidad: 'Presencial', actividad_lugar: 'Hotel Barceló',
  });
  assert.deepEqual(publicacionDesdePlan(planDesdePublicacion(virtual, tarifas), virtual), {});
});

test('enlaza publicaciones existentes con actividades ya planificadas del mismo nombre', () => {
  const planes = [{ id: 'a', actividad: 'duelo y PERDIDA', fecha_iso: '2026-08-20' }, { id: 'b', actividad: 'Otra' }];
  assert.equal(buscarPlanParecido(virtual, planes).id, 'a');
  assert.equal(buscarPlanParecido(virtual, [{ ...planes[0], publicacion_id: 'x' }]), null);
});

import { comprometidoPendiente, saldoProyectado } from './sincronizacion.js';

test('el saldo proyectado resta lo gastado y solo lo que falta por gastar', () => {
  const actividades = [
    { monto: 2500, monto_gastado: 2000, estado_general: 'En proceso' }, // faltan 500
    { monto: 3000, monto_gastado: 0, estado_general: 'Pendiente' },     // faltan 3000
    { monto: 4000, monto_gastado: 4200, estado_general: 'Completado' }, // ya ejecutado
    { monto: 1000, monto_gastado: 0, estado_general: 'Cancelado' },
  ];
  assert.equal(comprometidoPendiente(actividades), 3500);
  // ejecutado = 2000 + 4200 de actividades + 300 de rubros
  assert.equal(saldoProyectado({ disponible: 20000, ejecutado: 6500, actividades }), 10000);
});
