import { getOficioExpositores, parseJustificacionSections } from './oficioTemplates.js';
import { ACTIVITY_SOURCE_PUBLICACION } from './activitySources.js';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const todayGuatemalaISO = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Guatemala',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

export const escapeInformeHTML = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const splitPonentes = (value = '') => [...new Set(
  String(value)
    .split(/\n|;|\s+\/\s+|\s+\by\b\s+/i)
    .map(item => item.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean),
)];

export const formatInformeDate = (value) => {
  const source = String(value || '').trim();
  if (!source) return '';
  const iso = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${Number(iso[3])} de ${MONTHS[Number(iso[2]) - 1]} de ${iso[1]}`;
  const slash = source.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${Number(slash[1])} de ${MONTHS[Number(slash[2]) - 1]} de ${slash[3]}`;
  return source;
};

export const normalizeInformeDuration = (value) => {
  const source = String(value || '').trim();
  if (!source) return '2 horas';
  if (/hora/i.test(source)) return source;
  const number = source.match(/\d+(?:[.,]\d+)?/)?.[0];
  return number ? `${number.replace(',', '.')} horas` : source;
};

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const replaceInformePonente = (body = '', previous = '', next = '') => {
  const replacement = String(next || '').trim() || '[Nombre del ponente]';
  const current = String(previous || '').trim();
  let updated = String(body || '');
  if (!current) return updated.replace(/\[Nombre del ponente\]/g, replacement);
  const escaped = escapeRegExp(current);
  updated = updated.replace(new RegExp(`(que\\s+)${escaped}(\\s+impartió)`, 'g'), (_, prefix, suffix) => `${prefix}${replacement}${suffix}`);
  return updated.replace(new RegExp(`(Asimismo,\\s+)${escaped}(\\s+autoriza)`, 'g'), (_, prefix, suffix) => `${prefix}${replacement}${suffix}`);
};

const usefulProposalDetails = (oficio = {}) => {
  const parsed = parseJustificacionSections(oficio.justificacion || '');
  const candidates = [oficio.actividad_descripcion, parsed.intro]
    .map(value => String(value || '').trim())
    .filter(Boolean);
  return [...new Set(candidates)].join(' ')
    .replace(/\bsolicitamos\b/gi, 'se solicitó')
    .replace(/\bconsideramos\b/gi, 'se consideró')
    .replace(/\bbuscamos\b/gi, 'se buscó')
    .replace(/\bnuestro(s|as)?\b/gi, 'el')
    .replace(/\bnuestra(s)?\b/gi, 'la');
};

