// src/InformeLaboresView.jsx — Informe de labores para Junta Directiva
//
// Se eligen las fechas, el sistema trae las actividades del calendario del
// Aula Virtual y las solicitudes de publicación que aún no están en él, y la
// persona revisa cada una: participantes (presencial y virtual en un solo
// número), modalidad, o si se excluye. Esas correcciones se guardan. Al final
// se genera el informe paginado con el membrete y la firma del Coordinador.

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CalendarRange, CheckCircle2, Download, Eye, Loader, RefreshCw,
} from 'lucide-react';
import { supabase } from './supabaseClient.js';
import {
  ALTO_CONTENIDO,
  ANCHO_CONTENIDO,
  componerPaginas,
  construirBloques,
  etiquetaPeriodo,
  fechaLarga,
  MODALIDADES,
  nombreArchivoLabores,
  nombreMes,
  paginarBloques,
  resumirPorMes,
  reunirActividades,
} from './lib/informeLabores.js';

const TABLA_AJUSTES = 'caeduc_informe_labores_ajustes';
const SQL = 'supabase/2026_informe_labores.sql';

const hoyISO = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const inputClass = 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

// Solo se culpa al SQL pendiente cuando el error nombra la función o la tabla
// de este informe; cualquier otro error se muestra tal cual para diagnosticarlo.
const faltaSQL = (mensaje = '') => /caeduc_informe_labores/i.test(mensaje)
  && /does not exist|schema cache|Could not find/i.test(mensaje);

// Mide cada bloque con el mismo ancho y tipografía del área útil de la página
// y lo reparte en páginas carta.
const paginarEnNavegador = (bloques) => {
  const medidor = document.createElement('div');
  medidor.style.cssText = `position:fixed;left:-10000px;top:0;width:${ANCHO_CONTENIDO}px;font-family:'Segoe UI',Arial,sans-serif;visibility:hidden;`;
  document.body.appendChild(medidor);
  const medir = (html) => {
    const caja = document.createElement('div');
    caja.style.display = 'flow-root';
    caja.innerHTML = html;
    medidor.appendChild(caja);
    const alto = caja.getBoundingClientRect().height;
    medidor.removeChild(caja);
    return Math.ceil(alto);
  };
  try {
    const alturas = bloques.map(item => medir(item.html));
    const cache = {};
    return paginarBloques(bloques, alturas, ALTO_CONTENIDO, html => (cache[html] ??= medir(html)));
  } finally {
    document.body.removeChild(medidor);
  }
};

