// src/DirectorioView.jsx — Directorio, Proveedores y Procedimientos CAEDUC
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Users, Plus, Search, Edit3, Trash2, X, Save,
  Phone, Mail, MapPin, User, Building2, ChevronDown, ChevronUp,
  ClipboardList, Clock, AlertCircle, CheckCircle,
  ShoppingBag, Tag, Upload, Eye, Settings,
  FileText, RefreshCw, Filter,
  Award, GraduationCap, Printer, Download, Loader
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
);
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

const buildStorageUrl = (path, bucket) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

// ── Helpers compartidos ────────────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
// ── SECCIÓN PROVEEDORES ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── Gestión de Categorías ─────────────────────────────────────────────────────
function CategoriasManagerModal({ isOpen, onClose, categorias, onRefresh }) {
  const [newNombre, setNewNombre]       = useState('');
  const [editingId, setEditingId]       = useState(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(null);

  if (!isOpen) return null;

  const handleAdd = async (e) => {
    e.preventDefault();
    const nombre = newNombre.trim();
    if (!nombre) return;
    const existe = categorias.some(c => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) { alert('Ya existe una categoría con ese nombre.'); return; }
    setSaving(true);
    await supabase.from('proveedor_categorias').insert([{ nombre }]);
    setNewNombre('');
    await onRefresh();
    setSaving(false);
  };

  const handleEdit = async (id) => {
    const nombre = editingNombre.trim();
    if (!nombre) return;
    const existe = categorias.some(c => c.nombre.toLowerCase() === nombre.toLowerCase() && c.id !== id);
    if (existe) { alert('Ya existe una categoría con ese nombre.'); return; }
    setSaving(true);
    await supabase.from('proveedor_categorias').update({ nombre }).eq('id', id);
    setEditingId(null);
    await onRefresh();
    setSaving(false);
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`¿Eliminar la categoría "${cat.nombre}"?\nLos proveedores de esta categoría quedarán sin categoría asignada.`)) return;
    setDeleting(cat.id);
    await supabase.from('proveedor_categorias').delete().eq('id', cat.id);
    await onRefresh();
    setDeleting(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Tag size={18} className="text-emerald-600"/> Categorías de Proveedores
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Las categorías aquí definidas aparecen al crear proveedores.
            </p>
          </div>
          <button onClick={onClose}><X size={22} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Agregar nueva */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              required
              className="flex-1 border p-2.5 rounded-lg text-sm"
              placeholder="Nueva categoría (ej: Fotografía)..."
              value={newNombre}
              onChange={e => setNewNombre(e.target.value)}
            />
            <button
              type="submit"
              disabled={saving || !newNombre.trim()}
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1 text-sm shrink-0"
            >
              <Plus size={15}/> Agregar
            </button>
          </form>

          {/* Listado */}
          <div className="space-y-1.5">
            {categorias.length === 0 && (
              <p className="text-center text-gray-400 py-6 text-sm">
                Sin categorías. Agrega la primera arriba.
              </p>
            )}
            {categorias.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 border">
                <Tag size={13} className="text-emerald-500 shrink-0"/>
                {editingId === cat.id ? (
                  <input
                    className="flex-1 border p-1.5 rounded text-sm focus:ring-2 focus:ring-emerald-300 focus:outline-none"
                    value={editingNombre}
                    onChange={e => setEditingNombre(e.target.value)}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleEdit(cat.id); }
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium text-gray-700">{cat.nombre}</span>
                )}
                {editingId === cat.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(cat.id)}
                      disabled={saving}
                      className="text-emerald-500 hover:text-emerald-700 p-1"
                      title="Confirmar"
                    >
                      <CheckCircle size={15}/>
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 p-1" title="Cancelar">
                      <X size={15}/>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditingId(cat.id); setEditingNombre(cat.nombre); }}
                      className="text-gray-400 hover:text-blue-500 p-1"
                      title="Editar"
                    >
                      <Edit3 size={13}/>
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      disabled={deleting === cat.id}
                      className="text-gray-400 hover:text-red-500 p-1 disabled:opacity-40"
                      title="Eliminar"
                    >
                      <Trash2 size={13}/>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center pt-1">
            Editar con lápiz · Confirmar con ✓ · Cancelar con Esc
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Formulario de Proveedor ────────────────────────────────────────────────────
const PROVEEDOR_EMPTY = {
  nombre: '', categoria_id: '', ciudad: '',
  contacto: '', telefono: '', email: '', direccion: '', notas: ''
};

