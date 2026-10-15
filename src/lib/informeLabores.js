// Informe de labores para Junta Directiva
//
// Reúne las actividades del período (calendario del Aula Virtual más las
// solicitudes de publicación que todavía no se agregaron al calendario), las
// agrupa por mes y suma los beneficiados: participantes en vivo de cada
// actividad (presencial y virtual en un solo número) más los agremiados que
// obtuvieron certificado al ver contenido grabado en el Aula Virtual.
//
// El documento se arma como una lista de bloques. La vista los mide en el
// navegador y `paginarBloques` los reparte en páginas carta con el membrete,
// de modo que nada invada el encabezado ni el pie con las sedes, y la firma
// nunca quede partida entre dos páginas.

import { activityDateKey, escapeRegistroHTML as esc, sinAcentos } from './registroActividadesReport.js';

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const MODALIDADES = ['Presencial', 'Virtual', 'Híbrida'];

// Área útil de cada página, en px a 96 ppp (carta = 816 × 1056). Los márgenes
// dejan libre el logo de arriba, las pestañas de color de la izquierda, el
// adorno de la derecha y el pie con las sedes (empieza cerca de 900 px).
// El logo termina cerca de los 145 px.
export const PAGINA = {
  ancho: 816,
  alto: 1056,
  margenSuperior: 170,
  margenInferior: 165,
  margenIzquierdo: 86,
  margenDerecho: 82,
};
export const ANCHO_CONTENIDO = PAGINA.ancho - PAGINA.margenIzquierdo - PAGINA.margenDerecho;
// Se reservan 22 px al final del área útil para el número de página.
export const ALTO_CONTENIDO = PAGINA.alto - PAGINA.margenSuperior - PAGINA.margenInferior - 22;

const AZUL = '#1a5276';
const AZUL_OSCURO = '#173b63';
const ROSA = '#e91e63';
const TEXTO = '#26364b';
const GRIS = '#63758a';
const BORDE = '#d5dee8';

// ── Datos ────────────────────────────────────────────────────────────────────

