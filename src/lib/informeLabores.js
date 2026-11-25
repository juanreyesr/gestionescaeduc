// Informe de labores para Junta Directiva
//
// Reúne las actividades del período (calendario del Aula Virtual más las
// solicitudes de publicación que todavía no se agregaron al calendario), las
// agrupa por mes y suma los beneficiados: participantes en vivo de cada
// actividad (presencial y virtual en un solo número) más los agremiados que
// obtuvieron certificado al ver contenido grabado en el Aula Virtual.
// Cada actividad lleva su tipo (taller, conferencia, diplomado...) y el informe
// incluye los avales solicitados y aprobados en el período.
//
// El documento se arma como una lista de bloques. La vista los mide en el
// navegador y `paginarBloques` los reparte en páginas carta con el membrete,
// de modo que nada invada el encabezado ni el pie con las sedes, y la firma
// nunca quede partida entre dos páginas.

import { activityDateKey, escapeRegistroHTML as esc, sinAcentos } from './registroActividadesReport.js';
import { TIPOS_ACTIVIDAD } from './sincronizacion.js';
import { barraHorizontal, COLORES, graficaBarras } from './graficasInforme.js';
import { REFERENCIAS } from './historico2025.js';

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const MODALIDADES = ['Presencial', 'Virtual', 'Híbrida'];

// Tipos que se pueden elegir en pantalla: los de la Solicitud de publicación.
export const TIPOS = TIPOS_ACTIVIDAD;
export const SIN_TIPO = 'Sin especificar';

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

// ── Tipo de actividad ────────────────────────────────────────────────────────

// Acepta el tipo escrito de cualquier forma ("taller", "TALLER ") y lo deja como
// en la lista. Lo que no está en la lista se conserva tal cual.
export const normalizarTipo = (valor = '') => {
  const limpio = String(valor || '').trim();
  if (!limpio) return '';
  const clave = sinAcentos(limpio).toLowerCase();
  return TIPOS.find(tipo => sinAcentos(tipo).toLowerCase() === clave) || limpio;
};

// Palabras del nombre que delatan el tipo. Gana la que aparece primero:
// "Conferencia: taller de duelo" es una conferencia.
const PISTAS_TIPO = [
  [/\bdiplomado/, 'Diplomado'],
  [/\bcertificacion/, 'Certificación'],
  [/\bespecializacion/, 'Especialización'],
  [/\bcongreso/, 'Congreso'],
  [/\bsimposio/, 'Simposio'],
  [/\bseminario/, 'Seminario'],
  [/\btaller/, 'Taller'],
  [/\bcurso\b/, 'Curso'],
  [/\bwebinar/, 'Webinar'],
  [/\bforo\b/, 'Foro'],
  [/\bjornada/, 'Jornada'],
  [/\b(conferencia|ponencia|charla)/, 'Conferencia'],
  [/\bretiro\b/, 'Retiro'],
];

export const deducirTipo = (nombre = '') => {
  const texto = sinAcentos(String(nombre || '')).toLowerCase();
  let mejor = null;
  PISTAS_TIPO.forEach(([patron, tipo]) => {
    const encontrado = texto.match(patron);
    if (encontrado && (!mejor || encontrado.index < mejor.indice)) mejor = { indice: encontrado.index, tipo };
  });
  return mejor?.tipo || '';
};

// Plural en minúscula para la redacción: "3 talleres", "2 conferencias".
const PLURAL_ESPECIAL = { Webinar: 'webinars', 'Reunión interna': 'reuniones internas', Otro: 'otras actividades' };

