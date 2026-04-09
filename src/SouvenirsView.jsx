// src/SouvenirsView.jsx — Inventario de Souvenirs CAEDUC
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Gift, Plus, Edit3, Trash2, X, Save,
  Upload, Eye, ChevronDown, ChevronUp, RefreshCw,
  Printer, Calendar, User, Package,
  ShoppingCart, AlertCircle, CheckCircle,
  Archive, Info, Search, FileText
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
);
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

const buildUrl = (path, bucket) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

const fmt = (n) => Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const todayStr = () => new Date().toISOString().split('T')[0];
const nowTs    = () => new Date().toLocaleString('es-GT');

const CATEGORIAS = ['Tazas', 'Ropa', 'Bolsas', 'Papelería', 'Accesorios', 'Tecnología', 'Llaveros', 'General'];

// ── StockBadge ────────────────────────────────────────────────────────────────
function StockBadge({ cantidad }) {
  if (cantidad <= 0)  return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-300">Sin stock</span>;
  if (cantidad <= 5)  return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-700 border border-amber-300">{cantidad} uds.</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-green-100 text-green-700 border border-green-300">{cantidad} uds.</span>;
}

// ── SouvenirFormModal ─────────────────────────────────────────────────────────
function SouvenirFormModal({ isOpen, onClose, onSave, initial, saving }) {
  const [fd, setFd]           = useState({ nombre: '', descripcion: '', categoria: 'General', precio_unitario: '' });
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setFd(initial
      ? { nombre: initial.nombre, descripcion: initial.descripcion || '', categoria: initial.categoria || 'General', precio_unitario: initial.precio_unitario || '' }
      : { nombre: '', descripcion: '', categoria: 'General', precio_unitario: '' }
    );
    setImgFile(null);
    setImgPreview(initial?.imagen_path ? buildUrl(initial.imagen_path, 'souvenirs-imagenes') : null);
  }, [isOpen, initial]);

  const upd = (k, v) => setFd(p => ({ ...p, [k]: v }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Gift size={18} className="text-indigo-600"/>
            {initial ? 'Editar Souvenir' : 'Nuevo Souvenir'}
          </h3>
          <button onClick={onClose}><X size={22} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          <form onSubmit={e => { e.preventDefault(); onSave(fd, imgFile); }} className="space-y-4">
            {/* Imagen */}
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 bg-gray-50">
                {imgPreview
                  ? <img src={imgPreview} alt="" className="w-full h-full object-cover"/>
                  : <Package size={28} className="text-gray-300"/>}
              </div>
              <div className="flex-1 pt-1">
                <label className="block text-xs font-bold text-gray-600 mb-2">Imagen del souvenir</label>
                <label className="flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-200 text-sm font-medium w-fit">
                  <Upload size={14}/>
                  {imgPreview ? 'Cambiar imagen' : 'Subir imagen'}
                  <input ref={imgRef} type="file" className="hidden" accept="image/*"
                    onChange={e => {
                      const f = e.target.files[0];
                      if (!f) return;
                      if (!f.type.startsWith('image/')) { alert('Solo imágenes.'); return; }
                      setImgFile(f);
                      setImgPreview(URL.createObjectURL(f));
                    }}/>
                </label>
                {imgFile && <p className="text-xs text-green-600 mt-1.5 truncate max-w-xs">{imgFile.name}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Nombre *</label>
              <input required className="w-full border p-2.5 rounded-lg text-sm"
                placeholder="Ej: Taza CPG, Lapicero CAEDUC, Bolsa ecológica..."
                value={fd.nombre} onChange={e => upd('nombre', e.target.value)}/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Categoría</label>
                <input list="cat-souvenirs-list" className="w-full border p-2.5 rounded-lg text-sm"
                  value={fd.categoria} onChange={e => upd('categoria', e.target.value)}/>
                <datalist id="cat-souvenirs-list">
                  {CATEGORIAS.map(c => <option key={c} value={c}/>)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Precio unitario (Q)</label>
                <input type="number" min="0" step="0.01" className="w-full border p-2.5 rounded-lg text-sm"
                  placeholder="0.00"
                  value={fd.precio_unitario} onChange={e => upd('precio_unitario', e.target.value)}/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Descripción (opcional)</label>
              <textarea rows={2} className="w-full border p-2.5 rounded-lg text-sm resize-none"
                placeholder="Descripción, color, talla, especificaciones..."
                value={fd.descripcion} onChange={e => upd('descripcion', e.target.value)}/>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={16}/> {saving ? 'Guardando...' : 'Guardar souvenir'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── CompraModal ────────────────────────────────────────────────────────────────
function CompraModal({ isOpen, souvenir, onClose, onSave, saving }) {
  const [fd, setFd]               = useState({});
  const [facturaFile, setFactura] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setFd({ cantidad: '', precio_unitario: souvenir?.precio_unitario || '', comision_compradora: '', fecha_compra: todayStr(), notas: '' });
    setFactura(null);
  }, [isOpen, souvenir]);

  if (!isOpen || !souvenir) return null;

  const total = (Number(fd.cantidad) || 0) * (Number(fd.precio_unitario) || 0);
  const valid = fd.cantidad && Number(fd.cantidad) > 0 && fd.comision_compradora?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart size={18} className="text-green-600"/> Registrar Compra
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{souvenir.nombre}</p>
          </div>
          <button onClick={onClose}><X size={22} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Cantidad *</label>
              <input type="number" min="1" step="1" required
                className="w-full border p-2.5 rounded-lg text-sm font-bold"
                placeholder="0"
                value={fd.cantidad} onChange={e => setFd(p => ({...p, cantidad: e.target.value}))}/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Precio unitario (Q) *</label>
              <input type="number" min="0" step="0.01" required
                className="w-full border p-2.5 rounded-lg text-sm"
                placeholder="0.00"
                value={fd.precio_unitario} onChange={e => setFd(p => ({...p, precio_unitario: e.target.value}))}/>
            </div>
          </div>

          {total > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-green-700 font-semibold">Total de la compra</span>
              <span className="text-xl font-black text-green-700">Q{fmt(total)}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Comisión que realizó la compra *</label>
            <input required className="w-full border p-2.5 rounded-lg text-sm"
              placeholder="Ej: CAEDUC, Junta Directiva, Secretaría..."
              value={fd.comision_compradora} onChange={e => setFd(p => ({...p, comision_compradora: e.target.value}))}/>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Fecha de compra *</label>
            <input type="date" required className="w-full border p-2.5 rounded-lg text-sm"
              value={fd.fecha_compra} onChange={e => setFd(p => ({...p, fecha_compra: e.target.value}))}/>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Factura o cotización (opcional)
            </label>
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-3 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
              <Upload size={16} className="text-gray-400 shrink-0"/>
              <span className="text-sm text-gray-500 truncate">
                {facturaFile ? facturaFile.name : 'Subir PDF o imagen de factura/cotización'}
              </span>
              <input type="file" className="hidden" accept=".pdf,image/*"
                onChange={e => setFactura(e.target.files[0] || null)}/>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Notas (opcional)</label>
            <textarea rows={2} className="w-full border p-2.5 rounded-lg text-sm resize-none"
              placeholder="Proveedor, condiciones, etc."
              value={fd.notas} onChange={e => setFd(p => ({...p, notas: e.target.value}))}/>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>
            <button disabled={saving || !valid}
              onClick={() => onSave(fd, facturaFile)}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <Save size={16}/> {saving ? 'Guardando...' : 'Registrar compra'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DescargoModal ─────────────────────────────────────────────────────────────
function DescargoModal({ isOpen, souvenir, onClose, onSave, saving }) {
  const [fd, setFd] = useState({ cantidad: '', actividad: '', notas: '' });

  useEffect(() => {
    if (isOpen) setFd({ cantidad: '', actividad: '', notas: '' });
  }, [isOpen]);

  if (!isOpen || !souvenir) return null;

  const cant     = Number(fd.cantidad) || 0;
  const stockOk  = cant > 0 && cant <= souvenir.stock_actual;
  const valid    = stockOk && fd.actividad?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Archive size={18} className="text-orange-600"/> Registrar Descargo
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{souvenir.nombre}</p>
          </div>
          <button onClick={onClose}><X size={22} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <div className="p-5 space-y-4">

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-blue-700 font-semibold">Stock disponible</span>
            <StockBadge cantidad={souvenir.stock_actual}/>
          </div>

          {souvenir.stock_actual <= 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle size={14} className="shrink-0"/>
              No hay stock disponible para descargar.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Cantidad a descargar *</label>
            <input type="number" min="1" max={souvenir.stock_actual} step="1" required
              className={`w-full border p-2.5 rounded-lg text-sm font-bold transition-colors ${
                fd.cantidad && !stockOk ? 'border-red-400 bg-red-50' : ''
              }`}
              placeholder="0"
              value={fd.cantidad} onChange={e => setFd(p => ({...p, cantidad: e.target.value}))}/>
            {fd.cantidad && cant > souvenir.stock_actual && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={11}/> Excede el stock disponible ({souvenir.stock_actual})
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Actividad en que se usaron *</label>
            <input required className="w-full border p-2.5 rounded-lg text-sm"
              placeholder="Ej: Diplomado Neuropsicología mayo 2026, Taller CAEDUC..."
              value={fd.actividad} onChange={e => setFd(p => ({...p, actividad: e.target.value}))}/>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Notas (opcional)</label>
            <textarea rows={2} className="w-full border p-2.5 rounded-lg text-sm resize-none"
              placeholder="Observaciones adicionales..."
              value={fd.notas} onChange={e => setFd(p => ({...p, notas: e.target.value}))}/>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
            <Info size={13} className="shrink-0 mt-0.5"/>
            <span>Se registrará automáticamente tu nombre de usuario y la fecha y hora exacta del descargo para el reporte.</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>
            <button disabled={saving || !valid}
              onClick={() => onSave(fd)}
              className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <Archive size={16}/> {saving ? 'Registrando...' : 'Registrar descargo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SouvenirCard ──────────────────────────────────────────────────────────────
function SouvenirCard({ souvenir, compras, descargos, onEdit, onDelete, onCompra, onDescargo }) {
  const [showHistory, setShowHistory] = useState(false);

  const imgUrl     = souvenir.imagen_path ? buildUrl(souvenir.imagen_path, 'souvenirs-imagenes') : null;
  const misCompras = compras.filter(c => c.souvenir_id === souvenir.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const misDesc    = descargos.filter(d => d.souvenir_id === souvenir.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalComprado  = misCompras.reduce((s, c) => s + Number(c.cantidad), 0);
  const totalDescargado = misDesc.reduce((s, d) => s + Number(d.cantidad), 0);
  const valorTotal     = souvenir.stock_actual * Number(souvenir.precio_unitario || 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-xl border bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
            {imgUrl
              ? <img src={imgUrl} alt={souvenir.nombre} className="w-full h-full object-cover"/>
              : <Package size={24} className="text-gray-300"/>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {souvenir.categoria || 'General'}
                  </span>
                  <StockBadge cantidad={souvenir.stock_actual}/>
                </div>
                <h3 className="font-bold text-gray-800 text-sm leading-snug">{souvenir.nombre}</h3>
                {souvenir.descripcion && (
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed truncate">{souvenir.descripcion}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {souvenir.precio_unitario > 0 && (
                    <span className="font-medium">Q{fmt(souvenir.precio_unitario)} c/u</span>
                  )}
                  {valorTotal > 0 && (
                    <span className="text-green-700 font-semibold">Valor: Q{fmt(valorTotal)}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEdit(souvenir)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit3 size={13}/>
                </button>
                <button onClick={() => onDelete(souvenir)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 size={13}/>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Acción buttons */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={() => onCompra(souvenir)}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-1.5">
            <ShoppingCart size={12}/> Registrar compra
          </button>
          <button onClick={() => onDescargo(souvenir)}
            disabled={souvenir.stock_actual <= 0}
            className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-600 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            <Archive size={12}/> Registrar descargo
          </button>
          <button
            onClick={() => setShowHistory(h => !h)}
            className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 flex items-center gap-1 ml-auto">
            {showHistory ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            Historial ({misCompras.length + misDesc.length})
          </button>
        </div>
      </div>

      {/* Historial expandible */}
      {showHistory && (
        <div className="border-t bg-gray-50 px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
            <div className="bg-white rounded-lg border py-2">
              <p className="font-black text-green-600">{totalComprado}</p>
              <p className="text-gray-400">Comprados</p>
            </div>
            <div className="bg-white rounded-lg border py-2">
              <p className="font-black text-orange-600">{totalDescargado}</p>
              <p className="text-gray-400">Descargados</p>
            </div>
            <div className="bg-white rounded-lg border py-2">
              <p className={`font-black ${souvenir.stock_actual > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {souvenir.stock_actual}
              </p>
              <p className="text-gray-400">En stock</p>
            </div>
          </div>

          {/* Compras */}
          {misCompras.length > 0 && (
            <div>
              <p className="text-xs font-bold text-green-700 mb-1.5 flex items-center gap-1">
                <ShoppingCart size={11}/> Compras registradas
              </p>
              <div className="space-y-1.5">
                {misCompras.map(c => (
                  <div key={c.id} className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-green-700">+{c.cantidad} uds.</span>
                      <span className="text-xs text-gray-400">
                        {c.fecha_compra || new Date(c.created_at).toLocaleDateString('es-GT')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {c.precio_unitario > 0 && <span className="mr-2">Q{fmt(c.precio_unitario)} c/u</span>}
                      {c.comision_compradora && <span className="text-green-600 font-medium">{c.comision_compradora}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <User size={9}/>{c.created_by ? c.created_by.split('@')[0] : '—'}
                      </span>
                      {c.factura_path && (
                        <a href={buildUrl(c.factura_path, 'souvenirs-facturas')} target="_blank" rel="noopener"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                          <FileText size={10}/> Ver factura
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Descargos */}
          {misDesc.length > 0 && (
            <div>
              <p className="text-xs font-bold text-orange-700 mb-1.5 flex items-center gap-1">
                <Archive size={11}/> Descargos registrados
              </p>
              <div className="space-y-1.5">
                {misDesc.map(d => (
                  <div key={d.id} className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-700">−{d.cantidad} uds.</span>
                      <span className="text-xs text-gray-400">
                        {new Date(d.created_at).toLocaleDateString('es-GT')}
                        {' '}{new Date(d.created_at).toLocaleTimeString('es-GT', {hour:'2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">{d.actividad}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <User size={9}/>{d.created_by ? d.created_by.split('@')[0] : '—'}
                      </span>
                      {d.notas && <span className="text-xs text-gray-400 italic truncate max-w-32">{d.notas}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {misCompras.length === 0 && misDesc.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">Sin movimientos registrados</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Generador de reporte ──────────────────────────────────────────────────────
function generateSouvenirsReport(souvenirs, compras, descargos) {
  const totalValor = souvenirs.reduce((s, sv) =>
    s + (sv.stock_actual * Number(sv.precio_unitario || 0)), 0);

  const rowsInventario = souvenirs.map(sv => {
    const color = sv.stock_actual <= 0 ? '#dc2626' : sv.stock_actual <= 5 ? '#d97706' : '#16a34a';
    const valor = sv.stock_actual * Number(sv.precio_unitario || 0);
    return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:600;">${sv.nombre}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;">${sv.categoria || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:center;font-weight:800;color:${color};">${sv.stock_actual}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;">Q${sv.precio_unitario ? Number(sv.precio_unitario).toLocaleString('es-GT',{minimumFractionDigits:2}) : '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;text-align:right;font-weight:700;color:#1e40af;">Q${valor.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
      </tr>`;
  }).join('');

  // Movimientos combinados y ordenados por fecha
  const movimientos = [
    ...compras.map(c => ({
      fecha: c.created_at, tipo: 'COMPRA', souvenir_id: c.souvenir_id,
      cantidad: `+${c.cantidad}`, usuario: c.created_by || '—',
      detalle: c.comision_compradora || '—',
      extra: c.fecha_compra ? `Fecha compra: ${c.fecha_compra}` : '',
      color: '#16a34a', bg: '#f0fdf4'
    })),
    ...descargos.map(d => ({
      fecha: d.created_at, tipo: 'DESCARGO', souvenir_id: d.souvenir_id,
      cantidad: `−${d.cantidad}`, usuario: d.created_by || '—',
      detalle: d.actividad,
      extra: d.notas || '',
      color: '#ea580c', bg: '#fff7ed'
    }))
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const rowsMovimientos = movimientos.map(m => {
    const sv = souvenirs.find(s => s.id === m.souvenir_id);
    const fechaLocal = new Date(m.fecha).toLocaleString('es-GT');
    return `
      <tr style="background:${m.bg};">
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px;">${fechaLocal}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px;font-weight:800;color:${m.color};">${m.tipo}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px;font-weight:600;">${sv?.nombre || '—'}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px;text-align:center;font-weight:800;color:${m.color};">${m.cantidad}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px;">${m.usuario.split('@')[0]}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px;">${m.detalle}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px;color:#6b7280;">${m.extra}</td>
      </tr>`;
  }).join('');

  const thStyle = 'padding:7px 8px;background:#1e3a5f;color:white;font-size:10px;text-align:left;';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Reporte de Souvenirs — CAEDUC ${new Date().getFullYear()}</title>
    <style>
      @page{size:letter landscape;margin:0.5in;}
      body{font-family:Arial,sans-serif;color:#111;background:white;margin:0;}
      h1{font-size:16px;color:#1e3a5f;margin:0 0 4px;}
      h2{font-size:12px;color:#1e3a5f;border-bottom:2px solid #3b82f6;padding-bottom:3px;margin:18px 0 8px;}
      table{width:100%;border-collapse:collapse;margin-bottom:14px;}
      @media print{.no-print{display:none!important;}}
    </style>
  </head><body>
    <div class="no-print" style="text-align:right;padding-bottom:10px;">
      <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:7px 18px;border-radius:5px;font-size:11px;cursor:pointer;">
        🖨️ Imprimir / Guardar PDF
      </button>
    </div>
    <div style="border-bottom:3px solid #1e3a5f;padding-bottom:8px;margin-bottom:14px;">
      <h1>Reporte de Inventario de Souvenirs — CAEDUC</h1>
      <p style="font-size:10px;color:#6b7280;margin:0;">Generado: ${nowTs()} | Total artículos: ${souvenirs.length} | Valor total inventario: Q${totalValor.toLocaleString('es-GT',{minimumFractionDigits:2})}</p>
    </div>

    <h2>Inventario Actual</h2>
    <table>
      <thead><tr>
        <th style="${thStyle}">Artículo</th>
        <th style="${thStyle}">Categoría</th>
        <th style="${thStyle}text-align:center;">Stock</th>
        <th style="${thStyle}text-align:right;">Precio unit.</th>
        <th style="${thStyle}text-align:right;">Valor en stock</th>
      </tr></thead>
      <tbody>${rowsInventario}</tbody>
      <tfoot><tr style="background:#1e3a5f;color:white;font-weight:700;">
        <td colspan="4" style="padding:7px 8px;font-size:11px;">VALOR TOTAL DEL INVENTARIO</td>
        <td style="padding:7px 8px;font-size:11px;text-align:right;">Q${totalValor.toLocaleString('es-GT',{minimumFractionDigits:2})}</td>
      </tr></tfoot>
    </table>

    <h2>Historial de Movimientos (${movimientos.length} registros)</h2>
    ${movimientos.length > 0 ? `
    <table>
      <thead><tr>
        <th style="${thStyle}width:14%">Fecha y hora</th>
        <th style="${thStyle}width:8%">Tipo</th>
        <th style="${thStyle}width:16%">Artículo</th>
        <th style="${thStyle}width:6%;text-align:center">Cant.</th>
        <th style="${thStyle}width:12%">Usuario</th>
        <th style="${thStyle}width:22%">Comisión / Actividad</th>
        <th style="${thStyle}">Notas / Detalle</th>
      </tr></thead>
      <tbody>${rowsMovimientos}</tbody>
    </table>` : '<p style="font-size:11px;color:#6b7280;">Sin movimientos registrados.</p>'}

    <p style="font-size:9px;color:#9ca3af;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;">
      CAEDUC — Colegio de Psicólogos de Guatemala | colegiodepsicologos.org.gt
    </p>
  </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else alert('Permite las ventanas emergentes para generar el reporte.');
}

// ── SouvenirsView principal ───────────────────────────────────────────────────
export default function SouvenirsView() {
  const [souvenirs, setSouvenirs]         = useState([]);
  const [compras, setCompras]             = useState([]);
  const [descargos, setDescargos]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [currentUser, setCurrentUser]     = useState(null);
  const [search, setSearch]               = useState('');

  // Modals
  const [showForm, setShowForm]             = useState(false);
  const [editItem, setEditItem]             = useState(null);
  const [compraTarget, setCompraTarget]     = useState(null);
  const [descargoTarget, setDescargoTarget] = useState(null);
  const [deleteModal, setDeleteModal]       = useState(null);
  const [saving, setSaving]                 = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data?.user || null));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: sv }, { data: co }, { data: de }] = await Promise.all([
      supabase.from('souvenirs').select('*').order('nombre'),
      supabase.from('souvenir_compras').select('*').order('created_at', { ascending: false }),
      supabase.from('souvenir_descargos').select('*').order('created_at', { ascending: false }),
    ]);
    if (sv) setSouvenirs(sv);
    if (co) setCompras(co);
    if (de) setDescargos(de);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── CRUD souvenir ───────────────────────────────────────────────────────
  const handleSaveSouvenir = async (fd, imgFile) => {
    setSaving(true);
    let imagen_path = editItem?.imagen_path || null;

    // Subir imagen si hay nueva
    if (imgFile) {
      if (imagen_path) {
        await supabase.storage.from('souvenirs-imagenes').remove([imagen_path]);
      }
      const ext  = imgFile.name.split('.').pop();
      const path = `souvenir_${Date.now()}.${ext}`;
      const { data: up, error: ue } = await supabase.storage
        .from('souvenirs-imagenes').upload(path, imgFile, { upsert: true });
      if (!ue && up) imagen_path = up.path;
    }

    const payload = {
      nombre: fd.nombre,
      descripcion: fd.descripcion || '',
      categoria: fd.categoria || 'General',
      precio_unitario: Number(fd.precio_unitario) || 0,
      imagen_path,
      updated_at: new Date().toISOString(),
    };

    if (editItem) {
      await supabase.from('souvenirs').update(payload).eq('id', editItem.id);
    } else {
      await supabase.from('souvenirs').insert([{ ...payload, stock_actual: 0 }]);
    }
    await fetchAll();
    setShowForm(false);
    setEditItem(null);
    setSaving(false);
  };

  // ── Registrar compra ────────────────────────────────────────────────────
  const handleCompra = async (fd, facturaFile) => {
    setSaving(true);
    let factura_path = null;

    if (facturaFile) {
      const ext  = facturaFile.name.split('.').pop();
      const path = `factura_${compraTarget.id}_${Date.now()}.${ext}`;
      const { data: up } = await supabase.storage
        .from('souvenirs-facturas').upload(path, facturaFile, { upsert: true });
      if (up) factura_path = up.path;
    }

    const cantidad = Number(fd.cantidad);
    await supabase.from('souvenir_compras').insert([{
      souvenir_id:         compraTarget.id,
      cantidad,
      precio_unitario:     Number(fd.precio_unitario) || null,
      comision_compradora: fd.comision_compradora,
      factura_path,
      fecha_compra:        fd.fecha_compra,
      notas:               fd.notas || '',
      created_by:          currentUser?.email || 'usuario',
    }]);

    // Actualizar stock
    await supabase.from('souvenirs')
      .update({ stock_actual: compraTarget.stock_actual + cantidad, updated_at: new Date().toISOString() })
      .eq('id', compraTarget.id);

    await fetchAll();
    setCompraTarget(null);
    setSaving(false);
  };

  // ── Registrar descargo ──────────────────────────────────────────────────
  const handleDescargo = async (fd) => {
    setSaving(true);
    const cantidad = Number(fd.cantidad);

    if (cantidad > descargoTarget.stock_actual) {
      alert('Error: la cantidad excede el stock disponible.');
      setSaving(false);
      return;
    }

    await supabase.from('souvenir_descargos').insert([{
      souvenir_id: descargoTarget.id,
      cantidad,
      actividad:   fd.actividad,
      notas:       fd.notas || '',
      created_by:  currentUser?.email || 'usuario',
    }]);

    // Restar stock
    await supabase.from('souvenirs')
      .update({ stock_actual: descargoTarget.stock_actual - cantidad, updated_at: new Date().toISOString() })
      .eq('id', descargoTarget.id);

    await fetchAll();
    setDescargoTarget(null);
    setSaving(false);
  };

  // ── Eliminar souvenir ───────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteModal) return;
    if (deleteModal.imagen_path) {
      await supabase.storage.from('souvenirs-imagenes').remove([deleteModal.imagen_path]);
    }
    // Limpiar facturas de sus compras
    const misCompras = compras.filter(c => c.souvenir_id === deleteModal.id && c.factura_path);
    if (misCompras.length > 0) {
      await supabase.storage.from('souvenirs-facturas').remove(misCompras.map(c => c.factura_path));
    }
    await supabase.from('souvenirs').delete().eq('id', deleteModal.id);
    await fetchAll();
    setDeleteModal(null);
  };

  // ── Filtrado ────────────────────────────────────────────────────────────
  const filtered = souvenirs.filter(sv => {
    const q = search.toLowerCase();
    return !q || sv.nombre?.toLowerCase().includes(q) || sv.categoria?.toLowerCase().includes(q) || sv.descripcion?.toLowerCase().includes(q);
  });

  // ── Stats ───────────────────────────────────────────────────────────────
  const totalItems      = souvenirs.length;
  const totalStock      = souvenirs.reduce((s, sv) => s + sv.stock_actual, 0);
  const totalValor      = souvenirs.reduce((s, sv) => s + (sv.stock_actual * Number(sv.precio_unitario || 0)), 0);
  const sinStock        = souvenirs.filter(sv => sv.stock_actual <= 0).length;
  const totalDescargosN = descargos.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Gift size={22} className="text-indigo-600"/> Control de Souvenirs
          </h2>
          <p className="text-sm text-gray-500">Inventario, compras, descargos y reportes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => generateSouvenirsReport(souvenirs, compras, descargos)}
            className="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-xl font-bold hover:bg-indigo-100 flex items-center gap-2 text-sm border border-indigo-200">
            <Printer size={15}/> Reporte
          </button>
          <button onClick={fetchAll}
            className="bg-gray-100 text-gray-600 px-3 py-2.5 rounded-xl hover:bg-gray-200 flex items-center gap-1 text-sm">
            <RefreshCw size={14}/> Actualizar
          </button>
          <button onClick={() => { setEditItem(null); setShowForm(true); }}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2">
            <Plus size={18}/> Nuevo souvenir
          </button>
        </div>
      </div>

      {/* Stats */}
      {souvenirs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-indigo-600">{totalItems}</p>
            <p className="text-xs text-indigo-700 font-medium">Artículos</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-blue-600">{totalStock}</p>
            <p className="text-xs text-blue-700 font-medium">Unidades en stock</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-green-600">Q{totalValor >= 1000 ? `${(totalValor/1000).toFixed(1)}K` : totalValor.toFixed(0)}</p>
            <p className="text-xs text-green-700 font-medium">Valor inventario</p>
          </div>
          <div className={`${sinStock > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-black ${sinStock > 0 ? 'text-red-600' : 'text-gray-400'}`}>{sinStock}</p>
            <p className={`text-xs font-medium ${sinStock > 0 ? 'text-red-700' : 'text-gray-500'}`}>Sin stock</p>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full border p-2.5 pl-9 rounded-xl text-sm"
          placeholder="Buscar por nombre, categoría..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {/* Estado vacío */}
      {!loading && souvenirs.length === 0 && (
        <div className="bg-white rounded-xl border text-center py-16">
          <Gift size={48} className="text-gray-200 mx-auto mb-3"/>
          <p className="text-gray-400 text-lg font-medium">Sin souvenirs registrados</p>
          <p className="text-gray-400 text-sm mb-6">Agrega artículos para llevar control de tu inventario.</p>
          <button onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 inline-flex items-center gap-2">
            <Plus size={16}/> Agregar primer artículo
          </button>
        </div>
      )}

      {/* Sin resultados */}
      {!loading && souvenirs.length > 0 && filtered.length === 0 && (
        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border">
          <Search size={28} className="mx-auto mb-2 opacity-30"/>
          <p>Sin resultados para la búsqueda.</p>
        </div>
      )}

      {/* Grid de cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={28} className="text-indigo-500 animate-spin"/>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(sv => (
            <SouvenirCard
              key={sv.id}
              souvenir={sv}
              compras={compras}
              descargos={descargos}
              onEdit={item => { setEditItem(item); setShowForm(true); }}
              onDelete={setDeleteModal}
              onCompra={setCompraTarget}
              onDescargo={setDescargoTarget}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <SouvenirFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        onSave={handleSaveSouvenir}
        initial={editItem}
        saving={saving}
      />

      <CompraModal
        isOpen={!!compraTarget}
        souvenir={compraTarget}
        onClose={() => setCompraTarget(null)}
        onSave={handleCompra}
        saving={saving}
      />

      <DescargoModal
        isOpen={!!descargoTarget}
        souvenir={descargoTarget}
        onClose={() => setDescargoTarget(null)}
        onSave={handleDescargo}
        saving={saving}
      />

      {/* Modal eliminar */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">Eliminar souvenir</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
              <p className="text-red-700 font-medium">¿Eliminar <strong>{deleteModal.nombre}</strong>?</p>
              <p className="text-red-500 text-sm">Se eliminará todo el historial de compras y descargos.</p>
              {deleteModal.stock_actual > 0 && (
                <p className="text-red-600 text-sm font-semibold">⚠ Tiene {deleteModal.stock_actual} unidades en stock.</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
