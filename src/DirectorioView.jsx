// src/DirectorioView.jsx — Directorio y Procedimientos CAEDUC
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Users, BookOpen, Plus, Search, Edit3, Trash2, X, Save,
  Phone, Mail, MapPin, User, Building2, ChevronDown, ChevronUp,
  ClipboardList, Clock, AlertCircle, GripVertical, CheckCircle
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const DEPARTAMENTOS_GT = [
  'Alta Verapaz','Baja Verapaz','Chimaltenango','Chiquimula','El Progreso',
  'Escuintla','Guatemala','Huehuetenango','Izabal','Jalapa','Jutiapa',
  'Petén','Quetzaltenango','Quiché','Retalhuleu','Sacatepéquez',
  'San Marcos','Santa Rosa','Sololá','Suchitepéquez','Totonicapán','Zacapa'
];

const CARGOS_SUGERIDOS = [
  'Delegada Departamental','Delegado Departamental',
  'Coordinadora de Sub Sede','Coordinador de Sub Sede',
  'Representante Regional','Vocal','Secretaria','Tesorera','Presidenta','Presidente'
];

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-xl shadow-xl w-full ${sizes[size]} my-4`}>
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// ── PersonaForm ───────────────────────────────────────────────────────────────
const PERSONA_EMPTY = { nombre:'', cargo:'', email:'', telefono:'', departamento:'', delegacion:'' };

function PersonaForm({ initial, onSave, onClose, saving }) {
  const [fd, setFd] = useState(initial || PERSONA_EMPTY);
  const upd = (k, v) => setFd(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(fd); }} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Nombre completo *</label>
          <input required className="w-full border p-2.5 rounded-lg text-sm" placeholder="Ej: Licda. Ana López de García"
            value={fd.nombre} onChange={e => upd('nombre', e.target.value)}/>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Cargo *</label>
          <input list="cargos-list" required className="w-full border p-2.5 rounded-lg text-sm" placeholder="Ej: Delegada Departamental"
            value={fd.cargo} onChange={e => upd('cargo', e.target.value)}/>
          <datalist id="cargos-list">{CARGOS_SUGERIDOS.map(c => <option key={c} value={c}/>)}</datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Correo electrónico</label>
            <input type="email" className="w-full border p-2.5 rounded-lg text-sm" placeholder="ejemplo@correo.com"
              value={fd.email} onChange={e => upd('email', e.target.value)}/>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
            <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="+(502) 0000-0000"
              value={fd.telefono} onChange={e => upd('telefono', e.target.value)}/>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Departamento *</label>
          <select required className="w-full border p-2.5 rounded-lg text-sm"
            value={fd.departamento} onChange={e => upd('departamento', e.target.value)}>
            <option value="">Seleccionar departamento...</option>
            {DEPARTAMENTOS_GT.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Delegación / Sub Sede</label>
          <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="Ej: Sub Sede Cobán, Delegación Escuintla..."
            value={fd.delegacion} onChange={e => upd('delegacion', e.target.value)}/>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={16}/> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

// ── DirectorioSection ─────────────────────────────────────────────────────────
function DirectorioSection() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedDept, setExpandedDept] = useState({});

  const fetchPersonas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('directorio_personas').select('*').order('departamento').order('nombre');
    if (data) setPersonas(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPersonas(); }, [fetchPersonas]);

  const handleSave = async (fd) => {
    setSaving(true);
    if (editItem) {
      await supabase.from('directorio_personas').update(fd).eq('id', editItem.id);
    } else {
      await supabase.from('directorio_personas').insert([fd]);
    }
    await fetchPersonas();
    setShowModal(false); setEditItem(null); setSaving(false);
  };

  const handleDelete = async () => {
    await supabase.from('directorio_personas').delete().eq('id', deleteModal.id);
    await fetchPersonas(); setDeleteModal(null);
  };

  const openEdit = (p) => { setEditItem(p); setShowModal(true); };

  // Filter
  const filtered = personas.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.nombre?.toLowerCase().includes(q) || p.cargo?.toLowerCase().includes(q) ||
      p.departamento?.toLowerCase().includes(q) || p.delegacion?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
    const matchDept = !filterDept || p.departamento === filterDept;
    return matchSearch && matchDept;
  });

  // Group by departamento
  const grouped = filtered.reduce((acc, p) => {
    const d = p.departamento || 'Sin departamento';
    if (!acc[d]) acc[d] = [];
    acc[d].push(p);
    return acc;
  }, {});
  const sortedDepts = Object.keys(grouped).sort();

  const toggleDept = (d) => setExpandedDept(prev => ({ ...prev, [d]: !prev[d] }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users size={20} className="text-blue-600"/> Directorio de Delegaciones y Sub Sedes</h2>
          <p className="text-sm text-gray-500">{personas.length} contactos registrados</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 shrink-0">
          <Plus size={18}/> Agregar persona
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="w-full border p-2.5 pl-9 rounded-xl text-sm" placeholder="Buscar por nombre, cargo, delegación..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="border p-2.5 rounded-xl text-sm min-w-[200px]" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">Todos los departamentos</option>
          {DEPARTAMENTOS_GT.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Empty state */}
      {!loading && personas.length === 0 && (
        <Card className="text-center py-16">
          <Users size={48} className="text-gray-200 mx-auto mb-3"/>
          <p className="text-gray-400 text-lg font-medium">Directorio vacío</p>
          <p className="text-gray-400 text-sm mb-6">Agrega delegadas y responsables de sub sedes para construir el directorio.</p>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 inline-flex items-center gap-2">
            <Plus size={16}/> Agregar primera persona
          </button>
        </Card>
      )}

      {/* Grouped by departamento */}
      {sortedDepts.map(dept => {
        const isOpen = expandedDept[dept] !== false; // open by default
        return (
          <div key={dept} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button onClick={() => toggleDept(dept)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-blue-500 shrink-0"/>
                <span className="font-bold text-gray-800">{dept}</span>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{grouped[dept].length}</span>
              </div>
              {isOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
            </button>
            {isOpen && (
              <div className="divide-y divide-gray-50 border-t">
                {grouped[dept].map(p => (
                  <div key={p.id} className="px-5 py-3 flex items-start justify-between gap-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="bg-blue-100 text-blue-700 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                        {p.nombre?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{p.nombre}</p>
                        <p className="text-xs text-blue-600 font-medium">{p.cargo}</p>
                        {p.delegacion && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Building2 size={10}/>{p.delegacion}</p>}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                          {p.email && <a href={`mailto:${p.email}`} className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1"><Mail size={10}/>{p.email}</a>}
                          {p.telefono && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10}/>{p.telefono}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={14}/></button>
                      <button onClick={() => setDeleteModal(p)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* No results */}
      {!loading && personas.length > 0 && filtered.length === 0 && (
        <div className="text-center py-10 text-gray-400">No se encontraron resultados para tu búsqueda.</div>
      )}

      {/* Modal agregar/editar */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar persona' : 'Agregar persona al directorio'} size="md">
        <PersonaForm initial={editItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditItem(null); }} saving={saving}/>
      </Modal>

      {/* Modal eliminar */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Eliminar contacto" size="sm">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium">¿Eliminar a <strong>{deleteModal?.nombre}</strong>?</p>
            <p className="text-red-500 text-sm">Esta acción no se puede deshacer.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>
            <button onClick={handleDelete} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── ProcedimientosSection ─────────────────────────────────────────────────────
const PASO_EMPTY = { dirigido_a: '', anticipacion: '', condiciones: '' };

function PasoRow({ paso, idx, total, onChange, onRemove, onMove }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</div>
          <span className="text-sm font-bold text-gray-600">Paso {idx + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={idx === 0}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={14}/></button>
          <button type="button" onClick={() => onMove(1)} disabled={idx === total - 1}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={14}/></button>
          <button type="button" onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 ml-1"><Trash2 size={14}/></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><User size={10}/> Dirigido a *</label>
          <input required className="w-full border p-2 rounded-lg text-sm"
            placeholder="Ej: Coordinador de actividad, CAEDUC..."
            value={paso.dirigido_a} onChange={e => onChange('dirigido_a', e.target.value)}/>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Clock size={10}/> Anticipación requerida *</label>
          <input required className="w-full border p-2 rounded-lg text-sm"
            placeholder="Ej: 15 días antes, 48 horas antes..."
            value={paso.anticipacion} onChange={e => onChange('anticipacion', e.target.value)}/>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><AlertCircle size={10}/> Condiciones especiales (opcional)</label>
        <textarea rows={2} className="w-full border p-2 rounded-lg text-sm resize-none"
          placeholder="Ej: Requiere 3 cotizaciones comparativas, adjuntar factura, aprobación de Junta Directiva..."
          value={paso.condiciones} onChange={e => onChange('condiciones', e.target.value)}/>
      </div>
    </div>
  );
}

function ProcedimientoForm({ initial, onSave, onClose, saving }) {
  const [titulo, setTitulo] = useState(initial?.titulo || '');
  const [descripcion, setDescripcion] = useState(initial?.descripcion || '');
  const [pasos, setPasos] = useState(initial?.pasos?.length ? initial.pasos : [{ ...PASO_EMPTY }]);

  const addPaso = () => setPasos(p => [...p, { ...PASO_EMPTY }]);
  const removePaso = (idx) => setPasos(p => p.filter((_, i) => i !== idx));
  const updatePaso = (idx, field, val) => setPasos(p => p.map((paso, i) => i === idx ? { ...paso, [field]: val } : paso));
  const movePaso = (idx, dir) => {
    const n = [...pasos];
    const ni = idx + dir;
    if (ni < 0 || ni >= n.length) return;
    [n[idx], n[ni]] = [n[ni], n[idx]];
    setPasos(n);
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ titulo, descripcion, pasos }); }} className="space-y-5">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Título del procedimiento *</label>
        <input required className="w-full border p-2.5 rounded-lg"
          placeholder="Ej: Solicitud de recursos para actividad externa"
          value={titulo} onChange={e => setTitulo(e.target.value)}/>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Descripción general (opcional)</label>
        <textarea rows={2} className="w-full border p-2.5 rounded-lg resize-none"
          placeholder="Describe brevemente el objetivo del procedimiento..."
          value={descripcion} onChange={e => setDescripcion(e.target.value)}/>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-700 flex items-center gap-2"><ClipboardList size={16} className="text-blue-600"/> Pasos del procedimiento</h4>
          <button type="button" onClick={addPaso}
            className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-200 flex items-center gap-1">
            <Plus size={13}/> Agregar paso
          </button>
        </div>
        {pasos.map((paso, idx) => (
          <PasoRow key={idx} paso={paso} idx={idx} total={pasos.length}
            onChange={(f, v) => updatePaso(idx, f, v)}
            onRemove={() => removePaso(idx)}
            onMove={(d) => movePaso(idx, d)}/>
        ))}
        {pasos.length === 0 && (
          <div className="text-center py-6 text-gray-400 border-2 border-dashed rounded-xl">
            <Plus size={24} className="mx-auto mb-2"/>
            <p className="text-sm">Agrega al menos un paso</p>
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>
        <button type="submit" disabled={saving || pasos.length === 0}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={16}/> {saving ? 'Guardando...' : 'Guardar procedimiento'}
        </button>
      </div>
    </form>
  );
}

function ProcedimientosSection() {
  const [procs, setProcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchProcs = useCallback(async () => {
    setLoading(true);
    const { data: ps } = await supabase.from('procedimientos').select('*').order('created_at', { ascending: false });
    if (!ps) { setLoading(false); return; }
    const { data: pasos } = await supabase.from('procedimiento_pasos').select('*').order('orden');
    const full = ps.map(p => ({ ...p, pasos: (pasos || []).filter(s => s.procedimiento_id === p.id).sort((a, b) => a.orden - b.orden) }));
    setProcs(full);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProcs(); }, [fetchProcs]);

  const handleSave = async ({ titulo, descripcion, pasos }) => {
    setSaving(true);
    let procId;
    if (editItem) {
      await supabase.from('procedimientos').update({ titulo, descripcion }).eq('id', editItem.id);
      await supabase.from('procedimiento_pasos').delete().eq('procedimiento_id', editItem.id);
      procId = editItem.id;
    } else {
      const { data } = await supabase.from('procedimientos').insert([{ titulo, descripcion }]).select('id').single();
      procId = data?.id;
    }
    if (procId && pasos.length) {
      await supabase.from('procedimiento_pasos').insert(
        pasos.map((p, i) => ({ procedimiento_id: procId, orden: i + 1, dirigido_a: p.dirigido_a, anticipacion: p.anticipacion, condiciones: p.condiciones }))
      );
    }
    await fetchProcs();
    setShowModal(false); setEditItem(null); setSaving(false);
  };

  const handleDelete = async () => {
    await supabase.from('procedimiento_pasos').delete().eq('procedimiento_id', deleteModal.id);
    await supabase.from('procedimientos').delete().eq('id', deleteModal.id);
    await fetchProcs(); setDeleteModal(null);
  };

  const filtered = procs.filter(p => !search || p.titulo?.toLowerCase().includes(search.toLowerCase()) || p.descripcion?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><ClipboardList size={20} className="text-purple-600"/> Procedimientos Operativos</h2>
          <p className="text-sm text-gray-500">{procs.length} procedimientos registrados</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowModal(true); }}
          className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-purple-700 flex items-center gap-2 shrink-0">
          <Plus size={18}/> Nuevo procedimiento
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full border p-2.5 pl-9 rounded-xl text-sm" placeholder="Buscar procedimiento..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {!loading && procs.length === 0 && (
        <Card className="text-center py-16">
          <ClipboardList size={48} className="text-gray-200 mx-auto mb-3"/>
          <p className="text-gray-400 text-lg font-medium">Sin procedimientos</p>
          <p className="text-gray-400 text-sm mb-6">Documenta los procesos operativos de CAEDUC para estandarizar su ejecución.</p>
          <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-700 inline-flex items-center gap-2">
            <Plus size={16}/> Crear primer procedimiento
          </button>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map(proc => {
          const isOpen = !!expanded[proc.id];
          return (
            <div key={proc.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <div className="bg-purple-100 text-purple-700 w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <ClipboardList size={16}/>
                </div>
                <div className="flex-1 min-w-0">
                  <button onClick={() => setExpanded(prev => ({ ...prev, [proc.id]: !prev[proc.id] }))}
                    className="text-left w-full">
                    <p className="font-bold text-gray-800">{proc.titulo}</p>
                    {proc.descripcion && <p className="text-sm text-gray-500 mt-0.5">{proc.descripcion}</p>}
                    <p className="text-xs text-purple-600 mt-1 font-medium">{proc.pasos?.length || 0} pasos &nbsp;·&nbsp; {isOpen ? 'Ver menos ▲' : 'Ver pasos ▼'}</p>
                  </button>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditItem(proc); setShowModal(true); }}
                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Edit3 size={14}/></button>
                  <button onClick={() => setDeleteModal(proc)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                </div>
              </div>
              {isOpen && proc.pasos?.length > 0 && (
                <div className="border-t px-4 pb-4 pt-3 space-y-2">
                  {proc.pasos.map((paso, i) => (
                    <div key={paso.id || i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span className="text-xs text-gray-700 flex items-center gap-1 font-medium"><User size={11} className="text-blue-500"/>{paso.dirigido_a}</span>
                          <span className="text-xs text-gray-700 flex items-center gap-1"><Clock size={11} className="text-orange-500"/>{paso.anticipacion}</span>
                        </div>
                        {paso.condiciones && (
                          <div className="flex items-start gap-1.5 mt-1">
                            <AlertCircle size={11} className="text-amber-500 shrink-0 mt-0.5"/>
                            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1 flex-1">{paso.condiciones}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar procedimiento' : 'Nuevo procedimiento'} size="lg">
        <ProcedimientoForm initial={editItem} onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null); }} saving={saving}/>
      </Modal>

      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Eliminar procedimiento" size="sm">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium">¿Eliminar "{deleteModal?.titulo}"?</p>
            <p className="text-red-500 text-sm">Se eliminarán también todos sus pasos.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>
            <button onClick={handleDelete} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Main DirectorioView ───────────────────────────────────────────────────────
export default function DirectorioView() {
  const [activeTab, setActiveTab] = useState('directorio');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto sm:inline-flex">
        <button onClick={() => setActiveTab('directorio')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex-1 sm:flex-none justify-center ${activeTab === 'directorio' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Users size={16}/> Directorio
        </button>
        <button onClick={() => setActiveTab('procedimientos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex-1 sm:flex-none justify-center ${activeTab === 'procedimientos' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <ClipboardList size={16}/> Procedimientos
        </button>
      </div>

      {activeTab === 'directorio' && <DirectorioSection/>}
      {activeTab === 'procedimientos' && <ProcedimientosSection/>}
    </div>
  );
}