export const pluralTipo = (tipo = '', cantidad = 2) => {
  if (tipo === SIN_TIPO) return cantidad === 1 ? 'actividad sin tipo especificado' : 'actividades sin tipo especificado';
  if (tipo === 'Otro' && cantidad === 1) return 'otra actividad';
  const texto = tipo.toLowerCase();
  // Tipos fuera de la lista (p. ej. de un aval) o de varias palabras: tal cual.
  if (cantidad === 1 || !TIPOS.includes(tipo)) return texto;
  if (PLURAL_ESPECIAL[tipo]) return PLURAL_ESPECIAL[tipo];
  if (/ón$/.test(texto)) return `${texto.slice(0, -2)}ones`;
  if (/[aeiouáéíóú]$/.test(texto)) return `${texto}s`;
  return `${texto}es`;
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
  // El calendario del aula no guarda el tipo: se toma de la solicitud de
  // publicación de la misma actividad, si existe.
  const tiposSolicitud = publicaciones
    .filter(pub => normalizarTipo(pub.actividad_tipo))
    .map(pub => ({
      titulo: normalizarTitulo(pub.actividad_nombre),
      fecha: activityDateKey(pub.actividad_fecha || ''),
      tipo: normalizarTipo(pub.actividad_tipo),
    }));
  const tipoDeSolicitud = (nombre, fecha) => {
    const candidata = { titulo: normalizarTitulo(nombre), fecha };
    return tiposSolicitud.find(item => mismaActividad(candidata, item))?.tipo || '';
  };

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
      tipoRegistrado: normalizarTipo(actividad.type || actividad.tipo || actividad.category) || tipoDeSolicitud(actividad.title, fecha),
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
      tipoRegistrado: normalizarTipo(publicacion.actividad_tipo),
    });
  });

  return lista
    .map((item) => {
      const ajuste = ajustes[item.clave] || {};
      const { tipoRegistrado, ...resto } = item;
      const tipoAjuste = normalizarTipo(ajuste.tipo);
      const tipoDeducido = deducirTipo(item.nombre);
      // origenTipo: 'ajuste' (elegido en pantalla), 'registro' (venía en la
      // solicitud), 'deducido' (por el nombre) o '' (falta agregarlo).
      const [tipo, origenTipo] = tipoAjuste ? [tipoAjuste, 'ajuste']
        : tipoRegistrado ? [tipoRegistrado, 'registro']
          : tipoDeducido ? [tipoDeducido, 'deducido']
            : [SIN_TIPO, ''];
      return {
        ...resto,
        tipo,
        origenTipo,
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

// Conteo por tipo, de más a menos frecuente; "Sin especificar" va al final.
export const contarTipos = (actividades = []) => {
  const mapa = new Map();
  actividades.forEach((item) => {
    const tipo = item.tipo || SIN_TIPO;
    const actual = mapa.get(tipo) || { tipo, actividades: 0, enVivo: 0 };
    actual.actividades += 1;
    actual.enVivo += item.asistentes || 0;
    mapa.set(tipo, actual);
  });
  return [...mapa.values()].sort((a, b) => (a.tipo === SIN_TIPO) - (b.tipo === SIN_TIPO)
    || b.actividades - a.actividades
    || a.tipo.localeCompare(b.tipo, 'es'));
};

// Fecha (AAAA-MM-DD) de un timestamp según la hora de Guatemala.
export const fechaGuatemala = (valor = '') => {
  if (!valor) return '';
  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return activityDateKey(texto);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(fecha);
};

// Avales del período. Una solicitud cuenta en el mes en que se recibió; un aval
// aprobado cuenta en el mes de su aprobación (aunque se haya pedido antes).
// Las solicitudes eliminadas no se cuentan.
export const resumirAvales = ({ avales = [], desde = '', hasta = '' } = {}) => {
  const vigentes = avales.filter(aval => !aval.is_deleted);
  const solicitados = vigentes
    .map(aval => ({ ...aval, fechaSolicitud: fechaGuatemala(aval.created_at) }))
    .filter(aval => dentroDelRango(aval.fechaSolicitud, desde, hasta));
  const aprobados = vigentes
    .filter(aval => aval.status === 'Aprobado')
    .map(aval => ({ ...aval, fechaAprobacion: fechaGuatemala(aval.approval_date) || fechaGuatemala(aval.created_at) }))
    .filter(aval => dentroDelRango(aval.fechaAprobacion, desde, hasta))
    .sort((a, b) => a.fechaAprobacion.localeCompare(b.fechaAprobacion)
      || String(a.correlativo || '').localeCompare(String(b.correlativo || ''), 'es', { numeric: true }));
  const porMes = {};
  const delMes = (mes) => (porMes[mes] ??= { solicitados: 0, aprobados: 0 });
  solicitados.forEach((aval) => { delMes(mesDe(aval.fechaSolicitud)).solicitados += 1; });
  aprobados.forEach((aval) => { delMes(mesDe(aval.fechaAprobacion)).aprobados += 1; });
  return {
    solicitados: solicitados.length,
    aprobados: aprobados.length,
    rechazados: solicitados.filter(aval => aval.status === 'Rechazado').length,
    enProceso: solicitados.filter(aval => aval.status !== 'Aprobado' && aval.status !== 'Rechazado').length,
    porMes,
    listaAprobados: aprobados,
    tipos: contarTipos(aprobados.map(aval => ({ tipo: normalizarTipo(aval.activity_type) || SIN_TIPO }))),
  };
};

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
      tipos: contarTipos(delMes),
    };
  });
  const totales = {
    actividades: incluidas.length,
    modalidades: contarModalidades(incluidas),
    enVivo: meses.reduce((suma, item) => suma + item.enVivo, 0),
    aula: meses.reduce((suma, item) => suma + item.aula, 0),
    sinDato: incluidas.filter(item => item.asistentes === null).length,
    sinTipo: incluidas.filter(item => !item.origenTipo).length,
    tipos: contarTipos(incluidas),
  };
  totales.total = totales.enVivo + totales.aula;
  return { meses, totales };
};

// ── Comparativa con el año anterior ─────────────────────────────────────────

const desplazarAnio = (fecha = '', anios = 0) => (fecha ? `${Number(fecha.slice(0, 4)) + anios}${fecha.slice(4)}` : '');

// Datos del año anterior que se tienen para el período (o null).
export const referenciaAnterior = (hasta = '', referencias = REFERENCIAS) => referencias[Number(hasta.slice(0, 4)) - 1] || null;

// Período que se puede comparar: el elegido, un año antes, recortado a lo que
// cubre el informe del año anterior. Se compara contra las mismas fechas.
export const ventanaComparable = ({ desde = '', hasta = '', referencia = null } = {}) => {
  if (!referencia || !desde || !hasta || desde > hasta) return null;
  const desdeAnterior = desplazarAnio(desde, -1) > referencia.desde ? desplazarAnio(desde, -1) : referencia.desde;
  const hastaAnterior = desplazarAnio(hasta, -1) < referencia.hasta ? desplazarAnio(hasta, -1) : referencia.hasta;
  if (desdeAnterior > hastaAnterior) return null;
  return {
    anterior: { desde: desdeAnterior, hasta: hastaAnterior },
    actual: { desde: desplazarAnio(desdeAnterior, 1), hasta: desplazarAnio(hastaAnterior, 1) },
  };
};

