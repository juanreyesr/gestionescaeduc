// src/lib/syncActividades.js — Ejecuta la sincronización entre Solicitud de
// publicación, Planificación, Expediente del ponente y calendario del aula.
// Las reglas (qué campo va a dónde) están en sincronizacion.js; aquí solo se lee
// y escribe en Supabase. Todas las funciones reciben el cliente `supabase`.

import {
  buscarEventoAula, buscarPlanParecido, difiere, enlacesAulaPendientes, fechaISO, eventoAulaDesdePublicacion, expedienteCamposDesdePublicacion,
  faltaMigracion, faltantesPublicacion, MIGRACION_SINCRONIZACION, planDesdePublicacion, publicacionDesdePlan,
  fechaLarga,
} from './sincronizacion.js';
import { expedienteDesdePublicacion } from './expedientePonentes.js';
import { parseTarifas } from './tarifario.js';
import { buildPublicationMessage, DEFAULT_PUBLICATION_RESPONSIBLES, parseSettingJson } from './publicaciones.js';

const T_PUB = 'caeduc_publicaciones';
const T_PLAN = 'planificacion_actividades';
const T_EXP = 'caeduc_expediente_ponentes';

export const AVISO_MIGRACION = `Para sincronizar Planificación, publicaciones y aula falta ejecutar ${MIGRACION_SINCRONIZACION} en el SQL Editor de Supabase.`;

const resultadoMigracion = () => ({ ok: false, migracion: true, avisos: [AVISO_MIGRACION] });

export const leerTarifas = async (supabase) => {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'honorarios_tarifario').maybeSingle();
  return parseTarifas(data?.value);
};

const siguienteNumero = async (supabase) => {
  const { data } = await supabase.from(T_PLAN).select('numero').order('numero', { ascending: false, nullsFirst: false }).limit(1);
  return Number(data?.[0]?.numero || 0) + 1;
};

// ── Aula virtual ──────────────────────────────────────────────────────────────
export const leerEventoAula = async (supabase, eventId) => {
  if (!eventId) return null;
  const { data } = await supabase.from('cpg_content').select('activities').eq('id', 1).maybeSingle();
  return (data?.activities || []).find(item => String(item?.id) === String(eventId)) || null;
};

// Actualiza el evento ya publicado conservando lo que administra el aula.
// Devuelve { ok, existe }.
export const actualizarEventoAula = async (supabase, eventId, pub) => {
  const existente = await leerEventoAula(supabase, eventId);
  if (!existente) return { ok: false, existe: false };
  const evento = eventoAulaDesdePublicacion(pub, existente);
  const { data: ok, error } = await supabase.rpc('aula_actualizar_actividad', { p_event_id: String(eventId), p_evento: evento });
  if (error) return { ok: false, existe: true, error: error.message };
  return { ok: ok !== false, existe: ok !== false };
};

const leerEventosAula = async (supabase) => {
  const { data } = await supabase.from('cpg_content').select('activities').eq('id', 1).maybeSingle();
  return Array.isArray(data?.activities) ? data.activities : [];
};

const guardarEventoEnPlan = (supabase, planId, eventId) => supabase.from(T_PLAN)
  .update({ aula_event_id: String(eventId), updated_at: new Date().toISOString() }).eq('id', planId);

// Enlaza con su evento las actividades que ya están en el calendario del aula
// aunque se hayan publicado desde el panel del aula (mismo nombre y fecha).
export const enlazarEventosAula = async (supabase) => {
  const [{ data: planes, error }, eventos] = await Promise.all([
    supabase.from(T_PLAN).select('id, actividad, fecha_iso, aula_event_id, estado_general'),
    leerEventosAula(supabase),
  ]);
  if (error || !eventos.length) return { ok: !error, enlazadas: 0 };
  const enlaces = enlacesAulaPendientes(planes || [], eventos);
  let enlazadas = 0;
  for (const { planId, eventId } of enlaces) {
    // eslint-disable-next-line no-await-in-loop
    const { error: e } = await guardarEventoEnPlan(supabase, planId, eventId);
    if (!e) enlazadas += 1;
  }
  return { ok: true, enlazadas };
};

