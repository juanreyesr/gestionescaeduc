// src/lib/pagoPonentes.js — Oficios de pago de honorarios a ponentes
//
// Un oficio de este tipo solicita a Junta Directiva el pago de los honorarios de
// varias actividades a la vez. Las actividades se toman del "Historial de
// actividades" del módulo de Solicitud de publicación: primero se eligen el mes
// o los meses y después, con casillas, las actividades que entran en el oficio.
//
// El monto de cada línea sale del tarifario según el grado académico que se
// registró en la solicitud de publicación (dato interno: no se publica ni se
// envía a nadie, solo alimenta este oficio y el modelo de factura).
//
// El detalle se guarda dentro de `justificacion`, como el resto de bloques
// estructurados de los oficios (mismo patrón que `setOficioExpositores`), para
// no requerir columnas nuevas en la tabla `oficios`.

import { parseJustificacionSections } from './oficioTemplates.js';
import { activityDateKey, formatRegistroDate, monthFromName, sinAcentos } from './registroActividadesReport.js';
import { formatoQuetzales, montoPorGrado, TARIFAS_DEFAULT } from './tarifario.js';

export const MOTIVO_PAGO_PONENTES = 'Solicitud de pago de honorarios a ponentes';

export const esOficioPagoPonentes = (motivo = '') => /pago de\s+(?:los\s+)?honorarios/i.test(String(motivo || ''));

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Grupo para las actividades cuya fecha no se puede interpretar. Existe para que
// ninguna actividad del historial quede fuera del oficio solo por cómo se
// escribió su fecha: siempre hay una forma de marcarla.
export const SIN_MES = 'sin-mes';

// 'YYYY-MM' de una actividad del historial. Cuando la fecha no trae día pero sí
// mes ("junio de 2026", "junio"), igual sirve para agrupar aunque no se pueda
// ordenar por día.
export const activityMonthKey = (fecha = '') => {
  const completa = activityDateKey(fecha).slice(0, 7);
  if (completa) return completa;

  const raw = sinAcentos(String(fecha)).trim().toLowerCase();
  if (!raw) return '';

  // 2026-06 · 06/2026
  const numerico = raw.match(/^(\d{4})[-/](\d{1,2})$/) || raw.match(/^(\d{1,2})[-/](\d{4})$/);
  if (numerico) {
    const [anio, mes] = numerico[1].length === 4 ? [numerico[1], numerico[2]] : [numerico[2], numerico[1]];
    if (Number(mes) >= 1 && Number(mes) <= 12) return `${anio}-${String(mes).padStart(2, '0')}`;
  }

  // "junio", "junio de 2026", "jun 2026", "mes de junio"
  const conNombre = raw.match(/([a-z.]+)(?:\s+de[l]?)?(?:\s+(\d{4}))?$/);
  if (!conNombre) return '';
  const mes = monthFromName(conNombre[1]);
  if (!mes) return '';
  const anio = conNombre[2] || String(new Date().getFullYear());
  return `${anio}-${String(mes).padStart(2, '0')}`;
};

export const monthLabel = (key = '') => {
  if (key === SIN_MES) return 'Sin fecha reconocida';
  const match = String(key).match(/^(\d{4})-(\d{2})$/);
  if (!match) return 'Sin fecha';
  return `${MESES[Number(match[2]) - 1]} de ${match[1]}`;
};

