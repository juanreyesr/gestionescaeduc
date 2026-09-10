// src/ExpedientePonentesView.jsx — Expediente de documentos del ponente
//
// Reúne los papeles que Tesorería pide para pagarle a cada profesional: CV, RTU,
// DPI, último título, factura e informe de actividad firmado. El expediente se
// abre desde una actividad ya registrada en Solicitud de publicación, así que los
// datos de la actividad y del ponente no se vuelven a escribir.
//
// Los documentos se cargan de a poco y, cuando ya está lo necesario, un solo
// botón los descarga todos juntos en un ZIP con una carpeta por expediente.
// El bucket es privado (aquí hay DPI y RTU): se accede con enlaces firmados.

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle, Download, Eye, FileText, FolderDown, Loader,
  Plus, Search, Trash2, Upload, User, X,
} from 'lucide-react';
import { supabase } from './supabaseClient.js';
import {
  agruparDocumentos,
  DOCUMENTOS_PONENTE,
  documentoLabel,
  expedienteDesdePublicacion,
  extensionArchivo,
  nombreZipExpediente,
  normalizarIncluidosEnCv,
  planDescargaExpediente,
  progresoExpediente,
  puedeIrEnCv,
} from './lib/expedientePonentes.js';
import { formatRegistroDate } from './lib/registroActividadesReport.js';
import { formatHoraActividad } from './lib/pagoPonentes.js';

const TABLA_EXPEDIENTES = 'caeduc_expediente_ponentes';
const TABLA_DOCUMENTOS = 'caeduc_expediente_documentos';
const BUCKET = 'caeduc-expedientes';
const MAX_ARCHIVO = 20 * 1024 * 1024;
const TIPOS_ACEPTADOS = 'application/pdf,image/jpeg,image/png,image/webp';

// JSZip se carga desde CDN solo cuando se pide la descarga, igual que html2pdf
// en las cartas: no entra en el paquete inicial de la app.
const cargarJSZip = () => new Promise((resolve, reject) => {
  if (window.JSZip) return resolve(window.JSZip);
  const etiqueta = document.createElement('script');
  etiqueta.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  etiqueta.onload = () => resolve(window.JSZip);
  etiqueta.onerror = () => reject(new Error('No se pudo cargar el compresor de archivos.'));
  document.body.appendChild(etiqueta);
});

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