// Un solo botón: publica si no está en el aula, actualiza si ya está.
export const publicarEnAula = async (supabase, pub, plan) => {
  const { bloqueantes } = faltantesPublicacion(pub);
  if (bloqueantes.length) return { ok: false, error: `Completa antes: ${bloqueantes.join(', ')}.` };
  // Si ya estaba en el aula (publicada desde el panel del aula), se enlaza y se
  // actualiza ese evento en vez de crear uno repetido.
  if (!plan?.aula_event_id) {
    const eventos = await leerEventosAula(supabase);
    const existente = buscarEventoAula({ titulo: pub.actividad_nombre, fechaIso: fechaISO(pub.actividad_fecha) }, eventos);
    if (existente) {
      if (plan?.id) await guardarEventoEnPlan(supabase, plan.id, existente.id);
      const res = await actualizarEventoAula(supabase, existente.id, pub);
      if (res.ok) return { ...res, accion: 'actualizada', eventId: String(existente.id), aviso: 'Ya estaba en el calendario del aula: se enlazó y se actualizó (no se duplicó).' };
    }
  }
  if (plan?.aula_event_id) {
    const res = await actualizarEventoAula(supabase, plan.aula_event_id, pub);
    if (res.ok || res.existe) return { ...res, accion: 'actualizada' };
    // El evento fue borrado en el aula: se vuelve a publicar.
  }
  const evento = eventoAulaDesdePublicacion(pub);
  const { data: nuevoId, error } = await supabase.rpc('aula_publicar_actividad', { p_evento: evento });
  if (error) return { ok: false, error: error.message };
  if (plan?.id) {
    const { error: e2 } = await supabase.from(T_PLAN).update({ aula_event_id: String(nuevoId), updated_at: new Date().toISOString() }).eq('id', plan.id);
    if (e2) return { ok: true, accion: 'publicada', aviso: `Se publicó en el aula, pero no se guardó la referencia: ${e2.message}` };
  }
  return { ok: true, accion: 'publicada', eventId: String(nuevoId) };
};

// ── Expediente ────────────────────────────────────────────────────────────────
const sincronizarExpediente = async (supabase, pub) => {
  if (!pub?.id || !pub.actividad_nombre) return null;
  const { data: existentes, error } = await supabase.from(T_EXP).select('*').eq('publicacion_id', pub.id).limit(1);
  if (error) return `Expediente: ${error.message}`;
  const exp = existentes?.[0];
  if (!exp) {
    const { error: e } = await supabase.from(T_EXP).insert([expedienteDesdePublicacion(pub)]);
    return e && !/duplicate/i.test(e.message) ? `No se pudo abrir el expediente: ${e.message}` : null;
  }
  const campos = expedienteCamposDesdePublicacion(pub);
  if (!difiere(exp, campos)) return null;
  const { error: e } = await supabase.from(T_EXP).update({ ...campos, updated_at: new Date().toISOString() }).eq('id', exp.id);
  return e ? `No se pudo actualizar el expediente: ${e.message}` : null;
};

// ── Publicación → Planificación + Expediente + Aula ───────────────────────────
export const sincronizarPublicacion = async (supabase, pub, { tarifas, planes = null } = {}) => {
  if (!pub?.id || !pub.actividad_nombre) return { ok: false, avisos: [] };
  const tarifario = tarifas || await leerTarifas(supabase);
  const avisos = [];

  const { data: enlazadas, error } = await supabase.from(T_PLAN).select('*').eq('publicacion_id', pub.id).limit(1);
  if (error) return faltaMigracion(error) ? resultadoMigracion() : { ok: false, avisos: [`Planificación: ${error.message}`] };
  let plan = enlazadas?.[0] || null;
  let accionPlan = 'sin cambios';

  if (!plan) {
    let candidatos = planes;
    if (!candidatos) {
      const { data } = await supabase.from(T_PLAN).select('*').is('publicacion_id', null);
      candidatos = data || [];
    }
    const parecido = buscarPlanParecido(pub, candidatos);
    const campos = planDesdePublicacion(pub, tarifario, parecido);
    if (parecido) {
      const { data, error: e } = await supabase.from(T_PLAN).update({ ...campos, updated_at: new Date().toISOString() }).eq('id', parecido.id).select().single();
      if (e) return faltaMigracion(e) ? resultadoMigracion() : { ok: false, avisos: [`Planificación: ${e.message}`] };
      plan = data; accionPlan = 'enlazada';
    } else {
      const numero = await siguienteNumero(supabase);
      const { data, error: e } = await supabase.from(T_PLAN).insert([{ ...campos, numero }]).select().single();
      if (e) return faltaMigracion(e) ? resultadoMigracion() : { ok: false, avisos: [`Planificación: ${e.message}`] };
      plan = data; accionPlan = 'creada';
    }
  } else {
    const campos = planDesdePublicacion(pub, tarifario, plan);
    if (difiere(plan, campos)) {
      const { data, error: e } = await supabase.from(T_PLAN).update({ ...campos, updated_at: new Date().toISOString() }).eq('id', plan.id).select().single();
      if (e) avisos.push(`Planificación: ${e.message}`);
      else { plan = data; accionPlan = 'actualizada'; }
    }
  }

  const avisoExp = await sincronizarExpediente(supabase, pub);
  if (avisoExp) avisos.push(avisoExp);

  let aula = null;
  if (plan?.aula_event_id) {
    aula = await actualizarEventoAula(supabase, plan.aula_event_id, pub);
    if (aula.error) avisos.push(`Aula virtual: ${aula.error}`);
    else if (!aula.existe) avisos.push('El evento ya no existe en el calendario del aula; usa "Publicar en aula" para volver a crearlo.');
  }
  return { ok: true, plan, accionPlan, aula, avisos };
};

