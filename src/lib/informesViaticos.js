// src/lib/informesViaticos.js — Informes de respaldo de viáticos por sesión
//
// Auditoría exige un informe individual por cada sesión/actividad en la que se
// entreguen viáticos a un miembro de la Comisión. Este módulo arma ese informe:
// se elige el miembro (su cargo determina qué atribuciones del Reglamento de
// CAEDUC puede citar), la razón del viático y la fecha, y se genera un PDF con
// el mismo membrete y formato que el resto de oficios. No se guarda en base de
// datos: se genera y se descarga en el momento.

import { formatInformeDate } from './informesActividad.js';

// ── Atribuciones del Reglamento de CAEDUC, por cargo (arts. 6 a 11) ───────────
// Texto transcrito literalmente del reglamento para que la cita sea exacta.
export const ATRIBUCIONES_POR_CARGO = {
  'Coordinador(a)': {
    articulo: 'Artículo 6',
    atribuciones: [
      { literal: 'a', texto: 'Representar a la Comisión.' },
      { literal: 'b', texto: 'Convocar y presidir las sesiones ordinarias y extraordinarias.' },
      { literal: 'c', texto: 'En coordinación con el Secretario, elaborar el plan de trabajo, anteproyecto de presupuesto y memoria de labores, los que deben ser presentados a la Junta Directiva para su discusión, visto bueno y aprobación por Asamblea General.' },
      { literal: 'd', texto: 'Elaborar conjuntamente con el Secretario las agendas de las sesiones.' },
      { literal: 'e', texto: 'Firmar y sellar con el Secretario de la Comisión, las actas de las sesiones.' },
      { literal: 'f', texto: 'Firmar la correspondencia de la Comisión.' },
      { literal: 'g', texto: 'Velar por el buen funcionamiento de la Comisión.' },
      { literal: 'h', texto: 'Realizar las llamadas de atención a los miembros de la Comisión por ausencias injustificadas a las sesiones ordinarias, extraordinarias y actividades que lleve a cabo la Comisión.' },
      { literal: 'i', texto: 'Asistir puntualmente a las sesiones y actividades que realice la Comisión.' },
      { literal: 'j', texto: 'Junto con el Secretario, extender los certificados o constancias del cumplimiento de horas de crédito académico.' },
    ],
  },
  'Subcoordinador(a)': {
    articulo: 'Artículo 7',
    atribuciones: [
      { literal: 'a', texto: 'Representar a la Comisión en ausencia del Coordinador.' },
      { literal: 'b', texto: 'Asistir a las sesiones ordinarias y extraordinarias de la Comisión.' },
      { literal: 'c', texto: 'Sustituir al Coordinador por motivo de ausencia temporal en sus mismos deberes y atribuciones. Si la ausencia fuera definitiva ejercerá la coordinación mientras se nombra al nuevo titular.' },
      { literal: 'd', texto: 'Cumplir con las atribuciones que le sean encargadas por la Comisión.' },
    ],
  },
  'Secretario(a)': {
    articulo: 'Artículo 8',
    atribuciones: [
      { literal: 'a', texto: 'Redactar las actas de las sesiones junto con la Prosecretaria y firmarlas.' },
      { literal: 'b', texto: 'Tener a su cargo y llevar el control de todo lo referente a la secretaría de la Comisión.' },
      { literal: 'c', texto: 'Llevar el archivo de la correspondencia enviada y recibida de la Comisión.' },
      { literal: 'd', texto: 'Certificar las constancias que sean solicitadas a la Comisión.' },
      { literal: 'e', texto: 'En conjunto con el Coordinador elaborar el plan de trabajo, anteproyecto de presupuesto y memoria de labores, los que deben ser presentados a la Junta Directiva para su discusión, visto bueno y aprobación por Asamblea General.' },
      { literal: 'f', texto: 'Llevar el registro de las personas individuales o jurídicas, de Derecho público o privado, nacional e internacional, que soliciten el aval de la Comisión para el desarrollo de actividades científico-académicas.' },
      { literal: 'g', texto: 'Asistir puntualmente a las sesiones y actividades que realice la Comisión.' },
      { literal: 'h', texto: 'Junto con el Coordinador, extender los certificados o constancias del cumplimiento de horas de crédito académico.' },
    ],
  },
  'Prosecretario(a)': {
    articulo: 'Artículo 9',
    atribuciones: [
      { literal: 'a', texto: 'Sustituir al Secretario en su ausencia temporal o definitiva.' },
      { literal: 'b', texto: 'Colaborar con el Secretario en la redacción de las actas de las sesiones y demás actividades inherentes a la secretaría, contribuyendo al cumplimiento de las funciones de la misma.' },
      { literal: 'c', texto: 'Velar por la promoción y la difusión de las actividades de la Comisión.' },
      { literal: 'd', texto: 'Asistir puntualmente a las sesiones y actividades que realice la Comisión.' },
      { literal: 'e', texto: 'Y todas aquellas atribuciones propias de su cargo.' },
    ],
  },
  'Gestor(a) del Conocimiento': {
    articulo: 'Artículo 10',
    atribuciones: [
      { literal: 'a', texto: 'Identificar, recopilar, administrar y almacenar el conocimiento científico-académico de la Comisión.' },
      { literal: 'b', texto: 'Establecer comunicación y ser enlace con las entidades que brindan los servicios de capacitación y actualización profesional.' },
      { literal: 'c', texto: 'Velar por la calidad científica y académica de las actividades que se lleven a cabo.' },
      { literal: 'd', texto: 'Atender a través del aula virtual y correo electrónico las dudas, preguntas e inquietudes de los agremiados, relacionadas con las actividades científico-académicas realizadas por la Comisión, en coordinación con el ingeniero en sistemas, así como velar por el buen funcionamiento de los mecanismos de atención a los agremiados.' },
      { literal: 'e', texto: 'Coordinar con el responsable del manejo de las redes sociales la información que se debe publicar sobre las actividades científicas y académicas que la Comisión lleve a cabo, así como la información a brindar para resolver dudas e inquietudes de los agremiados.' },
      { literal: 'f', texto: 'Indagar, consultar y apoyarse con otros profesionales especializados para profundizar conocimientos y resolver dudas, preguntas e inquietudes de los agremiados.' },
      { literal: 'g', texto: 'Velar por la adquisición y uso adecuado de los recursos para crear un entorno en el que la información sea accesible a los agremiados.' },
      { literal: 'h', texto: 'Promover el flujo adecuado de los conocimientos brindados a través de las actividades científico-académicas y el máximo aprovechamiento del aula virtual.' },
      { literal: 'i', texto: 'Asistir puntualmente a las sesiones y actividades que realice la Comisión.' },
      { literal: 'j', texto: 'Colaborar con otras actividades que se le soliciten propias de la Comisión.' },
    ],
  },
  'Vocal I': {
    articulo: 'Artículo 11',
    atribuciones: [
      { literal: 'a', texto: 'Cooperar en todos los asuntos que se encuentren a cargo de la Comisión.' },
      { literal: 'b', texto: 'Cumplir las actividades que les sean asignadas por la Comisión o por su Coordinador.' },
      { literal: 'c', texto: 'Sustituir en sus cargos por ausencias temporales a los miembros de la Comisión, con excepción del Coordinador.' },
      { literal: 'd', texto: 'Asistir puntualmente a las sesiones y actividades que realice la Comisión.' },
      { literal: 'e', texto: 'Y todas aquellas atribuciones propias de su cargo.' },
    ],
  },
};
// Vocal II comparte el mismo artículo y las mismas atribuciones que Vocal I.
ATRIBUCIONES_POR_CARGO['Vocal II'] = ATRIBUCIONES_POR_CARGO['Vocal I'];

