import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agruparDocumentos,
  carpetaExpediente,
  DOCUMENTOS_EXTRA,
  documentoLabel,
  expedienteDesdePublicacion,
  extensionArchivo,
  nombreArchivoEnZip,
  nombreSeguro,
  nombreZipExpediente,
  planDescargaExpediente,
  normalizarIncluidosEnCv,
  progresoExpediente,
  puedeIrEnCv,
  esTipoExtra,
  TIPOS_EN_CV,
  TIPOS_EXTRA,
  TIPOS_PONENTE,
} from './expedientePonentes.js';

const EXPEDIENTE = { ponente_nombre: 'Ana López Gómez', actividad_nombre: 'Ansiedad: una visión integral' };

const doc = (tipo, nombre, created_at) => ({
  tipo,
  archivo_path: `${tipo}/${nombre}`,
  archivo_nombre: nombre,
  created_at,
});

test('el expediente copia los datos de la solicitud de publicación', () => {
  const expediente = expedienteDesdePublicacion({
    id: 'pub-1',
    ponente_nombre: '  Ana López  ',
    ponente_grado: 'Maestría',
    actividad_nombre: 'Duelo',
    actividad_fecha: '12 de junio de 2026',
    actividad_hora: '18:00',
    actividad_lugar: 'Virtual',
  });

  assert.equal(expediente.publicacion_id, 'pub-1');
  assert.equal(expediente.ponente_nombre, 'Ana López');
  assert.equal(expediente.actividad_fecha, '12 de junio de 2026');
  assert.equal(expediente.actividad_hora, '18:00');
});

test('el checklist lleva los documentos en el orden que pide Tesorería', () => {
  // La constancia de colegiado activo va después del título y antes de la
  // factura y el informe.
  assert.deepEqual(TIPOS_PONENTE, ['cv', 'rtu', 'dpi', 'titulo', 'colegiado', 'factura', 'informe']);
  assert.equal(documentoLabel('titulo'), 'Último título profesional');
  assert.equal(documentoLabel('colegiado'), 'Constancia de colegiado activo');
  assert.equal(documentoLabel('informe'), 'Informe de actividad firmado por el ponente');
});

test('el avance dice cuántos faltan mientras se carga de a poco', () => {
  assert.deepEqual(progresoExpediente([]), {
    cargados: 0,
    total: 7,
    faltantes: TIPOS_PONENTE,
    faltantesTexto: TIPOS_PONENTE.map(documentoLabel).join(', '),
    completo: false,
    enCv: [],
    faltaElCv: false,
  });

  const parcial = progresoExpediente([doc('cv', 'hoja.pdf'), doc('dpi', 'frente.jpg'), doc('dpi', 'reverso.jpg')]);
  assert.equal(parcial.cargados, 2);
  assert.equal(parcial.completo, false);
  assert.deepEqual(parcial.faltantes, ['rtu', 'titulo', 'colegiado', 'factura', 'informe']);

  const todos = progresoExpediente(TIPOS_PONENTE.map(tipo => doc(tipo, `${tipo}.pdf`)));
  assert.equal(todos.completo, true);
  assert.equal(todos.faltantesTexto, '');
});

test('agrupa por tipo respetando el orden del checklist y la fecha de carga', () => {
  const grupos = agruparDocumentos([
    doc('informe', 'informe.pdf', '2026-03-02'),
    doc('dpi', 'reverso.jpg', '2026-03-05'),
    doc('dpi', 'frente.jpg', '2026-03-01'),
  ]);

  assert.deepEqual(grupos.map(grupo => grupo.tipo), TIPOS_PONENTE);
  assert.deepEqual(grupos[2].documentos.map(item => item.archivo_nombre), ['frente.jpg', 'reverso.jpg']);
  assert.equal(grupos[0].documentos.length, 0);
});