const sumarCertificados = (certificados, desde, hasta) => (certificados || [])
  .filter(item => item.mes >= desde.slice(0, 7) && item.mes <= hasta.slice(0, 7))
  .reduce((suma, item) => suma + (Number(item.total) || 0), 0);

// Variación porcentual redondeada; null si no hay base para compararla.
export const variacion = (anterior, actual) => {
  if (anterior === null || anterior === undefined || actual === null || actual === undefined) return null;
  if (!anterior) return actual ? Infinity : 0;
  return Math.round(((actual - anterior) / anterior) * 100);
};

export const textoVariacion = (valor) => {
  if (valor === null) return '—';
  if (valor === Infinity) return 'nuevo';
  if (valor === 0) return 'sin cambio';
  return `${valor > 0 ? '+' : '−'}${numero(Math.abs(valor))} %`;
};

const mesCorto = (fecha = '') => MESES[Number(fecha.slice(5, 7)) - 1]?.slice(0, 3) || '';

// Avales aprobados: si el informe del año anterior trae su total (p. ej. 32 de
// febrero a diciembre de 2025), se usa ese número y se compara con los avales
// aprobados del año actual en esas mismas fechas, dentro del período elegido.
// Sin ese dato, se comparan los registros del sistema.
export const avalesAprobadosComparados = ({ avales = [], desde = '', hasta = '', referencia = null, sistema = null } = {}) => {
  const ref = referencia?.avalesOtorgados;
  if (!ref) return { clave: 'avalesAprobados', etiqueta: 'Avales aprobados', anterior: sistema?.anterior ?? null, actual: sistema?.actual ?? 0 };
  const desdeRef = desplazarAnio(ref.desde, 1);
  const hastaRef = desplazarAnio(ref.hasta, 1);
  const desdeActual = desdeRef > desde ? desdeRef : desde;
  const hastaActual = hastaRef < hasta ? hastaRef : hasta;
  const actual = desdeActual <= hastaActual ? resumirAvales({ avales, desde: desdeActual, hasta: hastaActual }).aprobados : 0;
  const completo = desdeActual === desdeRef && hastaActual === hastaRef;
  const rango = `${mesCorto(ref.desde)}–${mesCorto(ref.hasta)}`;
  return {
    clave: 'avalesAprobados',
    etiqueta: completo ? `Avales aprobados (${rango})` : `Avales aprobados (${rango}; ${hastaActual.slice(0, 4)} al ${fechaLarga(hastaActual).replace(/ de \d{4}$/, '')})`,
    anterior: ref.total,
    actual,
    deInforme: true,
    periodoAnterior: { desde: ref.desde, hasta: ref.hasta },
    periodoActual: { desde: desdeActual, hasta: hastaActual },
    completo,
  };
};