// ── Planificación → Publicación + Expediente + Aula ───────────────────────────
export const sincronizarPlan = async (supabase, plan) => {
  if (!plan?.publicacion_id) return { ok: true, avisos: [] };
  const { data: pub, error } = await supabase.from(T_PUB).select('*').eq('id', plan.publicacion_id).maybeSingle();
  if (error) return { ok: false, avisos: [`Publicación: ${error.message}`] };
  if (!pub) return { ok: false, avisos: ['La solicitud de publicación enlazada ya no existe.'] };
  const avisos = [];
  let actual = pub;
  const cambios = publicacionDesdePlan(plan, pub);
  if (Object.keys(cambios).length) {
    const { data, error: e } = await supabase.from(T_PUB).update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', pub.id).select().single();
    if (e) avisos.push(`Publicación: ${e.message}`);
    else actual = data;
  }
  const avisoExp = await sincronizarExpediente(supabase, actual);
  if (avisoExp) avisos.push(avisoExp);
  if (plan.aula_event_id) {
    const res = await actualizarEventoAula(supabase, plan.aula_event_id, actual);
    if (res.error) avisos.push(`Aula virtual: ${res.error}`);
  }
  return { ok: true, publicacion: actual, cambios, avisos };
};

// ── Importación inicial / periódica ───────────────────────────────────────────
// Toda publicación sin actividad en la Planificación se carga (o se enlaza con
// la actividad del mismo nombre que ya estuviera planificada).
export const importarPublicaciones = async (supabase) => {
  const [{ data: pubs, error: e1 }, { data: planes, error: e2 }] = await Promise.all([
    supabase.from(T_PUB).select('*'),
    supabase.from(T_PLAN).select('*'),
  ]);
  if (e1 || e2) {
    const err = e1 || e2;
    return faltaMigracion(err) ? resultadoMigracion() : { ok: false, avisos: [err.message] };
  }
  if ((planes || []).length && !Object.prototype.hasOwnProperty.call(planes[0], 'publicacion_id')) return resultadoMigracion();
  const enlazadas = new Set((planes || []).map(p => p.publicacion_id).filter(Boolean));
  const pendientes = (pubs || []).filter(p => p.actividad_nombre && !enlazadas.has(p.id));
  if (!pendientes.length) {
    const aula = await enlazarEventosAula(supabase);
    return { ok: true, creadas: 0, enlazadas: 0, enAula: aula.enlazadas, avisos: [] };
  }
  const tarifas = await leerTarifas(supabase);
  const libres = (planes || []).filter(p => !p.publicacion_id);
  let creadas = 0; let enlazadasN = 0; const avisos = [];
  for (const pub of pendientes) {
    // eslint-disable-next-line no-await-in-loop
    const res = await sincronizarPublicacion(supabase, pub, { tarifas, planes: libres });
    if (res.migracion) return res;
    if (res.accionPlan === 'creada') creadas += 1;
    if (res.accionPlan === 'enlazada') {
      enlazadasN += 1;
      const i = libres.findIndex(p => p.id === res.plan?.id);
      if (i >= 0) libres.splice(i, 1);
    }
    avisos.push(...(res.avisos || []));
  }
  const aula = await enlazarEventosAula(supabase);
  return { ok: true, creadas, enlazadas: enlazadasN, enAula: aula.enlazadas, avisos };
};

