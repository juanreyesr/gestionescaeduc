// src/lib/informeAnual.js — Informe anual de la Comisión (fin de año)
//
// Cruza en un solo documento lo que hoy vive en módulos separados:
//   · Planificación: actividades del año, estado, área, trimestre, asignado y gastado.
//   · Presupuesto general: aprobado + fondos extra − gastos (actividades y rubros).
//   · Solicitud de publicación / Expediente: ponente, modalidad y documentos entregados.
//   · Aula virtual: participantes registrados en el calendario (cpg_content).
// Termina con una lista de pendientes de cierre para resolver antes de entregarlo.

import { flowPageHTML } from './flowPagination.js';
import { progresoExpediente } from './expedientePonentes.js';
import { activityDateKey, escapeRegistroHTML as esc } from './registroActividadesReport.js';
import { AREAS_PLANIFICACION, modalidadDe } from './sincronizacion.js';

const TRIMESTRES = ['T1 – Ene/Mar', 'T2 – Abr/Jun', 'T3 – Jul/Sep', 'T4 – Oct/Dic'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const num = (v) => Number(v) || 0;
export const q = (v) => `Q ${num(v).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaDe = (a) => a.fecha_iso || activityDateKey(a.fecha || '') || '';
const anioDe = (valor) => Number(String(valor || '').slice(0, 4)) || null;
const fechaLegible = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1].slice(0, 3)}` : 'Sin fecha';
};
const trimestreDe = (a) => {
  const mes = Number(fechaDe(a).slice(5, 7));
  return mes ? TRIMESTRES[Math.floor((mes - 1) / 3)] : (a.trimestre || 'Sin fecha');
};
const participantesDe = (a, eventos) => {
  if (!a.aula_event_id) return 0;
  const ev = eventos.find(e => String(e?.id) === String(a.aula_event_id));
  return num(String(ev?.participants ?? '').replace(/\D/g, ''));
};

