import test from 'node:test';
import assert from 'node:assert/strict';

import {
  articuloDeCargo,
  atribucionesDeCargo,
  buildInformeViaticosDraft,
  cargoTieneAtribuciones,
  defaultLiteralParaMotivo,
  escapeViaticosHTML,
  generateInformeViaticosHTML,
  informeViaticosFileName,
  motivoLabel,
  motivoRequiereDetalle,
  textoAtribucion,
} from './informesViaticos.js';

test('cada cargo del reglamento trae su artículo y su lista de atribuciones', () => {
  assert.equal(articuloDeCargo('Coordinador(a)'), 'Artículo 6');
  assert.equal(articuloDeCargo('Secretario(a)'), 'Artículo 8');
  assert.equal(atribucionesDeCargo('Coordinador(a)').length, 10);
  assert.equal(atribucionesDeCargo('Vocal I').length, 5);
  // Vocal II comparte artículo y atribuciones con Vocal I.
  assert.deepEqual(atribucionesDeCargo('Vocal II'), atribucionesDeCargo('Vocal I'));
});

test('un cargo fuera del reglamento (ej. Junta Directiva) no trae atribuciones', () => {
  assert.equal(cargoTieneAtribuciones('Junta Directiva'), false);
  assert.equal(atribucionesDeCargo('Junta Directiva').length, 0);
});

test('sugiere el literal de sesiones para el Coordinador en sesión ordinaria y extraordinaria', () => {
  const literal = defaultLiteralParaMotivo('Coordinador(a)', 'sesion_ordinaria');
  assert.equal(literal, 'b');
  assert.equal(defaultLiteralParaMotivo('Coordinador(a)', 'sesion_extraordinaria'), 'b');
  assert.match(textoAtribucion('Coordinador(a)', literal), /sesiones ordinarias y extraordinarias/);
});

test('sugiere "representar a la Comisión" solo para Coordinador y Subcoordinador', () => {
  assert.equal(defaultLiteralParaMotivo('Coordinador(a)', 'representacion'), 'a');
  assert.equal(defaultLiteralParaMotivo('Subcoordinador(a)', 'representacion'), 'a');
  // El Secretario no tiene una atribución de representación explícita en el reglamento.
  assert.equal(defaultLiteralParaMotivo('Secretario(a)', 'representacion'), '');
});

test('sugiere el literal de asistencia a sesiones para cargos sin convocatoria propia', () => {
  assert.equal(defaultLiteralParaMotivo('Secretario(a)', 'sesion_ordinaria'), 'g');
  assert.equal(defaultLiteralParaMotivo('Vocal I', 'sesion_ordinaria'), 'd');
});

test('motivoLabel y motivoRequiereDetalle reflejan la lista precargada', () => {
  assert.equal(motivoLabel('sesion_ordinaria'), 'Sesión ordinaria');
  assert.equal(motivoRequiereDetalle('sesion_ordinaria'), false);
  assert.equal(motivoRequiereDetalle('otra'), true);
});

test('arma el borrador citando el artículo y literal del cargo elegido', () => {
  const draft = buildInformeViaticosDraft({
    miembro: { nombre: 'M. A. Juan J. Reyes', cargo: 'Coordinador(a)' },
    motivoId: 'sesion_ordinaria',
    fecha: '2026-03-12',
  });
  assert.equal(draft.miembro_nombre, 'M. A. Juan J. Reyes');
  assert.equal(draft.miembro_cargo, 'Coordinador(a)');
  assert.equal(draft.literal, 'b');
  assert.equal(draft.fecha, '2026-03-12');
});

test('el HTML cita el artículo y literal elegido, e incluye el detalle libre cuando se da', () => {
  const draft = buildInformeViaticosDraft({
    miembro: { nombre: 'Mgtr. Luisa Mazariegos', cargo: 'Secretario(a)' },
    motivoId: 'otra',
    detalle: 'reunión de coordinación con la Junta Directiva',
    literal: 'b',
    fecha: '2026-04-02',
  });
  const html = generateInformeViaticosHTML(draft, { firmaUrl: '' });
  assert.match(html, /Mgtr\. Luisa Mazariegos/);
  assert.match(html, /Secretario\(a\)/);
  assert.match(html, /Artículo 8, literal b/);
  assert.match(html, /reunión de coordinación con la Junta Directiva/);
  // Sin imagen de firma: debe quedar la línea en blanco para firma física.
  assert.doesNotMatch(html, /alt="Firma"/);
});

test('sin una atribución "otras actividades" en su artículo, el Secretario cae en la frase genérica', () => {
  // El Secretario (art. 8) no tiene un literal de cajón como sí lo tienen
  // Prosecretario, Gestor del Conocimiento o los Vocales: si no se elige un
  // literal a mano, el informe usa una frase genérica en vez de citar mal.
  assert.equal(defaultLiteralParaMotivo('Secretario(a)', 'otra'), '');
  const draft = buildInformeViaticosDraft({ miembro: { nombre: 'Mgtr. Luisa Mazariegos', cargo: 'Secretario(a)' }, motivoId: 'otra', detalle: 'entrega de constancias', fecha: '2026-04-02' });
  const html = generateInformeViaticosHTML(draft);
  assert.match(html, /atribuciones propias de su cargo, según el Reglamento/);
  assert.doesNotMatch(html, /Artículo 8, literal/);
});

test('con firmaUrl (solo el caso del Coordinador) el HTML incluye la imagen de la firma', () => {
  const draft = buildInformeViaticosDraft({
    miembro: { nombre: 'M. A. Juan J. Reyes', cargo: 'Coordinador(a)' },
    motivoId: 'representacion',
    fecha: '2026-05-20',
  });
  const html = generateInformeViaticosHTML(draft, { firmaUrl: 'https://example.com/firma-coordinador.png' });
  assert.match(html, /alt="Firma"/);
  assert.match(html, /firma-coordinador\.png/);
});

test('escapa el contenido editable antes de generar el HTML', () => {
  const draft = buildInformeViaticosDraft({
    miembro: { nombre: 'Ana & Luis <script>', cargo: 'Vocal I' },
    motivoId: 'otra',
    detalle: '<script>alert(1)</script>',
    fecha: '2026-06-01',
  });
  const html = generateInformeViaticosHTML(draft);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Ana &amp; Luis/);
  assert.equal(escapeViaticosHTML('A&B'), 'A&amp;B');
});

test('el nombre del archivo se arma con cargo, nombre y fecha, sin caracteres inválidos', () => {
  const nombre = informeViaticosFileName({ miembro_cargo: 'Vocal I', miembro_nombre: 'José Ruiz', fecha: '2026-06-01' });
  assert.equal(nombre, 'Informe_Viaticos_Vocal_I_José_Ruiz_2026-06-01');
});
