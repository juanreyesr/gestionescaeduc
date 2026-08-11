import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacturaText, escapeFacturaHtml } from './factura.js';

test('genera un modelo de factura completo en texto plano', () => {
  const text = buildFacturaText({
    actividad_tipo: 'Conferencia',
    actividad_nombre: 'Ansiedad: una visión integral',
    actividad_fecha: '08 de agosto',
    actividad_hora: '08:30',
    monto: 'Q2,000.00',
  }, '2026-08-11');

  assert.equal(text, `NIT: 55273092
A nombre de: COLEGIO DE PSICÓLOGOS DE GUATEMALA
Fecha: 11 de agosto de 2026
Concepto: Por conferencia Ansiedad: una visión integral el 08 de agosto a las 08:30hrs.
Monto: Q. 2,000.00`);
});

test('protege el texto editado al incorporarlo en el PDF', () => {
  assert.equal(escapeFacturaHtml('Concepto: <actividad> & "honorarios"'), 'Concepto: &lt;actividad&gt; &amp; &quot;honorarios&quot;');
});
