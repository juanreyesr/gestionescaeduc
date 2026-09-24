// src/lib/miembrosComision.js — Miembros de la Comisión
//
// El directorio interno de la comisión: quién ocupa cada cargo, con qué rol
// designado, su cumpleaños, su número de colegiado y su teléfono.
//
// Los cargos vienen precargados del reglamento (ROLES) para que no haya que
// escribirlos, pero se admite cualquier otro si la comisión crea uno nuevo.

import { ROLES } from './constants.js';

export const CARGOS_COMISION = ROLES;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Campos que pueden salir en el directorio impreso. El orden es el de la tabla.
export const CAMPOS_MIEMBRO = [
  { campo: 'cargo',           label: 'Cargo' },
  { campo: 'nombre',           label: 'Nombre' },
  { campo: 'rol_designado',    label: 'Rol designado' },
  { campo: 'cumpleanos',       label: 'Cumpleaños' },
  { campo: 'numero_colegiado', label: 'No. de colegiado' },
  { campo: 'telefono',         label: 'Teléfono' },
];

export const CAMPOS_POR_DEFECTO = ['cargo', 'nombre', 'rol_designado', 'telefono'];

export const campoLabel = (campo) => CAMPOS_MIEMBRO.find(item => item.campo === campo)?.label || campo;

const partesFecha = (valor) => {
  const match = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { anio: Number(match[1]), mes, dia };
};

// Solo día y mes: el año de nacimiento no se muestra en el directorio.
export const formatCumpleanos = (valor) => {
  const partes = partesFecha(valor);
  if (!partes) return '';
  return `${partes.dia} de ${MESES[partes.mes - 1]}`;
};

const esBisiesto = (anio) => (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;

// Un 29 de febrero en año no bisiesto se celebra el 28, para que el aviso no se
// salga del mes de nacimiento.
const diaDelAnio = (anio, mes, dia) => {
  const diaAjustado = mes === 2 && dia === 29 && !esBisiesto(anio) ? 28 : dia;
  return Date.UTC(anio, mes - 1, diaAjustado, 12);
};

const hoyEnMediodia = (hoy) => Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12);

// Días que faltan para el próximo cumpleaños. 0 es hoy. null si no hay fecha.
export const diasParaCumpleanos = (valor, hoy = new Date()) => {
  const partes = partesFecha(valor);
  if (!partes) return null;
  const referencia = hoyEnMediodia(hoy);
  let proximo = diaDelAnio(hoy.getFullYear(), partes.mes, partes.dia);
  if (proximo < referencia) proximo = diaDelAnio(hoy.getFullYear() + 1, partes.mes, partes.dia);
  return Math.round((proximo - referencia) / 86400000);
};

// La columna se llamó `puesto` antes de renombrarse a `cargo`. Esto deja que el
// listado siga viéndose entre el despliegue y la migración, en vez de aparecer
// vacío.
export const normalizarMiembro = (miembro = {}) => (
  miembro.cargo === undefined && miembro.puesto !== undefined
    ? { ...miembro, cargo: miembro.puesto }
    : miembro
);

// Quiénes cumplen años dentro de los próximos `dentroDe` días, hoy incluido.
// Ordenados por cercanía; a igual día, por nombre.
export const cumpleanosProximos = (miembros = [], { hoy = new Date(), dentroDe = 7 } = {}) => miembros
  .map(normalizarMiembro)
  .map(miembro => ({ ...miembro, diasParaCumpleanos: diasParaCumpleanos(miembro.cumpleanos, hoy) }))
  .filter(miembro => miembro.diasParaCumpleanos !== null && miembro.diasParaCumpleanos <= dentroDe)
  .sort((a, b) => a.diasParaCumpleanos - b.diasParaCumpleanos
    || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));

export const textoCuentaRegresiva = (dias) => {
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
};