function ProveedorFormModal({ isOpen, onClose, onSave, initial, categorias, saving }) {
  const [fd, setFd] = useState(PROVEEDOR_EMPTY);

  useEffect(() => {
    if (isOpen) setFd(initial ? { ...initial } : PROVEEDOR_EMPTY);
  }, [isOpen, initial]);

  const upd = (k, v) => setFd(p => ({ ...p, [k]: v }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag size={18} className="text-emerald-600"/>
            {initial ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h3>
          <button onClick={onClose}><X size={22} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          <form onSubmit={e => { e.preventDefault(); onSave(fd); }} className="space-y-4">

            {/* Datos del proveedor */}
            <div className="bg-emerald-50 rounded-xl p-4 space-y-3 border border-emerald-100">
              <h4 className="font-bold text-emerald-800 text-sm">Datos del proveedor</h4>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre del proveedor *</label>
                <input
                  required
                  className="w-full border p-2.5 rounded-lg text-sm"
                  placeholder="Ej: Restaurante El Portal, Hotel Los Arcos, Imprenta XYZ..."
                  value={fd.nombre}
                  onChange={e => upd('nombre', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Tipo / Categoría *
                    {categorias.length === 0 && (
                      <span className="text-amber-500 font-normal ml-1">(agrega categorías primero)</span>
                    )}
                  </label>
                  <select
                    required
                    className="w-full border p-2.5 rounded-lg text-sm"
                    value={fd.categoria_id}
                    onChange={e => upd('categoria_id', e.target.value)}
                  >
                    <option value="">Seleccionar categoría...</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Ciudad</label>
                  <input
                    className="w-full border p-2.5 rounded-lg text-sm"
                    placeholder="Ej: Guatemala, Chimaltenango..."
                    value={fd.ciudad}
                    onChange={e => upd('ciudad', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
              <h4 className="font-bold text-blue-800 text-sm">Información de contacto</h4>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nombre del contacto</label>
                <input
                  className="w-full border p-2.5 rounded-lg text-sm"
                  placeholder="Persona a quien contactar..."
                  value={fd.contacto}
                  onChange={e => upd('contacto', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Teléfono</label>
                  <input
                    className="w-full border p-2.5 rounded-lg text-sm"
                    placeholder="+(502) 0000-0000"
                    value={fd.telefono}
                    onChange={e => upd('telefono', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    className="w-full border p-2.5 rounded-lg text-sm"
                    placeholder="correo@ejemplo.com"
                    value={fd.email}
                    onChange={e => upd('email', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Dirección física</label>
                <input
                  className="w-full border p-2.5 rounded-lg text-sm"
                  placeholder="Calle, colonia, zona, ciudad..."
                  value={fd.direccion}
                  onChange={e => upd('direccion', e.target.value)}
                />
              </div>
            </div>

            {/* Notas */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <label className="block text-xs font-bold text-amber-700 mb-1">
                📝 Notas (recomendaciones del menú, condiciones especiales, observaciones)
              </label>
              <textarea
                rows={3}
                className="w-full border p-2.5 rounded-lg text-sm resize-none"
                placeholder="Ej: El menú ejecutivo incluye entrada, plato fuerte y postre. Mínimo 20 personas. Recomendado el pollo en salsa verde..."
                value={fd.notas}
                onChange={e => upd('notas', e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={16}/>
                {saving ? 'Guardando...' : 'Guardar proveedor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de Proveedor ───────────────────────────────────────────────────────
function ProveedorCard({ proveedor, categorias, onEdit, onDelete, onMenuUpload, onMenuDelete }) {
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const fileInputRef = useRef(null);

  const categoria = categorias.find(c => c.id === proveedor.categoria_id);
  const menuUrl   = proveedor.menu_path
    ? buildStorageUrl(proveedor.menu_path, 'proveedores-menus')
    : null;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const esImagen = file.type.startsWith('image/');
    const esPdf    = file.type === 'application/pdf';
    if (!esImagen && !esPdf) {
      setUploadMsg({ type: 'error', text: 'Solo PDF o imagen (JPG, PNG, etc.)' });
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    const ok = await onMenuUpload(proveedor, file);
    setUploading(false);
    if (!ok) setUploadMsg({ type: 'error', text: 'Error al subir el archivo.' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isPdf   = proveedor.menu_type === 'pdf';
  const isImage = proveedor.menu_type === 'image';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">

      {/* Cuerpo */}
      <div className="p-4 flex-1 space-y-3">

        {/* Header: categoría + ciudad + acciones */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {categoria ? (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {categoria.nombre}
                </span>
              ) : (
                <span className="bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                  Sin categoría
                </span>
              )}
              {proveedor.ciudad && (
                <span className="text-xs text-gray-500 flex items-center gap-0.5">
                  <MapPin size={10}/>{proveedor.ciudad}
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-800 text-base leading-snug">{proveedor.nombre}</h3>
          </div>
          <div className="flex gap-1 shrink-0 mt-0.5">
            <button
              onClick={() => onEdit(proveedor)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit3 size={13}/>
            </button>
            <button
              onClick={() => onDelete(proveedor)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 size={13}/>
            </button>
          </div>
        </div>

        {/* Datos de contacto */}
        <div className="space-y-1">
          {proveedor.contacto && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <User size={11} className="text-gray-400 shrink-0"/>
              <span>{proveedor.contacto}</span>
            </div>
          )}
          {proveedor.telefono && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Phone size={11} className="text-gray-400 shrink-0"/>
              <a href={`tel:${proveedor.telefono}`} className="hover:text-blue-600 transition-colors">
                {proveedor.telefono}
              </a>
            </div>
          )}
          {proveedor.email && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Mail size={11} className="text-gray-400 shrink-0"/>
              <a href={`mailto:${proveedor.email}`} className="hover:text-blue-600 transition-colors truncate">
                {proveedor.email}
              </a>
            </div>
          )}
          {proveedor.direccion && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <MapPin size={11} className="text-gray-400 shrink-0 mt-0.5"/>
              <span className="leading-relaxed">{proveedor.direccion}</span>
            </div>
          )}
        </div>

        {/* Notas */}
        {proveedor.notas && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-800 leading-relaxed">{proveedor.notas}</p>
          </div>
        )}

        {/* Mensaje de error upload */}
        {uploadMsg && (
          <div className={`text-xs rounded-lg px-3 py-1.5 ${
            uploadMsg.type === 'error'
              ? 'bg-red-50 text-red-600 border border-red-100'
              : 'bg-green-50 text-green-600 border border-green-100'
          }`}>
            {uploadMsg.text}
          </div>
        )}
      </div>

      {/* Sección de menú / cotización */}
      <div className="border-t bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">

          {/* Indicador de archivo */}
          <div className="flex items-center gap-1.5">
            <FileText
              size={14}
              className={proveedor.menu_path ? (isPdf ? 'text-red-500' : 'text-purple-500') : 'text-gray-300'}
            />
            <span className="text-xs font-semibold text-gray-600">
              {proveedor.menu_path
                ? (isPdf ? 'Menú / Cotización PDF' : 'Menú / Imagen')
                : 'Menú / Cotización'}
            </span>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-1.5 flex-wrap">
            {proveedor.menu_path ? (
              <>
                {/* Ver — abre en nueva pestaña */}
                <a
                  href={menuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1 transition-colors"
                  title="Ver menú / cotización"
                >
                  <Eye size={11}/> Ver
                </a>

                {/* Actualizar */}
                <label
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    uploading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                  title="Reemplazar menú / cotización"
                >
                  <Upload size={11}/>
                  {uploading ? '...' : 'Actualizar'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>

                {/* Borrar */}
                <button
                  onClick={() => onMenuDelete(proveedor)}
                  className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200 flex items-center gap-1 transition-colors"
                  title="Eliminar menú / cotización"
                >
                  <Trash2 size={11}/> Borrar
                </button>
              </>
            ) : (
              /* Cargar (primer archivo) */
              <label
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  uploading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
                title="Cargar menú / cotización"
              >
                <Upload size={11}/>
                {uploading ? 'Cargando...' : 'Cargar menú'}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sección principal Proveedores ─────────────────────────────────────────────
function ProveedoresSection() {
  const [proveedores, setProveedores]           = useState([]);
  const [categorias, setCategorias]             = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [showForm, setShowForm]                 = useState(false);
  const [editItem, setEditItem]                 = useState(null);
  const [deleteModal, setDeleteModal]           = useState(null);
  const [showCategoriasManager, setShowCategoriasManager] = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [searchCategoria, setSearchCategoria]   = useState('');
  const [searchCiudad, setSearchCiudad]         = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: provs }, { data: cats }] = await Promise.all([
      supabase.from('proveedores').select('*').order('nombre'),
      supabase.from('proveedor_categorias').select('*').order('nombre'),
    ]);
    if (provs) setProveedores(provs);
    if (cats)  setCategorias(cats);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── CRUD proveedores ──────────────────────────────────────────────────────
  const handleSave = async (fd) => {
    setSaving(true);
    const { id, menu_path, menu_type, created_at, updated_at, ...cleanData } = fd;
    if (id) {
      await supabase.from('proveedores')
        .update({ ...cleanData, updated_at: new Date().toISOString() })
        .eq('id', id);
    } else {
      await supabase.from('proveedores').insert([cleanData]);
    }
    await fetchAll();
    setShowForm(false);
    setEditItem(null);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    if (deleteModal.menu_path) {
      await supabase.storage.from('proveedores-menus').remove([deleteModal.menu_path]);
    }
    await supabase.from('proveedores').delete().eq('id', deleteModal.id);
    await fetchAll();
    setDeleteModal(null);
  };

  // ── Gestión de menú / archivo ─────────────────────────────────────────────
  const handleMenuUpload = async (proveedor, file) => {
    const esImagen = file.type.startsWith('image/');
    const esPdf    = file.type === 'application/pdf';
    if (!esImagen && !esPdf) return false;

    // Eliminar archivo previo si existe
    if (proveedor.menu_path) {
      await supabase.storage.from('proveedores-menus').remove([proveedor.menu_path]);
    }

    const ext  = file.name.split('.').pop();
    const path = `proveedor_${proveedor.id}_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('proveedores-menus')
      .upload(path, file, { upsert: true });

    if (error) { console.error(error); return false; }

    await supabase.from('proveedores').update({
      menu_path: data.path,
      menu_type: esImagen ? 'image' : 'pdf',
      updated_at: new Date().toISOString(),
    }).eq('id', proveedor.id);

    await fetchAll();
    return true;
  };

  const handleMenuDelete = async (proveedor) => {
    if (!window.confirm('¿Eliminar el menú/cotización de este proveedor?')) return;
    if (proveedor.menu_path) {
      await supabase.storage.from('proveedores-menus').remove([proveedor.menu_path]);
    }
    await supabase.from('proveedores').update({
      menu_path: null,
      menu_type: null,
      updated_at: new Date().toISOString(),
    }).eq('id', proveedor.id);
    await fetchAll();
  };

  // ── Filtrado dinámico ─────────────────────────────────────────────────────
  const filtered = proveedores.filter(p => {
    const cat       = categorias.find(c => c.id === p.categoria_id);
    const catNombre = cat?.nombre || '';
    const matchCat   = !searchCategoria ||
      catNombre.toLowerCase().includes(searchCategoria.toLowerCase());
    const matchCiudad = !searchCiudad ||
      (p.ciudad || '').toLowerCase().includes(searchCiudad.toLowerCase());
    return matchCat && matchCiudad;
  });

  const hayFiltros = searchCategoria || searchCiudad;
  const conMenu    = proveedores.filter(p => p.menu_path).length;
  const ciudades   = [...new Set(proveedores.map(p => p.ciudad).filter(Boolean))].length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag size={20} className="text-emerald-600"/>
            Directorio de Proveedores
          </h2>
          <p className="text-sm text-gray-500">
            {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} · {conMenu} con menú/cotización
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoriasManager(true)}
            className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-xl font-bold hover:bg-gray-200 flex items-center gap-2 text-sm border border-gray-200"
          >
            <Settings size={15}/> Categorías
          </button>
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus size={18}/> Nuevo proveedor
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {proveedores.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-emerald-600">{proveedores.length}</p>
            <p className="text-xs text-emerald-700 font-medium">Proveedores</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-blue-600">{categorias.length}</p>
            <p className="text-xs text-blue-700 font-medium">Categorías</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-purple-600">{ciudades}</p>
            <p className="text-xs text-purple-700 font-medium">Ciudades</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-amber-600">{conMenu}</p>
            <p className="text-xs text-amber-700 font-medium">Con menú / PDF</p>
          </div>
        </div>
      )}

      {/* Filtros dinámicos */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input
            className="w-full border p-2.5 pl-9 rounded-xl text-sm"
            placeholder="Filtrar por tipo de proveedor..."
            value={searchCategoria}
            onChange={e => setSearchCategoria(e.target.value)}
          />
        </div>
        <div className="relative flex-1">
          <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input
            className="w-full border p-2.5 pl-9 rounded-xl text-sm"
            placeholder="Filtrar por ciudad..."
            value={searchCiudad}
            onChange={e => setSearchCiudad(e.target.value)}
          />
        </div>
        {hayFiltros && (
          <button
            onClick={() => { setSearchCategoria(''); setSearchCiudad(''); }}
            className="text-xs text-red-500 hover:text-red-700 underline px-2 whitespace-nowrap self-center"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Contador de resultados al filtrar */}
      {hayFiltros && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <Filter size={11}/>
          Mostrando {filtered.length} de {proveedores.length} proveedores
        </p>
      )}

      {/* Estado vacío — sin proveedores */}
      {!loading && proveedores.length === 0 && (
        <div className="bg-white rounded-xl border text-center py-16">
          <ShoppingBag size={48} className="text-gray-200 mx-auto mb-3"/>
          <p className="text-gray-400 text-lg font-medium">Sin proveedores registrados</p>
          <p className="text-gray-400 text-sm mb-6">
            Agrega proveedores para gestionar tu directorio de contactos, menús y cotizaciones.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 inline-flex items-center gap-2"
          >
            <Plus size={16}/> Agregar primer proveedor
          </button>
        </div>
      )}

      {/* Sin resultados después de filtrar */}
      {!loading && proveedores.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <Search size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="font-medium">Sin resultados para los filtros aplicados</p>
          <p className="text-sm mt-1">Prueba con otro tipo de proveedor o ciudad.</p>
        </div>
      )}

      {/* Grid de tarjetas */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={28} className="text-emerald-500 animate-spin"/>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProveedorCard
              key={p.id}
              proveedor={p}
              categorias={categorias}
              onEdit={item => { setEditItem(item); setShowForm(true); }}
              onDelete={setDeleteModal}
              onMenuUpload={handleMenuUpload}
              onMenuDelete={handleMenuDelete}
            />
          ))}
        </div>
      )}

      {/* Modal formulario */}
      <ProveedorFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        onSave={handleSave}
        initial={editItem}
        categorias={categorias}
        saving={saving}
      />

      {/* Modal eliminar */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">Eliminar proveedor</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
              <p className="text-red-700 font-medium">
                ¿Eliminar a <strong>{deleteModal.nombre}</strong>?
              </p>
              {deleteModal.menu_path && (
                <p className="text-red-500 text-sm">
                  También se eliminará el menú/cotización adjunto.
                </p>
              )}
              <p className="text-red-400 text-xs">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestión de categorías */}
      <CategoriasManagerModal
        isOpen={showCategoriasManager}
        onClose={() => setShowCategoriasManager(false)}
        categorias={categorias}
        onRefresh={fetchAll}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── SECCIÓN DIRECTORIO (sin cambios) ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const PersonaForm = ({ initial, onSave, onClose, saving }) => {
  const PERSONA_EMPTY = { nombre:'', cargo:'', email:'', telefono:'', departamento:'', delegacion:'' };
  const [fd, setFd] = useState(initial || PERSONA_EMPTY);
  const upd = (k, v) => setFd(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(fd); }} className="space-y-4">
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
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={16}/> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

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

  const filtered = personas.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.nombre?.toLowerCase().includes(q) || p.cargo?.toLowerCase().includes(q) ||
      p.departamento?.toLowerCase().includes(q) || p.delegacion?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
    const matchDept = !filterDept || p.departamento === filterDept;
    return matchSearch && matchDept;
  });

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
      {sortedDepts.map(dept => {
        const isOpen = expandedDept[dept] !== false;
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
                      <button onClick={() => { setEditItem(p); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={14}/></button>
                      <button onClick={() => setDeleteModal(p)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {!loading && personas.length > 0 && filtered.length === 0 && (
        <div className="text-center py-10 text-gray-400">No se encontraron resultados para tu búsqueda.</div>
      )}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar persona' : 'Agregar persona al directorio'} size="md">
        <PersonaForm initial={editItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditItem(null); }} saving={saving}/>
      </Modal>
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

// ══════════════════════════════════════════════════════════════════════════════
// ── SECCIÓN PROCEDIMIENTOS (sin cambios) ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

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
          placeholder="Ej: Requiere 3 cotizaciones comparativas, adjuntar factura..."
          value={paso.condiciones} onChange={e => onChange('condiciones', e.target.value)}/>
      </div>
    </div>
  );
}

function ProcedimientoForm({ initial, onSave, onClose, saving }) {
  const [titulo, setTitulo] = useState(initial?.titulo || '');
  const [descripcion, setDescripcion] = useState(initial?.descripcion || '');
  const [pasos, setPasos] = useState(initial?.pasos?.length ? initial.pasos : [{ ...PASO_EMPTY }]);

  const addPaso    = () => setPasos(p => [...p, { ...PASO_EMPTY }]);
  const removePaso = (idx) => setPasos(p => p.filter((_, i) => i !== idx));
  const updatePaso = (idx, field, val) => setPasos(p => p.map((paso, i) => i === idx ? { ...paso, [field]: val } : paso));
  const movePaso   = (idx, dir) => {
    const n = [...pasos]; const ni = idx + dir;
    if (ni < 0 || ni >= n.length) return;
    [n[idx], n[ni]] = [n[ni], n[idx]]; setPasos(n);
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
                  <button onClick={() => setExpanded(prev => ({ ...prev, [proc.id]: !prev[proc.id] }))} className="text-left w-full">
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

// ══════════════════════════════════════════════════════════════════════════════
// ── TARIFARIO DE HONORARIOS ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const TARIFAS_DEFAULT = [
  { grado: 'Licenciatura',    monto: 2000 },
  { grado: 'Maestría',        monto: 2500 },
  { grado: 'Doctorado',       monto: 3000 },
  { grado: 'Post Doctorado',  monto: 3500 },
];

const parseTarifas = (value) => {
  if (!value) return TARIFAS_DEFAULT;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed) || !parsed.length) return TARIFAS_DEFAULT;
    return parsed.map(item => ({ grado: String(item.grado || ''), monto: Number(item.monto || 0) }));
  } catch {
    return TARIFAS_DEFAULT;
  }
};

const fmtQ = (n) => 'Q. ' + n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fechaLarga = (iso) => {
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = iso ? new Date(iso + 'T12:00:00') : new Date();
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
};

// html2pdf cargado desde CDN bajo demanda (mismo patrón que las cartas)
const loadHtml2Pdf = () => new Promise((resolve, reject) => {
  if (window.html2pdf) return resolve(window.html2pdf);
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
  s.onload = () => resolve(window.html2pdf);
  s.onerror = () => reject(new Error('No se pudo cargar el generador de PDF.'));
  document.body.appendChild(s);
});

const generateTarifarioHTML = (settings = {}, tarifas = TARIFAS_DEFAULT) => {
  const f1Name     = settings.firmante1_nombre     || 'M. A. Juan J. Reyes';
  const f1Cargo    = settings.firmante1_cargo      || 'Coordinador';
  const f1Inst     = settings.firmante1_institucion || 'Comisión de Acreditación y Educación Continua, Colegio de Psicólogos de Guatemala';
  const f1FirmaUrl = buildStorageUrl(settings.firmante1_firma_path, 'firmas-sellos');
  const selloUrl   = buildStorageUrl(settings.sello_path, 'firmas-sellos');
  const membreteUrl = settings.membrete_path
    ? buildStorageUrl(settings.membrete_path, 'firmas-sellos')
    : '/fondo-oficios.jpg';
  const instLines = f1Inst.split(',').map(s => s.trim()).filter(Boolean);

  const filas = tarifas.map((t, i) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">
      <td style="padding:11px 18px;font-size:12px;color:#1f2937;border-bottom:1px solid #e5e7eb;">${t.grado}</td>
      <td style="padding:11px 18px;font-size:12px;font-weight:700;color:#1a5276;text-align:right;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${fmtQ(t.monto)}</td>
    </tr>`).join('');

  const tablaHTML = `
    <table style="width:100%;border-collapse:collapse;margin:18px 0;border:1px solid #d1d5db;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#1a5276;color:#ffffff;">
          <th style="padding:11px 18px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:0.04em;">Grado académico</th>
          <th style="padding:11px 18px;font-size:11px;text-align:right;text-transform:uppercase;letter-spacing:0.04em;">Honorario</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>`;

  const firmaBlock = `
    <div style="margin-top:30px;text-align:center;">
      <p style="font-size:11.5px;margin-bottom:20px;">Atentamente,</p>
      <div style="display:inline-flex;align-items:flex-end;justify-content:center;gap:28px;">
        ${f1FirmaUrl ? `
          <div style="text-align:center;">
            <img src="${f1FirmaUrl}" alt="Firma" style="height:55px;width:auto;display:block;margin:0 auto -4px;"/>
            <div style="width:210px;border-top:1.5px solid #333;padding-top:5px;">
              <div style="font-size:11.5px;font-weight:700;">${f1Name}</div>
              <div style="font-size:10.5px;color:#555;">${f1Cargo}</div>
              ${instLines.map(l => `<div style="font-size:10px;color:#666;">${l}</div>`).join('')}
            </div>
          </div>` : ''}
        ${selloUrl ? `
          <div style="text-align:center;margin-bottom:6px;">
            <img src="${selloUrl}" alt="Sello" style="height:82px;width:auto;opacity:0.88;"/>
          </div>` : ''}
      </div>
    </div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Tarifario de Honorarios — CAEDUC</title>
    <style>
      @page{size:letter;margin:0;}
      *{margin:0;padding:0;box-sizing:border-box;}
      body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    </style>
  </head><body>
    <div class="carta-page" style="position:relative;width:8.5in;height:11in;font-family:'Segoe UI',Arial,sans-serif;color:#333;overflow:hidden;">
      <img src="${membreteUrl}" alt="" style="position:absolute;top:0;left:0;width:8.5in;height:11in;object-fit:cover;z-index:0;pointer-events:none;"/>
      <div style="position:relative;z-index:1;padding:1.35in 0.75in 1.9in 0.9in;height:11in;box-sizing:border-box;display:flex;flex-direction:column;">
        <div style="flex:1;">
          <div style="text-align:right;margin-bottom:20px;">
            <div style="font-size:11.5px;color:#555;">Guatemala, ${fechaLarga()}</div>
          </div>
          <div style="margin-bottom:18px;font-size:11.5px;line-height:1.7;">
            <strong>A quien corresponda:</strong>
          </div>
          <p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 12px;">
            Reciba un cordial saludo de parte de la <strong>Comisión de Acreditación y Educación Continua —CAEDUC—</strong> del Colegio de Psicólogos de Guatemala.
          </p>
          <p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 12px;">
            Por este medio, la Comisión de Acreditación y Educación Continua (CAEDUC) ha resuelto definir un tarifario que contemple el pago de honorarios a ponentes y conferencistas de forma clara y sin sesgos de ninguna clase, atendiendo únicamente al logro académico y a la dignificación profesional de acuerdo con su recorrido académico, quedando establecido de la siguiente manera:
          </p>
          ${tablaHTML}
          <p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 12px;">
            Los montos descritos corresponden al honorario por su participación en las distintas actividades académicas organizadas por la Comisión, y se aplicarán de manera uniforme conforme al grado académico debidamente acreditado del profesional.
          </p>
          <p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 12px;">
            Sin otro particular, me suscribo de usted con muestras de alta estima y consideración, quedando a su entera disposición para cualquier información o detalle adicional que requiera.
          </p>
          ${firmaBlock}
        </div>
      </div>
    </div>
  </body></html>`;
};

const downloadTarifarioPDF = async (settings, tarifas) => {
  const html2pdf = await loadHtml2Pdf();
  const html = generateTarifarioHTML(settings, tarifas);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:-9999px;top:0;width:8.5in;height:11in;border:0;';
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    await new Promise(r => setTimeout(r, 300));
    const imgs = Array.from(doc.images || []);
    await Promise.all(imgs.map(img => img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise(res => { img.onload = res; img.onerror = res; setTimeout(res, 4000); })));
    const target = doc.querySelector('.carta-page') || doc.body;
    await html2pdf().set({
      margin: 0,
      filename: 'Tarifario de Honorarios - CAEDUC.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    }).from(target).save();
  } finally {
    document.body.removeChild(iframe);
  }
};

const previewTarifario = (settings, tarifas) => {
  const url = URL.createObjectURL(new Blob([generateTarifarioHTML(settings, tarifas)], { type: 'text/html' }));
  const w = window.open(url, '_blank');
  if (!w) { URL.revokeObjectURL(url); alert('Permite las ventanas emergentes para ver la vista previa.'); return; }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// ── MODELO DE FACTURA ─────────────────────────────────────────────────────────
const NIT_COLEGIO = '55273092';
const NOMBRE_COLEGIO = 'COLEGIO DE PSICÓLOGOS DE GUATEMALA';

const montoFactura = (monto) => {
  const numero = String(monto || '').match(/\d[\d,]*(?:\.\d+)?/);
  const valor = Number((numero?.[0] || '').replace(/,/g, ''));
  return Number.isFinite(valor) && valor > 0 ? fmtQ(valor) : 'No indicado en el oficio';
};

const horaDesdeActividad = (oficio) => {
  if (oficio?.actividad_hora) return `${oficio.actividad_hora}hrs.`;
  const texto = `${oficio?.actividad_descripcion || ''} ${oficio?.actividad_fecha || ''}`;
  const match = texto.match(/a\s+las\s+(\d{1,2})(?::(\d{2}))?\s*(?:horas?|hrs?\.?|h)?/i);
  if (!match) return 'hora indicada en el oficio';
  return `${String(match[1]).padStart(2, '0')}:${match[2] || '00'}hrs.`;
};

const conceptoFactura = (oficio) => {
  if (!oficio) return '';
  const tipo = (oficio.actividad_tipo || 'actividad').trim().toLowerCase();
  const nombre = (oficio.actividad_nombre || 'sin nombre').trim().replace(/[.]+$/, '');
  const fecha = (oficio.actividad_fecha || 'fecha indicada en el oficio').trim();
  return `Por ${tipo} ${nombre} el ${fecha} a las ${horaDesdeActividad(oficio)}`;
};

const generateFacturaHTML = (oficio, fechaFactura) => `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Modelo de factura — ${oficio.numero_oficio}</title>
  <style>@page{size:letter;margin:0.65in;}*{box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;}</style>
</head><body>
  <main style="border:1.5px solid #cbd5e1;border-radius:14px;padding:38px 42px;min-height:8.8in;">
    <div style="border-bottom:2px solid #1a5276;padding-bottom:20px;margin-bottom:30px;">
      <p style="margin:0;color:#1a5276;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">Comisión de Acreditación y Educación Continua</p>
      <h1 style="margin:6px 0 0;font-size:25px;color:#172554;">Modelo de factura</h1>
      <p style="margin:7px 0 0;color:#64748b;font-size:12px;">Referencia: ${oficio.numero_oficio || 'Oficio CAEDUC'}</p>
    </div>
    <section style="font-size:14px;line-height:1.7;">
      <div style="margin-bottom:19px;"><strong>NIT:</strong> ${NIT_COLEGIO}</div>
      <div style="margin-bottom:19px;"><strong>A nombre de:</strong> ${NOMBRE_COLEGIO}</div>
      <div style="margin-bottom:19px;"><strong>Fecha:</strong> ${fechaLarga(fechaFactura)}</div>
      <div style="margin-bottom:19px;"><strong>Concepto:</strong><p style="margin:7px 0 0;padding:14px 16px;background:#f8fafc;border-left:4px solid #1a5276;border-radius:4px;line-height:1.7;">${conceptoFactura(oficio)}</p></div>
      <div><strong>Monto:</strong> <span style="font-size:18px;font-weight:800;color:#166534;">${montoFactura(oficio.monto)}</span></div>
    </section>
    <p style="margin:52px 0 0;color:#64748b;font-size:10.5px;line-height:1.6;">Este modelo sirve como guía para emitir la factura correspondiente a la actividad autorizada mediante el oficio indicado.</p>
  </main>
</body></html>`;

const downloadFacturaPDF = async (oficio, fechaFactura) => {
  const html2pdf = await loadHtml2Pdf();
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:-9999px;top:0;width:8.5in;height:11in;border:0;';
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open(); doc.write(generateFacturaHTML(oficio, fechaFactura)); doc.close();
    await new Promise(resolve => setTimeout(resolve, 150));
    await html2pdf().set({
      margin: 0,
      filename: `Modelo de factura - ${(oficio.numero_oficio || 'CAEDUC').replace(/[^a-z0-9.-]+/gi, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    }).from(doc.body).save();
  } finally {
    document.body.removeChild(iframe);
  }
};

function ModeloFacturaSection() {
  const [oficios, setOficios] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [fechaFactura, setFechaFactura] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.from('oficios').select('id,numero_oficio,actividad_nombre,actividad_tipo,actividad_fecha,actividad_hora,actividad_descripcion,monto,estado')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) { alert(`No se pudieron cargar los oficios: ${error.message}`); }
        const conActividad = (data || []).filter(o => o.actividad_nombre);
        setOficios(conActividad);
        if (conActividad.length) setSelectedId(conActividad[0].id);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const oficio = oficios.find(item => item.id === selectedId);

  const handleDownload = async () => {
    if (!oficio) return;
    setPdfLoading(true);
    try { await downloadFacturaPDF(oficio, fechaFactura); }
    catch (err) { alert(`No se pudo generar el modelo: ${err?.message || err}`); }
    setPdfLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText size={20} className="text-emerald-600"/> Modelo de facturación</h2>
        <p className="text-sm text-gray-500">Selecciona la actividad del oficio y revisa el modelo antes de descargarlo.</p>
      </div>

      <Card className="max-w-3xl">
        <label className="block text-sm font-bold text-gray-700 mb-2">Actividad autorizada mediante oficio</label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} disabled={loading || !oficios.length}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50">
          {loading && <option>Cargando oficios...</option>}
          {!loading && !oficios.length && <option>No hay oficios de actividades disponibles</option>}
          {oficios.map(item => <option key={item.id} value={item.id}>{item.numero_oficio} — {item.actividad_nombre}{item.estado === 'Borrador' ? ' (Borrador)' : ''}</option>)}
        </select>
        <p className="text-xs text-gray-500 mt-2">Se incluyen también los oficios en borrador que tienen una actividad registrada.</p>
      </Card>

      <Card className="max-w-3xl">
        <label className="block text-sm font-bold text-gray-700 mb-2">Fecha de la factura</label>
        <input type="date" value={fechaFactura} onChange={e => setFechaFactura(e.target.value)}
          className="w-full sm:w-auto border border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        <p className="text-xs text-gray-400 mt-2">Inicia con la fecha de hoy. Puedes ajustarla antes de descargar el modelo.</p>
      </Card>

      {oficio && <div className="max-w-3xl space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
            <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest">Vista previa</p>
            <h3 className="text-white text-xl font-black mt-1">Modelo de factura</h3>
            <p className="text-slate-300 text-sm mt-1">{oficio.numero_oficio} · {oficio.actividad_nombre}</p>
          </div>
          <div className="p-6 sm:p-8 text-sm text-gray-700 space-y-4">
            <p><span className="font-bold text-gray-900">NIT:</span> {NIT_COLEGIO}</p>
            <p><span className="font-bold text-gray-900">A nombre de:</span> {NOMBRE_COLEGIO}</p>
            <p><span className="font-bold text-gray-900">Fecha:</span> {fechaLarga(fechaFactura)}</p>
            <div><span className="font-bold text-gray-900">Concepto:</span><p className="mt-2 bg-slate-50 border-l-4 border-emerald-600 rounded-r-lg px-4 py-3 leading-6">{conceptoFactura(oficio)}</p></div>
            <p><span className="font-bold text-gray-900">Monto:</span> <span className="font-black text-emerald-700 text-base">{montoFactura(oficio.monto)}</span></p>
          </div>
        </div>
        <button onClick={handleDownload} disabled={pdfLoading}
          className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
          {pdfLoading ? <Loader size={17} className="animate-spin"/> : <Download size={17}/>} {pdfLoading ? 'Generando...' : 'Descargar modelo de factura'}
        </button>
      </div>}
    </div>
  );
}

function TarifarioSection() {
  const [settings, setSettings] = useState({});
  const [tarifas, setTarifas] = useState(TARIFAS_DEFAULT);
  const [draftTarifas, setDraftTarifas] = useState(TARIFAS_DEFAULT);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    supabase.from('app_settings').select('key, value').then(({ data }) => {
      if (data) {
        const m = {};
        data.forEach(r => { m[r.key] = r.value; });
        const savedTarifas = parseTarifas(m.honorarios_tarifario);
        setSettings(m);
        setTarifas(savedTarifas);
        setDraftTarifas(savedTarifas);
      }
    });
  }, []);

  const handleDownload = async () => {
    setPdfLoading(true);
    try { await downloadTarifarioPDF(settings, tarifas); }
    catch (err) { alert('No se pudo generar el PDF: ' + (err?.message || err)); }
    setPdfLoading(false);
  };

  const handleSaveTarifas = async () => {
    const clean = draftTarifas
      .map(item => ({ grado: item.grado.trim(), monto: Number(item.monto) }))
      .filter(item => item.grado);
    if (!clean.length || clean.some(item => !Number.isFinite(item.monto) || item.monto <= 0)) {
      setFeedback('Cada grado debe tener un nombre y un valor mayor que cero.');
      return;
    }
    setSaving(true);
    setFeedback('');
    const value = JSON.stringify(clean);
    const { error } = await supabase.from('app_settings').upsert(
      { key: 'honorarios_tarifario', value, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
    if (error) setFeedback(`No se pudieron guardar los valores: ${error.message}`);
    else {
      setTarifas(clean);
      setDraftTarifas(clean);
      setSettings(current => ({ ...current, honorarios_tarifario: value }));
      setEditing(false);
      setFeedback('Tarifario actualizado.');
    }
    setSaving(false);
  };

  const handleOficioUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFeedback('Selecciona un archivo PDF.');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setFeedback('El PDF debe pesar 6 MB o menos para una carga confiable.');
      return;
    }
    setUploading(true);
    setFeedback('');
    const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const path = `tarifario/${Date.now()}_${safeName}`;
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from('avales-files')
      .upload(path, file, { upsert: false, cacheControl: '3600', contentType: 'application/pdf' });
    if (uploadError) {
      setFeedback(`No se pudo cargar el oficio: ${uploadError.message}`);
      setUploading(false);
      return;
    }
    const newPath = uploaded?.path || path;
    const oldPath = settings.tarifario_oficio_path;
    const { error: settingError } = await supabase.from('app_settings').upsert(
      { key: 'tarifario_oficio_path', value: newPath, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
    if (settingError) {
      await supabase.storage.from('avales-files').remove([newPath]);
      setFeedback(`El PDF se cargó, pero no pudo asociarse al tarifario: ${settingError.message}`);
    } else {
      setSettings(current => ({ ...current, tarifario_oficio_path: newPath }));
      if (oldPath && oldPath !== newPath) await supabase.storage.from('avales-files').remove([oldPath]);
      setFeedback(oldPath ? 'Oficio PDF reemplazado.' : 'Oficio PDF adjuntado.');
    }
    setUploading(false);
  };

  const handleOficioDownload = async () => {
    const path = settings.tarifario_oficio_path;
    if (!path) return;
    const { data, error } = await supabase.storage.from('avales-files').download(path);
    if (error) {
      setFeedback(`No se pudo descargar el oficio: ${error.message}`);
      return;
    }
    const url = URL.createObjectURL(data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = path.split('/').pop() || 'Oficio_tarifario_CAEDUC.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const oficioUrl = buildStorageUrl(settings.tarifario_oficio_path, 'avales-files');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Award size={20} className="text-amber-500"/> Tarifario de Honorarios
          </h2>
          <p className="text-sm text-gray-500">Pago a ponentes y conferencistas según grado académico</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button onClick={() => { setDraftTarifas(tarifas); setEditing(true); setFeedback(''); }}
            className="bg-amber-100 text-amber-800 px-4 py-2.5 rounded-xl font-bold hover:bg-amber-200 flex items-center gap-2">
            <Edit3 size={16}/> Editar valores
          </button>
          <button onClick={() => previewTarifario(settings, tarifas)}
            className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-200 flex items-center gap-2">
            <Eye size={16}/> Vista previa
          </button>
          <button onClick={handleDownload} disabled={pdfLoading}
            className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
            {pdfLoading ? <Loader size={16} className="animate-spin"/> : <Printer size={16}/>}
            {pdfLoading ? 'Generando...' : 'Imprimir tarifario'}
          </button>
        </div>
      </div>

      {feedback && <div role="status" className="max-w-2xl mx-auto rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{feedback}</div>}

      <div className="max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-center">
            <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">Comisión de Acreditación y Educación Continua</p>
            <h3 className="text-white text-2xl font-black mt-1">Tarifario de Honorarios</h3>
            <p className="text-slate-300 text-xs mt-1">Ponentes y conferencistas · por actividad académica</p>
          </div>
          <div className="divide-y divide-gray-100">
            {tarifas.map((t, i) => (
              <div key={`${t.grado}-${i}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <GraduationCap size={18} className="text-purple-600"/>
                  </div>
                  <span className="font-semibold text-gray-800">{t.grado}</span>
                </div>
                <span className="text-lg font-black text-slate-700 tabular-nums">{fmtQ(t.monto)}</span>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 px-6 py-3 text-center">
            <p className="text-xs text-gray-400">Montos uniformes según grado académico acreditado · sin sesgos</p>
          </div>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-slate-800"><FileText size={18} className="text-blue-600"/> Oficio enviado a Junta Directiva</h3>
            <p className="mt-1 text-xs text-slate-500">Adjunta el PDF que respalda este tarifario. Podrás verlo, descargarlo o reemplazarlo.</p>
          </div>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
            <Upload size={16}/> {uploading ? 'Cargando...' : oficioUrl ? 'Reemplazar PDF' : 'Adjuntar PDF'}
            <input type="file" accept="application/pdf,.pdf" disabled={uploading} onChange={handleOficioUpload} className="sr-only"/>
          </label>
        </div>
        {oficioUrl ? (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-emerald-900">Oficio PDF disponible</p>
              <p className="text-xs text-emerald-700">Documento vigente asociado al tarifario.</p>
            </div>
            <a href={oficioUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"><Eye size={16}/> Ver</a>
            <button type="button" onClick={handleOficioDownload} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"><Download size={16}/> Descargar</button>
          </div>
        ) : <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Aún no hay un oficio PDF adjunto.</p>}
      </Card>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Editar valores del tarifario" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Modifica los montos, elimina grados o agrega los que necesites.</p>
          {draftTarifas.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
              <div>
                <label className="block text-sm font-bold text-slate-700">Grado académico</label>
                <input value={item.grado} onChange={event => setDraftTarifas(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, grado: event.target.value } : row))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700">Valor (Q)</label>
                <input type="number" min="0.01" step="0.01" inputMode="decimal" value={item.monto} onChange={event => setDraftTarifas(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, monto: event.target.value } : row))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2"/>
              </div>
              <button type="button" aria-label={`Eliminar ${item.grado || `grado ${index + 1}`}`} onClick={() => setDraftTarifas(current => current.filter((_, rowIndex) => rowIndex !== index))} disabled={draftTarifas.length === 1} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 size={18}/></button>
            </div>
          ))}
          <button type="button" onClick={() => setDraftTarifas(current => [...current, { grado: '', monto: '' }])} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"><Plus size={16}/> Agregar grado</button>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
            <button type="button" onClick={handleSaveTarifas} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Save size={16}/>{saving ? 'Guardando...' : 'Guardar valores'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

export default function DirectorioView() {
  const [activeTab, setActiveTab] = useState('directorio');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto sm:inline-flex">
        <button
          onClick={() => setActiveTab('directorio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex-1 sm:flex-none justify-center ${
            activeTab === 'directorio' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={15}/> Directorio
        </button>
        <button
          onClick={() => setActiveTab('proveedores')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex-1 sm:flex-none justify-center ${
            activeTab === 'proveedores' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingBag size={15}/> Proveedores
        </button>
        <button
          onClick={() => setActiveTab('procedimientos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex-1 sm:flex-none justify-center ${
            activeTab === 'procedimientos' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList size={15}/> Procedimientos
        </button>
        <button
          onClick={() => setActiveTab('tarifario')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex-1 sm:flex-none justify-center ${
            activeTab === 'tarifario' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Award size={15}/> Tarifario
        </button>
        <button
          onClick={() => setActiveTab('factura')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex-1 sm:flex-none justify-center ${
            activeTab === 'factura' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={15}/> Modelo de factura
        </button>
      </div>

      {activeTab === 'directorio'     && <DirectorioSection/>}
      {activeTab === 'proveedores'    && <ProveedoresSection/>}
      {activeTab === 'procedimientos' && <ProcedimientosSection/>}
      {activeTab === 'tarifario'      && <TarifarioSection/>}
      {activeTab === 'factura'        && <ModeloFacturaSection/>}
    </div>
  );
}