// ── Planificación → nueva Solicitud de publicación ────────────────────────────
// Para actividades creadas directamente en la Planificación.
export const crearPublicacionDesdePlan = async (supabase, plan) => {
  const { data: ajuste } = await supabase.from('app_settings').select('value').eq('key', 'publicacion_responsables').maybeSingle();
  const responsables = parseSettingJson(ajuste?.value, DEFAULT_PUBLICATION_RESPONSIBLES);
  const responsable = (Array.isArray(responsables) && responsables[0]) || DEFAULT_PUBLICATION_RESPONSIBLES[0];
  const [primero, ...resto] = String(plan.sede_modalidad || '').split(' · ');
  const modalidad = ['Virtual', 'Presencial', 'Híbrida'].find(m => m.toLowerCase() === primero.trim().toLowerCase()) || '';
  const pub = {
    id: crypto.randomUUID(),
    origen: 'manual',
    actividad_nombre: plan.actividad || '',
    ponente_nombre: plan.t2_ponente || '',
    actividad_fecha: plan.fecha_iso ? fechaLarga(plan.fecha_iso) : (plan.fecha || ''),
    actividad_hora: '',
    actividad_lugar: modalidad ? (resto.join(' · ') || modalidad) : (plan.sede_modalidad || ''),
    modalidad,
    actividad_tipo: plan.tipo || '',
    area: plan.area || '',
    zoom_detalles: '',
    responsable_nombre: responsable.name,
    responsable_telefono: responsable.phone,
    updated_at: new Date().toISOString(),
  };
  pub.mensaje_publicacion = buildPublicationMessage({ activity: pub, responsible: responsable });
  const { data, error } = await supabase.from(T_PUB).insert([pub]).select().single();
  if (error) return faltaMigracion(error) ? resultadoMigracion() : { ok: false, avisos: [error.message] };
  const { error: e2 } = await supabase.from(T_PLAN).update({ publicacion_id: data.id, updated_at: new Date().toISOString() }).eq('id', plan.id);
  if (e2) return faltaMigracion(e2) ? resultadoMigracion() : { ok: false, avisos: [e2.message] };
  const avisoExp = await sincronizarExpediente(supabase, data);
  return { ok: true, publicacion: data, avisos: avisoExp ? [avisoExp] : [] };
};

// ── Eliminar ──────────────────────────────────────────────────────────────────
// Quita el evento del calendario del aula (no queda como "cancelado").
export const eliminarDeAula = async (supabase, eventId) => {
  if (!eventId) return { ok: true, quitada: false };
  const { data, error } = await supabase.rpc('aula_eliminar_actividad', { p_event_id: String(eventId) });
  if (error) {
    const falta = /aula_eliminar_actividad|function .* does not exist|schema cache/i.test(error.message || '');
    return { ok: false, error: falta ? `Para quitar actividades del aula falta ejecutar ${MIGRACION_SINCRONIZACION} en Supabase.` : error.message };
  }
  return { ok: true, quitada: data !== false };
};

// Al eliminar una Solicitud de publicación: sale del aula y, si se pide, también
// de la Planificación; si no, la actividad planificada queda sin enlace.
// (El expediente se conserva porque puede tener documentos ya cargados.)
export const limpiarAlEliminarPublicacion = async (supabase, plan, { borrarDePlanificacion = false } = {}) => {
  if (!plan?.id) return { ok: true, avisos: [] };
  const avisos = [];
  if (plan.aula_event_id) {
    const res = await eliminarDeAula(supabase, plan.aula_event_id);
    if (!res.ok) avisos.push(`Aula virtual: ${res.error}`);
  }
  const { error } = borrarDePlanificacion
    ? await supabase.from(T_PLAN).delete().eq('id', plan.id)
    : await supabase.from(T_PLAN).update({ publicacion_id: null, aula_event_id: null, updated_at: new Date().toISOString() }).eq('id', plan.id);
  if (error) avisos.push(`Planificación: ${error.message}`);
  return { ok: !avisos.length, avisos };
};
