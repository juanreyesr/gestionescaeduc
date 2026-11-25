import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clasificarModalidad,
  construirBloques,
  deducirTipo,
  pluralTipo,
  resumirAvales,
  SIN_TIPO,
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

test('el tipo viene del ajuste, de la solicitud o del nombre; si no, queda sin especificar', () => {
  const aula = [
    { id: 1, title: 'Taller de Ansiedad', date: '2026-02-10', location: 'Zoom' },
    { id: 2, title: 'Duelo en la infancia', date: '2026-02-12', location: 'Zoom' },
    { id: 3, title: 'Ética profesional', date: '2026-02-14', location: 'Zoom' },
    { id: 4, title: 'Neuropsicología', date: '2026-02-16', location: 'Zoom' },
  ];
  const publicaciones = [{ id: 'p', actividad_nombre: 'Duelo en la infancia', actividad_fecha: '12/02/2026', actividad_tipo: 'conferencia' }];
  const ajustes = { 'aula:3': { tipo: 'Diplomado' } };
  const lista = reunirActividades({ aula, publicaciones, desde: '2026-01-01', hasta: '2026-12-31', ajustes });
  const porClave = Object.fromEntries(lista.map(item => [item.clave, item]));
  assert.deepEqual([porClave['aula:1'].tipo, porClave['aula:1'].origenTipo], ['Taller', 'deducido']);
  assert.deepEqual([porClave['aula:2'].tipo, porClave['aula:2'].origenTipo], ['Conferencia', 'registro']);
  assert.deepEqual([porClave['aula:3'].tipo, porClave['aula:3'].origenTipo], ['Diplomado', 'ajuste']);
  assert.deepEqual([porClave['aula:4'].tipo, porClave['aula:4'].origenTipo], [SIN_TIPO, '']);
  const { totales } = resumirPorMes({ actividades: lista, desde: '2026-02-01', hasta: '2026-02-28' });
  assert.equal(totales.sinTipo, 1);
  assert.equal(totales.tipos[totales.tipos.length - 1].tipo, SIN_TIPO);
});

test('deduce y pluraliza tipos', () => {
  assert.equal(deducirTipo('Conferencia: taller de duelo'), 'Conferencia');
  assert.equal(deducirTipo('Gran TALLER de autocuidado'), 'Taller');
  assert.equal(deducirTipo('Autocuidado'), '');
  assert.equal(pluralTipo('Taller', 3), 'talleres');
  assert.equal(pluralTipo('Reunión', 2), 'reuniones');
  assert.equal(pluralTipo('Conferencia', 1), 'conferencia');
});

test('resume avales solicitados y aprobados del período', () => {
  const avales = [
    { id: 1, created_at: '2026-02-03T15:00:00Z', status: 'Aprobado', approval_date: '2026-02-10', correlativo: 'CAEDUC-002', activity_type: 'Taller' },
    { id: 2, created_at: '2026-01-20T15:00:00Z', status: 'Aprobado', approval_date: '2026-02-01', correlativo: 'CAEDUC-001', activity_type: 'Conferencia' },
    { id: 3, created_at: '2026-02-15T15:00:00Z', status: 'Rechazado' },
    { id: 4, created_at: '2026-03-01T03:00:00Z', status: 'En Proceso' }, // 28 feb en Guatemala
    { id: 5, created_at: '2026-02-16T15:00:00Z', status: 'Aprobado', approval_date: '2026-02-17', is_deleted: true },
  ];
  const r = resumirAvales({ avales, desde: '2026-02-01', hasta: '2026-02-28' });
  assert.equal(r.solicitados, 3);
  assert.equal(r.aprobados, 2);
  assert.equal(r.rechazados, 1);
  assert.equal(r.enProceso, 1);
  assert.deepEqual(r.porMes, { '2026-02': { solicitados: 3, aprobados: 2 } });
  assert.deepEqual(r.listaAprobados.map(a => a.correlativo), ['CAEDUC-001', 'CAEDUC-002']);
});

test('el informe incluye tipo de actividad y la sección de avales', () => {
  const actividades = reunirActividades({ aula: [{ id: 1, title: 'Taller de duelo', date: '2026-02-10', location: 'Zoom', participants: 20 }], desde: '2026-02-01', hasta: '2026-02-28' });
  const resumen = resumirPorMes({ actividades, desde: '2026-02-01', hasta: '2026-02-28' });
  const avales = resumirAvales({ avales: [{ id: 1, created_at: '2026-02-03T15:00:00Z', status: 'Aprobado', approval_date: '2026-02-10', correlativo: 'CAEDUC-010', activity_name: 'Simposio X', activity_type: 'Simposio' }], desde: '2026-02-01', hasta: '2026-02-28' });
  assert.match(textoMes(resumen.meses[0], avales.porMes['2026-02']), /1 actividad \(1 taller; 1 virtual\).*se recibió 1 solicitud de aval y se aprobó 1 aval/);
  const html = construirBloques({ resumen, avales, desde: '2026-02-01', hasta: '2026-02-28', fechaInforme: '2026-03-01' }).map(b => b.html).join('');
  assert.match(html, />Tipo</);
  assert.match(html, /Actividades por tipo/);
  assert.match(html, /Avales aprobados en el período/);
  assert.match(html, /CAEDUC-010/);
  assert.match(html, /10\/02\/2026/);
});

