// src/MiembrosComisionView.jsx — Miembros de la Comisión
//
// Quién ocupa cada cargo, con su rol designado, cumpleaños, número de colegiado
// y teléfono. Los cargos del reglamento vienen precargados: se puede sembrar la
// lista completa de una vez y luego ir anotando el nombre de cada uno.
//
// El directorio se imprime eligiendo con casillas qué datos salen, porque no
// siempre conviene repartir los teléfonos o los cumpleaños.

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Cake, Edit3, Loader, Phone, Plus, Printer, Save,
  Search, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import { supabase } from './supabaseClient.js';
import {
  CAMPOS_MIEMBRO,
  CAMPOS_POR_DEFECTO,
  cumpleanosProximos,
  formatCumpleanos,
  generateDirectorioMiembrosHTML,
  ordenarMiembros,
  CARGOS_COMISION,
  textoCuentaRegresiva,
} from './lib/miembrosComision.js';

const TABLA = 'caeduc_miembros_comision';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const buildStorageUrl = (path, bucket) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

// html2pdf desde CDN bajo demanda, igual que el resto de impresiones del área.
const loadHtml2Pdf = () => new Promise((resolve, reject) => {
  if (window.html2pdf) return resolve(window.html2pdf);
  const etiqueta = document.createElement('script');
  etiqueta.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
  etiqueta.onload = () => resolve(window.html2pdf);
  etiqueta.onerror = () => reject(new Error('No se pudo cargar el generador de PDF.'));
  document.body.appendChild(etiqueta);
});

const imprimirHTML = async (html, filename) => {
  const html2pdf = await loadHtml2Pdf();
  const marco = document.createElement('iframe');
  marco.style.cssText = 'position:fixed;right:-9999px;top:0;width:8.5in;height:11in;border:0;';
  document.body.appendChild(marco);
  try {
    const doc = marco.contentDocument || marco.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    await new Promise(listo => setTimeout(listo, 300));
    await Promise.all(Array.from(doc.images || []).map(img => (img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise(listo => { img.onload = listo; img.onerror = listo; setTimeout(listo, 4000); }))));
    await html2pdf().set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    }).from(doc.querySelector('.carta-page') || doc.body).save();
  } finally {
    document.body.removeChild(marco);
  }
};

const vacio = () => ({
  id: null,
  cargo: CARGOS_COMISION[0],
  nombre: '',
  rol_designado: '',
  cumpleanos: '',
  numero_colegiado: '',
  telefono: '',
});

const inputCls = 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

const Campo = ({ id, label, children, ayuda }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-bold text-slate-700">{label}</label>
    {children}
    {ayuda && <p className="mt-1.5 text-xs leading-5 text-slate-500">{ayuda}</p>}
  </div>
);