export const cargoTieneAtribuciones = (cargo) => Boolean(ATRIBUCIONES_POR_CARGO[cargo]);

export const atribucionesDeCargo = (cargo) => ATRIBUCIONES_POR_CARGO[cargo]?.atribuciones || [];

export const articuloDeCargo = (cargo) => ATRIBUCIONES_POR_CARGO[cargo]?.articulo || '';

export const textoAtribucion = (cargo, literal) =>
  atribucionesDeCargo(cargo).find(item => item.literal === literal)?.texto || '';

// Devuelve, en el orden del reglamento, las atribuciones del cargo cuyo
// literal está entre los elegidos. Permite marcar varias a la vez cuando una
// misma sesión respalda más de una acción del cargo.
export const atribucionesSeleccionadas = (cargo, literales = []) => {
  const elegidos = new Set(literales);
  return atribucionesDeCargo(cargo).filter(item => elegidos.has(item.literal));
};

// Une una lista de frases con comas y un "y"/"e" final, como se escribe en
// español ("a, b y c"; "a e incisos").
const unirConY = (frases = []) => {
  if (!frases.length) return '';
  if (frases.length === 1) return frases[0];
  const ultima = frases[frases.length - 1];
  const conector = /^[iI](?!i)/.test(ultima) ? 'e' : 'y';
  return `${frases.slice(0, -1).join(', ')} ${conector} ${ultima}`;
};

// Convierte una atribución en una cláusula que se integra en la oración
// ("a) representar a la Comisión") en vez de pegarse como cita textual entre
// comillas, que se vuelve inmanejable con varios literales a la vez.
const clausulaAtribucion = (item) => {
  const texto = String(item.texto || '').trim().replace(/\.\s*$/, '');
  const primeraMinuscula = texto ? texto.charAt(0).toLowerCase() + texto.slice(1) : '';
  return `${item.literal}) ${primeraMinuscula}`;
};