test('la comparativa usa las mismas fechas del año anterior y lo que cubre su informe', async () => {
  const { compararConAnterior, ventanaComparable, textoVariacion } = await import('./informeLabores.js');
  const referencia = {
    fuente: 'Informe 2025', desde: '2025-06-01', hasta: '2025-12-31',
    actividades: [
      { fecha: '2025-08-09', tipo: 'Webinar', asistentes: 100 },
      { fecha: '2025-09-10', tipo: 'Taller', asistentes: 50 },
      { fecha: '2025-12-06', tipo: 'Seminario', asistentes: 245 }, // fuera: después del 25 nov
    ],
  };
  assert.equal(ventanaComparable({ desde: '2026-01-01', hasta: '2026-05-31', referencia }), null);
  const v = ventanaComparable({ desde: '2026-01-01', hasta: '2026-11-25', referencia });
  assert.deepEqual(v, { anterior: { desde: '2025-06-01', hasta: '2025-11-25' }, actual: { desde: '2026-06-01', hasta: '2026-11-25' } });

  const actividades = [
    { fecha: '2026-03-01', tipo: 'Taller', asistentes: 999, incluir: true }, // antes de la ventana
    { fecha: '2026-08-15', tipo: 'Taller', asistentes: 80, incluir: true },
    { fecha: '2026-09-15', tipo: 'Taller', asistentes: 40, incluir: true },
    { fecha: '2026-09-20', tipo: 'Webinar', asistentes: 70, incluir: false },
  ];
  const avales = [
    { created_at: '2025-07-01T15:00:00Z', status: 'Aprobado', approval_date: '2025-07-05' },
    { created_at: '2026-07-01T15:00:00Z', status: 'Aprobado', approval_date: '2026-07-05' },
    { created_at: '2026-08-01T15:00:00Z', status: 'Aprobado', approval_date: '2026-08-05' },
  ];
  const c = compararConAnterior({
    actividades, avales, referencia, desde: '2026-01-01', hasta: '2026-11-25',
    certificados: [{ mes: '2026-05', total: 500 }, { mes: '2026-10', total: 30 }],
    certificadosAnterior: [{ mes: '2025-10', total: 20 }],
  });
  const ind = Object.fromEntries(c.indicadores.map(i => [i.clave, i]));
  assert.deepEqual([ind.actividades.anterior, ind.actividades.actual, ind.actividades.variacion], [2, 2, 0]);
  assert.deepEqual([ind.enVivo.anterior, ind.enVivo.actual, ind.enVivo.variacion], [150, 120, -20]);
  assert.deepEqual([ind.aula.anterior, ind.aula.actual], [20, 30]);
  assert.deepEqual([ind.avalesAprobados.anterior, ind.avalesAprobados.actual], [1, 2]);
  assert.equal(textoVariacion(ind.avalesAprobados.variacion), '+100 %');
  assert.deepEqual(c.tipos.map(t => [t.tipo, t.anterior, t.actual]), [['Taller', 1, 2], ['Webinar', 1, 0]]);
  assert.equal(c.meses.length, 6);

  const sinCert = compararConAnterior({ actividades, referencia, desde: '2026-01-01', hasta: '2026-11-25' });
  assert.equal(sinCert.indicadores.find(i => i.clave === 'aula').anterior, null);
  assert.equal(textoVariacion(sinCert.indicadores.find(i => i.clave === 'aula').variacion), '—');
});

test('los datos de 2025 suman lo reportado en su informe', async () => {
  const { INFORME_2025 } = await import('./historico2025.js');
  const total = INFORME_2025.actividades.reduce((suma, item) => suma + item.asistentes, 0);
  assert.equal(INFORME_2025.actividades.length, 21);
  assert.equal(total, INFORME_2025.totalReportado);
});

test('los avales aprobados del año anterior salen del total de su informe', async () => {
  const { avalesAprobadosComparados, compararConAnterior, construirBloques, resumirPorMes } = await import('./informeLabores.js');
  const referencia = { fuente: 'Informe 2025', desde: '2025-06-01', hasta: '2025-12-31', actividades: [], avalesOtorgados: { desde: '2025-02-01', hasta: '2025-12-31', total: 32 } };
  const avales = [
    { created_at: '2026-01-10T15:00:00Z', status: 'Aprobado', approval_date: '2026-01-20' }, // antes de febrero: no cuenta
    { created_at: '2026-03-01T15:00:00Z', status: 'Aprobado', approval_date: '2026-03-05' },
    { created_at: '2026-10-01T15:00:00Z', status: 'Aprobado', approval_date: '2026-10-05' },
    { created_at: '2026-12-01T15:00:00Z', status: 'Aprobado', approval_date: '2026-12-10' },
  ];
  const parcial = avalesAprobadosComparados({ avales, desde: '2026-01-01', hasta: '2026-11-25', referencia });
  assert.deepEqual([parcial.anterior, parcial.actual, parcial.completo], [32, 2, false]);
  assert.equal(parcial.etiqueta, 'Avales aprobados (feb–dic; 2026 al 25 de noviembre)');
  const completo = avalesAprobadosComparados({ avales, desde: '2026-01-01', hasta: '2026-12-31', referencia });
  assert.deepEqual([completo.actual, completo.completo, completo.etiqueta], [3, true, 'Avales aprobados (feb–dic)']);

  const c = compararConAnterior({ avales, referencia, desde: '2026-01-01', hasta: '2026-11-25' });
  const ind = Object.fromEntries(c.indicadores.map(i => [i.clave, i]));
  assert.equal(ind.avalesAprobados.anterior, 32);
  assert.equal(ind.avalesAprobados.variacion, -94);
  assert.equal(ind.avalesSolicitados.anterior, null);
  const resumen = resumirPorMes({ actividades: [], desde: '2026-01-01', hasta: '2026-11-25' });
  const html = construirBloques({ resumen, comparativa: c, desde: '2026-01-01', hasta: '2026-11-25', fechaInforme: '2026-11-25' }).map(b => b.html).join('');
  assert.match(html, /frente a los 32 otorgados de febrero a diciembre de 2025/);
});
