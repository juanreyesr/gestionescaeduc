import test from 'node:test';
import assert from 'node:assert/strict';
import { importarPublicaciones, publicarEnAula, sincronizarPlan, sincronizarPublicacion } from './syncActividades.js';

// Base de datos en memoria con la parte de la API de supabase-js que se usa.
const crearDb = (inicial = {}) => {
  const tablas = { app_settings: [{ key: 'honorarios_tarifario', value: JSON.stringify([{ grado: 'Maestría', monto: 2500 }]) }], cpg_content: [{ id: 1, activities: [] }], ...inicial };
  let seq = 0;
  const rpcLog = [];
  const consulta = (nombre) => {
    const filtros = []; let op = 'select'; let datos = null; let limite = null;
    const filas = () => (tablas[nombre] ||= []).filter(f => filtros.every(fn => fn(f)));
    const ejecutar = () => {
      if (op === 'insert') {
        const nuevas = datos.map(d => ({ id: d.id || `id-${++seq}`, ...d }));
        for (const n of nuevas) {
          if (nombre === 'planificacion_actividades' && n.publicacion_id && tablas[nombre].some(f => f.publicacion_id === n.publicacion_id)) return { data: null, error: { message: 'duplicate key' } };
        }
        tablas[nombre].push(...nuevas); return { data: nuevas, error: null };
      }
      if (op === 'update') { const fs = filas(); fs.forEach(f => Object.assign(f, datos)); return { data: fs, error: null }; }
      const fs = filas(); return { data: limite ? fs.slice(0, limite) : fs, error: null };
    };
    const q = {
      select() { return q; }, order() { return q; },
      eq(c, v) { filtros.push(f => String(f[c]) === String(v)); return q; },
      is(c, v) { filtros.push(f => (f[c] ?? null) === v); return q; },
      not(c, _o, v) { filtros.push(f => (f[c] ?? null) !== v); return q; },
      limit(n) { limite = n; return q; },
      insert(d) { op = 'insert'; datos = d; return q; },
      update(d) { op = 'update'; datos = d; return q; },
      single() { const r = ejecutar(); return Promise.resolve({ data: r.data?.[0] ?? null, error: r.error }); },
      maybeSingle() { return q.single(); },
      then(res, rej) { return Promise.resolve(ejecutar()).then(res, rej); },
    };
    return q;
  };
  return {
    tablas, rpcLog,
    from: consulta,
    rpc(nombre, args) {
      rpcLog.push({ nombre, args });
      const acts = tablas.cpg_content[0].activities;
      if (nombre === 'aula_publicar_actividad') { const id = 1000 + acts.length; acts.push({ ...args.p_evento, id }); return Promise.resolve({ data: id, error: null }); }
      const i = acts.findIndex(a => String(a.id) === String(args.p_event_id));
      if (i < 0) return Promise.resolve({ data: false, error: null });
      acts[i] = { ...args.p_evento, id: acts[i].id }; return Promise.resolve({ data: true, error: null });
    },
  };
};

const pub = {
  id: 'pub-1', actividad_nombre: 'Duelo', ponente_nombre: 'Mgtr. Ana', ponente_grado: 'Maestría', actividad_fecha: '20 de agosto de 2026',
  actividad_hora: '19:00', actividad_lugar: 'Zoom', modalidad: 'Virtual', actividad_tipo: 'Conferencia', area: 'Clínico', duracion_horas: 2, zoom_detalles: '',
};

test('flujo completo: publicación → planificación + expediente → aula → cambios en planificación', async () => {
  const db = crearDb({ caeduc_publicaciones: [{ ...pub }], planificacion_actividades: [{ id: 'p0', numero: 7, actividad: 'Otra', publicacion_id: null }], caeduc_expediente_ponentes: [] });
  const imp = await importarPublicaciones(db);
  assert.equal(imp.creadas, 1);
  const plan = db.tablas.planificacion_actividades.find(p => p.publicacion_id === 'pub-1');
  assert.equal(plan.numero, 8);
  assert.equal(plan.monto, 2500);
  assert.equal(db.tablas.caeduc_expediente_ponentes.length, 1);

  // Publicar en el aula sin Zoom → enlace al aula virtual
  const res = await publicarEnAula(db, pub, plan);
  assert.equal(res.ok, true);
  assert.equal(db.tablas.cpg_content[0].activities[0].meetingLink, 'https://www.aulavirtualcpg.org');
  assert.equal(plan.aula_event_id, '1000');
  // El aula registra participantes; luego se agrega el Zoom en la publicación
  db.tablas.cpg_content[0].activities[0].participants = '80';
  const pub2 = { ...pub, zoom_detalles: 'https://zoom.us/j/9', ponente_grado: 'Maestría' };
  db.tablas.caeduc_publicaciones[0] = pub2;
  const s = await sincronizarPublicacion(db, pub2);
  assert.equal(s.aula.ok, true);
  assert.equal(db.tablas.cpg_content[0].activities[0].meetingLink, 'https://zoom.us/j/9');
  assert.equal(db.tablas.cpg_content[0].activities[0].participants, '80');

  // Cambio de fecha y nombre en la Planificación → regresa a publicación, expediente y aula
  Object.assign(plan, { actividad: 'Duelo y pérdida', fecha_iso: '2026-09-03' });
  const r = await sincronizarPlan(db, plan);
  assert.equal(r.ok, true);
  assert.equal(db.tablas.caeduc_publicaciones[0].actividad_nombre, 'Duelo y pérdida');
  assert.equal(db.tablas.caeduc_publicaciones[0].actividad_fecha, '3 de septiembre de 2026');
  assert.equal(db.tablas.caeduc_expediente_ponentes[0].actividad_nombre, 'Duelo y pérdida');
  assert.equal(db.tablas.cpg_content[0].activities[0].date, '2026-09-03');
  // Volver a importar no duplica nada
  assert.equal((await importarPublicaciones(db)).creadas, 0);
});

test('enlaza con la actividad que ya estaba planificada en vez de duplicarla', async () => {
  const db = crearDb({ caeduc_publicaciones: [{ ...pub }], planificacion_actividades: [{ id: 'p1', numero: 1, actividad: 'DUELO', fecha_iso: '2026-08-20', publicacion_id: null, estado_general: 'Completado' }], caeduc_expediente_ponentes: [] });
  const imp = await importarPublicaciones(db);
  assert.equal(imp.enlazadas, 1);
  assert.equal(db.tablas.planificacion_actividades.length, 1);
  assert.equal(db.tablas.planificacion_actividades[0].publicacion_id, 'pub-1');
  assert.equal(db.tablas.planificacion_actividades[0].estado_general, 'Completado');
});