export const datosInformeAnual = ({
  anio, hoy = new Date().toISOString().slice(0, 10),
  actividades = [], rubros = [], gastosRubro = [], fondos = [], presAnual = [],
  publicaciones = [], expedientes = [], documentosExp = [], eventosAula = [],
}) => {
  const delAnio = actividades.filter(a => anioDe(fechaDe(a)) === anio || (!fechaDe(a) && anioDe(a.created_at) === anio));
  const pubPorId = new Map(publicaciones.map(p => [p.id, p]));
  const expPorPub = new Map(expedientes.filter(e => e.publicacion_id).map(e => [e.publicacion_id, e]));

  const detalle = delAnio.map(a => {
    const pub = a.publicacion_id ? pubPorId.get(a.publicacion_id) : null;
    const exp = a.publicacion_id ? expPorPub.get(a.publicacion_id) : null;
    const progreso = exp ? progresoExpediente(documentosExp.filter(d => d.expediente_id === exp.id), exp.incluidos_en_cv) : null;
    return {
      id: a.id,
      fecha: fechaDe(a),
      actividad: a.actividad || 'Sin nombre',
      area: a.area || 'Sin área',
      tipo: a.tipo || '',
      trimestre: trimestreDe(a),
      ponente: pub?.ponente_nombre || a.t2_ponente || '',
      modalidad: pub ? (modalidadDe(pub) || pub.actividad_lugar || '') : (a.sede_modalidad || ''),
      estado: a.estado_general || 'Pendiente',
      asignado: num(a.monto),
      gastado: num(a.monto_gastado),
      participantes: participantesDe(a, eventosAula),
      enAula: Boolean(a.aula_event_id),
      expediente: progreso ? `${progreso.cargados}/${progreso.total}` : (a.publicacion_id ? 'Sin abrir' : '—'),
      expedienteCompleto: Boolean(progreso?.completo),
      faltanExtras: Boolean(a.presupuesto_detalle?.faltan_extras),
      tieneExpediente: Boolean(progreso),
    };
  }).sort((x, y) => (x.fecha || '9999').localeCompare(y.fecha || '9999'));

  const vigentes = detalle.filter(d => d.estado !== 'Cancelado');
  const sumar = (lista, campo) => lista.reduce((s, d) => s + num(d[campo]), 0);
  const agrupar = (clave, orden) => orden.map(nombre => {
    const grupo = detalle.filter(d => d[clave] === nombre);
    const activos = grupo.filter(d => d.estado !== 'Cancelado');
    return {
      nombre,
      total: activos.length,
      realizadas: grupo.filter(d => d.estado === 'Completado').length,
      asignado: sumar(activos, 'asignado'),
      gastado: sumar(grupo, 'gastado'),
      participantes: sumar(grupo, 'participantes'),
    };
  }).filter(g => g.total || g.gastado);

  const areas = [...AREAS_PLANIFICACION, ...new Set(detalle.map(d => d.area).filter(a => !AREAS_PLANIFICACION.includes(a)))];
  const gastosRubroAnio = gastosRubro.filter(g => !g.fecha || anioDe(g.fecha) === anio);
  const fondosAnio = fondos.filter(f => anioDe(f.fecha || f.created_at) === anio || (!f.fecha && !f.created_at));
  const aprobado = num((presAnual.find(p => Number(p.anio) === anio) || {}).monto);
  const totalFondos = sumar(fondosAnio, 'monto');
  const gastadoActividades = sumar(detalle, 'gastado');
  const gastadoRubros = sumar(gastosRubroAnio, 'monto');
  const disponible = aprobado + totalFondos;
  const ejecutado = gastadoActividades + gastadoRubros;

  const rubrosDetalle = rubros.map(r => ({
    nombre: r.nombre || 'Rubro',
    asignado: num(r.monto_asignado),
    gastado: gastosRubroAnio.filter(g => g.rubro_id === r.id).reduce((s, g) => s + num(g.monto), 0),
  }));

  const pendientes = [];
  detalle.forEach(d => {
    if (d.fecha && d.fecha < hoy && !['Completado', 'Cancelado'].includes(d.estado)) pendientes.push(`${d.actividad}: ya pasó su fecha y sigue "${d.estado}" (márcala como Completado o Cancelado).`);
    if (d.estado === 'Completado' && d.tieneExpediente && !d.expedienteCompleto) pendientes.push(`${d.actividad}: expediente del ponente incompleto (${d.expediente} documentos).`);
    if (d.estado === 'Completado' && d.asignado > 0 && d.gastado === 0) pendientes.push(`${d.actividad}: realizada sin gastos registrados (registra el pago del honorario y los gastos extra).`);
    if (d.faltanExtras && d.estado !== 'Cancelado') pendientes.push(`${d.actividad}: actividad presencial sin gastos extra planificados.`);
    if (d.gastado > d.asignado && d.asignado > 0) pendientes.push(`${d.actividad}: gastó ${q(d.gastado)}, más que lo asignado (${q(d.asignado)}).`);
    if (d.estado === 'Completado' && d.enAula && !d.participantes) pendientes.push(`${d.actividad}: falta registrar los participantes en el aula virtual.`);
  });

  return {
    anio,
    resumen: {
      planificadas: vigentes.length,
      realizadas: detalle.filter(d => d.estado === 'Completado').length,
      enProceso: detalle.filter(d => d.estado === 'En proceso').length,
      pendientes: detalle.filter(d => d.estado === 'Pendiente').length,
      canceladas: detalle.filter(d => d.estado === 'Cancelado').length,
      participantes: sumar(detalle, 'participantes'),
      aprobado, totalFondos, disponible, gastadoActividades, gastadoRubros, ejecutado,
      saldo: disponible - ejecutado,
      ejecucionPct: disponible > 0 ? Math.round((ejecutado / disponible) * 100) : 0,
      cumplimientoPct: vigentes.length ? Math.round((detalle.filter(d => d.estado === 'Completado').length / vigentes.length) * 100) : 0,
      publicadasEnAula: detalle.filter(d => d.enAula).length,
      expedientesCompletos: detalle.filter(d => d.expedienteCompleto).length,
      conExpediente: detalle.filter(d => d.tieneExpediente).length,
    },
    porArea: agrupar('area', areas),
    porTrimestre: agrupar('trimestre', [...TRIMESTRES, 'Sin fecha']),
    detalle,
    rubros: rubrosDetalle,
    pendientes,
  };
};