test('los nombres de archivo y carpeta sobreviven a Windows y a las tildes', () => {
  assert.equal(nombreSeguro('Ana López Gómez'), 'Ana Lopez Gomez');
  // ? : / son ilegales en nombres de archivo de Windows; ¿ no lo es y se conserva.
  assert.equal(nombreSeguro('Taller: ¿qué hacer? / parte 2'), 'Taller ¿que hacer parte 2');
  assert.equal(nombreSeguro('   ', 'Ponente'), 'Ponente');
  assert.equal(extensionArchivo('hoja de vida.PDF'), 'pdf');
  assert.equal(extensionArchivo('sin extension'), 'pdf');
  assert.equal(
    carpetaExpediente(EXPEDIENTE),
    'Expediente Ana Lopez Gomez - Ansiedad una vision integral',
  );
  assert.equal(carpetaExpediente({}), 'Expediente');
  assert.match(nombreZipExpediente(EXPEDIENTE), /\.zip$/);
});

test('numera los archivos del ZIP en el orden del checklist', () => {
  assert.equal(
    nombreArchivoEnZip(doc('cv', 'hoja.pdf'), { expediente: EXPEDIENTE }),
    '01 CV - Ana Lopez Gomez.pdf',
  );
  assert.equal(
    nombreArchivoEnZip(doc('colegiado', 'constancia.pdf'), { expediente: EXPEDIENTE }),
    '05 Colegiado - Ana Lopez Gomez.pdf',
  );
  assert.equal(
    nombreArchivoEnZip(doc('informe', 'informe.pdf'), { expediente: EXPEDIENTE }),
    '07 Informe - Ana Lopez Gomez.pdf',
  );
  // Dos lados del DPI: se distinguen entre sí sin perder su posición.
  assert.equal(
    nombreArchivoEnZip(doc('dpi', 'reverso.jpg'), { expediente: EXPEDIENTE, indiceEnTipo: 1, totalDelTipo: 2 }),
    '03 DPI (2) - Ana Lopez Gomez.jpg',
  );
});

test('el plan de descarga arma una sola carpeta con todo lo cargado', () => {
  const documentos = [
    doc('factura', 'factura.pdf', '2026-03-09'),
    doc('dpi', 'frente.jpg', '2026-03-01'),
    doc('dpi', 'reverso.jpg', '2026-03-02'),
    doc('cv', 'hoja.pdf', '2026-03-03'),
  ];

  assert.deepEqual(planDescargaExpediente(EXPEDIENTE, documentos), [
    { archivo_path: 'cv/hoja.pdf', ruta: 'Expediente Ana Lopez Gomez - Ansiedad una vision integral/01 CV - Ana Lopez Gomez.pdf' },
    { archivo_path: 'dpi/frente.jpg', ruta: 'Expediente Ana Lopez Gomez - Ansiedad una vision integral/03 DPI (1) - Ana Lopez Gomez.jpg' },
    { archivo_path: 'dpi/reverso.jpg', ruta: 'Expediente Ana Lopez Gomez - Ansiedad una vision integral/03 DPI (2) - Ana Lopez Gomez.jpg' },
    { archivo_path: 'factura/factura.pdf', ruta: 'Expediente Ana Lopez Gomez - Ansiedad una vision integral/06 Factura - Ana Lopez Gomez.pdf' },
  ]);

  // Un expediente todavía vacío no produce descarga.
  assert.deepEqual(planDescargaExpediente(EXPEDIENTE, []), []);
});

test('solo del RTU a la constancia se puede marcar "dentro del CV"', () => {
  assert.deepEqual(TIPOS_EN_CV, ['rtu', 'dpi', 'titulo', 'colegiado']);
  // El CV no cabe dentro de sí mismo; factura e informe son documentos aparte.
  ['cv', 'factura', 'informe'].forEach(tipo => assert.equal(puedeIrEnCv(tipo), false, tipo));
  TIPOS_EN_CV.forEach(tipo => assert.equal(puedeIrEnCv(tipo), true, tipo));

  // Un valor guardado que ya no corresponde no debe inflar el conteo.
  assert.deepEqual(normalizarIncluidosEnCv(['rtu', 'factura', 'inventado', 'dpi']), ['rtu', 'dpi']);
  assert.deepEqual(normalizarIncluidosEnCv(null), []);
  assert.deepEqual(normalizarIncluidosEnCv('rtu'), []);
});