export const normalizarTitulo = (valor = '') => sinAcentos(valor)
  .toLowerCase()
  .replace(/["“”'‘’«»]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// La modalidad se deduce del lugar o de la modalidad escrita; la persona puede
// corregirla en pantalla antes de generar el informe.
export const clasificarModalidad = (...textos) => {
  const texto = sinAcentos(textos.filter(Boolean).join(' ')).toLowerCase();
  if (!texto.trim()) return 'Virtual';
  if (/hibrid/.test(texto)) return 'Híbrida';
  const virtual = /virtual|zoom|meet|teams|youtube|en linea|online|facebook|live|transmision|webinar/.test(texto);
  const presencial = /presencial|salon|auditorio|sede|hotel|universidad|campus|calle|avenida|zona|edificio|aula \d|instalaciones/.test(texto);
  if (virtual && presencial) return 'Híbrida';
  if (virtual) return 'Virtual';
  return 'Presencial';
};

const enteroONulo = (valor) => {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  const numero = Number(String(valor).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero) : null;
};

const dentroDelRango = (fecha, desde, hasta) => Boolean(fecha) && (!desde || fecha >= desde) && (!hasta || fecha <= hasta);

const mismaActividad = (a, b) => {
  if (!a.titulo || !b.titulo) return false;
  if (a.titulo === b.titulo) return true;
  // Mismo día y un título contiene al otro ("Taller de X" / "X").
  return a.fecha === b.fecha && a.titulo.length > 6 && b.titulo.length > 6
    && (a.titulo.includes(b.titulo) || b.titulo.includes(a.titulo));
};

// Une el calendario del aula con las solicitudes de publicación. Las del aula
// mandan; una solicitud solo se agrega si no está ya en el calendario.
export const reunirActividades = ({ aula = [], publicaciones = [], desde = '', hasta = '', ajustes = {} } = {}) => {
  const lista = [];

  aula.forEach((actividad) => {
    const fecha = activityDateKey(actividad.date || '');
    if (!dentroDelRango(fecha, desde, hasta)) return;
    const clave = `aula:${actividad.id ?? `${normalizarTitulo(actividad.title)}|${fecha}`}`;
    lista.push({
      clave,
      origen: 'aula',
      nombre: String(actividad.title || '').trim() || 'Actividad sin nombre',
      fecha,
      lugar: String(actividad.location || '').trim(),
      ponente: '',
      modalidad: clasificarModalidad(actividad.location, actividad.modality),
      asistentes: enteroONulo(actividad.participants),
    });
  });

  publicaciones.forEach((publicacion) => {
    const fecha = activityDateKey(publicacion.actividad_fecha || '');
    if (!dentroDelRango(fecha, desde, hasta)) return;
    const candidata = { titulo: normalizarTitulo(publicacion.actividad_nombre), fecha };
    const repetida = lista.some(item => mismaActividad(candidata, { titulo: normalizarTitulo(item.nombre), fecha: item.fecha }));
    if (repetida) return;
    lista.push({
      clave: `pub:${publicacion.id}`,
      origen: 'solicitud',
      nombre: String(publicacion.actividad_nombre || '').trim() || 'Actividad sin nombre',
      fecha,
      lugar: String(publicacion.actividad_lugar || '').trim(),
      ponente: String(publicacion.ponente_nombre || '').trim(),
      modalidad: clasificarModalidad(publicacion.actividad_modalidad, publicacion.actividad_lugar, publicacion.zoom_detalles ? 'zoom' : ''),
      asistentes: null,
    });
  });

  return lista
    .map((item) => {
      const ajuste = ajustes[item.clave] || {};
      return {
        ...item,
        modalidad: MODALIDADES.includes(ajuste.modalidad) ? ajuste.modalidad : item.modalidad,
        asistentes: enteroONulo(ajuste.asistentes) ?? item.asistentes,
        incluir: ajuste.incluir !== false,
      };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre, 'es'));
};

const mesDe = (fecha = '') => fecha.slice(0, 7);

export const nombreMes = (clave = '') => {
  const [anio, mes] = clave.split('-');
  return `${MESES[Number(mes) - 1] || ''} ${anio || ''}`.trim();
};

const capitalizar = (texto = '') => texto.charAt(0).toUpperCase() + texto.slice(1);

// Meses del período, aunque alguno no tenga actividades, para que el informe
// muestre el año completo sin huecos.
export const mesesDelPeriodo = (desde, hasta) => {
  if (!desde || !hasta || desde > hasta) return [];
  const meses = [];
  let [anio, mes] = desde.slice(0, 7).split('-').map(Number);
  const [anioFin, mesFin] = hasta.slice(0, 7).split('-').map(Number);
  while (anio < anioFin || (anio === anioFin && mes <= mesFin)) {
    meses.push(`${anio}-${String(mes).padStart(2, '0')}`);
    mes += 1;
    if (mes > 12) { mes = 1; anio += 1; }
  }
  return meses;
};

const contarModalidades = (actividades) => MODALIDADES.reduce((acc, modalidad) => ({
  ...acc,
  [modalidad]: actividades.filter(item => item.modalidad === modalidad).length,
}), {});

export const resumirPorMes = ({ actividades = [], certificados = [], desde = '', hasta = '' } = {}) => {
  const incluidas = actividades.filter(item => item.incluir !== false);
  const certificadosPorMes = Object.fromEntries(certificados.map(item => [item.mes, Number(item.total) || 0]));
  const claves = new Set([
    ...mesesDelPeriodo(desde, hasta),
    ...incluidas.map(item => mesDe(item.fecha)),
    ...Object.keys(certificadosPorMes),
  ]);
  const meses = [...claves].filter(Boolean).sort().map((mes) => {
    const delMes = incluidas.filter(item => mesDe(item.fecha) === mes);
    const enVivo = delMes.reduce((suma, item) => suma + (item.asistentes || 0), 0);
    const aula = certificadosPorMes[mes] || 0;
    return {
      mes,
      actividades: delMes,
      modalidades: contarModalidades(delMes),
      enVivo,
      aula,
      total: enVivo + aula,
      sinDato: delMes.filter(item => item.asistentes === null).length,
    };
  });
  const totales = {
    actividades: incluidas.length,
    modalidades: contarModalidades(incluidas),
    enVivo: meses.reduce((suma, item) => suma + item.enVivo, 0),
    aula: meses.reduce((suma, item) => suma + item.aula, 0),
    sinDato: incluidas.filter(item => item.asistentes === null).length,
  };
  totales.total = totales.enVivo + totales.aula;
  return { meses, totales };
};

// ── Redacción ────────────────────────────────────────────────────────────────

const numero = (valor) => new Intl.NumberFormat('es-GT').format(valor || 0);

const plural = (cantidad, singular, pluralTexto) => `${numero(cantidad)} ${cantidad === 1 ? singular : pluralTexto}`;

const listaEs = (items) => {
  const limpios = items.filter(Boolean);
  if (limpios.length <= 1) return limpios.join('');
  return `${limpios.slice(0, -1).join(', ')} y ${limpios[limpios.length - 1]}`;
};

const ADJETIVO = {
  Presencial: ['presencial', 'presenciales'],
  Virtual: ['virtual', 'virtuales'],
  Híbrida: ['híbrida', 'híbridas'],
};

const desgloseModalidades = (modalidades) => listaEs(MODALIDADES
  .filter(modalidad => modalidades[modalidad])
  .map(modalidad => `${numero(modalidades[modalidad])} ${ADJETIVO[modalidad][modalidades[modalidad] === 1 ? 0 : 1]}`));

export const fechaLarga = (fecha = '') => {
  const clave = activityDateKey(fecha);
  if (!clave) return String(fecha || '');
  const [anio, mes, dia] = clave.split('-');
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${anio}`;
};

export const etiquetaPeriodo = (desde, hasta) => `del ${fechaLarga(desde)} al ${fechaLarga(hasta)}`;

export const textoMes = (resumen) => {
  const { actividades, modalidades, enVivo, aula, total } = resumen;
  const partes = [];
  if (actividades.length) {
    partes.push(`Durante el mes se realizaron ${plural(actividades.length, 'actividad', 'actividades')} (${desgloseModalidades(modalidades)}), con ${plural(enVivo, 'participante', 'participantes')} en vivo.`);
  } else {
    partes.push('Durante el mes no se registraron actividades en vivo.');
  }
  if (aula) {
    partes.push(`Además, ${plural(aula, 'agremiado obtuvo', 'agremiados obtuvieron')} su certificado tras completar contenido grabado en el Aula Virtual.`);
  }
  partes.push(`Beneficiados en el mes: ${numero(total)}.`);
  return partes.join(' ');
};

// ── Bloques HTML ─────────────────────────────────────────────────────────────

const P = `margin:0;padding:0 0 12px;font-size:11.5px;line-height:1.7;text-align:justify;color:${TEXTO};`;

const bloque = (html, opciones = {}) => ({ html, ...opciones });

const tarjeta = (valor, etiqueta, color) => `<td style="width:25%;padding:0 4px;"><div style="border:1px solid ${BORDE};border-top:3px solid ${color};border-radius:8px;padding:9px 6px 8px;text-align:center;background:#fbfdff;"><div style="font-size:19px;font-weight:800;color:${color};line-height:1.1;">${esc(valor)}</div><div style="font-size:8.5px;font-weight:700;color:${GRIS};text-transform:uppercase;letter-spacing:.5px;margin-top:3px;line-height:1.3;">${esc(etiqueta)}</div></div></td>`;

const filaActividad = (actividad, indice) => {
  const asistentes = actividad.asistentes === null ? '<span style="color:#b45309;">Sin registro</span>' : numero(actividad.asistentes);
  const detalle = [actividad.ponente && `Ponente: ${esc(actividad.ponente)}`, actividad.lugar && esc(actividad.lugar)].filter(Boolean).join(' · ');
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:10.5px;color:${TEXTO};"><colgroup><col style="width:17%"><col style="width:53%"><col style="width:15%"><col style="width:15%"></colgroup><tr style="background:${indice % 2 ? '#f6f9fc' : '#fff'};"><td style="padding:6px 7px;border-bottom:1px solid ${BORDE};vertical-align:top;">${esc(fechaLarga(actividad.fecha).replace(/ de \d{4}$/, ''))}</td><td style="padding:6px 7px;border-bottom:1px solid ${BORDE};vertical-align:top;line-height:1.4;"><strong>${esc(actividad.nombre)}</strong>${detalle ? `<div style="font-size:9px;color:${GRIS};margin-top:2px;">${detalle}</div>` : ''}</td><td style="padding:6px 7px;border-bottom:1px solid ${BORDE};vertical-align:top;">${esc(actividad.modalidad)}</td><td style="padding:6px 7px;border-bottom:1px solid ${BORDE};vertical-align:top;text-align:right;font-weight:700;">${asistentes}</td></tr></table>`;
};

const encabezadoTabla = `<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5px;"><colgroup><col style="width:17%"><col style="width:53%"><col style="width:15%"><col style="width:15%"></colgroup><tr style="background:${AZUL};color:#fff;text-transform:uppercase;letter-spacing:.4px;"><th style="padding:5px 7px;text-align:left;">Fecha</th><th style="padding:5px 7px;text-align:left;">Actividad</th><th style="padding:5px 7px;text-align:left;">Modalidad</th><th style="padding:5px 7px;text-align:right;">En vivo</th></tr></table>`;

export const construirBloques = ({
  resumen,
  desde,
  hasta,
  fechaInforme,
  firmante = {},
} = {}) => {
  const { meses, totales } = resumen;
  const periodo = etiquetaPeriodo(desde, hasta);
  const bloques = [];

  bloques.push(bloque(`<div style="padding-bottom:18px;text-align:right;font-size:11.5px;color:#4b5563;">Guatemala, ${esc(fechaLarga(fechaInforme))}</div>`));
  bloques.push(bloque(`<div style="padding-bottom:16px;font-size:11.5px;line-height:1.6;color:${TEXTO};"><strong>Señores</strong><br><strong>Junta Directiva</strong><br>Colegio de Psicólogos de Guatemala<br>Presente</div>`));
  bloques.push(bloque(`<p style="${P}font-weight:700;">Honorables miembros de la Junta Directiva:</p>`));
  bloques.push(bloque(`<p style="margin:0;padding:0 0 14px;font-size:11px;font-weight:700;color:${AZUL};text-transform:uppercase;">Asunto: Informe técnico de labores de CAEDUC, período ${esc(periodo)}</p>`));
  bloques.push(bloque(`<p style="${P}">Reciban un cordial saludo. Por este medio, la Comisión de Acreditación y Educación Continua (CAEDUC) presenta a su consideración el informe técnico de las labores realizadas durante el período ${esc(periodo)}, en preparación para el cierre del ejercicio. El informe resume, mes a mes, las actividades de educación continua desarrolladas en modalidad presencial, virtual e híbrida, así como el alcance obtenido entre los agremiados, tanto en las actividades en vivo como en el contenido grabado disponible en el Aula Virtual del Colegio.</p>`));
  bloques.push(bloque(`<p style="${P}">Durante el período se realizaron ${plural(totales.actividades, 'actividad', 'actividades')}${totales.actividades ? ` (${desgloseModalidades(totales.modalidades)})` : ''}, que en conjunto beneficiaron a ${numero(totales.total)} agremiados: ${numero(totales.enVivo)} participaciones en vivo y ${numero(totales.aula)} certificados obtenidos en el Aula Virtual.</p>`));
  bloques.push(bloque(`<table style="width:100%;border-collapse:separate;border-spacing:0;margin:2px 0 18px;"><tr>${tarjeta(numero(totales.actividades), 'Actividades realizadas', AZUL_OSCURO)}${tarjeta(numero(totales.enVivo), 'Participantes en vivo', ROSA)}${tarjeta(numero(totales.aula), 'Certificados en Aula Virtual', '#0f766e')}${tarjeta(numero(totales.total), 'Total de beneficiados', AZUL)}</tr></table>`));

  bloques.push(bloque(`<h2 style="margin:0;padding:4px 0 10px;font-size:14px;color:${AZUL_OSCURO};border-bottom:2px solid ${ROSA};">Actividades por mes</h2><div style="height:12px;"></div>`, { conSiguiente: true }));

  meses.forEach((mes) => {
    bloques.push(bloque(`<h3 style="margin:0;padding:4px 0 6px;font-size:12.5px;color:${AZUL};">${esc(capitalizar(nombreMes(mes.mes)))}</h3><p style="${P}padding-bottom:8px;">${esc(textoMes(mes))}</p>`, { conSiguiente: mes.actividades.length > 0 }));
    if (mes.actividades.length) {
      bloques.push(bloque(encabezadoTabla, { conSiguiente: true, encabezado: true }));
      mes.actividades.forEach((actividad, indice) => {
        bloques.push(bloque(filaActividad(actividad, indice), { repetir: encabezadoTabla }));
      });
    }
    bloques.push(bloque('<div style="height:14px;"></div>', { espacio: true }));
  });

  const filasResumen = meses.map((mes, indice) => `<tr style="background:${indice % 2 ? '#f6f9fc' : '#fff'};"><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};">${esc(capitalizar(nombreMes(mes.mes)))}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};text-align:center;">${numero(mes.modalidades.Presencial)}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};text-align:center;">${numero(mes.modalidades.Virtual)}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};text-align:center;">${numero(mes.modalidades['Híbrida'])}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};text-align:right;">${numero(mes.enVivo)}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};text-align:right;">${numero(mes.aula)}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};text-align:right;font-weight:700;">${numero(mes.total)}</td></tr>`).join('');
  bloques.push(bloque(`<h2 style="margin:0;padding:4px 0 10px;font-size:14px;color:${AZUL_OSCURO};border-bottom:2px solid ${ROSA};">Resumen general</h2><div style="height:10px;"></div><table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;color:${TEXTO};"><colgroup><col style="width:22%"><col style="width:12%"><col style="width:11%"><col style="width:11%"><col style="width:14%"><col style="width:14%"><col style="width:16%"></colgroup><tr style="background:${AZUL};color:#fff;font-size:8px;text-transform:uppercase;letter-spacing:.3px;"><th style="padding:5px 7px;text-align:left;">Mes</th><th style="padding:5px 4px;text-align:center;">Presencial</th><th style="padding:5px 4px;text-align:center;">Virtual</th><th style="padding:5px 4px;text-align:center;">Híbrida</th><th style="padding:5px 7px;text-align:right;">En vivo</th><th style="padding:5px 7px;text-align:right;">Aula virtual</th><th style="padding:5px 7px;text-align:right;">Beneficiados</th></tr>${filasResumen}<tr style="background:#eaf1f8;font-weight:800;"><td style="padding:6px 7px;border-top:2px solid ${AZUL};">Total</td><td style="padding:6px 4px;border-top:2px solid ${AZUL};text-align:center;">${numero(totales.modalidades.Presencial)}</td><td style="padding:6px 4px;border-top:2px solid ${AZUL};text-align:center;">${numero(totales.modalidades.Virtual)}</td><td style="padding:6px 4px;border-top:2px solid ${AZUL};text-align:center;">${numero(totales.modalidades['Híbrida'])}</td><td style="padding:6px 7px;border-top:2px solid ${AZUL};text-align:right;">${numero(totales.enVivo)}</td><td style="padding:6px 7px;border-top:2px solid ${AZUL};text-align:right;">${numero(totales.aula)}</td><td style="padding:6px 7px;border-top:2px solid ${AZUL};text-align:right;">${numero(totales.total)}</td></tr></table><p style="margin:0;padding:6px 0 16px;font-size:8.5px;line-height:1.5;color:${GRIS};">Las cifras cuentan participaciones: un mismo agremiado puede haber participado en varias actividades. «En vivo» incluye la asistencia presencial y virtual de cada actividad; «Aula virtual» son los certificados emitidos por contenido grabado en el mes correspondiente.</p>`));

  bloques.push(bloque(`<p style="${P}">En síntesis, durante el período ${esc(periodo)} CAEDUC llevó a cabo ${plural(totales.actividades, 'actividad', 'actividades')} de educación continua${totales.actividades ? ` —${desgloseModalidades(totales.modalidades)}—` : ''} en beneficio de ${numero(totales.total)} agremiados, en cumplimiento de su plan de trabajo y de su compromiso con la actualización profesional de los psicólogos colegiados.</p>`, { conSiguiente: true }));

  const institucion = String(firmante.institucion || 'Comisión de Acreditación y Educación Continua, Colegio de Psicólogos de Guatemala')
    .split(',').map(linea => `<div style="font-size:9px;color:#556579;">${esc(linea.trim())}</div>`).join('');
  const firma = firmante.firmaUrl
    ? `<img src="${esc(firmante.firmaUrl)}" alt="Firma" style="height:55px;max-width:200px;width:auto;object-fit:contain;display:block;margin:0 auto -4px;">`
    : '<div style="height:51px;"></div>';
  const sello = firmante.selloUrl
    ? `<td style="width:100px;vertical-align:bottom;padding-left:18px;"><img src="${esc(firmante.selloUrl)}" alt="Sello" style="height:78px;max-width:100px;width:auto;object-fit:contain;opacity:.88;display:block;"></td>`
    : '';
  bloques.push(bloque(`<p style="${P}">Sin otro particular, me suscribo de ustedes con muestras de consideración y estima.</p><p style="margin:0;padding:0 0 10px;font-size:11.5px;color:${TEXTO};">Atentamente,</p><table style="margin:0 auto;border-collapse:collapse;"><tr><td style="width:230px;text-align:center;vertical-align:bottom;">${firma}<div style="border-top:1.5px solid ${TEXTO};padding-top:4px;"><div style="font-size:11px;font-weight:800;color:${TEXTO};">${esc(firmante.nombre || 'M. A. Juan José Reyes')}</div><div style="font-size:10px;color:#45576c;">${esc(firmante.cargo || 'Coordinador')}</div>${institucion}</div></td>${sello}</tr></table><p style="margin:0;padding:12px 0 0;font-size:9.5px;color:#888;">C.C.: Archivo / CAEDUC</p>`, { firma: true }));

  return bloques;
};

// ── Paginación ───────────────────────────────────────────────────────────────

// Reparte bloques medidos en páginas. `conSiguiente` mantiene un título junto
// a lo que sigue; `repetir` vuelve a poner el encabezado de la tabla cuando
// una fila abre página nueva; los espaciadores no abren página.
export const paginarBloques = (bloques = [], alturas = [], altoDisponible = ALTO_CONTENIDO, alturaDe = () => 0) => {
  const paginas = [[]];
  let usado = 0;
  const nuevaPagina = () => { paginas.push([]); usado = 0; };

  for (let i = 0; i < bloques.length; i += 1) {
    const actual = bloques[i];
    const alto = alturas[i] || 0;
    if (actual.espacio && usado === 0) continue;

    // Altura del grupo que no se puede separar: este bloque más los que
    // dependen de él (títulos encadenados hasta el primer contenido real).
    let grupo = alto;
    let j = i;
    while (bloques[j]?.conSiguiente && j + 1 < bloques.length) {
      j += 1;
      grupo += alturas[j] || 0;
    }

    if (usado > 0 && usado + grupo > altoDisponible) nuevaPagina();

    if (usado === 0 && actual.repetir && !actual.encabezado) {
      paginas[paginas.length - 1].push({ html: actual.repetir });
      usado += alturaDe(actual.repetir);
    }
    paginas[paginas.length - 1].push(actual);
    usado += alto;
  }
  return paginas.filter(pagina => pagina.length);
};

export const componerPaginas = (paginas = [], { membreteUrl = '/fondo-oficios.jpg', titulo = 'Informe de labores CAEDUC' } = {}) => {
  const total = paginas.length;
  const cuerpo = paginas.map((pagina, indice) => `<section class="page" style="position:relative;width:${PAGINA.ancho}px;height:${PAGINA.alto}px;overflow:hidden;background:#fff;font-family:'Segoe UI',Arial,sans-serif;color:${TEXTO};page-break-after:${indice < total - 1 ? 'always' : 'auto'};"><img src="${esc(membreteUrl)}" alt="" style="position:absolute;inset:0;width:${PAGINA.ancho}px;height:${PAGINA.alto}px;object-fit:cover;z-index:0;pointer-events:none;"><div style="position:absolute;z-index:1;top:${PAGINA.margenSuperior}px;left:${PAGINA.margenIzquierdo}px;width:${ANCHO_CONTENIDO}px;height:${ALTO_CONTENIDO}px;overflow:hidden;">${pagina.map(item => item.html).join('')}</div>${total > 1 ? `<div style="position:absolute;z-index:1;left:${PAGINA.margenIzquierdo}px;width:${ANCHO_CONTENIDO}px;top:${PAGINA.margenSuperior + ALTO_CONTENIDO + 4}px;text-align:right;font-size:9px;color:#8b9aac;">Página ${indice + 1} de ${total}</div>` : ''}</section>`).join('');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>@page{size:letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${cuerpo}</body></html>`;
};

export const nombreArchivoLabores = (desde, hasta) => `Informe_de_labores_CAEDUC_${desde || 'inicio'}_${hasta || 'fin'}`;
