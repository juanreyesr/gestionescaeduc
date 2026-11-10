// src/lib/sincronizacion.js — Reglas para mantener sincronizadas la Solicitud de
// publicación, la Planificación, el Expediente del ponente y el calendario del
// aula virtual.
//
// La Solicitud de publicación es la fuente principal: ahí se piden una sola vez
// los datos de la actividad (incluido el grado del ponente, que define el
// honorario según el tarifario). Desde ella se crea/actualiza la actividad de la
// Planificación (con su presupuesto), el expediente del ponente y el evento del
// calendario del aula. Los cambios hechos en la Planificación regresan a la
// publicación con publicacionDesdePlan().
//
// Todo aquí son funciones puras (sin red) para poder probarlas.

import { activityDateKey } from './registroActividadesReport.js';
import { montoPorGrado } from './tarifario.js';

export const AREAS_PLANIFICACION = [
  'Clínico', 'Educativo', 'Deportivo', 'Social/Comunitario',
  'Organizacional/Indust.', 'Reunión CAEDUC', 'Actividades CAEDUC',
];

export const TIPOS_ACTIVIDAD = [
  'Certificación', 'Diplomado', 'Taller', 'Conferencia', 'Seminario',
  'Congreso', 'Curso', 'Simposio', 'Foro', 'Jornada', 'Reunión',
  'Reunión interna', 'Especialización', 'Webinar', 'Diagnóstico', 'Retiro', 'Otro',
];

export const MODALIDADES = ['Virtual', 'Presencial', 'Híbrida'];

// Cuando la actividad no tiene enlace de Zoom, el calendario del aula lleva al
// participante a la página principal del aula virtual.
export const AULA_URL_DEFAULT = 'https://www.aulavirtualcpg.org';

// Gastos que suele llevar una actividad presencial además del honorario.
export const GASTOS_EXTRA_SUGERIDOS = [
  'Alimentación',
  'Souvenirs',
  'Salón',
  'Equipo audiovisual',
];

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const texto = (v) => String(v ?? '').trim();
const normalizar = (v) => texto(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');

export const fechaISO = (valor) => activityDateKey(texto(valor)) || '';

// "2026-08-25" → "25 ago 2026" (formato de la lista de Planificación)
export const fechaCorta = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${Number(m[3])} ${MESES_CORTOS[Number(m[2]) - 1]} ${m[1]}` : '';
};

// "2026-08-25" → "25 de agosto de 2026" (formato de la Solicitud de publicación)
export const fechaLarga = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${Number(m[3])} de ${MESES_LARGOS[Number(m[2]) - 1]} de ${m[1]}` : '';
};

export const trimestreDe = (iso) => {
  const mes = Number((iso || '').slice(5, 7));
  if (!mes) return '';
  if (mes <= 3) return 'T1 – Ene/Mar';
  if (mes <= 6) return 'T2 – Abr/Jun';
  if (mes <= 9) return 'T3 – Jul/Sep';
  return 'T4 – Oct/Dic';
};