const fechaHora = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function ExpedientePonentesView({ publicaciones = [] }) {
  const [expedientes, setExpedientes] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [eligiendo, setEligiendo] = useState(false);
  const [seleccion, setSeleccion] = useState('');
  const [creando, setCreando] = useState(false);
  const [abierto, setAbierto] = useState('');
  const [subiendo, setSubiendo] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [zip, setZip] = useState('');
  const [porBorrar, setPorBorrar] = useState(null);

  const cargar = async () => {
    setCargando(true);
    const [resExpedientes, resDocumentos] = await Promise.all([
      supabase.from(TABLA_EXPEDIENTES).select('*').order('created_at', { ascending: false }),
      supabase.from(TABLA_DOCUMENTOS).select('*').order('created_at', { ascending: true }),
    ]);
    const fallo = resExpedientes.error || resDocumentos.error;
    if (fallo) setError(fallo.message);
    else {
      setError('');
      setExpedientes(resExpedientes.data || []);
      setDocumentos(resDocumentos.data || []);
    }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const documentosDe = (expedienteId) => documentos.filter(item => item.expediente_id === expedienteId);

  // Actividades que aún no tienen expediente: no tiene sentido abrir dos para la misma.
  const actividadesDisponibles = useMemo(() => {
    const yaAbiertas = new Set(expedientes.map(item => item.publicacion_id).filter(Boolean));
    return publicaciones.filter(item => item.actividad_nombre && !yaAbiertas.has(item.id));
  }, [publicaciones, expedientes]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return expedientes;
    return expedientes.filter(item => [item.ponente_nombre, item.actividad_nombre, item.actividad_fecha]
      .some(valor => String(valor || '').toLowerCase().includes(texto)));
  }, [expedientes, busqueda]);

  const crearExpediente = async () => {
    const publicacion = actividadesDisponibles.find(item => item.id === seleccion);
    if (!publicacion) {
      setAviso('Selecciona una actividad.');
      return;
    }
    setCreando(true);
    const { data, error: fallo } = await supabase
      .from(TABLA_EXPEDIENTES)
      .insert([expedienteDesdePublicacion(publicacion)])
      .select()
      .single();
    setCreando(false);
    if (fallo) {
      setAviso(`No se pudo abrir el expediente: ${fallo.message}`);
      return;
    }
    setEligiendo(false);
    setSeleccion('');
    setAviso('');
    await cargar();
    setAbierto(data.id);
  };

  const subirDocumento = async (expediente, tipo, evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    if (archivo.size > MAX_ARCHIVO) {
      setAviso('Cada documento debe pesar 20 MB o menos.');
      return;
    }
    const clave = `${expediente.id}-${tipo}`;
    setSubiendo(clave);
    setAviso('');
    const ruta = `${expediente.id}/${tipo}/${crypto.randomUUID()}.${extensionArchivo(archivo.name)}`;
    try {
      const { error: falloSubida } = await supabase.storage
        .from(BUCKET)
        .upload(ruta, archivo, { upsert: false, contentType: archivo.type });
      if (falloSubida) throw falloSubida;
      // La fecha de carga la pone la base (created_at por defecto).
      const { error: falloRegistro } = await supabase.from(TABLA_DOCUMENTOS).insert([{
        expediente_id: expediente.id,
        tipo,
        archivo_path: ruta,
        archivo_nombre: archivo.name,
        archivo_tamano: archivo.size,
      }]);
      if (falloRegistro) throw falloRegistro;
      await cargar();
    } catch (fallo) {
      await supabase.storage.from(BUCKET).remove([ruta]);
      // El tipo de documento está limitado por un CHECK en la base. Si es uno
      // agregado después, hay que correr su migración antes de poder usarlo.
      setAviso(/tipo_check|violates check constraint/i.test(fallo.message || '')
        ? `La base todavía no admite el documento "${documentoLabel(tipo)}": falta ejecutar supabase/2026_expediente_colegiado_activo.sql en el SQL Editor de Supabase.`
        : `No se pudo cargar el documento: ${fallo.message}`);
    } finally {
      setSubiendo('');
    }
  };

  // Marca (o desmarca) un documento como incluido dentro del CV. Se actualiza en
  // pantalla de inmediato y se revierte si la base rechaza el cambio.
  const alternarEnCv = async (expediente, tipo) => {
    if (!puedeIrEnCv(tipo)) return;
    const actuales = normalizarIncluidosEnCv(expediente.incluidos_en_cv);
    const siguiente = actuales.includes(tipo)
      ? actuales.filter(item => item !== tipo)
      : [...actuales, tipo];
    const aplicar = (valor) => setExpedientes(prev => prev.map(
      item => (item.id === expediente.id ? { ...item, incluidos_en_cv: valor } : item),
    ));
    aplicar(siguiente);
    setAviso('');
    const { error: fallo } = await supabase
      .from(TABLA_EXPEDIENTES)
      .update({ incluidos_en_cv: siguiente })
      .eq('id', expediente.id);
    if (fallo) {
      aplicar(actuales);
      setAviso(/incluidos_en_cv/.test(fallo.message || '')
        ? 'Falta ejecutar supabase/2026_expediente_incluidos_en_cv.sql en el SQL Editor de Supabase para poder marcar documentos como incluidos en el CV.'
        : `No se pudo guardar la marca: ${fallo.message}`);
    }
  };

  const verDocumento = async (documento) => {
    setOcupado(documento.id);
    const { data, error: fallo } = await supabase.storage.from(BUCKET).createSignedUrl(documento.archivo_path, 300);
    setOcupado('');
    if (fallo || !data?.signedUrl) {
      setAviso(`No se pudo abrir el documento: ${fallo?.message || 'enlace no disponible'}`);
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const descargarDocumento = async (documento) => {
    setOcupado(documento.id);
    const { data, error: fallo } = await supabase.storage.from(BUCKET).download(documento.archivo_path);
    setOcupado('');
    if (fallo) {
      setAviso(`No se pudo descargar: ${fallo.message}`);
      return;
    }
    descargarBlob(data, documento.archivo_nombre || 'documento');
  };

  const eliminarDocumento = async (documento) => {
    setOcupado(documento.id);
    const { error: fallo } = await supabase.from(TABLA_DOCUMENTOS).delete().eq('id', documento.id);
    if (fallo) setAviso(`No se pudo eliminar: ${fallo.message}`);
    else {
      await supabase.storage.from(BUCKET).remove([documento.archivo_path]);
      await cargar();
    }
    setOcupado('');
  };

  // Todos los documentos cargados, juntos, en una carpeta dentro de un ZIP.
  const descargarTodo = async (expediente) => {
    const plan = planDescargaExpediente(expediente, documentosDe(expediente.id));
    if (!plan.length) {
      setAviso('Este expediente todavía no tiene documentos cargados.');
      return;
    }
    setZip(expediente.id);
    setAviso('');
    try {
      const JSZip = await cargarJSZip();
      const paquete = new JSZip();
      const fallidos = [];
      for (const item of plan) {
        // En serie a propósito: son pocos archivos y así no se satura la conexión
        // ni se disparan los límites de descarga de Storage.
        // eslint-disable-next-line no-await-in-loop
        const { data, error: fallo } = await supabase.storage.from(BUCKET).download(item.archivo_path);
        if (fallo || !data) fallidos.push(item.ruta);
        else paquete.file(item.ruta, data);
      }
      if (fallidos.length === plan.length) throw new Error('No se pudo descargar ningún documento.');
      const blob = await paquete.generateAsync({ type: 'blob' });
      descargarBlob(blob, nombreZipExpediente(expediente));
      setAviso(fallidos.length
        ? `Se descargaron ${plan.length - fallidos.length} de ${plan.length} documentos. No se pudieron incluir: ${fallidos.join(', ')}.`
        : `Listo: ${plan.length} documento${plan.length === 1 ? '' : 's'} en una sola carpeta.`);
    } catch (fallo) {
      setAviso(`No se pudo armar la descarga: ${fallo.message}`);
    } finally {
      setZip('');
    }
  };

  const eliminarExpediente = async () => {
    if (!porBorrar) return;
    const suyos = documentosDe(porBorrar.id);
    const { error: fallo } = await supabase.from(TABLA_EXPEDIENTES).delete().eq('id', porBorrar.id);
    if (fallo) setAviso(`No se pudo eliminar: ${fallo.message}`);
    else {
      if (suyos.length) await supabase.storage.from(BUCKET).remove(suyos.map(item => item.archivo_path));
      await cargar();
    }
    setPorBorrar(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800"><FolderDown size={22} className="text-emerald-600"/> Expediente de ponentes</h2>
          <p className="text-sm text-gray-500">Los documentos que Tesorería pide para pagarle a cada profesional, reunidos por actividad.</p>
        </div>
        <button type="button" onClick={() => { setEligiendo(true); setAviso(''); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700">
          <Plus size={19}/> Abrir expediente
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

      {aviso && <p role="status" aria-live="polite" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{aviso}</p>}

      <div className="relative max-w-md">
        <Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400"/>
        <input aria-label="Buscar expediente" value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Buscar por ponente o actividad" className="min-h-11 w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
      </div>

      {cargando && <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-8 text-sm text-slate-500"><Loader size={18} className="animate-spin"/> Cargando expedientes...</div>}

      {!cargando && !visibles.length && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <FolderDown size={40} className="mx-auto text-slate-300"/>
          <p className="mt-3 font-bold text-slate-600">{expedientes.length ? 'Ningún expediente coincide con la búsqueda.' : 'Todavía no hay expedientes abiertos.'}</p>
          {!expedientes.length && <p className="mt-1 text-sm text-slate-500">Usa “Abrir expediente” y elige una actividad de Solicitud de publicación.</p>}
        </div>
      )}

      <div className="space-y-3">
        {visibles.map(expediente => {
          const suyos = documentosDe(expediente.id);
          const enCv = normalizarIncluidosEnCv(expediente.incluidos_en_cv);
          const avance = progresoExpediente(suyos, enCv);
          const desplegado = abierto === expediente.id;
          return (
            <div key={expediente.id} className={`rounded-xl border bg-white shadow-sm ${desplegado ? 'border-emerald-300' : 'border-slate-200'}`}>
              <button type="button" onClick={() => setAbierto(desplegado ? '' : expediente.id)} aria-expanded={desplegado} className="flex w-full items-center gap-3 p-4 text-left">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${avance.completo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {avance.completo ? <CheckCircle size={20}/> : <User size={20}/>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-slate-800">{expediente.ponente_nombre || 'Profesional pendiente'}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {expediente.actividad_nombre || 'Actividad sin nombre'}
                    {expediente.actividad_fecha ? ` · ${formatRegistroDate(expediente.actividad_fecha)}` : ''}
                    {expediente.actividad_hora ? ` · ${formatHoraActividad(expediente.actividad_hora)}` : ''}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${avance.completo ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {avance.cargados}/{avance.total}
                </span>
                <Plus size={18} className={`shrink-0 text-slate-400 transition-transform ${desplegado ? 'rotate-45' : ''}`} aria-hidden="true"/>
              </button>

              {desplegado && (
                <div className="border-t border-slate-100 p-4">
                  {expediente.ponente_grado && <p className="mb-3 text-xs text-slate-500">Grado académico registrado: <strong className="text-slate-700">{expediente.ponente_grado}</strong></p>}

                  <div className="space-y-2">
                    {agruparDocumentos(suyos).map(grupo => {
                      const clave = `${expediente.id}-${grupo.tipo}`;
                      const marcadoEnCv = enCv.includes(grupo.tipo);
                      const resuelto = grupo.documentos.length > 0 || marcadoEnCv;
                      return (
                        <div key={grupo.tipo} className={`rounded-lg border p-3 ${resuelto ? 'border-emerald-200 bg-emerald-50/40' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-700">{grupo.label}{grupo.documentos.length > 1 ? ` (${grupo.documentos.length})` : ''}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              {puedeIrEnCv(grupo.tipo) && (
                                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">
                                  <input type="checkbox" checked={marcadoEnCv} onChange={() => alternarEnCv(expediente, grupo.tipo)} className="h-4 w-4 accent-emerald-600"/>
                                  Va dentro del CV
                                </label>
                              )}
                              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50">
                                {subiendo === clave ? <Loader size={15} className="animate-spin"/> : <Upload size={15}/>}
                                {grupo.documentos.length ? 'Agregar otro' : 'Cargar'}
                                <input type="file" accept={TIPOS_ACEPTADOS} disabled={subiendo === clave} onChange={evento => subirDocumento(expediente, grupo.tipo, evento)} className="sr-only"/>
                              </label>
                            </div>
                          </div>
                          {!grupo.documentos.length && (
                            <p className={`mt-1 text-xs ${marcadoEnCv ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>
                              {marcadoEnCv ? 'Incluido dentro del Curriculum Vitae.' : 'Pendiente.'}
                            </p>
                          )}
                          {grupo.documentos.map(documento => (
                            <div key={documento.id} className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white p-2 ring-1 ring-slate-200">
                              <FileText size={15} className="shrink-0 text-slate-400"/>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-slate-700">{documento.archivo_nombre}</span>
                                <span className="block text-xs text-slate-400">Cargado: {fechaHora(documento.created_at)}</span>
                              </span>
                              <button type="button" disabled={ocupado === documento.id} onClick={() => verDocumento(documento)} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Eye size={14}/> Ver</button>
                              <button type="button" disabled={ocupado === documento.id} onClick={() => descargarDocumento(documento)} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><Download size={14}/></button>
                              <button type="button" disabled={ocupado === documento.id} onClick={() => eliminarDocumento(documento)} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={14}/></button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  {!avance.completo && <p className="mt-3 text-xs text-amber-700">Falta cargar: {avance.faltantesTexto}.</p>}
                  {avance.faltaElCv && <p className="mt-1 text-xs font-bold text-amber-700">Hay documentos marcados como incluidos en el CV, pero el CV todavía no está cargado.</p>}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => descargarTodo(expediente)} disabled={zip === expediente.id || !suyos.length} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                      {zip === expediente.id ? <Loader size={18} className="animate-spin"/> : <FolderDown size={18}/>}
                      {zip === expediente.id ? 'Preparando...' : 'Descargar documentos para factura'}
                    </button>
                    <button type="button" onClick={() => setPorBorrar(expediente)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-100"><Trash2 size={16}/> Eliminar expediente</button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Se descarga un ZIP con una carpeta que contiene todos los documentos cargados, numerados en el orden en que los pide Tesorería.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {eligiendo && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4">
          <div className="my-4 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-black text-slate-800">Abrir expediente</h3>
                <p className="text-xs text-slate-500">Los datos del ponente y de la actividad se toman de Solicitud de publicación.</p>
              </div>
              <button type="button" onClick={() => setEligiendo(false)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={20}/></button>
            </div>
            <div className="space-y-4 p-5">
              <label htmlFor="expediente-actividad" className="block text-sm font-bold text-slate-700">Actividad</label>
              <select id="expediente-actividad" value={seleccion} onChange={evento => setSeleccion(evento.target.value)} disabled={!actividadesDisponibles.length} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50">
                <option value="">{actividadesDisponibles.length ? 'Selecciona una actividad...' : 'Todas las actividades ya tienen expediente'}</option>
                {actividadesDisponibles.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.actividad_nombre} — {item.ponente_nombre || 'Sin ponente'}{item.actividad_fecha ? ` (${item.actividad_fecha})` : ''}
                  </option>
                ))}
              </select>
              {seleccion && (() => {
                const elegida = actividadesDisponibles.find(item => item.id === seleccion);
                if (!elegida) return null;
                return (
                  <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                    <p><span className="block text-xs font-bold uppercase text-slate-400">Ponente</span>{elegida.ponente_nombre || 'Pendiente'}</p>
                    <p><span className="block text-xs font-bold uppercase text-slate-400">Grado académico</span>{elegida.ponente_grado || 'Sin definir'}</p>
                    <p><span className="block text-xs font-bold uppercase text-slate-400">Fecha</span>{elegida.actividad_fecha ? formatRegistroDate(elegida.actividad_fecha) : 'Pendiente'}</p>
                    <p><span className="block text-xs font-bold uppercase text-slate-400">Hora</span>{formatHoraActividad(elegida.actividad_hora) || 'Pendiente'}</p>
                  </div>
                );
              })()}
              <p className="text-xs text-slate-500">Después podrás cargar de a poco: {DOCUMENTOS_PONENTE.map(item => item.corto).join(', ')}.</p>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEligiendo(false)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
              <button type="button" onClick={crearExpediente} disabled={creando || !seleccion} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                {creando ? <Loader size={16} className="animate-spin"/> : <Plus size={16}/>} {creando ? 'Abriendo...' : 'Abrir expediente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {porBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-black text-slate-800">Eliminar expediente</h3>
            <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              Se eliminará el expediente de <strong>{porBorrar.ponente_nombre || 'este profesional'}</strong> y sus {documentosDe(porBorrar.id).length} documento(s) cargados. No se puede deshacer.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPorBorrar(null)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
              <button type="button" onClick={eliminarExpediente} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"><Trash2 size={16}/> Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