const Tarjeta = ({ valor, etiqueta, tono }) => (
  <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tono}`}>
    <p className="text-2xl font-black tabular-nums">{new Intl.NumberFormat('es-GT').format(valor)}</p>
    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{etiqueta}</p>
  </div>
);

export default function InformeLaboresView({ publicaciones = [], membreteUrl, firmante, onPreview, onDownload }) {
  const anio = hoyISO().slice(0, 4);
  const [desde, setDesde] = useState(`${anio}-01-01`);
  const [hasta, setHasta] = useState(hoyISO());
  const [fechaInforme, setFechaInforme] = useState(hoyISO());
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [datosAula, setDatosAula] = useState(null);
  const [ajustes, setAjustes] = useState({});
  const [generando, setGenerando] = useState('');

  const cargar = async () => {
    if (!desde || !hasta || desde > hasta) {
      setAviso({ tipo: 'error', texto: 'Revisa las fechas: la fecha inicial debe ser anterior a la final.' });
      return;
    }
    setCargando(true);
    setAviso(null);
    const [{ data, error }, ajustesResp] = await Promise.all([
      supabase.rpc('caeduc_informe_labores_datos', { p_desde: desde, p_hasta: hasta }),
      supabase.from(TABLA_AJUSTES).select('*'),
    ]);
    setCargando(false);
    if (error) {
      setDatosAula({ actividades: [], certificados: [] });
      setAviso({
        tipo: 'error',
        texto: faltaSQL(error.message)
          ? `No se pudieron leer los datos del Aula Virtual: falta ejecutar ${SQL} en el SQL Editor de Supabase (${error.message}). Por ahora solo se muestran las solicitudes de publicación.`
          : `No se pudieron leer los datos del Aula Virtual: ${error.message}. Por ahora solo se muestran las solicitudes de publicación.`,
      });
    } else {
      setDatosAula({ actividades: data?.actividades || [], certificados: data?.certificados || [] });
    }
    if (!ajustesResp.error) {
      setAjustes(Object.fromEntries((ajustesResp.data || []).map(fila => [fila.clave, fila])));
    }
  };

  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const actividades = useMemo(() => (datosAula
    ? reunirActividades({ aula: datosAula.actividades, publicaciones, desde, hasta, ajustes })
    : []), [datosAula, publicaciones, desde, hasta, ajustes]);

  const resumen = useMemo(
    () => resumirPorMes({ actividades, certificados: datosAula?.certificados || [], desde, hasta }),
    [actividades, datosAula, desde, hasta],
  );

  const guardarAjuste = async (clave, cambios) => {
    const siguiente = { ...(ajustes[clave] || { clave, incluir: true }), ...cambios, clave };
    setAjustes(actual => ({ ...actual, [clave]: siguiente }));
    const { error } = await supabase.from(TABLA_AJUSTES).upsert({
      clave,
      asistentes: siguiente.asistentes === '' || siguiente.asistentes === undefined ? null : siguiente.asistentes,
      modalidad: siguiente.modalidad || null,
      incluir: siguiente.incluir !== false,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setAviso({
        tipo: 'error',
        texto: faltaSQL(error.message)
          ? `El cambio se usará en este informe, pero no se guardó: falta ejecutar ${SQL} en Supabase.`
          : `El cambio se usará en este informe, pero no se guardó: ${error.message}`,
      });
    }
  };

  const generar = async (modo) => {
    setGenerando(modo);
    try {
      const bloques = construirBloques({ resumen, desde, hasta, fechaInforme, firmante });
      const paginas = paginarEnNavegador(bloques);
      const html = componerPaginas(paginas, { membreteUrl, titulo: `Informe de labores CAEDUC ${etiquetaPeriodo(desde, hasta)}` });
      if (modo === 'vista') onPreview(html);
      else await onDownload(html, nombreArchivoLabores(desde, hasta));
    } finally {
      setGenerando('');
    }
  };

  const incluidas = actividades.filter(item => item.incluir);
  const sinDato = incluidas.filter(item => item.asistentes === null).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-caeduc-pink">Cierre del período</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-800"><CalendarRange className="text-caeduc-blue" size={25}/> Informe de labores a Junta Directiva</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Elige el período. Se toman las actividades del calendario del Aula Virtual y las solicitudes de publicación que todavía no están en el calendario. Revisa los participantes de cada una; lo que corrijas aquí se guarda para la próxima vez.</p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="labores-desde" className="block text-sm font-extrabold text-slate-700">Desde</label>
          <input id="labores-desde" type="date" value={desde} onChange={e => setDesde(e.target.value)} className={inputClass}/>
        </div>
        <div>
          <label htmlFor="labores-hasta" className="block text-sm font-extrabold text-slate-700">Hasta</label>
          <input id="labores-hasta" type="date" value={hasta} onChange={e => setHasta(e.target.value)} className={inputClass}/>
        </div>
        <div>
          <label htmlFor="labores-fecha" className="block text-sm font-extrabold text-slate-700">Fecha del informe</label>
          <input id="labores-fecha" type="date" value={fechaInforme} onChange={e => setFechaInforme(e.target.value)} className={inputClass}/>
        </div>
        <div className="flex items-end">
          <button type="button" onClick={cargar} disabled={cargando} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-caeduc-blue px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-caeduc-blueDark disabled:opacity-60">
            {cargando ? <Loader size={17} className="animate-spin"/> : <RefreshCw size={17}/>} {cargando ? 'Cargando...' : 'Actualizar datos'}
          </button>
        </div>
      </section>

      {aviso && (
        <p role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${aviso.tipo === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          <AlertCircle size={17} className="mt-0.5 shrink-0"/> {aviso.texto}
        </p>
      )}

      {datosAula && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tarjeta valor={resumen.totales.actividades} etiqueta="Actividades" tono="border-slate-200 text-caeduc-blueDark"/>
            <Tarjeta valor={resumen.totales.enVivo} etiqueta="Participantes en vivo" tono="border-pink-200 text-caeduc-pink"/>
            <Tarjeta valor={resumen.totales.aula} etiqueta="Certificados Aula Virtual" tono="border-teal-200 text-teal-700"/>
            <Tarjeta valor={resumen.totales.total} etiqueta="Beneficiados" tono="border-blue-200 text-caeduc-blue"/>
          </section>

          {sinDato > 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle size={17} className="mt-0.5 shrink-0"/> {sinDato === 1 ? 'Hay 1 actividad' : `Hay ${sinDato} actividades`} sin número de participantes. Escríbelo en la tabla; si lo dejas vacío aparecerá como «Sin registro» y contará 0.
            </p>
          )}

          <section className="space-y-5">
            {resumen.meses.map(mes => {
              const delMes = actividades.filter(item => item.fecha.slice(0, 7) === mes.mes);
              return (
                <div key={mes.mes} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <h2 className="text-base font-black capitalize text-slate-800">{nombreMes(mes.mes)}</h2>
                    <p className="text-xs font-bold text-slate-500">
                      {mes.actividades.length} act. · {mes.enVivo} en vivo · {mes.aula} aula · <span className="text-caeduc-blue">{mes.total} beneficiados</span>
                    </p>
                  </div>
                  {delMes.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400">Sin actividades en vivo este mes.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-2">Incluir</th>
                            <th className="px-2 py-2">Fecha</th>
                            <th className="px-2 py-2">Actividad</th>
                            <th className="px-2 py-2">Modalidad</th>
                            <th className="px-4 py-2 text-right">Participantes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {delMes.map(item => (
                            <tr key={item.clave} className={`border-t border-slate-100 ${item.incluir ? '' : 'opacity-50'}`}>
                              <td className="px-4 py-2">
                                <input type="checkbox" aria-label={`Incluir ${item.nombre}`} checked={item.incluir} onChange={e => guardarAjuste(item.clave, { incluir: e.target.checked })} className="h-4 w-4"/>
                              </td>
                              <td className="whitespace-nowrap px-2 py-2 text-slate-600">{fechaLarga(item.fecha).replace(/ de \d{4}$/, '')}</td>
                              <td className="px-2 py-2">
                                <p className="font-bold text-slate-800">{item.nombre}</p>
                                <p className="text-xs text-slate-500">
                                  <span className={`mr-1.5 rounded px-1.5 py-0.5 font-bold ${item.origen === 'aula' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{item.origen === 'aula' ? 'Aula Virtual' : 'Solicitud (no está en el aula)'}</span>
                                  {item.lugar}
                                </p>
                              </td>
                              <td className="px-2 py-2">
                                <select aria-label={`Modalidad de ${item.nombre}`} value={item.modalidad} onChange={e => guardarAjuste(item.clave, { modalidad: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                                  {MODALIDADES.map(opcion => <option key={opcion} value={opcion}>{opcion}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  key={`${item.clave}-${item.asistentes ?? ''}`}
                                  type="number"
                                  min="0"
                                  inputMode="numeric"
                                  aria-label={`Participantes de ${item.nombre}`}
                                  defaultValue={item.asistentes ?? ''}
                                  placeholder="Sin registro"
                                  onBlur={e => {
                                    const valor = e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value)));
                                    if (valor !== item.asistentes) guardarAjuste(item.clave, { asistentes: valor });
                                  }}
                                  className={`w-28 rounded-lg border px-2 py-1.5 text-right text-sm tabular-nums ${item.asistentes === null ? 'border-amber-300 bg-amber-50' : 'border-slate-300'}`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-slate-600">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600"/>
              Firma: {firmante?.nombre} · {firmante?.cargo}. Período {etiquetaPeriodo(desde, hasta)}.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => generar('vista')} disabled={!!generando} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                <Eye size={17}/> Vista previa
              </button>
              <button type="button" onClick={() => generar('pdf')} disabled={!!generando} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-60">
                {generando === 'pdf' ? <Loader size={17} className="animate-spin"/> : <Download size={17}/>} Descargar PDF
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