export const buildInformeActividadDraft = (oficio = {}, ponente = '', fechaInforme) => {
  const parsed = parseJustificacionSections(oficio.justificacion || '');
  const ponenteNombre = String(ponente || '').trim();
  const actividadTipo = String(oficio.actividad_tipo || 'actividad científico-académica').trim();
  const actividadNombre = String(oficio.actividad_nombre || oficio.titulo || '').trim();
  const actividadFecha = String(oficio.actividad_fecha || '').trim();
  const actividadModalidad = String(oficio.actividad_modalidad || 'Virtual').trim();
  const actividadDuracion = normalizeInformeDuration(oficio.actividad_duracion);
  const details = usefulProposalDetails(oficio);
  const results = String(parsed.sections['Resultados esperados'] || '').trim();
  const person = ponenteNombre || '[Nombre del ponente]';
  const article = /^(taller|seminario|simposio|congreso|diplomado)\b/i.test(actividadTipo) ? 'el' : 'la';
  const paragraphs = [
    `Por medio del presente informe, se comunica a la Junta Directiva del Colegio de Psicólogos de Guatemala que ${person} impartió ${article} ${actividadTipo.toLowerCase()} denominada "${actividadNombre || '[Nombre de la actividad]'}", en fecha ${formatInformeDate(actividadFecha) || '[Fecha de realización]'}, en modalidad ${actividadModalidad.toLowerCase()}, con una duración de ${actividadDuracion}.`,
    details ? `De acuerdo con la propuesta técnica, la actividad desarrolló los siguientes aspectos: ${details}` : `Durante la actividad se desarrollaron contenidos de actualización profesional relacionados con "${actividadNombre || 'el tema programado'}", de acuerdo con la propuesta técnica presentada a la Junta Directiva.`,
    'La actividad estuvo dirigida exclusivamente a psicólogos con colegiado activo en el Colegio de Psicólogos de Guatemala, con el propósito de fortalecer su actualización científico-académica y su ejercicio profesional.',
    results || 'La actividad permitió fortalecer conocimientos y competencias aplicables al ejercicio profesional, en congruencia con los objetivos de educación continua de CAEDUC.',
    `Asimismo, ${person} autoriza que, al finalizar la actividad, el material utilizado pueda ser cargado en el Aula Virtual del Colegio de Psicólogos de Guatemala para consulta y aprovechamiento académico de los profesionales activos.`,
  ];

  return {
    origen: oficio.source_type === ACTIVITY_SOURCE_PUBLICACION ? ACTIVITY_SOURCE_PUBLICACION : 'oficio',
    oficio_id: oficio.source_type === ACTIVITY_SOURCE_PUBLICACION ? null : oficio.id || null,
    publicacion_id: oficio.source_type === ACTIVITY_SOURCE_PUBLICACION ? oficio.id || null : null,
    numero_oficio: oficio.numero_oficio || '',
    fecha_informe: fechaInforme || todayGuatemalaISO(),
    dirigido_a: 'Junta Directiva del Colegio de Psicólogos de Guatemala',
    ponente_nombre: ponenteNombre,
    actividad_nombre: actividadNombre,
    actividad_tipo: actividadTipo,
    actividad_fecha: actividadFecha,
    actividad_modalidad: actividadModalidad,
    actividad_duracion: actividadDuracion,
    cuerpo: paragraphs.join('\n\n'),
  };
};

export const getInformePonentes = (oficio = {}) => splitPonentes(
  oficio.ponente_nombre || getOficioExpositores(oficio),
);

export const informeFileName = (informe = {}) => {
  const base = `Informe_${informe.actividad_nombre || informe.numero_oficio || 'Actividad'}_${informe.ponente_nombre || 'Ponente'}`;
  return base.replace(/[^a-zA-Z0-9_\-áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_');
};

export const generateInformeActividadHTML = (informe = {}, { membreteUrl = '/fondo-oficios.jpg' } = {}) => {
  const paragraphs = String(informe.cuerpo || '')
    .split(/\n\s*\n/)
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => `<p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 12px;">${escapeInformeHTML(value).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const subject = `Informe de realización de ${informe.actividad_tipo || 'actividad'}: ${informe.actividad_nombre || ''}`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeInformeHTML(subject)}</title><style>@page{size:letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><div class="page" style="position:relative;width:8.5in;min-height:11in;font-family:'Segoe UI',Arial,sans-serif;color:#333;background:white;overflow:hidden;"><img src="${escapeInformeHTML(membreteUrl)}" alt="" style="position:absolute;inset:0;width:100%;height:1056px;object-fit:cover;z-index:0;pointer-events:none;"><div style="position:relative;z-index:1;padding:1.35in .78in 1.7in .9in;min-height:11in;display:flex;flex-direction:column;"><div style="flex:1;"><div style="text-align:right;margin-bottom:22px;"><div style="font-size:11.5px;color:#444;">Guatemala, ${escapeInformeHTML(formatInformeDate(informe.fecha_informe))}</div></div><div style="font-size:11.5px;line-height:1.65;margin-bottom:18px;"><strong>Señores</strong><br><strong>Junta Directiva</strong><br>Colegio de Psicólogos de Guatemala<br>Presente</div><p style="font-size:11.5px;font-weight:700;margin:0 0 14px;">Honorables miembros de la Junta Directiva:</p><p style="font-size:11px;font-weight:700;color:#1a5276;text-transform:uppercase;margin:0 0 14px;">Asunto: ${escapeInformeHTML(subject)}</p>${paragraphs}<p style="font-size:11.5px;line-height:1.8;margin:16px 0 34px;">Atentamente,</p><div style="text-align:center;margin-top:28px;font-size:11.5px;font-weight:700;">${escapeInformeHTML(informe.ponente_nombre || '[Nombre del ponente]')}</div></div></div></div></body></html>`;
};
