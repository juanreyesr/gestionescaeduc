// src/PlanificacionCAEDUCView.jsx
// Módulo de Planificación y Seguimiento CAEDUC 2026
// Integrado en CAEDUC App (React + Supabase + Tailwind)

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Calendar, Users, CheckCircle, Clock, AlertCircle, BarChart2,
  Edit3, Save, X, User, RefreshCw, Filter, Target, Clipboard,
  ChevronRight, TrendingUp, DollarSign, MapPin, FileText, Phone,
  Mail, CheckSquare, Square, ArrowRight, Info, Building2
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Constantes ──────────────────────────────────────────────────────────────

const AREAS = [
  'Clínico', 'Educativo', 'Deportivo', 'Social/Comunitario',
  'Organizacional/Indust.', 'Reunión CAEDUC', 'Actividades CAEDUC',
];

const AREA_STYLE = {
  'Clínico':                { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-l-blue-500',    dot: 'bg-blue-500'    },
  'Educativo':              { bg: 'bg-green-100',   text: 'text-green-800',   border: 'border-l-green-500',   dot: 'bg-green-500'   },
  'Deportivo':              { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-l-orange-500',  dot: 'bg-orange-500'  },
  'Social/Comunitario':     { bg: 'bg-purple-100',  text: 'text-purple-800',  border: 'border-l-purple-500',  dot: 'bg-purple-500'  },
  'Organizacional/Indust.': { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-l-yellow-500',  dot: 'bg-yellow-400'  },
  'Reunión CAEDUC':         { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-l-gray-400',    dot: 'bg-gray-400'    },
  'Actividades CAEDUC':     { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-l-rose-500',    dot: 'bg-rose-500'    },
};

const ESTADOS = ['Pendiente', 'En proceso', 'Completado', 'Cancelado'];
const TRIMESTRES = ['T1 – Ene/Mar', 'T2 – Abr/Jun', 'T3 – Jul/Sep', 'T4 – Oct/Dic'];

const ESTADO_STYLE = {
  'Pendiente':  { badge: 'bg-yellow-100 text-yellow-800 border-yellow-300', row: '' },
  'En proceso': { badge: 'bg-blue-100 text-blue-800 border-blue-300',       row: 'bg-blue-50' },
  'Completado': { badge: 'bg-green-100 text-green-800 border-green-300',    row: 'bg-green-50' },
  'Cancelado':  { badge: 'bg-gray-200 text-gray-600 border-gray-300',       row: 'opacity-60' },
};

const TASKS_META = [
  { key: 't1', label: 'Solicitud de Actividad',    color: 'blue',   fields: [
    { k: 't1_fecha',  label: 'Fecha de solicitud',      type: 'date' },
    { k: 't1_obs',    label: 'Observaciones',            type: 'text' },
  ]},
  { key: 't2', label: 'Confirmación con Ponente',  color: 'indigo', fields: [
    { k: 't2_fecha',   label: 'Fecha de confirmación',  type: 'date' },
    { k: 't2_ponente', label: 'Nombre del ponente',     type: 'text' },
  ]},
  { key: 't3', label: 'Solicitud del Lugar',       color: 'amber',  fields: [
    { k: 't3_fecha',  label: 'Fecha confirmación lugar', type: 'date' },
    { k: 't3_lugar',  label: 'Lugar / Plataforma',       type: 'text' },
  ]},
  { key: 't4', label: 'Elaboración de Oficios',    color: 'violet', fields: [
    { k: 't4_fecha',     label: 'Fecha elaboración',   type: 'date' },
    { k: 't4_num_oficio',label: 'N° de oficio',         type: 'text' },
  ]},
];

// ── Mini-componentes ─────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const s = ESTADO_STYLE[status] || ESTADO_STYLE['Pendiente'];
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${s.badge}`}>
      {status}
    </span>
  );
};

const AreaTag = ({ area }) => {
  const c = AREA_STYLE[area] || {};
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {area}
    </span>
  );
};

const ProgressBar = ({ done, total, showLabel = true }) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : pct > 0 ? 'bg-yellow-400' : 'bg-gray-200';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>}
    </div>
  );
};

// Indicadores de las 4 tareas (4 puntos de color)
const TaskDots = ({ act }) => (
  <div className="flex gap-1 items-center" title="Solicitud · Ponente · Lugar · Oficio">
    {['t1_estado', 't2_estado', 't3_estado', 't4_estado'].map((k, i) => {
      const st = act[k];
      const c = st === 'Completado' ? 'bg-green-500' : st === 'En proceso' ? 'bg-blue-400' : st === 'Cancelado' ? 'bg-gray-300' : 'bg-gray-300';
      return <div key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />;
    })}
  </div>
);

// ── Componente principal ─────────────────────────────────────────────────────

export default function PlanificacionCAEDUCView({ onNavigateOficios }) {
  const [tab, setTab] = useState('dashboard');
  const [responsables, setResponsables] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingArea, setEditingArea] = useState(null);
  const [respForm, setRespForm] = useState({ responsable: '', email: '', telefono: '' });
  const [savingResp, setSavingResp] = useState(false);
  const [selectedAct, setSelectedAct] = useState(null);
  const [taskForm, setTaskForm] = useState({});
  const [savingTask, setSavingTask] = useState(false);
  const [filters, setFilters] = useState({ trimestre: '', area: '', estado: '' });

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: resp }, { data: acts }] = await Promise.all([
      supabase.from('planificacion_responsables').select('*').order('area'),
      supabase.from('planificacion_actividades').select('*').order('numero'),
    ]);
    if (resp) setResponsables(resp);
    if (acts) setActividades(acts);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Helpers ──
  const getRespData = (area) => responsables.find(r => r.area === area) || {};
  const getRespName = (area) => getRespData(area).responsable || 'Sin asignar';

  const enriched = actividades.map(a => ({ ...a, responsable_nombre: getRespName(a.area) }));

  const filtered = enriched.filter(a => {
    if (filters.trimestre && a.trimestre !== filters.trimestre) return false;
    if (filters.area && a.area !== filters.area) return false;
    if (filters.estado && a.estado_general !== filters.estado) return false;
    return true;
  });

  // ── Estadísticas globales ──
  const stats = {
    total: actividades.length,
    completadas: actividades.filter(a => a.estado_general === 'Completado').length,
    enProceso:   actividades.filter(a => a.estado_general === 'En proceso').length,
    pendientes:  actividades.filter(a => a.estado_general === 'Pendiente').length,
    presupuesto: actividades.reduce((s, a) => s + (Number(a.monto) || 0), 0),
  };

  // ── Stats por área ──
  const areaStats = AREAS.map(area => {
    const acts = actividades.filter(a => a.area === area);
    return {
      area,
      total:       acts.length,
      completadas: acts.filter(a => a.estado_general === 'Completado').length,
      enProceso:   acts.filter(a => a.estado_general === 'En proceso').length,
      pendientes:  acts.filter(a => a.estado_general === 'Pendiente').length,
      presupuesto: acts.reduce((s, a) => s + (Number(a.monto) || 0), 0),
      resp:        getRespData(area),
    };
  }).filter(s => s.total > 0);

  // ── Guardar responsable ──
  const openEditResp = (area) => {
    const r = getRespData(area);
    setRespForm({ responsable: r.responsable || '', email: r.email || '', telefono: r.telefono || '' });
    setEditingArea(area);
  };

  const saveResp = async () => {
    setSavingResp(true);
    await supabase.from('planificacion_responsables')
      .upsert({ area: editingArea, ...respForm, updated_at: new Date().toISOString() }, { onConflict: 'area' });
    setEditingArea(null);
    await fetchData();
    setSavingResp(false);
  };

  // ── Actualizar estado general directamente ──
  const updateEstado = async (id, estado_general) => {
    setActividades(prev => prev.map(a => a.id === id ? { ...a, estado_general } : a));
    await supabase.from('planificacion_actividades')
      .update({ estado_general, updated_at: new Date().toISOString() }).eq('id', id);
  };

  // ── Abrir modal de tareas ──
  const openActivity = (act) => {
    setSelectedAct(act);
    setTaskForm({
      estado_general:  act.estado_general  || 'Pendiente',
      sede_modalidad:  act.sede_modalidad  || '',
      observaciones:   act.observaciones   || '',
      t1_estado:  act.t1_estado  || 'Pendiente',  t1_fecha:  act.t1_fecha  || '',  t1_obs:       act.t1_obs       || '',
      t2_estado:  act.t2_estado  || 'Pendiente',  t2_fecha:  act.t2_fecha  || '',  t2_ponente:   act.t2_ponente   || '',
      t3_estado:  act.t3_estado  || 'Pendiente',  t3_fecha:  act.t3_fecha  || '',  t3_lugar:     act.t3_lugar     || '',
      t4_estado:  act.t4_estado  || 'Pendiente',  t4_fecha:  act.t4_fecha  || '',  t4_num_oficio:act.t4_num_oficio|| '',
    });
  };

  const saveTask = async () => {
    if (!selectedAct) return;
    setSavingTask(true);
    await supabase.from('planificacion_actividades')
      .update({ ...taskForm, updated_at: new Date().toISOString() }).eq('id', selectedAct.id);
    await fetchData();
    setSelectedAct(null);
    setSavingTask(false);
  };

  // ── Colores por tarea ──
  const taskBorderColor = { blue: 'border-blue-300 bg-blue-50', indigo: 'border-indigo-300 bg-indigo-50', amber: 'border-amber-300 bg-amber-50', violet: 'border-violet-300 bg-violet-50' };
  const taskTitleColor  = { blue: 'text-blue-700', indigo: 'text-indigo-700', amber: 'text-amber-700', violet: 'text-violet-700' };

  // ── Loading ──
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={32} className="text-blue-500 animate-spin" />
      <span className="ml-3 text-gray-500">Cargando planificación...</span>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* ── Encabezado ── */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Planificación CAEDUC 2026</h2>
          <p className="text-sm text-gray-500">Seguimiento de actividades · Responsables por área · 4 tareas por actividad</p>
        </div>
        <button onClick={fetchData} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm font-medium">
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      {/* ── Tarjetas de estadísticas ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{stats.completadas}</p>
          <p className="text-xs text-gray-500 mt-1">Completadas</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-blue-500">{stats.enProceso}</p>
          <p className="text-xs text-gray-500 mt-1">En Proceso</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{stats.pendientes}</p>
          <p className="text-xs text-gray-500 mt-1">Pendientes</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center col-span-2 md:col-span-1">
          <p className="text-xl font-bold text-gray-700">Q{(stats.presupuesto / 1000).toFixed(0)}K</p>
          <p className="text-xs text-gray-500 mt-1">Presupuesto</p>
        </div>
      </div>

      {/* ── Barra de progreso global ── */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span className="font-semibold">Avance global 2026</span>
          <span>{stats.completadas}/{stats.total} actividades completadas</span>
        </div>
        <ProgressBar done={stats.completadas} total={stats.total} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'dashboard',   label: 'Responsables y Avance', icon: <BarChart2  size={16} /> },
          { id: 'actividades', label: 'Actividades',            icon: <Calendar  size={16} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium flex-1 justify-center transition-all
              ${tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB: DASHBOARD – Responsables y avance por área
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>Asigna el responsable de cada área haciendo clic en <strong>"Editar"</strong>. El nombre se refleja automáticamente en todas las actividades de esa área sin necesidad de cambiarlas una por una.</span>
          </div>

          <div className="grid gap-4">
            {areaStats.map(({ area, total, completadas, enProceso, pendientes, presupuesto, resp }) => {
              const c = AREA_STYLE[area] || {};
              const isEditing = editingArea === area;
              return (
                <div key={area} className={`bg-white rounded-lg shadow-sm border-l-4 ${c.border} overflow-hidden`}>
                  <div className="p-4">
                    {/* Cabecera del área */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                        <span className="font-bold text-gray-800">{area}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{total} actividades</span>
                        {presupuesto > 0 && (
                          <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                            Q{presupuesto.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {!isEditing && (
                        <button onClick={() => openEditResp(area)}
                          className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1 font-medium border border-blue-200">
                          <Edit3 size={12} /> {resp.responsable ? 'Editar' : 'Asignar responsable'}
                        </button>
                      )}
                    </div>

                    {/* Formulario edición */}
                    {isEditing ? (
                      <div className="space-y-3 mt-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <input placeholder="Nombre completo del responsable *"
                          className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                          value={respForm.responsable} onChange={e => setRespForm({...respForm, responsable: e.target.value})} />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input placeholder="Email" className="w-full border p-2 pl-8 rounded-lg text-sm"
                              value={respForm.email} onChange={e => setRespForm({...respForm, email: e.target.value})} />
                          </div>
                          <div className="relative">
                            <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input placeholder="Teléfono" className="w-full border p-2 pl-8 rounded-lg text-sm"
                              value={respForm.telefono} onChange={e => setRespForm({...respForm, telefono: e.target.value})} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveResp} disabled={savingResp}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                            <Save size={14} /> {savingResp ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button onClick={() => setEditingArea(null)}
                            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Info responsable actual */
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`${c.bg} rounded-full p-2`}>
                          <User size={14} className={c.text} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${resp.responsable ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                            {resp.responsable || 'Sin responsable asignado'}
                          </p>
                          <div className="flex gap-3">
                            {resp.email    && <p className="text-xs text-gray-500">{resp.email}</p>}
                            {resp.telefono && <p className="text-xs text-gray-500">{resp.telefono}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Barra de progreso del área */}
                    {!isEditing && (
                      <div className="space-y-1.5">
                        <ProgressBar done={completadas} total={total} />
                        <div className="flex gap-4 text-xs">
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle size={11} /> {completadas} completadas
                          </span>
                          <span className="text-blue-600 flex items-center gap-1">
                            <Clock size={11} /> {enProceso} en proceso
                          </span>
                          <span className="text-yellow-600 flex items-center gap-1">
                            <AlertCircle size={11} /> {pendientes} pendientes
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: ACTIVIDADES – Lista filtrable con seguimiento de tareas
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 'actividades' && (
        <div className="space-y-4">

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm border p-3">
            <div className="flex gap-2 flex-wrap items-center">
              <Filter size={15} className="text-gray-400 shrink-0" />
              <select className="border p-2 rounded-lg text-sm" value={filters.trimestre}
                onChange={e => setFilters({...filters, trimestre: e.target.value})}>
                <option value="">Todos los trimestres</option>
                {TRIMESTRES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="border p-2 rounded-lg text-sm" value={filters.area}
                onChange={e => setFilters({...filters, area: e.target.value})}>
                <option value="">Todas las áreas</option>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select className="border p-2 rounded-lg text-sm" value={filters.estado}
                onChange={e => setFilters({...filters, estado: e.target.value})}>
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              {(filters.trimestre || filters.area || filters.estado) && (
                <button onClick={() => setFilters({ trimestre: '', area: '', estado: '' })}
                  className="text-xs text-red-500 hover:text-red-700 underline ml-1">
                  Limpiar filtros
                </button>
              )}
              <span className="ml-auto text-xs text-gray-400 shrink-0">{filtered.length} actividades</span>
            </div>
          </div>

          {/* Leyenda de puntos de tareas */}
          <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
            <span className="font-semibold text-gray-600">Tareas (●●●●):</span>
            <span>1. Solicitud</span>
            <span>2. Ponente</span>
            <span>3. Lugar</span>
            <span>4. Oficios</span>
            <div className="flex items-center gap-1 ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Completado
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block ml-2" /> En proceso
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block ml-2" /> Pendiente
            </div>
          </div>

          {/* Lista de actividades */}
          <div className="space-y-2">
            {filtered.map(act => {
              const s = ESTADO_STYLE[act.estado_general] || {};
              const c = AREA_STYLE[act.area] || {};
              return (
                <div key={act.id} className={`bg-white rounded-lg shadow-sm border-l-4 ${c.border} hover:shadow-md transition-shadow ${s.row}`}>
                  <div className="p-3 flex items-center gap-3">
                    {/* Número */}
                    <span className="text-xs font-bold text-gray-300 w-6 text-center shrink-0">
                      {act.numero}
                    </span>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <AreaTag area={act.area} />
                        <span className="text-xs text-gray-400">{act.trimestre}</span>
                        {act.responsable_nombre !== 'Sin asignar' && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <User size={10} /> {act.responsable_nombre}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{act.actividad}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={10} /> {act.fecha}
                        </span>
                        {act.monto > 0 && (
                          <span className="text-xs text-green-600 font-medium">
                            Q{Number(act.monto).toLocaleString()}
                          </span>
                        )}
                        <TaskDots act={act} />
                      </div>
                    </div>

                    {/* Estado (dropdown inline) */}
                    <div className="shrink-0 flex items-center gap-2">
                      <select
                        className={`border rounded-lg text-xs p-1.5 font-semibold cursor-pointer ${s.badge} border-current`}
                        value={act.estado_general}
                        onChange={e => updateEstado(act.id, e.target.value)}
                      >
                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <button onClick={() => openActivity(act)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 flex items-center gap-1 font-medium shrink-0">
                        <Clipboard size={12} /> Tareas
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Target size={40} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium">Sin actividades con los filtros seleccionados</p>
                <button onClick={() => setFilters({ trimestre: '', area: '', estado: '' })}
                  className="mt-3 text-blue-500 hover:text-blue-700 text-sm underline">
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: Seguimiento de 4 tareas por actividad
      ════════════════════════════════════════════════════════════════════ */}
      {selectedAct && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">

            {/* Header del modal */}
            <div className="flex justify-between items-start p-5 border-b bg-gray-50 rounded-t-xl">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <AreaTag area={selectedAct.area} />
                  <span className="text-xs text-gray-400">{selectedAct.trimestre} · #{selectedAct.numero}</span>
                </div>
                <h3 className="text-base font-bold text-gray-800 leading-snug">{selectedAct.actividad}</h3>
                <div className="flex gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={10} /> {selectedAct.fecha}</span>
                  {selectedAct.monto > 0 && <span className="text-xs text-green-600 font-medium">Q{Number(selectedAct.monto).toLocaleString()}</span>}
                  <span className="text-xs text-gray-500 flex items-center gap-1"><User size={10} /> {getRespName(selectedAct.area)}</span>
                </div>
              </div>
              <button onClick={() => setSelectedAct(null)}>
                <X size={22} className="text-gray-400 hover:text-red-500" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Estado General */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border">
                <span className="text-sm font-bold text-gray-700">Estado General:</span>
                <select className="border p-2 rounded-lg text-sm font-medium flex-1 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                  value={taskForm.estado_general}
                  onChange={e => setTaskForm({...taskForm, estado_general: e.target.value})}>
                  {ESTADOS.map(e => <option key={e}>{e}</option>)}
                </select>
                <StatusBadge status={taskForm.estado_general} />
              </div>

              {/* 4 Tareas */}
              {TASKS_META.map(({ key, label, color, fields }) => {
                const estadoKey = `${key}_estado`;
                const est = taskForm[estadoKey] || 'Pendiente';
                const borderCls = est === 'Completado'
                  ? 'border-green-300 bg-green-50'
                  : est === 'En proceso'
                  ? `${taskBorderColor[color] || 'border-gray-200 bg-gray-50'}`
                  : 'border-gray-200 bg-white';
                return (
                  <div key={key} className={`border rounded-xl p-4 transition-colors ${borderCls}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-bold text-sm ${taskTitleColor[color] || 'text-gray-700'}`}>{label}</h4>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={est} />
                        {est === 'Completado' && <CheckCircle size={16} className="text-green-500" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {/* Select de estado */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Estado</label>
                        <select className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                          value={taskForm[estadoKey] || 'Pendiente'}
                          onChange={e => setTaskForm({...taskForm, [estadoKey]: e.target.value})}>
                          {ESTADOS.map(e => <option key={e}>{e}</option>)}
                        </select>
                      </div>
                      {/* Campos adicionales */}
                      <div className="grid grid-cols-2 gap-2">
                        {fields.map(({ k, label: fl, type }) => (
                          <div key={k}>
                            <label className="block text-xs font-bold text-gray-500 mb-1">{fl}</label>
                            <input type={type === 'date' ? 'date' : 'text'}
                              placeholder={type !== 'date' ? fl : undefined}
                              className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                              value={taskForm[k] || ''}
                              onChange={e => setTaskForm({...taskForm, [k]: e.target.value})} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Sede / Observaciones */}
              <div className="grid grid-cols-1 gap-3 border rounded-xl p-4 bg-gray-50">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                    <MapPin size={12} /> Sede / Modalidad
                  </label>
                  <input type="text" placeholder="Ej: Sede Central Guatemala, Virtual vía Zoom"
                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    value={taskForm.sede_modalidad}
                    onChange={e => setTaskForm({...taskForm, sede_modalidad: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                    <FileText size={12} /> Observaciones generales
                  </label>
                  <textarea rows={2} placeholder="Notas, comentarios adicionales sobre la actividad..."
                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none resize-none"
                    value={taskForm.observaciones}
                    onChange={e => setTaskForm({...taskForm, observaciones: e.target.value})} />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setSelectedAct(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200 text-sm">
                  Cancelar
                </button>
                {onNavigateOficios && (
                  <button onClick={() => { setSelectedAct(null); onNavigateOficios(selectedAct); }}
                    className="bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-100 text-sm flex items-center gap-1 border border-indigo-200">
                    <FileText size={14} /> Crear Oficio
                  </button>
                )}
                <button onClick={saveTask} disabled={savingTask}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  <Save size={16} /> {savingTask ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