// Arma la frase de fundamento con una o varias atribuciones del cargo, ya
// integrada en la oración en vez de citas textuales sueltas.
export const fraseAtribuciones = (cargo, literales = []) => {
  const articulo = articuloDeCargo(cargo);
  const seleccionadas = atribucionesSeleccionadas(cargo, literales);
  if (!articulo || !seleccionadas.length) return '';
  const plural = seleccionadas.length > 1;
  const listado = unirConY(seleccionadas.map(clausulaAtribucion));
  return `en cumplimiento a las atribuciones que se le otorgan según el Reglamento de la Comisión de Acreditación y Educación Continua (CAEDUC), en su ${articulo}, literal${plural ? 'es' : ''} ${listado}`;
};

// ── Motivos de viático precargados ─────────────────────────────────────────
export const MOTIVOS_VIATICOS = [
  {
    id: 'sesion_ordinaria',
    label: 'Sesión ordinaria',
    requiereDetalle: false,
    frase: 'su asistencia y participación en la sesión ordinaria de la Comisión de Acreditación y Educación Continua (CAEDUC)',
  },
  {
    id: 'sesion_extraordinaria',
    label: 'Sesión extraordinaria',
    requiereDetalle: false,
    frase: 'su asistencia y participación en la sesión extraordinaria de la Comisión de Acreditación y Educación Continua (CAEDUC)',
  },
  {
    id: 'representacion',
    label: 'Actividad de representación',
    requiereDetalle: false,
    frase: 'su participación en actividades de representación de la Comisión de Acreditación y Educación Continua (CAEDUC)',
  },
  {
    id: 'otra',
    label: 'Otra actividad de la Comisión',
    requiereDetalle: true,
    frase: 'su participación en la actividad de la Comisión de Acreditación y Educación Continua (CAEDUC) que se detalla a continuación',
  },
];

export const motivoLabel = (motivoId) => MOTIVOS_VIATICOS.find(item => item.id === motivoId)?.label || '';

export const motivoRequiereDetalle = (motivoId) => Boolean(MOTIVOS_VIATICOS.find(item => item.id === motivoId)?.requiereDetalle);

// Sugiere, dentro de las atribuciones del cargo elegido, la que mejor calza con
// el motivo seleccionado. Es solo una sugerencia: el selector de literal sigue
// siendo manual y se puede cambiar libremente.
export const defaultLiteralParaMotivo = (cargo, motivoId) => {
  const atribuciones = atribucionesDeCargo(cargo);
  const buscar = (regex) => atribuciones.find(item => regex.test(item.texto));
  if (motivoId === 'sesion_ordinaria' || motivoId === 'sesion_extraordinaria') {
    return (
      buscar(/sesiones? ordinarias? y extraordinarias?/i)
      || buscar(/convocar y presidir/i)
      || buscar(/asistir (puntualmente )?a las sesiones/i)
    )?.literal || '';
  }
  if (motivoId === 'representacion') {
    return buscar(/representar a la comisi[oó]n/i)?.literal || '';
  }
  if (motivoId === 'otra') {
    return (
      buscar(/todas aquellas atribuciones propias de su cargo/i)
      || buscar(/colaborar con otras actividades/i)
      || buscar(/cumplir con las atribuciones/i)
      || buscar(/cumplir las actividades/i)
    )?.literal || '';
  }
  return '';
};

const todayGuatemalaISO = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Guatemala',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

export const escapeViaticosHTML = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

// Arma el borrador del informe a partir del miembro elegido, el motivo y la
// fecha. `detalle` es el texto libre que describe la sesión/actividad y es
// obligatorio solo cuando el motivo lo pide (por ahora, "Otra actividad").
// `literales` acepta varias atribuciones a la vez, para sesiones donde el
// cargo cumplió más de una función (ej. convocó la sesión y además representó
// a la Comisión en ella).
export const buildInformeViaticosDraft = ({
  miembro = null,
  motivoId = MOTIVOS_VIATICOS[0].id,
  detalle = '',
  literales = [],
  fecha = '',
} = {}) => {
  const cargo = miembro?.cargo || '';
  const nombre = miembro?.nombre || '';
  const elegidos = literales.length ? literales : [defaultLiteralParaMotivo(cargo, motivoId)].filter(Boolean);
  return {
    miembro_nombre: nombre,
    miembro_cargo: cargo,
    motivo_id: motivoId,
    detalle: detalle.trim(),
    literales: elegidos,
    fecha: fecha || todayGuatemalaISO(),
  };
};