// ── Documento ─────────────────────────────────────────────────────────────────
const AZUL = '#1a5276';
const th = (t, align = 'left') => `<th style="padding:4px 5px;border:1px solid #174567;text-align:${align};font-size:8.5px;">${t}</th>`;
const td = (t, align = 'left', extra = '') => `<td style="padding:4px 5px;border:1px solid #cbd5df;text-align:${align};font-size:9.5px;line-height:1.3;overflow-wrap:anywhere;${extra}">${t}</td>`;
const tabla = (cabeza, filas, cols) => `<table data-split="rows" style="width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 14px;">${cols ? `<colgroup>${cols.map(w => `<col style="width:${w}%">`).join('')}</colgroup>` : ''}<thead><tr style="background:${AZUL};color:#fff;">${cabeza.join('')}</tr></thead><tbody>${filas.join('')}</tbody></table>`;
const titulo = (t) => `<h2 data-keep-next style="margin:14px 0 6px;font-size:13px;color:${AZUL};text-transform:uppercase;letter-spacing:.4px;">${t}</h2>`;
const parrafo = (t) => `<p style="margin:0 0 10px;font-size:11px;line-height:1.7;text-align:justify;">${t}</p>`;

export const htmlInformeAnual = (d, { membreteUrl = '/fondo-oficios.jpg', firmante = 'M. A. Juan J. Reyes', cargo = 'Coordinador', firmaUrl = '', fecha = '' } = {}) => {
  const r = d.resumen;
  const tarjetas = [
    ['Actividades planificadas', r.planificadas], ['Realizadas', `${r.realizadas} (${r.cumplimientoPct}%)`],
    ['Participantes (aula)', r.participantes.toLocaleString('es-GT')], ['Presupuesto disponible', q(r.disponible)],
    ['Ejecutado', `${q(r.ejecutado)} (${r.ejecucionPct}%)`], ['Saldo', q(r.saldo)],
  ];
  const resumenHTML = `<div data-keep style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 14px;">${tarjetas.map(([k, v]) => `<div style="border:1px solid #d5dee8;border-radius:8px;padding:8px;"><div style="font-size:8.5px;color:#63758a;text-transform:uppercase;font-weight:700;">${k}</div><div style="font-size:14px;font-weight:800;color:${AZUL};margin-top:2px;">${v}</div></div>`).join('')}</div>`;

  const filaGrupo = g => `<tr>${td(esc(g.nombre))}${td(g.total, 'center')}${td(g.realizadas, 'center')}${td(q(g.asignado), 'right')}${td(q(g.gastado), 'right')}${td(g.participantes.toLocaleString('es-GT'), 'center')}</tr>`;
  const cabGrupo = (n) => [th(n), th('Activ.', 'center'), th('Realiz.', 'center'), th('Asignado', 'right'), th('Ejecutado', 'right'), th('Particip.', 'center')];

  const filasDetalle = d.detalle.map((a, i) => `<tr style="background:${i % 2 ? '#f8fbfd' : '#fff'};">${td(fechaLegible(a.fecha))}${td(`<strong>${esc(a.actividad)}</strong>${a.ponente ? `<br><span style="color:#63758a;">${esc(a.ponente)}</span>` : ''}`)}${td(esc(a.area).replace('/', '/<wbr>'))}${td(esc(a.estado))}${td(q(a.gastado), 'right')}${td(a.participantes || '—', 'center')}${td(esc(a.expediente), 'center')}</tr>`);

  const presupuestoFilas = [
    ['Presupuesto aprobado', q(r.aprobado)], ['(+) Fondos adicionales', q(r.totalFondos)], ['= Total disponible', q(r.disponible)],
    ['(−) Gastos de actividades', q(r.gastadoActividades)], ['(−) Gastos de rubros especiales', q(r.gastadoRubros)], ['= Saldo al cierre', q(r.saldo)],
  ].map(([k, v], i) => `<tr${i === 2 || i === 5 ? ' style="font-weight:800;background:#eef4fa;"' : ''}>${td(k)}${td(v, 'right')}</tr>`);

  const inner = [
    `<p style="margin:0;text-align:right;font-size:11px;color:#4b5563;">Guatemala, ${esc(fecha)}</p>`,
    `<h1 data-keep-next style="margin:14px 0 2px;font-size:17px;color:${AZUL};text-align:center;">Informe anual de labores ${d.anio}</h1>`,
    `<p data-keep-next style="margin:0 0 14px;text-align:center;font-size:10.5px;color:#63758a;">Comisión de Acreditación y Educación Continua — CAEDUC</p>`,
    parrafo(`Durante ${d.anio} la Comisión planificó <strong>${r.planificadas}</strong> actividades, de las cuales se realizaron <strong>${r.realizadas}</strong> (${r.cumplimientoPct}% de cumplimiento), ${r.enProceso} siguen en proceso, ${r.pendientes} están pendientes y ${r.canceladas} se cancelaron. Se registraron <strong>${r.participantes.toLocaleString('es-GT')}</strong> participantes en las actividades publicadas en el aula virtual (${r.publicadasEnAula} actividades). Del presupuesto disponible de ${q(r.disponible)} se ejecutaron ${q(r.ejecutado)} (${r.ejecucionPct}%), con un saldo de ${q(r.saldo)}.`),
    resumenHTML,
    titulo('1. Ejecución presupuestaria'),
    tabla([th('Concepto'), th('Monto', 'right')], presupuestoFilas, [70, 30]),
    titulo('2. Actividades por área'),
    tabla(cabGrupo('Área'), d.porArea.map(filaGrupo), [31, 11, 11, 17, 17, 13]),
    titulo('3. Actividades por trimestre'),
    tabla(cabGrupo('Trimestre'), d.porTrimestre.map(filaGrupo), [31, 11, 11, 17, 17, 13]),
    d.rubros.length ? titulo('4. Rubros especiales') : '',
    d.rubros.length ? tabla([th('Rubro'), th('Asignado', 'right'), th('Ejecutado', 'right'), th('Saldo', 'right')], d.rubros.map(x => `<tr>${td(esc(x.nombre))}${td(q(x.asignado), 'right')}${td(q(x.gastado), 'right')}${td(q(x.asignado - x.gastado), 'right')}</tr>`), [40, 20, 20, 20]) : '',
    titulo(`${d.rubros.length ? 5 : 4}. Detalle de actividades`),
    tabla([th('Fecha'), th('Actividad / ponente'), th('Área'), th('Estado'), th('Ejecutado', 'right'), th('Partic.', 'center'), th('Exped.', 'center')], filasDetalle.length ? filasDetalle : [`<tr>${td('Sin actividades registradas para este año.', 'left', 'font-style:italic;')}${td('')}${td('')}${td('')}${td('')}${td('')}${td('')}</tr>`], [8, 32, 17, 12, 13, 8, 10]),
    titulo(`${d.rubros.length ? 6 : 5}. Pendientes de cierre`),
    d.pendientes.length
      ? `<ul data-split="items" style="margin:0 0 12px;padding-left:18px;">${d.pendientes.map(p => `<li style="font-size:10.5px;line-height:1.6;margin-bottom:2px;">${esc(p)}</li>`).join('')}</ul>`
      : parrafo('Sin pendientes: todas las actividades tienen su estado, gastos y expediente al día.'),
    `<div data-keep style="padding-top:26px;text-align:center;"><p style="font-size:11px;margin:0 0 16px;text-align:left;">Atentamente,</p>${firmaUrl ? `<img src="${esc(firmaUrl)}" alt="Firma" style="height:55px;width:auto;display:block;margin:0 auto -4px;">` : ''}<div style="display:inline-block;width:230px;border-top:1.5px solid #26364b;padding-top:4px;"><div style="font-size:11px;font-weight:800;">${esc(firmante)}</div><div style="font-size:10px;color:#45576c;">${esc(cargo)} — CAEDUC</div></div></div>`,
  ].join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe anual CAEDUC ${d.anio}</title><style>@page{size:letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${flowPageHTML({ inner, membreteUrl: esc(membreteUrl), padding: '1.35in .72in 1.9in .9in', color: '#26364b' })}</body></html>`;
};