// Meses presentes en el historial, del más reciente al más antiguo, con cuántas
// actividades tiene cada uno para poder decidir sin abrirlos. El grupo "Sin fecha
// reconocida" va siempre al final.
export const listActivityMonths = (activities = []) => {
  const counts = new Map();
  activities.forEach(activity => {
    const key = activityMonthKey(activity.actividad_fecha) || SIN_MES;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => {
      if (a[0] === SIN_MES) return 1;
      if (b[0] === SIN_MES) return -1;
      return b[0].localeCompare(a[0]);
    })
    .map(([key, total]) => ({ key, label: monthLabel(key), total }));
};

export const activitiesInMonths = (activities = [], months = []) => {
  const selected = new Set(months.filter(Boolean));
  if (!selected.size) return [];
  // Las actividades sin fecha reconocible se ordenan al final, por nombre.
  const orden = (activity) => activityDateKey(activity.actividad_fecha)
    || `${activityMonthKey(activity.actividad_fecha) || '9999-99'}-99`;
  return activities
    .filter(activity => selected.has(activityMonthKey(activity.actividad_fecha) || SIN_MES))
    .sort((a, b) => orden(a).localeCompare(orden(b))
      || String(a.actividad_nombre || '').localeCompare(String(b.actividad_nombre || ''), 'es'));
};

export const formatHoraActividad = (hora = '') => {
  const match = String(hora).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(hora || '').trim();
  return `${String(match[1]).padStart(2, '0')}:${match[2]} hrs.`;
};

// Convierte una actividad del historial en una línea del oficio. `grado` permite
// corregir en el oficio el grado académico sin tocar la solicitud de publicación.
export const buildPagoLinea = (activity = {}, { grado, tarifas = TARIFAS_DEFAULT } = {}) => {
  const gradoFinal = String(grado ?? activity.ponente_grado ?? '').trim();
  const monto = montoPorGrado(gradoFinal, tarifas);
  return {
    publicacion_id: activity.id || '',
    profesional: String(activity.ponente_nombre || '').trim(),
    actividad: String(activity.actividad_nombre || '').trim(),
    fecha: String(activity.actividad_fecha || '').trim(),
    hora: String(activity.actividad_hora || '').trim(),
    grado: gradoFinal,
    monto: monto ?? 0,
  };
};

export const totalPagoPonentes = (lineas = []) => lineas
  .reduce((total, linea) => total + (Number(linea.monto) || 0), 0);

export const totalPagoPonentesTexto = (lineas = []) => formatoQuetzales(totalPagoPonentes(lineas));

export const PAGO_SECTION = 'Pago de honorarios a ponentes';

const sanitizeLinea = (linea = {}) => ({
  publicacion_id: String(linea.publicacion_id || ''),
  profesional: String(linea.profesional || ''),
  actividad: String(linea.actividad || ''),
  fecha: String(linea.fecha || ''),
  hora: String(linea.hora || ''),
  grado: String(linea.grado || ''),
  monto: Number(linea.monto) || 0,
});

export const getOficioPagoPonentes = (oficioOrText) => {
  const text = typeof oficioOrText === 'string'
    ? oficioOrText
    : oficioOrText?.justificacion || '';
  const raw = parseJustificacionSections(text).sections[PAGO_SECTION];
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(sanitizeLinea) : [];
  } catch {
    return [];
  }
};

export const setOficioPagoPonentes = (text, lineas = []) => {
  const source = text || '';
  const sectionPattern = new RegExp(`(?:^|\\n)###\\s*${PAGO_SECTION}\\s*\\n[\\s\\S]*?(?=\\n###\\s|$)`, 'i');
  const cleaned = source.replace(sectionPattern, '').trim();
  const limpias = (lineas || []).map(sanitizeLinea);
  if (!limpias.length) return cleaned;
  // JSON en una sola línea: `parseJustificacionSections` separa por líneas que
  // empiezan con "### ", así que el bloque nunca debe contener saltos de línea.
  return `${cleaned ? `${cleaned}\n\n` : ''}### ${PAGO_SECTION}\n${JSON.stringify(limpias)}`;
};

// Párrafo de la primera página del oficio: enlaza con el detalle de la página 2.
export const buildPagoPonentesCuerpo = (lineas = []) => {
  const cantidad = lineas.length;
  const profesionales = new Set(lineas.map(linea => linea.profesional).filter(Boolean)).size;
  const total = totalPagoPonentesTexto(lineas);
  return `Por este medio, la Comisión de Acreditación y Educación Continua (CAEDUC) se dirige a ustedes solicitando el pago de los honorarios para los profesionales y las actividades siguientes, correspondientes a ${cantidad === 1 ? 'la actividad académica realizada' : `las ${cantidad} actividades académicas realizadas`}${profesionales ? ` por ${profesionales === 1 ? 'un profesional' : `${profesionales} profesionales`}` : ''}, por un monto total de <strong>${total}</strong>. El detalle de cada profesional, actividad, hora y monto a pagar se describe en la página siguiente.`;
};

export const describirLineaPago = (linea = {}) => [
  linea.profesional || 'Profesional pendiente',
  linea.actividad || 'Actividad sin nombre',
  linea.fecha ? formatRegistroDate(linea.fecha) : '',
  formatHoraActividad(linea.hora),
  formatoQuetzales(linea.monto),
].filter(Boolean).join(' · ');
