// src/PuntosResolutivosView.jsx — Puntos resolutivos escaneados
//
// Cada punto resolutivo es el documento escaneado de una resolución, con su
// título y su fecha de resolución. La fecha de carga la registra la app sola.
// El bucket es privado: los documentos se ven y se descargan con enlaces
// firmados de corta duración, nunca con una URL pública.

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Calendar, Download, Edit3, Eye, FileText, Gavel,
  Loader, Plus, Save, Search, Trash2, Upload, X,
} from 'lucide-react';
import { supabase } from './supabaseClient.js';
import { extensionArchivo, nombreSeguro } from './lib/expedientePonentes.js';

const TABLA = 'caeduc_puntos_resolutivos';
const BUCKET = 'caeduc-puntos-resolutivos';
const MAX_ARCHIVO = 20 * 1024 * 1024;
const TIPOS_ACEPTADOS = 'application/pdf,image/jpeg,image/png,image/webp';

const hoyISO = () => new Date().toISOString().split('T')[0];

const fechaLarga = (valor) => {
  if (!valor) return 'Sin fecha';
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fecha = new Date(`${String(valor).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
};

const fechaHora = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
};

const pesoLegible = (bytes) => {
  const valor = Number(bytes);
  if (!Number.isFinite(valor) || valor <= 0) return '';
  return valor < 1024 * 1024
    ? `${Math.max(1, Math.round(valor / 1024))} KB`
    : `${(valor / (1024 * 1024)).toFixed(1)} MB`;
};

const descargarBlob = (blob, nombre) => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
};

const Campo = ({ id, label, children, ayuda }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-bold text-slate-700">{label}</label>
    {children}
    {ayuda && <p className="mt-1.5 text-xs leading-5 text-slate-500">{ayuda}</p>}
  </div>
);

const inputCls = 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

export default function PuntosResolutivosView() {
  const [puntos, setPuntos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [quitarArchivo, setQuitarArchivo] = useState(false);
  const [porBorrar, setPorBorrar] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [ocupado, setOcupado] = useState('');

  const cargar = async () => {
    setCargando(true);
    const { data, error: fallo } = await supabase
      .from(TABLA)
      .select('*')
      .order('fecha_resolucion', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (fallo) setError(fallo.message);
    else {
      setError('');
      setPuntos(data || []);
    }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return puntos;
    return puntos.filter(punto => [punto.titulo, punto.notas, punto.fecha_resolucion, punto.documento_nombre]
      .some(valor => String(valor || '').toLowerCase().includes(texto)));
  }, [puntos, busqueda]);

  const abrirNuevo = () => {
    setFormulario({ id: null, titulo: '', fecha_resolucion: hoyISO(), notas: '', documento_path: '', documento_nombre: '' });
    setArchivo(null);
    setQuitarArchivo(false);
    setAviso('');
  };

  const abrirEdicion = (punto) => {
    setFormulario({
      id: punto.id,
      titulo: punto.titulo || '',
      fecha_resolucion: punto.fecha_resolucion || '',
      notas: punto.notas || '',
      documento_path: punto.documento_path || '',
      documento_nombre: punto.documento_nombre || '',
    });
    setArchivo(null);
    setQuitarArchivo(false);
    setAviso('');
  };

  const elegirArchivo = (evento) => {
    const elegido = evento.target.files?.[0];
    evento.target.value = '';
    if (!elegido) return;
    if (elegido.size > MAX_ARCHIVO) {
      setAviso('El documento no debe superar 20 MB.');
      return;
    }
    setArchivo(elegido);
    setQuitarArchivo(false);
    setAviso('');
  };

  const guardar = async () => {
    if (!formulario.titulo.trim()) {
      setAviso('Escribe el título de la resolución.');
      return;
    }
    setGuardando(true);
    setAviso('');
    const rutaAnterior = formulario.documento_path;
    let rutaSubida = '';
    try {
      let documentoPath = quitarArchivo ? null : rutaAnterior || null;
      let documentoNombre = quitarArchivo ? null : formulario.documento_nombre || null;
      let cargadoEn = quitarArchivo ? null : undefined;

      if (archivo) {
        const extension = extensionArchivo(archivo.name);
        rutaSubida = `${crypto.randomUUID()}-${Date.now()}.${extension}`;
        const { error: falloSubida } = await supabase.storage
          .from(BUCKET)
          .upload(rutaSubida, archivo, { upsert: false, contentType: archivo.type });
        if (falloSubida) throw falloSubida;
        documentoPath = rutaSubida;
        documentoNombre = archivo.name;
        // Fecha de carga: se sella sola cada vez que entra un archivo nuevo.
        cargadoEn = new Date().toISOString();
      }

      const datos = {
        titulo: formulario.titulo.trim(),
        fecha_resolucion: formulario.fecha_resolucion || null,
        notas: formulario.notas.trim() || null,
        documento_path: documentoPath,
        documento_nombre: documentoNombre,
      };
      if (cargadoEn !== undefined) datos.documento_cargado_en = cargadoEn;

      const consulta = formulario.id
        ? supabase.from(TABLA).update(datos).eq('id', formulario.id)
        : supabase.from(TABLA).insert([datos]);
      const { error: falloGuardar } = await consulta;
      if (falloGuardar) throw falloGuardar;

      if (rutaAnterior && rutaAnterior !== documentoPath) {
        await supabase.storage.from(BUCKET).remove([rutaAnterior]);
      }
      setFormulario(null);
      setArchivo(null);
      await cargar();
    } catch (fallo) {
      if (rutaSubida) await supabase.storage.from(BUCKET).remove([rutaSubida]);
      setAviso(`No se pudo guardar: ${fallo.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!porBorrar) return;
    setBorrando(true);
    const { error: fallo } = await supabase.from(TABLA).delete().eq('id', porBorrar.id);
    if (fallo) setAviso(`No se pudo eliminar: ${fallo.message}`);
    else {
      if (porBorrar.documento_path) await supabase.storage.from(BUCKET).remove([porBorrar.documento_path]);
      await cargar();
    }
    setPorBorrar(null);
    setBorrando(false);
  };

  // El bucket es privado: para ver o descargar se pide un enlace firmado.
  const verDocumento = async (punto) => {
    if (!punto.documento_path) return;
    setOcupado(punto.id);
    const { data, error: fallo } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(punto.documento_path, 300);
    setOcupado('');
    if (fallo || !data?.signedUrl) {
      setAviso(`No se pudo abrir el documento: ${fallo?.message || 'enlace no disponible'}`);
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const descargarDocumento = async (punto) => {
    if (!punto.documento_path) return;
    setOcupado(punto.id);
    const { data, error: fallo } = await supabase.storage.from(BUCKET).download(punto.documento_path);
    setOcupado('');
    if (fallo) {
      setAviso(`No se pudo descargar: ${fallo.message}`);
      return;
    }
    const extension = extensionArchivo(punto.documento_nombre);
    descargarBlob(data, punto.documento_nombre || `${nombreSeguro(punto.titulo, 'Punto resolutivo')}.${extension}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800"><Gavel size={22} className="text-amber-600"/> Puntos resolutivos</h2>
          <p className="text-sm text-gray-500">Resoluciones escaneadas, con su título, su fecha y la fecha en que se cargaron.</p>
        </div>
        <button type="button" onClick={abrirNuevo} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white hover:bg-amber-700">
          <Plus size={19}/> Nuevo punto resolutivo
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0"/>
          <div>
            <p className="font-bold">No se pudo cargar el listado.</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-xs">Si dice que la tabla no existe, falta ejecutar <code className="rounded bg-red-100 px-1">supabase/2026_puntos_resolutivos_y_expedientes.sql</code> en el SQL Editor de Supabase.</p>
          </div>
        </div>
      )}

      {aviso && <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{aviso}</p>}

      <div className="relative max-w-md">
        <Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400"/>
        <input aria-label="Buscar punto resolutivo" value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Buscar por título, fecha o nota" className="min-h-11 w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
      </div>

      {cargando && <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-8 text-sm text-slate-500"><Loader size={18} className="animate-spin"/> Cargando puntos resolutivos...</div>}

      {!cargando && !visibles.length && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <Gavel size={40} className="mx-auto text-slate-300"/>
          <p className="mt-3 font-bold text-slate-600">{puntos.length ? 'Ningún punto resolutivo coincide con la búsqueda.' : 'Todavía no hay puntos resolutivos cargados.'}</p>
        </div>
      )}

      <div className="space-y-3">
        {visibles.map(punto => (
          <div key={punto.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800">{punto.titulo}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Calendar size={13}/> Resolución: {fechaLarga(punto.fecha_resolucion)}</span>
                  <span className="flex items-center gap-1"><Upload size={13}/> Cargado: {fechaHora(punto.documento_cargado_en || punto.created_at)}</span>
                </p>
                {punto.notas && <p className="mt-2 text-sm text-slate-600">{punto.notas}</p>}
                {punto.documento_nombre && <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><FileText size={13}/> {punto.documento_nombre}</p>}
                {!punto.documento_path && <p className="mt-2 text-xs font-bold text-amber-600">Sin documento escaneado todavía.</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {punto.documento_path && <>
                  <button type="button" disabled={ocupado === punto.id} onClick={() => verDocumento(punto)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"><Eye size={15}/> Ver</button>
                  <button type="button" disabled={ocupado === punto.id} onClick={() => descargarDocumento(punto)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">{ocupado === punto.id ? <Loader size={15} className="animate-spin"/> : <Download size={15}/>} Descargar</button>
                </>}
                <button type="button" onClick={() => abrirEdicion(punto)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100"><Edit3 size={15}/> Modificar</button>
                <button type="button" onClick={() => setPorBorrar(punto)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100"><Trash2 size={15}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {formulario && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4">
          <div className="my-4 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h3 className="text-lg font-black text-slate-800">{formulario.id ? 'Modificar punto resolutivo' : 'Nuevo punto resolutivo'}</h3>
              <button type="button" onClick={() => setFormulario(null)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={20}/></button>
            </div>
            <div className="space-y-4 p-5">
              <Campo id="punto-titulo" label="Título de la resolución *">
                <input id="punto-titulo" value={formulario.titulo} onChange={evento => setFormulario(actual => ({ ...actual, titulo: evento.target.value }))} className={inputCls} placeholder="Ej: Punto resolutivo 12-2026, aprobación de tarifario"/>
              </Campo>
              <Campo id="punto-fecha" label="Fecha de resolución">
                <input id="punto-fecha" type="date" value={formulario.fecha_resolucion || ''} onChange={evento => setFormulario(actual => ({ ...actual, fecha_resolucion: evento.target.value }))} className={inputCls}/>
              </Campo>
              <Campo id="punto-notas" label="Notas (opcional)">
                <textarea id="punto-notas" rows={3} value={formulario.notas} onChange={evento => setFormulario(actual => ({ ...actual, notas: evento.target.value }))} className={`${inputCls} resize-y`}/>
              </Campo>
              <Campo id="punto-archivo" label="Documento escaneado" ayuda="PDF o imagen, hasta 20 MB. La fecha de carga se registra sola.">
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                    <Upload size={17}/> {formulario.documento_path || archivo ? 'Reemplazar documento' : 'Cargar documento'}
                    <input id="punto-archivo" type="file" accept={TIPOS_ACEPTADOS} onChange={elegirArchivo} className="sr-only"/>
                  </label>
                  {(archivo || (formulario.documento_path && !quitarArchivo)) && (
                    <button type="button" onClick={() => { setArchivo(null); setQuitarArchivo(Boolean(formulario.documento_path)); }} className="min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">Quitar</button>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {archivo
                    ? `Nuevo: ${archivo.name} ${pesoLegible(archivo.size)}`
                    : quitarArchivo
                      ? 'Se quitará el documento actual al guardar.'
                      : formulario.documento_nombre || 'Sin documento.'}
                </p>
              </Campo>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setFormulario(null)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
              <button type="button" onClick={guardar} disabled={guardando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50">
                {guardando ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>} {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {porBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-black text-slate-800">Eliminar punto resolutivo</h3>
            <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">Se eliminará <strong>{porBorrar.titulo}</strong>{porBorrar.documento_path ? ', junto con su documento escaneado' : ''}. No se puede deshacer.</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPorBorrar(null)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
              <button type="button" onClick={eliminar} disabled={borrando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {borrando ? <Loader size={16} className="animate-spin"/> : <Trash2 size={16}/>} {borrando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