const parrafosInforme = (informe = {}) => {
  const motivo = MOTIVOS_VIATICOS.find(item => item.id === informe.motivo_id) || MOTIVOS_VIATICOS[0];
  const nombre = informe.miembro_nombre || '[Nombre del miembro]';
  const cargo = informe.miembro_cargo || '[Cargo]';
  const fechaTexto = formatInformeDate(informe.fecha) || '[Fecha pendiente]';
  const detalle = String(informe.detalle || '').trim();
  const frase = fraseAtribuciones(cargo, informe.literales || []);

  const p1 = `Por medio del presente informe, se deja constancia de que ${nombre}, ${cargo} de la Comisión de Acreditación y Educación Continua (CAEDUC), participó en ${motivo.frase}${detalle ? `, consistente en ${detalle}` : ''}, celebrada/realizada el ${fechaTexto}.`;

  const p2 = frase
    ? `Dicha participación se realiza ${frase}.`
    : `Dicha participación se realiza en cumplimiento a las atribuciones propias de su cargo, según el Reglamento de la Comisión de Acreditación y Educación Continua (CAEDUC).`;

  const p3 = 'El presente informe se extiende para los efectos administrativos y de fiscalización correspondientes, como respaldo de los viáticos otorgados en virtud de la participación antes descrita.';

  return [p1, p2, p3];
};

export const informeViaticosFileName = (informe = {}) => {
  const base = `Informe_Viaticos_${informe.miembro_cargo || 'Miembro'}_${informe.miembro_nombre || ''}_${informe.fecha || ''}`;
  return base.replace(/[^a-zA-Z0-9_\-áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_');
};

// `firmaUrl` solo debe pasarse para el Coordinador (única firma disponible en
// el sistema); para el resto de cargos se deja la línea en blanco para firma
// física, con el nombre y el cargo tal como están en el directorio.
export const generateInformeViaticosHTML = (informe = {}, { membreteUrl = '/fondo-oficios.jpg', firmaUrl = '' } = {}) => {
  const nombre = informe.miembro_nombre || '[Nombre del miembro]';
  const cargo = informe.miembro_cargo || '[Cargo]';
  const motivo = MOTIVOS_VIATICOS.find(item => item.id === informe.motivo_id) || MOTIVOS_VIATICOS[0];
  const subject = `Informe de respaldo de viáticos — ${cargo} — ${motivo.label}`;
  const paragraphs = parrafosInforme(informe)
    .map(value => `<p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 12px;">${escapeViaticosHTML(value)}</p>`)
    .join('');

  const firmaBlock = `<div style="margin-top:30px;"><p style="font-size:11.5px;margin:0 0 34px;">Atentamente,</p><div style="text-align:center;"><div style="display:inline-flex;flex-direction:column;align-items:center;">${
    firmaUrl ? `<img src="${escapeViaticosHTML(firmaUrl)}" alt="Firma" style="height:55px;width:auto;display:block;margin:0 auto -4px;">` : ''
  }<div style="width:240px;border-top:1.5px solid #26364b;padding-top:5px;margin-top:${firmaUrl ? '0' : '46px'};"><div style="font-size:11.5px;font-weight:700;">${escapeViaticosHTML(nombre)}</div><div style="font-size:10.5px;color:#556579;">${escapeViaticosHTML(cargo)}</div></div></div></div></div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeViaticosHTML(subject)}</title><style>@page{size:letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><div class="page" style="position:relative;width:8.5in;min-height:11in;font-family:'Segoe UI',Arial,sans-serif;color:#333;background:white;overflow:hidden;"><img src="${escapeViaticosHTML(membreteUrl)}" alt="" style="position:absolute;inset:0;width:100%;height:1056px;object-fit:cover;z-index:0;pointer-events:none;"><div style="position:relative;z-index:1;padding:1.35in .78in 1.7in .9in;min-height:11in;display:flex;flex-direction:column;"><div style="flex:1;"><div style="text-align:right;margin-bottom:22px;"><div style="font-size:11.5px;color:#444;">Guatemala, ${escapeViaticosHTML(formatInformeDate(informe.fecha))}</div></div><div style="font-size:11.5px;line-height:1.65;margin-bottom:18px;"><strong>Señores</strong><br><strong>Junta Directiva</strong><br>Colegio de Psicólogos de Guatemala<br>Presente</div><p style="font-size:11.5px;font-weight:700;margin:0 0 14px;">Honorables miembros de la Junta Directiva:</p><p style="font-size:11px;font-weight:700;color:#1a5276;text-transform:uppercase;margin:0 0 14px;">Asunto: ${escapeViaticosHTML(subject)}</p>${paragraphs}${firmaBlock}</div></div></div></body></html>`;
};