// Primer enlace http(s) dentro del bloque de Zoom pegado por la persona usuaria.
export const extraerEnlace = (bloque = '') => {
  const m = String(bloque || '').match(/https?:\/\/[^\s<>"')]+/i);
  return m ? m[0].replace(/[.,;]+$/, '') : '';
};

// La modalidad elegida manda; si no la hay, se deduce del lugar escrito.
export const modalidadDe = (pub = {}) => {
  const elegida = MODALIDADES.find(m => normalizar(m) === normalizar(pub.modalidad));
  if (elegida) return elegida;
  const lugar = normalizar(pub.actividad_lugar);
  if (!lugar) return '';
  const virtual = /zoom|virtual|meet|teams|en linea|online|aula/.test(lugar);
  const presencial = /presencial|salon|sede|auditorio|hotel|colegio|zona|sala/.test(lugar);
  if (virtual && presencial) return 'Híbrida';
  if (virtual) return 'Virtual';
  if (presencial) return 'Presencial';
  return '';
};

export const requiereGastosExtra = (pub = {}) => ['Presencial', 'Híbrida'].includes(modalidadDe(pub));

export const normalizarGastosExtra = (valor) => (Array.isArray(valor) ? valor : [])
  .map(item => ({ concepto: texto(item?.concepto), monto: Number(item?.monto) || 0 }))
  .filter(item => item.concepto || item.monto > 0);

// Presupuesto que se carga a la Planificación: honorario del tarifario + extras.
export const presupuestoDePublicacion = (pub = {}, tarifas) => {
  const honorario = montoPorGrado(pub.ponente_grado || '', tarifas) || 0;
  const extras = normalizarGastosExtra(pub.gastos_extra);
  const totalExtras = extras.reduce((s, g) => s + g.monto, 0);
  const requiere = requiereGastosExtra(pub);
  return {
    grado: texto(pub.ponente_grado),
    honorario,
    extras,
    total_extras: totalExtras,
    total: honorario + totalExtras,
    requiere_extras: requiere,
    faltan_extras: requiere && totalExtras <= 0,
  };
};

// Datos que faltan para que la actividad quede completa en Planificación,
// Expediente y aula virtual. `bloqueantes` impiden publicar en el aula.
export const faltantesPublicacion = (pub = {}, tarifas) => {
  const faltan = [];
  const bloqueantes = [];
  const add = (msg, bloquea = false) => { faltan.push(msg); if (bloquea) bloqueantes.push(msg); };
  if (!texto(pub.actividad_nombre)) add('Nombre de la actividad', true);
  if (!fechaISO(pub.actividad_fecha)) add('Fecha válida (ej. 20 de agosto de 2026)', true);
  if (!texto(pub.actividad_hora)) add('Hora');
  if (!modalidadDe(pub)) add('Modalidad (virtual, presencial o híbrida)');
  if (!texto(pub.actividad_tipo)) add('Tipo de actividad');
  if (!texto(pub.area)) add('Área de la planificación');
  if (!texto(pub.ponente_nombre)) add('Nombre del ponente');
  if (!montoPorGrado(pub.ponente_grado || '', tarifas)) add('Grado académico del ponente (define el honorario)');
  if (!(Number(pub.duracion_horas) > 0)) add('Duración en horas (para certificados del aula)');
  if (requiereGastosExtra(pub)) {
    if (!texto(pub.actividad_lugar)) add('Lugar o dirección de la actividad presencial');
    if (presupuestoDePublicacion(pub, tarifas).faltan_extras) add('Gastos extra de la actividad presencial (alimentación, souvenirs, etc.)');
  }
  if (modalidadDe(pub) !== 'Presencial' && !enlaceReunion(pub)) add(`Enlace de Zoom (mientras no lo haya, el aula enlaza a ${AULA_URL_DEFAULT.replace('https://', '')})`);
  return { faltan, bloqueantes, completo: faltan.length === 0 };
};

export const enlaceReunion = (pub = {}) => texto(pub.enlace_reunion) || extraerEnlace(pub.zoom_detalles);

const sedeModalidad = (pub) => {
  const modalidad = modalidadDe(pub);
  const lugar = texto(pub.actividad_lugar);
  if (!modalidad) return lugar;
  if (!lugar || normalizar(lugar) === normalizar(modalidad)) return modalidad;
  return `${modalidad} · ${lugar}`;
};

// Campos de planificacion_actividades que se derivan de la publicación.
// `existente` es la fila actual (si la hay) para no pisar su estado ni su número.
export const planDesdePublicacion = (pub = {}, tarifas, existente = null) => {
  const iso = fechaISO(pub.actividad_fecha);
  const presupuesto = presupuestoDePublicacion(pub, tarifas);
  const ponente = texto(pub.ponente_nombre);
  const lugar = sedeModalidad(pub);
  const campos = {
    publicacion_id: pub.id || null,
    actividad: texto(pub.actividad_nombre),
    tipo: TIPOS_ACTIVIDAD.includes(pub.actividad_tipo) ? pub.actividad_tipo : (existente?.tipo || (texto(pub.actividad_tipo) ? 'Otro' : 'Conferencia')),
    area: AREAS_PLANIFICACION.includes(pub.area) ? pub.area : (existente?.area || 'Actividades CAEDUC'),
    fecha_iso: iso || existente?.fecha_iso || null,
    fecha: iso ? fechaCorta(iso) : (existente?.fecha || texto(pub.actividad_fecha)),
    trimestre: trimestreDe(iso) || existente?.trimestre || 'T1 – Ene/Mar',
    sede_modalidad: lugar || existente?.sede_modalidad || '',
    presupuesto_detalle: presupuesto,
  };
  if (presupuesto.total > 0) campos.monto = presupuesto.total;
  if (ponente) { campos.t2_ponente = ponente; campos.t2_estado = 'Completado'; }
  if (lugar) { campos.t3_lugar = lugar; campos.t3_estado = 'Completado'; }
  if (!existente) {
    campos.estado_general = 'En proceso';
    campos.t1_estado = 'Completado';
    campos.t1_obs = 'Creada desde Solicitud de publicación';
  }
  return campos;
};

// Cambios hechos en la Planificación que deben regresar a la publicación.
export const publicacionDesdePlan = (plan = {}, pub = {}) => {
  const cambios = {};
  const set = (campo, valor) => { if (valor !== undefined && valor !== null && texto(valor) !== texto(pub[campo])) cambios[campo] = valor; };
  set('actividad_nombre', texto(plan.actividad) || undefined);
  if (plan.fecha_iso && plan.fecha_iso !== fechaISO(pub.actividad_fecha)) cambios.actividad_fecha = fechaLarga(plan.fecha_iso);
  if (TIPOS_ACTIVIDAD.includes(plan.tipo)) set('actividad_tipo', plan.tipo);
  if (AREAS_PLANIFICACION.includes(plan.area)) set('area', plan.area);
  if (texto(plan.t2_ponente)) set('ponente_nombre', texto(plan.t2_ponente));
  const sede = texto(plan.sede_modalidad);
  if (sede && sede !== sedeModalidad(pub)) {
    const [primero, ...resto] = sede.split(' · ');
    const modalidad = MODALIDADES.find(m => normalizar(m) === normalizar(primero));
    if (modalidad) {
      set('modalidad', modalidad);
      set('actividad_lugar', resto.join(' · ') || modalidad);
    } else {
      set('actividad_lugar', sede);
    }
  }
  return cambios;
};

// Datos del expediente que se copian de la publicación (se mantienen al día).
export const expedienteCamposDesdePublicacion = (pub = {}) => ({
  ponente_nombre: texto(pub.ponente_nombre),
  ponente_grado: texto(pub.ponente_grado),
  actividad_nombre: texto(pub.actividad_nombre),
  actividad_fecha: texto(pub.actividad_fecha),
  actividad_hora: texto(pub.actividad_hora),
  actividad_lugar: texto(pub.actividad_lugar),
});

export const difiere = (actual = {}, nuevos = {}) => Object.keys(nuevos)
  .some(k => JSON.stringify(actual?.[k] ?? null) !== JSON.stringify(nuevos[k] ?? null));

// Evento para el calendario del aula virtual (cpg_content.activities).
// `existente` es el evento ya publicado: se conserva lo que el aula administra
// (participantes, cupo lleno, costos, comisiones) y solo se reemplaza lo nuestro.
export const eventoAulaDesdePublicacion = (pub = {}, existente = null) => {
  const modalidad = modalidadDe(pub);
  const lugar = texto(pub.actividad_lugar);
  const location = modalidad === 'Virtual'
    ? (lugar && normalizar(lugar) !== 'virtual' ? lugar : 'Zoom')
    : (lugar || modalidad || 'Por confirmar');
  const base = existente ? { ...existente } : {
    organizer: 'CAEDUC', cost: '', costType: 'free', isFull: false,
    participants: '', scholarshipAmt: '', scholarshipPct: '',
  };
  return {
    ...base,
    title: texto(pub.actividad_nombre),
    date: fechaISO(pub.actividad_fecha),
    time: texto(pub.actividad_hora).slice(0, 5) || base.time || '18:00',
    horas: Number(pub.duracion_horas) > 0 ? String(pub.duracion_horas) : (base.horas || ''),
    location,
    organizer: base.organizer || 'CAEDUC',
    meetingLink: enlaceReunion(pub) || AULA_URL_DEFAULT,
    registrationLink: texto(pub.enlace_inscripcion) || base.registrationLink || '',
  };
};

// Para importar publicaciones que ya existían: busca una actividad de la
// Planificación sin enlazar con el mismo nombre (y misma fecha si ambas la tienen).
export const buscarPlanParecido = (pub = {}, planes = []) => {
  const nombre = normalizar(pub.actividad_nombre);
  if (!nombre) return null;
  const iso = fechaISO(pub.actividad_fecha);
  return planes.find(p => !p.publicacion_id
    && normalizar(p.actividad) === nombre
    && (!iso || !p.fecha_iso || p.fecha_iso === iso)) || null;
};

// El error que da PostgREST cuando falta ejecutar la migración de columnas.
export const faltaMigracion = (error) => /publicacion_id|presupuesto_detalle|gastos_extra|modalidad|actividad_tipo|duracion_horas|enlace_reunion|enlace_inscripcion|participantes_estimados|schema cache|column .* does not exist/i
  .test(String(error?.message || error || ''));

export const MIGRACION_SINCRONIZACION = 'supabase/2026_sincronizacion_actividades.sql';

// ── Presupuesto general ───────────────────────────────────────────────────────
// Cada gasto registrado (líneas de gasto de actividades y de rubros) se resta
// del presupuesto general. Lo "comprometido" es solo lo que falta por gastar de
// las actividades pendientes o en proceso: asignado menos lo ya gastado, para
// no contar dos veces un honorario que ya se registró como gasto.
export const comprometidoPendiente = (actividades = []) => actividades
  .filter(a => a.estado_general !== 'Completado' && a.estado_general !== 'Cancelado')
  .reduce((s, a) => s + Math.max(Number(a.monto || 0) - Number(a.monto_gastado || 0), 0), 0);

export const saldoProyectado = ({ disponible = 0, ejecutado = 0, actividades = [] } = {}) =>
  disponible - ejecutado - comprometidoPendiente(actividades);