export default function MiembrosComisionView() {
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [porBorrar, setPorBorrar] = useState(null);
  const [sembrando, setSembrando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [dialogoImpresion, setDialogoImpresion] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_POR_DEFECTO);
  const [settings, setSettings] = useState({});

  const cargar = async () => {
    setCargando(true);
    const [resMiembros, resSettings] = await Promise.all([
      supabase.from(TABLA).select('*'),
      supabase.from('app_settings').select('key, value'),
    ]);
    if (resMiembros.error) setError(resMiembros.error.message);
    else {
      setError('');
      setMiembros(resMiembros.data || []);
    }
    if (resSettings.data) {
      setSettings(Object.fromEntries(resSettings.data.map(fila => [fila.key, fila.value])));
    }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const ordenados = useMemo(() => ordenarMiembros(miembros), [miembros]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return ordenados;
    return ordenados.filter(item => [item.nombre, item.cargo, item.rol_designado, item.numero_colegiado, item.telefono]
      .some(valor => String(valor || '').toLowerCase().includes(texto)));
  }, [ordenados, busqueda]);

  const proximosCumples = useMemo(() => cumpleanosProximos(miembros), [miembros]);

  const cargosLibres = useMemo(() => {
    const ocupados = new Set(miembros.map(item => item.cargo));
    return CARGOS_COMISION.filter(cargo => !ocupados.has(cargo));
  }, [miembros]);

  // Crea de una vez un espacio por cada cargo del reglamento, para solo anotar
  // el nombre en cada uno en vez de darlos de alta a mano.
  const sembrarCargos = async () => {
    if (!cargosLibres.length) return;
    setSembrando(true);
    setAviso('');
    const { error: fallo } = await supabase.from(TABLA).insert(
      cargosLibres.map(cargo => ({ cargo, nombre: '' })),
    );
    if (fallo) setAviso(`No se pudieron crear los cargos: ${fallo.message}`);
    else {
      await cargar();
      setAviso(`Se crearon ${cargosLibres.length} cargo(s). Ya puedes anotar el nombre de cada uno.`);
    }
    setSembrando(false);
  };

  const guardar = async () => {
    if (!formulario.cargo.trim()) {
      setAviso('Indica el cargo.');
      return;
    }
    setGuardando(true);
    setAviso('');
    const datos = {
      cargo: formulario.cargo.trim(),
      nombre: formulario.nombre.trim(),
      rol_designado: formulario.rol_designado.trim(),
      cumpleanos: formulario.cumpleanos || null,
      numero_colegiado: formulario.numero_colegiado.trim(),
      telefono: formulario.telefono.trim(),
    };
    const { error: fallo } = formulario.id
      ? await supabase.from(TABLA).update(datos).eq('id', formulario.id)
      : await supabase.from(TABLA).insert([datos]);
    if (fallo) setAviso(`No se pudo guardar: ${fallo.message}`);
    else {
      setFormulario(null);
      await cargar();
    }
    setGuardando(false);
  };

  const eliminar = async () => {
    if (!porBorrar) return;
    const { error: fallo } = await supabase.from(TABLA).delete().eq('id', porBorrar.id);
    if (fallo) setAviso(`No se pudo eliminar: ${fallo.message}`);
    else await cargar();
    setPorBorrar(null);
  };

  const alternarCampo = (campo) => setCampos(actuales => (
    actuales.includes(campo) ? actuales.filter(item => item !== campo) : [...actuales, campo]
  ));

  const imprimirDirectorio = async () => {
    setImprimiendo(true);
    setAviso('');
    try {
      const membreteUrl = settings.membrete_path
        ? buildStorageUrl(settings.membrete_path, 'firmas-sellos')
        : '/fondo-oficios.jpg';
      await imprimirHTML(
        generateDirectorioMiembrosHTML(miembros, campos, { membreteUrl }),
        'Miembros de la Comision - CAEDUC.pdf',
      );
      setDialogoImpresion(false);
    } catch (fallo) {
      setAviso(`No se pudo generar el PDF: ${fallo.message}`);
    }
    setImprimiendo(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800"><Users size={20} className="text-blue-600"/> Miembros de la Comisión</h2>
          <p className="text-sm text-gray-500">Quién ocupa cada cargo, con su rol designado, cumpleaños, colegiado y teléfono.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setCampos(CAMPOS_POR_DEFECTO); setDialogoImpresion(true); setAviso(''); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"><Printer size={17}/> Imprimir directorio</button>
          <button type="button" onClick={() => { setFormulario(vacio()); setAviso(''); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"><Plus size={18}/> Agregar miembro</button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0"/>
          <div>
            <p className="font-bold">No se pudo cargar el listado.</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-xs">Si dice que la tabla no existe, falta ejecutar <code className="rounded bg-red-100 px-1">supabase/2026_miembros_comision.sql</code> en el SQL Editor de Supabase. Si menciona la columna <code className="rounded bg-red-100 px-1">cargo</code>, falta <code className="rounded bg-red-100 px-1">supabase/2026_miembros_cargo.sql</code>.</p>
          </div>
        </div>
      )}

      {aviso && <p role="status" aria-live="polite" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{aviso}</p>}

      {proximosCumples.length > 0 && (
        <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-pink-900"><Cake size={17}/> Cumpleaños de esta semana</p>
          <ul className="mt-2 space-y-1">
            {proximosCumples.map(item => (
              <li key={item.id} className="text-sm text-pink-900">
                <strong>{item.nombre || item.cargo}</strong> · {formatCumpleanos(item.cumpleanos)} — {textoCuentaRegresiva(item.diasParaCumpleanos)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400"/>
          <input aria-label="Buscar miembro" value={busqueda} onChange={evento => setBusqueda(evento.target.value)} placeholder="Buscar por nombre, cargo o teléfono" className="min-h-11 w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
        </div>
        {cargosLibres.length > 0 && !cargando && !error && (
          <button type="button" onClick={sembrarCargos} disabled={sembrando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
            {sembrando ? <Loader size={16} className="animate-spin"/> : <UserPlus size={16}/>} Crear los {cargosLibres.length} cargos que faltan
          </button>
        )}
      </div>

      {cargando && <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-8 text-sm text-slate-500"><Loader size={18} className="animate-spin"/> Cargando miembros...</div>}

      {!cargando && !visibles.length && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <Users size={40} className="mx-auto text-slate-300"/>
          <p className="mt-3 font-bold text-slate-600">{miembros.length ? 'Ningún miembro coincide con la búsqueda.' : 'Todavía no hay miembros registrados.'}</p>
          {!miembros.length && <p className="mt-1 text-sm text-slate-500">Usa “Crear los cargos que faltan” para tener un espacio por cada cargo del reglamento.</p>}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {visibles.map(item => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{item.cargo || 'Sin cargo'}</p>
                <p className="mt-0.5 font-bold text-slate-800">{item.nombre || <span className="font-normal text-slate-400">Sin asignar</span>}</p>
                {item.rol_designado && <p className="mt-1 text-sm text-slate-600">{item.rol_designado}</p>}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {item.cumpleanos && <span className="flex items-center gap-1"><Cake size={13}/> {formatCumpleanos(item.cumpleanos)}</span>}
                  {item.numero_colegiado && <span>Colegiado {item.numero_colegiado}</span>}
                  {item.telefono && <span className="flex items-center gap-1"><Phone size={13}/> {item.telefono}</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => { setFormulario({ ...vacio(), ...item, cumpleanos: item.cumpleanos || '', nombre: item.nombre || '', rol_designado: item.rol_designado || '', numero_colegiado: item.numero_colegiado || '', telefono: item.telefono || '' }); setAviso(''); }} aria-label={`Editar ${item.cargo}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-blue-700 hover:bg-blue-50"><Edit3 size={16}/></button>
                <button type="button" onClick={() => setPorBorrar(item)} aria-label={`Eliminar ${item.cargo}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={16}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {formulario && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4">
          <div className="my-4 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h3 className="text-lg font-black text-slate-800">{formulario.id ? 'Editar miembro' : 'Agregar miembro'}</h3>
              <button type="button" onClick={() => setFormulario(null)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={20}/></button>
            </div>
            <div className="space-y-4 p-5">
              <Campo id="miembro-cargo" label="Cargo *" ayuda="Los del reglamento vienen precargados; también puedes escribir uno nuevo.">
                <input id="miembro-cargo" list="cargos-comision" value={formulario.cargo} onChange={evento => setFormulario(actual => ({ ...actual, cargo: evento.target.value }))} className={inputCls}/>
                <datalist id="cargos-comision">
                  {CARGOS_COMISION.map(cargo => <option key={cargo} value={cargo}/>)}
                </datalist>
              </Campo>
              <Campo id="miembro-nombre" label="Nombre">
                <input id="miembro-nombre" value={formulario.nombre} onChange={evento => setFormulario(actual => ({ ...actual, nombre: evento.target.value }))} className={inputCls}/>
              </Campo>
              <Campo id="miembro-rol" label="Rol designado" ayuda="Las funciones que le corresponden dentro de la comisión.">
                <textarea id="miembro-rol" rows={2} value={formulario.rol_designado} onChange={evento => setFormulario(actual => ({ ...actual, rol_designado: evento.target.value }))} className={`${inputCls} resize-y`}/>
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="miembro-cumple" label="Fecha de cumpleaños" ayuda="Avisa en el inicio la semana antes. El año no se imprime.">
                  <input id="miembro-cumple" type="date" value={formulario.cumpleanos} onChange={evento => setFormulario(actual => ({ ...actual, cumpleanos: evento.target.value }))} className={inputCls}/>
                </Campo>
                <Campo id="miembro-colegiado" label="Número de colegiado">
                  <input id="miembro-colegiado" inputMode="numeric" value={formulario.numero_colegiado} onChange={evento => setFormulario(actual => ({ ...actual, numero_colegiado: evento.target.value }))} className={inputCls}/>
                </Campo>
              </div>
              <Campo id="miembro-telefono" label="Número de teléfono">
                <input id="miembro-telefono" type="tel" inputMode="tel" value={formulario.telefono} onChange={evento => setFormulario(actual => ({ ...actual, telefono: evento.target.value }))} className={inputCls}/>
              </Campo>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setFormulario(null)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
              <button type="button" onClick={guardar} disabled={guardando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {guardando ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>} {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogoImpresion && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4">
          <div className="my-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h3 className="text-lg font-black text-slate-800">Imprimir directorio</h3>
                <p className="mt-1 text-sm text-slate-500">Marca qué datos deben salir en el informe.</p>
              </div>
              <button type="button" onClick={() => setDialogoImpresion(false)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={20}/></button>
            </div>
            <div className="space-y-2 p-5">
              {CAMPOS_MIEMBRO.map(item => (
                <label key={item.campo} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${campos.includes(item.campo) ? 'border-blue-400 bg-blue-50 font-bold text-blue-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={campos.includes(item.campo)} onChange={() => alternarCampo(item.campo)} className="h-4 w-4 accent-blue-600"/>
                  {item.label}
                </label>
              ))}
              <p className="pt-1 text-xs text-slate-500">
                {campos.length
                  ? `Saldrán ${campos.length} columna(s) para ${miembros.length} miembro(s).`
                  : 'Sin nada marcado se imprimen cargo, nombre, rol y teléfono.'}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDialogoImpresion(false)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
              <button type="button" onClick={imprimirDirectorio} disabled={imprimiendo} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {imprimiendo ? <Loader size={16} className="animate-spin"/> : <Printer size={16}/>} {imprimiendo ? 'Generando...' : 'Generar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {porBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-black text-slate-800">Eliminar miembro</h3>
            <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">Se eliminará <strong>{porBorrar.nombre || porBorrar.cargo}</strong> del directorio. No se puede deshacer.</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPorBorrar(null)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
              <button type="button" onClick={eliminar} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"><Trash2 size={16}/> Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