// Compara el período elegido con las mismas fechas del año anterior.
// - Actividades y participantes del año anterior: informe de referencia.
// - Certificados del Aula Virtual: los del año anterior se leen del aula con las
//   mismas fechas (`certificadosAnterior`); si no se pudieron leer, quedan sin comparar.
// - Avales: de la tabla de avales del sistema, con las mismas reglas ambos años.
export const compararConAnterior = ({
  actividades = [],
  certificados = [],
  certificadosAnterior = null,
  avales = [],
  desde = '',
  hasta = '',
  referencia = referenciaAnterior(hasta),
} = {}) => {
  const ventana = ventanaComparable({ desde, hasta, referencia });
  if (!ventana) return null;
  const { anterior, actual } = ventana;
  const actuales = actividades.filter(item => item.incluir !== false && dentroDelRango(item.fecha, actual.desde, actual.hasta));
  const previas = referencia.actividades.filter(item => dentroDelRango(item.fecha, anterior.desde, anterior.hasta));
  const enVivo = lista => lista.reduce((suma, item) => suma + (item.asistentes || 0), 0);

  const certActual = sumarCertificados(certificados, actual.desde, actual.hasta);
  const certAnterior = certificadosAnterior ? sumarCertificados(certificadosAnterior, anterior.desde, anterior.hasta) : null;
  const avalesActual = resumirAvales({ avales, desde: actual.desde, hasta: actual.hasta });
  const avalesAnterior = resumirAvales({ avales, desde: anterior.desde, hasta: anterior.hasta });

  const indicadores = [
    { clave: 'actividades', etiqueta: 'Actividades realizadas', anterior: previas.length, actual: actuales.length },
    { clave: 'enVivo', etiqueta: 'Participantes en vivo', anterior: enVivo(previas), actual: enVivo(actuales) },
    { clave: 'aula', etiqueta: 'Certificados en Aula Virtual', anterior: certAnterior, actual: certActual },
    { clave: 'total', etiqueta: 'Total de beneficiados', anterior: certAnterior === null ? null : enVivo(previas) + certAnterior, actual: enVivo(actuales) + certActual },
    // El informe del año anterior no trae avales solicitados: se usa el sistema
    // si tiene registros de esas fechas; si no, queda sin comparar.
    { clave: 'avalesSolicitados', etiqueta: 'Avales solicitados', anterior: avalesAnterior.solicitados || null, actual: avalesActual.solicitados },
    avalesAprobadosComparados({ avales, desde, hasta, referencia, sistema: { anterior: avalesAnterior.aprobados, actual: avalesActual.aprobados } }),
  ].map(item => ({ ...item, variacion: variacion(item.anterior, item.actual) }));

  const tiposAnterior = Object.fromEntries(contarTipos(previas).map(item => [item.tipo, item.actividades]));
  const tiposActual = Object.fromEntries(contarTipos(actuales).map(item => [item.tipo, item.actividades]));
  const tipos = [...new Set([...Object.keys(tiposActual), ...Object.keys(tiposAnterior)])]
    .map(tipo => ({ tipo, anterior: tiposAnterior[tipo] || 0, actual: tiposActual[tipo] || 0 }))
    .sort((a, b) => (a.tipo === SIN_TIPO) - (b.tipo === SIN_TIPO) || (b.actual + b.anterior) - (a.actual + a.anterior) || a.tipo.localeCompare(b.tipo, 'es'));

  const meses = mesesDelPeriodo(actual.desde, actual.hasta).map((mes) => {
    const mesAnterior = desplazarAnio(mes, -1);
    return {
      mes,
      anterior: enVivo(previas.filter(item => mesDe(item.fecha) === mesAnterior)),
      actual: enVivo(actuales.filter(item => mesDe(item.fecha) === mes)),
      actividadesAnterior: previas.filter(item => mesDe(item.fecha) === mesAnterior).length,
      actividadesActual: actuales.filter(item => mesDe(item.fecha) === mes).length,
    };
  });

  return {
    ventana,
    anioActual: actual.desde.slice(0, 4),
    anioAnterior: anterior.desde.slice(0, 4),
    indicadores,
    tipos,
    meses,
    fuente: referencia.fuente,
  };
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

// En la redacción no se nombran las que no tienen tipo; sí en las tablas.
const desgloseTipos = (tipos = []) => listaEs(tipos
  .filter(item => item.tipo !== SIN_TIPO)
  .map(item => `${numero(item.actividades)} ${pluralTipo(item.tipo, item.actividades)}`));

export const fechaLarga = (fecha = '') => {
  const clave = activityDateKey(fecha);
  if (!clave) return String(fecha || '');
  const [anio, mes, dia] = clave.split('-');
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${anio}`;
};

const fechaCorta = (fecha = '') => {
  const [anio, mes, dia] = String(fecha || '').split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : '—';
};

export const etiquetaPeriodo = (desde, hasta) => `del ${fechaLarga(desde)} al ${fechaLarga(hasta)}`;

const textoAvales = ({ solicitados = 0, aprobados = 0 } = {}, cuando = 'En el mes') => {
  if (!solicitados && !aprobados) return '';
  const recibidas = `se ${solicitados === 1 ? 'recibió' : 'recibieron'} ${plural(solicitados, 'solicitud de aval', 'solicitudes de aval')}`;
  const otorgados = `se ${aprobados === 1 ? 'aprobó' : 'aprobaron'} ${plural(aprobados, 'aval', 'avales')}`;
  return `${cuando} ${recibidas} y ${otorgados}.`;
};

export const textoMes = (resumen, avalesMes = null) => {
  const { actividades, modalidades, enVivo, aula, total } = resumen;
  const tipos = resumen.tipos || contarTipos(actividades);
  const partes = [];
  if (actividades.length) {
    const detalle = [desgloseTipos(tipos), desgloseModalidades(modalidades)].filter(Boolean).join('; ');
    partes.push(`Durante el mes se realizaron ${plural(actividades.length, 'actividad', 'actividades')} (${detalle}), con ${plural(enVivo, 'participante', 'participantes')} en vivo.`);
  } else {
    partes.push('Durante el mes no se registraron actividades en vivo.');
  }
  if (aula) {
    partes.push(`Además, ${plural(aula, 'agremiado obtuvo', 'agremiados obtuvieron')} su certificado tras completar contenido grabado en el Aula Virtual.`);
  }
  const avales = textoAvales(avalesMes || {});
  if (avales) partes.push(avales);
  partes.push(`Beneficiados en el mes: ${numero(total)}.`);
  return partes.join(' ');
};

// ── Bloques HTML ─────────────────────────────────────────────────────────────

const P = `margin:0;padding:0 0 12px;font-size:11.5px;line-height:1.7;text-align:justify;color:${TEXTO};`;

const bloque = (html, opciones = {}) => ({ html, ...opciones });

const tarjeta = (valor, etiqueta, color) => `<td style="width:25%;padding:0 4px;"><div style="border:1px solid ${BORDE};border-top:3px solid ${color};border-radius:8px;padding:9px 6px 8px;text-align:center;background:#fbfdff;"><div style="font-size:19px;font-weight:800;color:${color};line-height:1.1;">${esc(valor)}</div><div style="font-size:8.5px;font-weight:700;color:${GRIS};text-transform:uppercase;letter-spacing:.5px;margin-top:3px;line-height:1.3;">${esc(etiqueta)}</div></div></td>`;

const COLUMNAS_ACTIVIDAD = '<colgroup><col style="width:14%"><col style="width:43%"><col style="width:15%"><col style="width:14%"><col style="width:14%"></colgroup>';

const filaActividad = (actividad, indice) => {
  const asistentes = actividad.asistentes === null ? '<span style="color:#b45309;">Sin registro</span>' : numero(actividad.asistentes);
  const detalle = [actividad.ponente && `Ponente: ${esc(actividad.ponente)}`, actividad.lugar && esc(actividad.lugar)].filter(Boolean).join(' · ');
  const tipo = actividad.tipo && actividad.tipo !== SIN_TIPO ? esc(actividad.tipo) : `<span style="color:${GRIS};">—</span>`;
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:10.5px;color:${TEXTO};">${COLUMNAS_ACTIVIDAD}<tr style="background:${indice % 2 ? '#f6f9fc' : '#fff'};"><td style="padding:6px 7px;border-bottom:1px solid ${BORDE};vertical-align:top;">${esc(fechaLarga(actividad.fecha).replace(/ de \d{4}$/, ''))}</td><td style="padding:6px 7px;border-bottom:1px solid ${BORDE};vertical-align:top;line-height:1.4;"><strong>${esc(actividad.nombre)}</strong>${detalle ? `<div style="font-size:9px;color:${GRIS};margin-top:2px;">${detalle}</div>` : ''}</td><td style="padding:6px 7px;border-bottom:1px solid ${BORDE};vertical-align:top;">${tipo}</td><td style="padding:6px 7px;border-bottom:1px solid ${BORDE};vertical-align:top;">${esc(actividad.modalidad)}</td><td style="padding:6px 7px;border-bottom:1px solid ${BORDE};vertical-align:top;text-align:right;font-weight:700;">${asistentes}</td></tr></table>`;
};

const encabezadoTabla = `<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5px;">${COLUMNAS_ACTIVIDAD}<tr style="background:${AZUL};color:#fff;text-transform:uppercase;letter-spacing:.4px;"><th style="padding:5px 7px;text-align:left;">Fecha</th><th style="padding:5px 7px;text-align:left;">Actividad</th><th style="padding:5px 7px;text-align:left;">Tipo</th><th style="padding:5px 7px;text-align:left;">Modalidad</th><th style="padding:5px 7px;text-align:right;">En vivo</th></tr></table>`;

const COLUMNAS_AVAL = '<colgroup><col style="width:15%"><col style="width:39%"><col style="width:16%"><col style="width:16%"><col style="width:14%"></colgroup>';

const encabezadoAvales = `<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5px;">${COLUMNAS_AVAL}<tr style="background:${AZUL};color:#fff;text-transform:uppercase;letter-spacing:.4px;"><th style="padding:5px 7px;text-align:left;">Aval</th><th style="padding:5px 7px;text-align:left;">Actividad</th><th style="padding:5px 7px;text-align:left;">Tipo</th><th style="padding:5px 7px;text-align:left;">Modalidad</th><th style="padding:5px 7px;text-align:right;">Aprobado</th></tr></table>`;

const filaAval = (aval, indice) => {
  const tipo = normalizarTipo(aval.activity_type);
  const institucion = String(aval.institution || aval.applicant_name || '').trim();
  const celda = `padding:6px 7px;border-bottom:1px solid ${BORDE};vertical-align:top;`;
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;color:${TEXTO};">${COLUMNAS_AVAL}<tr style="background:${indice % 2 ? '#f6f9fc' : '#fff'};"><td style="${celda}font-weight:700;">${esc(aval.correlativo || '—')}</td><td style="${celda}line-height:1.4;"><strong>${esc(aval.activity_name || aval.topic || 'Actividad sin nombre')}</strong>${institucion ? `<div style="font-size:9px;color:${GRIS};margin-top:2px;">${esc(institucion)}</div>` : ''}</td><td style="${celda}">${tipo ? esc(tipo) : `<span style="color:${GRIS};">—</span>`}</td><td style="${celda}">${esc(aval.modality || '—')}</td><td style="${celda}text-align:right;">${esc(fechaCorta(aval.fechaAprobacion))}</td></tr></table>`;
};

const tituloSeccion = (texto) => `<h2 style="margin:0;padding:4px 0 10px;font-size:14px;color:${AZUL_OSCURO};border-bottom:2px solid ${ROSA};">${esc(texto)}</h2><div style="height:10px;"></div>`;

export const construirBloques = ({
  resumen,
  desde,
  hasta,
  fechaInforme,
  firmante = {},
  avales = null,
  comparativa = null,
} = {}) => {
  const { meses, totales } = resumen;
  const tiposTotales = totales.tipos || [];
  const periodo = etiquetaPeriodo(desde, hasta);
  const bloques = [];

  bloques.push(bloque(`<div style="padding-bottom:18px;text-align:right;font-size:11.5px;color:#4b5563;">Guatemala, ${esc(fechaLarga(fechaInforme))}</div>`));
  bloques.push(bloque(`<div style="padding-bottom:16px;font-size:11.5px;line-height:1.6;color:${TEXTO};"><strong>Señores</strong><br><strong>Junta Directiva</strong><br>Colegio de Psicólogos de Guatemala<br>Presente</div>`));
  bloques.push(bloque(`<p style="${P}font-weight:700;">Honorables miembros de la Junta Directiva:</p>`));
  bloques.push(bloque(`<p style="margin:0;padding:0 0 14px;font-size:11px;font-weight:700;color:${AZUL};text-transform:uppercase;">Asunto: Informe técnico de labores de CAEDUC, período ${esc(periodo)}</p>`));
  bloques.push(bloque(`<p style="${P}">Reciban un cordial saludo. Por este medio, la Comisión de Acreditación y Educación Continua (CAEDUC) presenta a su consideración el informe técnico de las labores realizadas durante el período ${esc(periodo)}, en preparación para el cierre del ejercicio. El informe resume, mes a mes, las actividades de educación continua desarrolladas en modalidad presencial, virtual e híbrida, así como el alcance obtenido entre los agremiados, tanto en las actividades en vivo como en el contenido grabado disponible en el Aula Virtual del Colegio.</p>`));
  const detallePeriodo = [desgloseTipos(tiposTotales), desgloseModalidades(totales.modalidades)].filter(Boolean).join('; ');
  const avalesPeriodo = avales ? ` ${textoAvales(avales, 'Asimismo, en el período')}`.trimEnd() : '';
  bloques.push(bloque(`<p style="${P}">Durante el período se realizaron ${plural(totales.actividades, 'actividad', 'actividades')}${totales.actividades ? ` (${detallePeriodo})` : ''}, que en conjunto beneficiaron a ${numero(totales.total)} agremiados: ${numero(totales.enVivo)} participaciones en vivo y ${numero(totales.aula)} certificados obtenidos en el Aula Virtual.${esc(avalesPeriodo)}</p>`));
  bloques.push(bloque(`<table style="width:100%;border-collapse:separate;border-spacing:0;margin:2px 0 18px;"><tr>${tarjeta(numero(totales.actividades), 'Actividades realizadas', AZUL_OSCURO)}${tarjeta(numero(totales.enVivo), 'Participantes en vivo', ROSA)}${tarjeta(numero(totales.aula), 'Certificados en Aula Virtual', '#0f766e')}${tarjeta(numero(totales.total), 'Total de beneficiados', AZUL)}</tr></table>`));

  bloques.push(bloque(`<h2 style="margin:0;padding:4px 0 10px;font-size:14px;color:${AZUL_OSCURO};border-bottom:2px solid ${ROSA};">Actividades por mes</h2><div style="height:12px;"></div>`, { conSiguiente: true }));

  meses.forEach((mes) => {
    bloques.push(bloque(`<h3 style="margin:0;padding:4px 0 6px;font-size:12.5px;color:${AZUL};">${esc(capitalizar(nombreMes(mes.mes)))}</h3><p style="${P}padding-bottom:8px;">${esc(textoMes(mes, avales?.porMes?.[mes.mes]))}</p>`, { conSiguiente: mes.actividades.length > 0 }));
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

  if (meses.some(mes => mes.total > 0)) {
    const grafica = graficaBarras({
      titulo: 'Beneficiados por mes',
      modo: 'apilada',
      series: [{ nombre: 'Participantes en vivo', color: COLORES.enVivo }, { nombre: 'Certificados en Aula Virtual', color: COLORES.aula }],
      categorias: meses.map(mes => ({ etiqueta: capitalizar(MESES[Number(mes.mes.slice(5, 7)) - 1].slice(0, 3)), valores: [mes.enVivo, mes.aula] })),
    });
    bloques.push(bloque(grafica));
  }

  if (tiposTotales.length) {
    const maximoTipo = Math.max(...tiposTotales.map(item => item.actividades));
    const filasTipos = tiposTotales.map((item, indice) => `<tr style="background:${indice % 2 ? '#f6f9fc' : '#fff'};"><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};">${esc(item.tipo)}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};text-align:center;">${numero(item.actividades)}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};vertical-align:middle;">${barraHorizontal(item.actividades, maximoTipo)}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};text-align:right;">${numero(item.enVivo)}</td></tr>`).join('');
    bloques.push(bloque(`${tituloSeccion('Actividades por tipo')}<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;color:${TEXTO};margin-bottom:18px;"><colgroup><col style="width:30%"><col style="width:14%"><col style="width:34%"><col style="width:22%"></colgroup><tr style="background:${AZUL};color:#fff;font-size:8px;text-transform:uppercase;letter-spacing:.3px;"><th style="padding:5px 7px;text-align:left;">Tipo de actividad</th><th style="padding:5px 7px;text-align:center;">Actividades</th><th style="padding:5px 7px;text-align:left;"></th><th style="padding:5px 7px;text-align:right;">Participantes en vivo</th></tr>${filasTipos}<tr style="background:#eaf1f8;font-weight:800;"><td style="padding:6px 7px;border-top:2px solid ${AZUL};">Total</td><td style="padding:6px 7px;border-top:2px solid ${AZUL};text-align:center;">${numero(totales.actividades)}</td><td style="padding:6px 7px;border-top:2px solid ${AZUL};"></td><td style="padding:6px 7px;border-top:2px solid ${AZUL};text-align:right;">${numero(totales.enVivo)}</td></tr></table>`));
  }

  if (avales) {
    const estados = [
      avales.rechazados ? `${plural(avales.rechazados, 'fue rechazada', 'fueron rechazadas')}` : '',
      avales.enProceso ? `${plural(avales.enProceso, 'continúa', 'continúan')} en proceso` : '',
    ].filter(Boolean);
    const textoEstados = avales.solicitados && estados.length ? ` De las solicitudes recibidas, ${listaEs(estados)}.` : '';
    const tiposAval = avales.tipos.filter(item => item.tipo !== SIN_TIPO);
    const textoTiposAval = avales.aprobados && tiposAval.length ? ` Los avales aprobados corresponden a ${desgloseTipos(avales.tipos)}.` : '';
    const parrafo = avales.solicitados || avales.aprobados
      ? `Además de sus propias actividades, CAEDUC evalúa las actividades de educación continua que otras instituciones y unidades someten a su aval. Durante el período ${periodo} se ${avales.solicitados === 1 ? 'recibió' : 'recibieron'} ${plural(avales.solicitados, 'solicitud de aval', 'solicitudes de aval')} y se ${avales.aprobados === 1 ? 'aprobó' : 'aprobaron'} ${plural(avales.aprobados, 'aval', 'avales')}.${textoEstados}${textoTiposAval}`
      : `Durante el período ${periodo} no se recibieron solicitudes de aval ni se aprobaron avales.`;
    bloques.push(bloque(`${tituloSeccion('Avales')}<p style="${P}">${esc(parrafo)}</p><table style="width:100%;border-collapse:separate;border-spacing:0;margin:2px 0 16px;"><tr>${tarjeta(numero(avales.solicitados), 'Avales solicitados', AZUL_OSCURO)}${tarjeta(numero(avales.aprobados), 'Avales aprobados', '#15803d')}${tarjeta(numero(avales.rechazados), 'Solicitudes rechazadas', '#b91c1c')}${tarjeta(numero(avales.enProceso), 'Solicitudes en proceso', '#b45309')}</tr></table>`, { conSiguiente: true }));

    const filasMes = meses.map((mes, indice) => {
      const dato = avales.porMes[mes.mes] || { solicitados: 0, aprobados: 0 };
      return `<tr style="background:${indice % 2 ? '#f6f9fc' : '#fff'};"><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};">${esc(capitalizar(nombreMes(mes.mes)))}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};text-align:center;">${numero(dato.solicitados)}</td><td style="padding:5px 7px;border-bottom:1px solid ${BORDE};text-align:center;">${numero(dato.aprobados)}</td></tr>`;
    }).join('');
    bloques.push(bloque(`<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;color:${TEXTO};"><colgroup><col style="width:40%"><col style="width:30%"><col style="width:30%"></colgroup><tr style="background:${AZUL};color:#fff;font-size:8px;text-transform:uppercase;letter-spacing:.3px;"><th style="padding:5px 7px;text-align:left;">Mes</th><th style="padding:5px 7px;text-align:center;">Avales solicitados</th><th style="padding:5px 7px;text-align:center;">Avales aprobados</th></tr>${filasMes}<tr style="background:#eaf1f8;font-weight:800;"><td style="padding:6px 7px;border-top:2px solid ${AZUL};">Total</td><td style="padding:6px 7px;border-top:2px solid ${AZUL};text-align:center;">${numero(avales.solicitados)}</td><td style="padding:6px 7px;border-top:2px solid ${AZUL};text-align:center;">${numero(avales.aprobados)}</td></tr></table><p style="margin:0;padding:6px 0 16px;font-size:8.5px;line-height:1.5;color:${GRIS};">Las solicitudes se cuentan en el mes en que se recibieron; los avales aprobados, en el mes de su aprobación, aunque se hayan solicitado antes del período. No se cuentan las solicitudes eliminadas.</p>`));

    if (avales.listaAprobados.length) {
      bloques.push(bloque(`<h3 style="margin:0;padding:4px 0 6px;font-size:12.5px;color:${AZUL};">Avales aprobados en el período</h3>`, { conSiguiente: true }));
      bloques.push(bloque(encabezadoAvales, { conSiguiente: true, encabezado: true }));
      avales.listaAprobados.forEach((aval, indice) => {
        bloques.push(bloque(filaAval(aval, indice), { repetir: encabezadoAvales }));
      });
      bloques.push(bloque('<div style="height:16px;"></div>', { espacio: true }));
    }
  }

  if (comparativa) {
    const { anioAnterior: previo, anioActual: actualAnio, indicadores, ventana } = comparativa;
    const ind = Object.fromEntries(indicadores.map(item => [item.clave, item]));
    const rango = `del ${fechaLarga(ventana.actual.desde).replace(/ de \d{4}$/, '')} al ${fechaLarga(ventana.actual.hasta).replace(/ de \d{4}$/, '')}`;
    const frase = (item, singular, pluralTexto) => {
      const cambio = item.variacion === null || item.variacion === Infinity || item.variacion === 0 ? '' : ` (${textoVariacion(item.variacion)})`;
      return `${plural(item.actual, singular, pluralTexto)} frente a ${numero(item.anterior)} en ${previo}${cambio}`;
    };
    const partes = [
      `Para dimensionar el avance, se comparan las mismas fechas de ambos años (${rango}). En ${actualAnio} se realizaron ${frase(ind.actividades, 'actividad', 'actividades')}, con ${frase(ind.enVivo, 'participante en vivo', 'participantes en vivo')}.`,
      ind.aula.anterior !== null ? `Los certificados obtenidos en el Aula Virtual fueron ${numero(ind.aula.actual)} frente a ${numero(ind.aula.anterior)}${ind.aula.variacion !== null && ind.aula.variacion !== Infinity && ind.aula.variacion !== 0 ? ` (${textoVariacion(ind.aula.variacion)})` : ''}.` : '',
      ind.avalesAprobados.deInforme
        ? (() => {
          const aval = ind.avalesAprobados;
          const cambio = aval.variacion === null || aval.variacion === Infinity || aval.variacion === 0 ? '' : ` (${textoVariacion(aval.variacion)})`;
          const pAnterior = `de ${MESES[Number(aval.periodoAnterior.desde.slice(5, 7)) - 1]} a ${MESES[Number(aval.periodoAnterior.hasta.slice(5, 7)) - 1]}`;
          return `En avales, del ${fechaLarga(aval.periodoActual.desde)} al ${fechaLarga(aval.periodoActual.hasta)} se ${aval.actual === 1 ? 'aprobó' : 'aprobaron'} ${plural(aval.actual, 'aval', 'avales')}, frente a los ${numero(aval.anterior)} otorgados ${pAnterior} de ${previo}${cambio}${aval.completo ? '' : `; el año en curso aún no cierra ese período`}.`;
        })()
        : ind.avalesAprobados.actual || ind.avalesAprobados.anterior
          ? `En avales se ${ind.avalesAprobados.actual === 1 ? 'aprobó' : 'aprobaron'} ${frase(ind.avalesAprobados, 'aval', 'avales')}.`
          : '',
    ].filter(Boolean).join(' ');
    const celda = `padding:5px 7px;border-bottom:1px solid ${BORDE};`;
    const valor = v => (v === null || v === undefined ? '—' : numero(v));
    const colorVariacion = v => (v === null || v === 0 ? GRIS : v > 0 ? '#15803d' : '#b91c1c');
    const filasIndicadores = indicadores.map((item, indice) => `<tr style="background:${indice % 2 ? '#f6f9fc' : '#fff'};"><td style="${celda}">${esc(item.etiqueta)}</td><td style="${celda}text-align:right;">${valor(item.anterior)}</td><td style="${celda}text-align:right;font-weight:700;">${valor(item.actual)}</td><td style="${celda}text-align:right;font-weight:700;color:${colorVariacion(item.variacion)};">${esc(textoVariacion(item.variacion))}</td></tr>`).join('');
    const encabezadoAnios = (primera) => `<tr style="background:${AZUL};color:#fff;font-size:8px;text-transform:uppercase;letter-spacing:.3px;"><th style="padding:5px 7px;text-align:left;">${primera}</th><th style="padding:5px 7px;text-align:right;">${previo}</th><th style="padding:5px 7px;text-align:right;">${actualAnio}</th><th style="padding:5px 7px;text-align:right;">Variación</th></tr>`;
    bloques.push(bloque(`${tituloSeccion(`Comparativo con ${previo}`)}<p style="${P}">${esc(partes)}</p><table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;color:${TEXTO};margin-bottom:16px;"><colgroup><col style="width:43%"><col style="width:19%"><col style="width:19%"><col style="width:19%"></colgroup>${encabezadoAnios('Indicador')}${filasIndicadores}</table>`, { conSiguiente: true }));

    if (comparativa.meses.some(mes => mes.anterior || mes.actual)) {
      bloques.push(bloque(graficaBarras({
        titulo: `Participantes en vivo por mes: ${previo} y ${actualAnio}`,
        modo: 'agrupada',
        series: [{ nombre: previo, color: COLORES.anioAnterior }, { nombre: actualAnio, color: COLORES.anioActual }],
        categorias: comparativa.meses.map(mes => ({ etiqueta: capitalizar(MESES[Number(mes.mes.slice(5, 7)) - 1].slice(0, 3)), valores: [mes.anterior, mes.actual] })),
      })));
    }

    if (comparativa.tipos.length) {
      const filasTipos = comparativa.tipos.map((item, indice) => {
        const cambio = variacion(item.anterior, item.actual);
        return `<tr style="background:${indice % 2 ? '#f6f9fc' : '#fff'};"><td style="${celda}">${esc(item.tipo)}</td><td style="${celda}text-align:right;">${numero(item.anterior)}</td><td style="${celda}text-align:right;font-weight:700;">${numero(item.actual)}</td><td style="${celda}text-align:right;font-weight:700;color:${colorVariacion(cambio)};">${esc(textoVariacion(cambio))}</td></tr>`;
      }).join('');
      bloques.push(bloque(`<div style="font-size:10.5px;font-weight:700;color:${TEXTO};padding-bottom:8px;">Actividades por tipo: ${previo} y ${actualAnio}</div><table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;color:${TEXTO};"><colgroup><col style="width:43%"><col style="width:19%"><col style="width:19%"><col style="width:19%"></colgroup>${encabezadoAnios('Tipo de actividad')}${filasTipos}</table><p style="margin:0;padding:6px 0 16px;font-size:8.5px;line-height:1.5;color:${GRIS};">Datos de ${previo}: actividades y participantes tomados del «${esc(comparativa.fuente)}» (los diplomados se cuentan en su mes de inicio); avales aprobados de ${previo}: total reportado en ese mismo informe, comparado con los aprobados del año en curso en esas fechas; certificados del Aula Virtual y avales solicitados tomados de los registros del sistema con las mismas fechas («—» cuando no hay registro). «Nuevo» indica que no hubo actividades de ese tipo en ${previo}.</p>`));
    }
  }

  bloques.push(bloque(`<p style="${P}">En síntesis, durante el período ${esc(periodo)} CAEDUC llevó a cabo ${plural(totales.actividades, 'actividad', 'actividades')} de educación continua${totales.actividades ? ` —${desgloseModalidades(totales.modalidades)}—` : ''} en beneficio de ${numero(totales.total)} agremiados${avales && (avales.solicitados || avales.aprobados) ? `, y atendió ${plural(avales.solicitados, 'solicitud de aval', 'solicitudes de aval')}, con ${plural(avales.aprobados, 'aval aprobado', 'avales aprobados')}` : ''}, en cumplimiento de su plan de trabajo y de su compromiso con la actualización profesional de los psicólogos colegiados.</p>`, { conSiguiente: true }));

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
