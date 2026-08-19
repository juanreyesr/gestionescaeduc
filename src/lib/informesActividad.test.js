import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInformeActividadDraft,
  escapeInformeHTML,
  formatInformeDate,
  generateInformeActividadHTML,
  normalizeInformeDuration,
  replaceInformePonente,
  splitPonentes,
} from './informesActividad.js';

test('usa dos horas cuando el oficio no indica duración', () => {
  assert.equal(normalizeInformeDuration(''), '2 horas');
  assert.equal(normalizeInformeDuration('2'), '2 horas');
  assert.equal(normalizeInformeDuration('3 horas'), '3 horas');
});

test('separa varios ponentes sin dividir nombres por comas', () => {
  assert.deepEqual(splitPonentes('Dra. Ana López\nLic. Mario Pérez y M.A. Julia Ruiz'), [
    'Dra. Ana López', 'Lic. Mario Pérez', 'M.A. Julia Ruiz',
  ]);
});

test('actualiza las menciones del ponente sin regenerar el informe', () => {
  const pending = 'Se comunica que [Nombre del ponente] impartió el taller.\n\nAsimismo, [Nombre del ponente] autoriza el material.';
  const completed = replaceInformePonente(pending, '', 'Dra. Ana López');
  assert.doesNotMatch(completed, /\[Nombre del ponente\]/);
  assert.match(completed, /que Dra\. Ana López impartió/);
  assert.match(completed, /Asimismo, Dra\. Ana López autoriza/);
  assert.match(replaceInformePonente(completed, 'Dra. Ana López', 'Dr. Luis Pérez'), /que Dr\. Luis Pérez impartió/);
});

test('redacta el informe en tercera persona con audiencia y autorización', () => {
  const draft = buildInformeActividadDraft({
    id: 'oficio-1',
    actividad_nombre: 'Ansiedad: una visión integral',
    actividad_tipo: 'Conferencia',
    actividad_fecha: '2026-08-08',
    actividad_modalidad: 'Virtual',
    actividad_descripcion: 'Solicitamos recursos para brindar herramientas clínicas de abordaje.',
  }, 'Dra. Ana López', '2026-08-10');

  assert.match(draft.cuerpo, /que Dra\. Ana López impartió la conferencia/);
  assert.doesNotMatch(draft.cuerpo, /persona ponente/i);
  assert.match(draft.cuerpo, /psicólogos con colegiado activo en el Colegio de Psicólogos de Guatemala/);
  assert.doesNotMatch(draft.cuerpo, /profesionales de la Psicología/i);
  assert.match(draft.cuerpo, /autoriza que.*material.*Aula Virtual/s);
  assert.doesNotMatch(draft.cuerpo, /solicitamos/i);
  assert.equal(draft.actividad_duracion, '2 horas');
  assert.equal(formatInformeDate(draft.fecha_informe), '10 de agosto de 2026');
});

test('escapa el contenido editable antes de crear el HTML del PDF', () => {
  const html = generateInformeActividadHTML({
    fecha_informe: '2026-08-10',
    actividad_tipo: 'Conferencia',
    actividad_nombre: '<script>alert(1)</script>',
    ponente_nombre: 'Ana & Luis',
    cuerpo: 'Contenido <b>editable</b>.',
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Ana &amp; Luis/);
  assert.doesNotMatch(html, /border-top/);
  assert.equal(escapeInformeHTML('A&B'), 'A&amp;B');
});