// Orden del directorio: por el cargo según el reglamento y, dentro del mismo
// cargo (o para cargos nuevos), alfabético.
export const ordenarMiembros = (miembros = []) => [...miembros].map(normalizarMiembro).sort((a, b) => {
  const posA = CARGOS_COMISION.indexOf(a.cargo);
  const posB = CARGOS_COMISION.indexOf(b.cargo);
  const normA = posA === -1 ? CARGOS_COMISION.length : posA;
  const normB = posB === -1 ? CARGOS_COMISION.length : posB;
  return normA - normB
    || String(a.cargo || '').localeCompare(String(b.cargo || ''), 'es')
    || String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
});

export const valorDeCampo = (miembro = {}, campo) => {
  if (campo === 'cumpleanos') return formatCumpleanos(miembro.cumpleanos);
  return String(miembro[campo] || '').trim();
};

// Deja solo los campos marcados, en el orden de la tabla, y descarta cualquiera
// que no exista. Si no queda ninguno, se usan los de siempre para no imprimir
// una hoja en blanco.
export const camposParaImprimir = (seleccion = []) => {
  const validos = CAMPOS_MIEMBRO.map(item => item.campo).filter(campo => seleccion.includes(campo));
  return validos.length ? validos : CAMPOS_POR_DEFECTO;
};

export const filasParaImprimir = (miembros = [], seleccion = []) => {
  const campos = camposParaImprimir(seleccion);
  return ordenarMiembros(miembros).map(miembro => campos.map(campo => valorDeCampo(miembro, campo)));
};

export const escapeMiembroHTML = (valor = '') => String(valor)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const fechaDeHoyLarga = (hoy = new Date()) =>
  `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;

export const generateDirectorioMiembrosHTML = (miembros = [], seleccion = [], {
  membreteUrl = '/fondo-oficios.jpg',
  hoy = new Date(),
} = {}) => {
  const campos = camposParaImprimir(seleccion);
  const filas = filasParaImprimir(miembros, seleccion);
  const encabezados = campos
    .map(campo => `<th style="padding:6px 8px;border:1px solid #174567;text-align:left;font-size:9px;text-transform:uppercase;">${escapeMiembroHTML(campoLabel(campo))}</th>`)
    .join('');
  const cuerpo = filas.map((fila, indice) => `<tr style="background:${indice % 2 ? '#f8fbfd' : '#fff'};">${
    fila.map(valor => `<td style="padding:6px 8px;border:1px solid #cbd5df;font-size:11px;line-height:1.35;">${escapeMiembroHTML(valor || '—')}</td>`).join('')
  }</tr>`).join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Miembros de la Comisión — CAEDUC</title><style>@page{size:letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><section class="carta-page" style="position:relative;width:8.5in;min-height:11in;font-family:'Segoe UI',Arial,sans-serif;color:#26364b;background:#fff;overflow:hidden;"><img src="${escapeMiembroHTML(membreteUrl)}" alt="" style="position:absolute;inset:0;width:100%;height:1056px;object-fit:cover;z-index:0;pointer-events:none;"><div style="position:relative;z-index:1;padding:1.35in .75in 1.7in .9in;"><p style="margin:0;text-align:right;font-size:11px;color:#4b5563;">Guatemala, ${escapeMiembroHTML(fechaDeHoyLarga(hoy))}</p><h1 style="margin:18px 0 4px;font-size:16px;color:#1a5276;text-align:center;">Miembros de la Comisión de Acreditación y Educación Continua</h1><p style="margin:0 0 16px;text-align:center;color:#63758a;font-size:10px;">${filas.length} integrante${filas.length === 1 ? '' : 's'}</p><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><thead><tr style="background:#1a5276;color:#fff;">${encabezados}</tr></thead><tbody>${cuerpo}</tbody></table>${filas.length ? '' : '<p style="margin-top:18px;text-align:center;font-size:11px;color:#8b9aac;">No hay miembros registrados.</p>'}</div></section></body></html>`;
};