test('lo marcado como incluido en el CV cuenta como entregado', () => {
  // El caso real: el ponente entrega todo dentro del CV y sube un solo archivo.
  const avance = progresoExpediente([doc('cv', 'hoja.pdf')], ['rtu', 'dpi', 'titulo', 'colegiado']);

  assert.equal(avance.cargados, 5);
  assert.equal(avance.total, 7);
  assert.deepEqual(avance.faltantes, ['factura', 'informe']);
  assert.deepEqual(avance.enCv, ['rtu', 'dpi', 'titulo', 'colegiado']);
  assert.equal(avance.completo, false);
  assert.equal(avance.faltaElCv, false);

  // Con la factura y el informe, el expediente queda completo con dos archivos.
  const completo = progresoExpediente(
    [doc('cv', 'hoja.pdf'), doc('factura', 'f.pdf'), doc('informe', 'i.pdf')],
    TIPOS_EN_CV,
  );
  assert.equal(completo.cargados, 7);
  assert.equal(completo.completo, true);
});

test('un documento no se cuenta dos veces por estar cargado y marcado', () => {
  const avance = progresoExpediente([doc('cv', 'hoja.pdf'), doc('rtu', 'rtu.pdf')], ['rtu']);
  assert.equal(avance.cargados, 2);
  assert.deepEqual(avance.faltantes, ['dpi', 'titulo', 'colegiado', 'factura', 'informe']);
});

test('avisa cuando hay marcas pero el CV todavía no está cargado', () => {
  const avance = progresoExpediente([doc('rtu', 'rtu.pdf')], ['dpi']);
  assert.equal(avance.faltaElCv, true);
  assert.equal(avance.cargados, 2);

  assert.equal(progresoExpediente([doc('cv', 'hoja.pdf')], ['dpi']).faltaElCv, false);
  assert.equal(progresoExpediente([doc('cv', 'hoja.pdf')], []).faltaElCv, false);
});

test('la publicación para redes no cuenta en el avance del checklist', () => {
  assert.deepEqual(TIPOS_EXTRA, ['redes']);
  assert.equal(esTipoExtra('redes'), true);
  assert.equal(esTipoExtra('cv'), false);
  assert.equal(documentoLabel('redes'), 'Publicación para redes');

  // Es material de respaldo, no un requisito: el resumen no se mueve.
  const soloRedes = progresoExpediente([doc('redes', 'arte.jpg')]);
  assert.equal(soloRedes.cargados, 0);
  assert.equal(soloRedes.total, 7);
  assert.deepEqual(soloRedes.faltantes, TIPOS_PONENTE);

  const conCv = progresoExpediente([doc('cv', 'hoja.pdf'), doc('redes', 'arte.jpg')]);
  assert.equal(conCv.cargados, 1);
  assert.equal(conCv.total, 7);
});

test('la publicación para redes sí viaja en el paquete, al final', () => {
  assert.equal(
    nombreArchivoEnZip(doc('redes', 'arte.jpg'), { expediente: EXPEDIENTE }),
    '08 Redes - Ana Lopez Gomez.jpg',
  );
  // Varias piezas publicadas se numeran entre sí sin perder su posición.
  assert.equal(
    nombreArchivoEnZip(doc('redes', 'historia.png'), { expediente: EXPEDIENTE, indiceEnTipo: 1, totalDelTipo: 2 }),
    '08 Redes (2) - Ana Lopez Gomez.png',
  );

  const plan = planDescargaExpediente(EXPEDIENTE, [
    doc('redes', 'arte.jpg', '2026-03-05'),
    doc('cv', 'hoja.pdf', '2026-03-01'),
  ]);
  assert.deepEqual(plan.map(item => item.ruta.split('/')[1]), [
    '01 CV - Ana Lopez Gomez.pdf',
    '08 Redes - Ana Lopez Gomez.jpg',
  ]);
});

test('el material extra se agrupa aparte del checklist', () => {
  const documentos = [doc('cv', 'hoja.pdf'), doc('redes', 'arte.jpg')];
  // El checklist no muestra la publicación de redes entre sus renglones.
  const checklist = agruparDocumentos(documentos);
  assert.deepEqual(checklist.map(grupo => grupo.tipo), TIPOS_PONENTE);
  assert.equal(checklist.reduce((total, grupo) => total + grupo.documentos.length, 0), 1);

  const extras = agruparDocumentos(documentos, DOCUMENTOS_EXTRA);
  assert.deepEqual(extras.map(grupo => grupo.tipo), ['redes']);
  assert.equal(extras[0].documentos.length, 1);
});
