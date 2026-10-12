// src/OficioDocumentos.jsx — Documentos adjuntos de un oficio
//
// Un oficio puede acumular varios documentos con el tiempo: el punto resolutivo,
// la respuesta de Junta Directiva, una certificación, etc. Cada archivo es una
// fila de caeduc_oficio_documentos con su etiqueta, y la fecha de carga la
// registra la base de datos sola. Los archivos van al bucket privado de puntos
// resolutivos y se ven o descargan con enlaces firmados de corta duración.

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Download, Eye, Loader, Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import { supabase } from './supabaseClient.js';
import { extensionArchivo, nombreSeguro } from './lib/expedientePonentes.js';

const TABLA = 'caeduc_oficio_documentos';
const BUCKET = 'caeduc-puntos-resolutivos';
const MAX_ARCHIVO = 20 * 1024 * 1024;
const TIPOS_ACEPTADOS = 'application/pdf,image/jpeg,image/png,image/webp';
const ETIQUETAS_SUGERIDAS = ['Punto resolutivo', 'Respuesta de Junta Directiva', 'Certificación', 'Informe de uso'];

const fechaHora = (valor) => {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
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

export default function OficioDocumentos({ oficioId }) {
  const idOficio = String(oficioId);
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [etiqueta, setEtiqueta] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [ocupado, setOcupado] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from(TABLA)
      .select('*')
      .eq('oficio_id', idOficio)
      .order('created_at', { ascending: true });
    setCargando(false);
    if (error) {
      setAviso(`No se pudieron cargar los documentos: ${error.message}`);
      return;
    }
    setDocumentos(data || []);
  }, [idOficio]);

  useEffect(() => { cargar(); }, [cargar]);

  const elegirArchivos = (evento) => {
    const elegidos = Array.from(evento.target.files || []);
    const grandes = elegidos.filter(archivo => archivo.size > MAX_ARCHIVO);
    if (grandes.length) {
      setAviso(`Estos archivos pasan de 20 MB y no se pueden subir: ${grandes.map(a => a.name).join(', ')}`);
    } else {
      setAviso('');
    }
    setArchivos(elegidos.filter(archivo => archivo.size <= MAX_ARCHIVO));
  };

  const cancelar = () => {
    setAgregando(false);
    setEtiqueta('');
    setArchivos([]);
  };

  const subir = async () => {
    if (!archivos.length) {
      setAviso('Selecciona al menos un archivo.');
      return;
    }
    setSubiendo(true);
    setAviso('');
    const fallidos = [];
    for (const archivo of archivos) {
      const extension = extensionArchivo(archivo.name);
      const base = nombreSeguro(archivo.name.replace(/\.[^.]+$/, ''), 'documento').replace(/\s+/g, '_');
      const ruta = `oficios/${idOficio}/${Date.now()}_${base}.${extension}`;
      const { error: errorSubida } = await supabase.storage
        .from(BUCKET)
        .upload(ruta, archivo, { upsert: false, contentType: archivo.type });
      if (errorSubida) {
        fallidos.push(`${archivo.name}: ${errorSubida.message}`);
        continue;
      }
      const { error: errorFila } = await supabase.from(TABLA).insert([{
        oficio_id: idOficio,
        etiqueta: etiqueta.trim() || null,
        archivo_path: ruta,
        archivo_nombre: archivo.name,
        archivo_tamano: archivo.size,
      }]);
      if (errorFila) {
        // Sin fila el archivo quedaría huérfano en el bucket.
        await supabase.storage.from(BUCKET).remove([ruta]);
        fallidos.push(`${archivo.name}: ${errorFila.message}`);
      }
    }
    setSubiendo(false);
    if (fallidos.length) setAviso(`No se pudieron guardar: ${fallidos.join(' · ')}`);
    else cancelar();
    cargar();
  };

  const ver = async (documento) => {
    setOcupado(documento.id);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(documento.archivo_path, 300);
    setOcupado('');
    if (error || !data?.signedUrl) {
      setAviso(`No se pudo abrir el documento: ${error?.message || 'enlace no disponible'}`);
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const descargar = async (documento) => {
    setOcupado(documento.id);
    const { data, error } = await supabase.storage.from(BUCKET).download(documento.archivo_path);
    setOcupado('');
    if (error) {
      setAviso(`No se pudo descargar: ${error.message}`);
      return;
    }
    descargarBlob(data, documento.archivo_nombre || `documento.${extensionArchivo(documento.archivo_path)}`);
  };

  const eliminar = async (documento) => {
    if (!window.confirm(`¿Eliminar "${documento.archivo_nombre || 'documento'}"?`)) return;
    setOcupado(documento.id);
    const { error } = await supabase.from(TABLA).delete().eq('id', documento.id);
    if (error) {
      setOcupado('');
      setAviso(`No se pudo eliminar: ${error.message}`);
      return;
    }
    await supabase.storage.from(BUCKET).remove([documento.archivo_path]);
    setOcupado('');
    cargar();
  };

  return (
    <div className="border-t pt-3 mt-1" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Paperclip size={12}/> Documentos adjuntos</span>
        {!agregando && (
          <button onClick={() => setAgregando(true)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus size={11}/> Agregar</button>
        )}
      </div>

      {aviso && (
        <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
          <AlertCircle size={13} className="mt-0.5 shrink-0"/>
          <span>
            {aviso}
            {/relation|does not exist|schema cache/i.test(aviso) && (
              <> — falta ejecutar <code className="rounded bg-red-100 px-1">supabase/2026_oficio_documentos.sql</code> en el SQL Editor de Supabase.</>
            )}
          </span>
        </div>
      )}

      {cargando && <p className="flex items-center gap-1.5 text-xs text-gray-400"><Loader size={12} className="animate-spin"/> Cargando documentos...</p>}
      {!cargando && documentos.length === 0 && !agregando && <p className="text-xs text-gray-400">Sin documentos adjuntos.</p>}

      {documentos.length > 0 && (
        <ul className="space-y-1.5">
          {documentos.map(documento => (
            <li key={documento.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-white px-2.5 py-2">
              <div className="min-w-0 flex-1">
                {documento.etiqueta && <span className="mr-1.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200">{documento.etiqueta}</span>}
                <span className="break-all text-xs text-gray-700">{documento.archivo_nombre}</span>
                <p className="text-[11px] text-gray-400">Cargado {fechaHora(documento.created_at)}</p>
              </div>
              {ocupado === documento.id ? <Loader size={13} className="animate-spin text-gray-400"/> : (
                <div className="flex gap-1.5">
                  <button onClick={() => ver(documento)} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs hover:bg-blue-100 flex items-center gap-1"><Eye size={11}/> Ver</button>
                  <button onClick={() => descargar(documento)} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded text-xs hover:bg-indigo-100 flex items-center gap-1"><Download size={11}/> Descargar</button>
                  <button onClick={() => eliminar(documento)} aria-label="Eliminar documento" className="bg-red-50 text-red-500 px-2 py-1 rounded text-xs hover:bg-red-100 flex items-center"><Trash2 size={11}/></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {agregando && (
        <div className="mt-2 space-y-2 bg-white border rounded-lg p-3">
          <input
            list="oficio-documento-etiquetas"
            placeholder="Etiqueta (ej: Respuesta de Junta Directiva)"
            className="w-full border p-2 rounded text-sm"
            value={etiqueta}
            onChange={e => setEtiqueta(e.target.value)}
          />
          <datalist id="oficio-documento-etiquetas">
            {ETIQUETAS_SUGERIDAS.map(opcion => <option key={opcion} value={opcion}/>)}
          </datalist>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Archivos (PDF/imagen, máx. 20 MB c/u) — puedes elegir varios</label>
            <input type="file" multiple accept={TIPOS_ACEPTADOS} className="text-xs w-full" onChange={elegirArchivos}/>
          </div>
          <div className="flex gap-2">
            <button disabled={subiendo || !archivos.length} onClick={subir} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
              {subiendo ? <><Loader size={12} className="animate-spin"/> Subiendo...</> : <><Upload size={12}/> Subir {archivos.length > 1 ? `${archivos.length} archivos` : ''}</>}
            </button>
            <button disabled={subiendo} onClick={cancelar} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-xs hover:bg-gray-200">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
