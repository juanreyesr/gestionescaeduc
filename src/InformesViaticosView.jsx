// src/InformesViaticosView.jsx — Informes de respaldo de viáticos por sesión
//
// Auditoría pide un informe individual por cada sesión o actividad en la que
// se entreguen viáticos a un miembro de la Comisión. Aquí se elige quién es
// (su cargo determina qué atribuciones del Reglamento de CAEDUC puede citar,
// y se pueden marcar varias a la vez si la sesión cubrió más de una función),
// la razón del viático y la fecha; el sistema arma el informe con el mismo
// membrete que el resto de oficios. No se guarda nada: se genera y se
// descarga en el momento, con vista previa en tiempo real antes de imprimir.

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Banknote, Download, FileText, User } from 'lucide-react';
import { supabase } from './supabaseClient.js';
import { ordenarMiembros } from './lib/miembrosComision.js';
import {
  articuloDeCargo,
  atribucionesDeCargo,
  buildInformeViaticosDraft,
  cargoTieneAtribuciones,
  defaultLiteralParaMotivo,
  fraseAtribuciones,
  MOTIVOS_VIATICOS,
  motivoRequiereDetalle,
} from './lib/informesViaticos.js';
import { formatInformeDate as formatFecha } from './lib/informesActividad.js';

const TABLA = 'caeduc_miembros_comision';

const todayGuatemalaISO = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Guatemala',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const inputClass = 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const Field = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-extrabold text-slate-700">{label}</label>
    {children}
    {hint ? <p className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p> : null}
  </div>
);

const PaperPreview = ({ draft, firmaUrl }) => {
  const nombre = draft.miembro_nombre || '[Nombre del miembro]';
  const cargo = draft.miembro_cargo || '[Cargo]';
  const motivo = MOTIVOS_VIATICOS.find(item => item.id === draft.motivo_id) || MOTIVOS_VIATICOS[0];
  const detalle = String(draft.detalle || '').trim();
  const fechaTexto = formatFecha(draft.fecha) || 'fecha pendiente';
  const frase = fraseAtribuciones(cargo, draft.literales || []);
  const p1 = `Por medio del presente informe, se deja constancia de que ${nombre}, ${cargo} de la Comisión de Acreditación y Educación Continua (CAEDUC), participó en ${motivo.frase}${detalle ? `, consistente en ${detalle}` : ''}, celebrada/realizada el ${fechaTexto}.`;
  const p2 = frase
    ? `Dicha participación se realiza ${frase}.`
    : 'Dicha participación se realiza en cumplimiento a las atribuciones propias de su cargo, según el Reglamento de la Comisión de Acreditación y Educación Continua (CAEDUC).';
  const p3 = 'El presente informe se extiende para los efectos administrativos y de fiscalización correspondientes, como respaldo de los viáticos otorgados en virtud de la participación antes descrita.';

  return (
    <article className="mx-auto aspect-[8.5/11] w-full max-w-[640px] overflow-y-auto rounded-sm border border-slate-200 bg-white px-[9%] pb-[14%] pt-[12%] text-[clamp(8px,1.35vw,11.5px)] leading-[1.75] text-slate-800 shadow-xl" aria-label="Vista previa del informe de viáticos">
      <p className="text-right text-slate-600">Guatemala, {formatFecha(draft.fecha) || 'fecha pendiente'}</p>
      <div className="mt-[4%]">
        <p className="font-bold">Señores</p>
        <p className="font-bold">Junta Directiva</p>
        <p>Colegio de Psicólogos de Guatemala</p>
        <p>Presente</p>
      </div>
      <p className="mt-[4%] font-bold">Honorables miembros de la Junta Directiva:</p>
      <p className="mt-[3%] font-bold uppercase text-caeduc-blue">Asunto: Informe de respaldo de viáticos — {cargo} — {motivo.label}</p>
      <div className="mt-[3%] space-y-[2.5%] text-justify">
        <p>{p1}</p>
        <p>{p2}</p>
        <p>{p3}</p>
      </div>
      <p className="mt-[8%]">Atentamente,</p>
      <div className="mx-auto mt-[9%] flex flex-col items-center text-center">
        {firmaUrl ? <img src={firmaUrl} alt="" className="h-10 w-auto object-contain" /> : <div className="h-[46px]" aria-hidden="true" />}
        <div className="mt-1 w-[58%] border-t border-slate-700 pt-1">
          <p className="font-bold">{nombre}</p>
          <p className="text-slate-500">{cargo}</p>
        </div>
      </div>
    </article>
  );
};

export default function InformesViaticosView({ appSettings = {}, onDownload }) {
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [miembroId, setMiembroId] = useState('');
  const [motivoId, setMotivoId] = useState(MOTIVOS_VIATICOS[0].id);
  const [detalle, setDetalle] = useState('');
  const [literales, setLiterales] = useState([]);
  const [literalesTocado, setLiteralesTocado] = useState(false);
  const [fecha, setFecha] = useState(todayGuatemalaISO());
  const [descargando, setDescargando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargando(true);
      const { data, error: fetchError } = await supabase.from(TABLA).select('*');
      if (cancelado) return;
      if (fetchError) setError(`No se pudo cargar el directorio de la Comisión: ${fetchError.message}`);
      else setError('');
      setMiembros(ordenarMiembros((data || []).filter(item => item.nombre)));
      setCargando(false);
    })();
    return () => { cancelado = true; };
  }, []);

  const miembro = miembros.find(item => item.id === miembroId) || null;
  const cargo = miembro?.cargo || '';
  const atribuciones = useMemo(() => atribucionesDeCargo(cargo), [cargo]);
  const tieneAtribuciones = cargoTieneAtribuciones(cargo);
  const articulo = articuloDeCargo(cargo);

  useEffect(() => {
    if (!miembros.length || miembroId) return;
    setMiembroId(miembros[0].id);
  }, [miembros, miembroId]);

  // Sugiere un literal al cambiar de miembro o de motivo, salvo que la
  // persona ya haya marcado las casillas a mano para esta combinación.
  useEffect(() => {
    setLiteralesTocado(false);
  }, [miembroId, motivoId]);

  useEffect(() => {
    if (literalesTocado) return;
    setLiterales([defaultLiteralParaMotivo(cargo, motivoId)].filter(Boolean));
  }, [cargo, motivoId, literalesTocado]);

  const toggleLiteral = (literal) => {
    setLiterales(prev => (prev.includes(literal) ? prev.filter(item => item !== literal) : [...prev, literal]));
    setLiteralesTocado(true);
  };

  const esCoordinador = cargo === 'Coordinador(a)';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const buildStorageUrl = (path, bucket) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  };
  const firmaUrl = esCoordinador
    ? (buildStorageUrl(appSettings.firmante1_firma_path, 'firmas-sellos') || '/firma-coordinador.png')
    : '';

  const draft = useMemo(() => buildInformeViaticosDraft({
    miembro, motivoId, detalle, literales, fecha,
  }), [miembro, motivoId, detalle, literales, fecha]);

  const requiereDetalle = motivoRequiereDetalle(motivoId);
  const faltaDetalle = requiereDetalle && !detalle.trim();
  const faltaAtribuciones = tieneAtribuciones && !literales.length;
  const puedeDescargar = Boolean(miembro) && Boolean(fecha) && !faltaDetalle && !faltaAtribuciones;

  const handleDescargar = async () => {
    if (!puedeDescargar) {
      setFeedback({ type: 'error', text: 'Completa el miembro, la fecha y, si aplica, el detalle o al menos una atribución antes de descargar.' });
      return;
    }
    setDescargando(true);
    setFeedback(null);
    try {
      await onDownload(draft, { firmaUrl });
      setFeedback({ type: 'success', text: 'El PDF se generó y descargó correctamente.' });
    } catch (err) {
      setFeedback({ type: 'error', text: `No se pudo generar el PDF: ${err.message}` });
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-caeduc-pink">Respaldo ante auditoría</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-800"><Banknote className="text-caeduc-blue" size={25}/> Informes de respaldo de viáticos</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Un informe por cada sesión o actividad en la que se entreguen viáticos a un miembro de la Comisión. Elige el miembro y la razón: el informe integra en el texto el o los artículos del Reglamento de CAEDUC que amparan su participación. No se guarda: se genera y descarga en el momento.</p>
      </header>

      {error ? <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-700"><AlertCircle className="mt-0.5 shrink-0" size={17}/>{error}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-black text-slate-800">Datos del informe</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">El nombre y el cargo se toman tal como están en el Directorio de la Comisión.</p>
          </div>

          <Field id="viaticos-miembro" label="Miembro de la Comisión *" hint={cargando ? 'Cargando directorio...' : (!miembros.length ? 'No hay miembros con nombre registrado en el directorio.' : undefined)}>
            <select id="viaticos-miembro" value={miembroId} onChange={event => setMiembroId(event.target.value)} disabled={cargando || !miembros.length} className={inputClass}>
              {!miembros.length ? <option value="">Sin miembros disponibles</option> : null}
              {miembros.map(item => <option key={item.id} value={item.id}>{item.nombre} — {item.cargo}</option>)}
            </select>
          </Field>

          <Field id="viaticos-motivo" label="Razón del viático *">
            <select id="viaticos-motivo" value={motivoId} onChange={event => { setMotivoId(event.target.value); setDetalle(''); }} className={inputClass}>
              {MOTIVOS_VIATICOS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </Field>

          <Field id="viaticos-detalle" label={`Detalle de la actividad${requiereDetalle ? ' *' : ' (opcional)'}`} hint={requiereDetalle ? 'Obligatorio para "Otra actividad de la Comisión": describe brevemente de qué se trató.' : 'Añade contexto si quieres precisar el tema o el destino de la representación.'}>
            <input id="viaticos-detalle" value={detalle} onChange={event => setDetalle(event.target.value)} placeholder="Ej. reunión con la Junta Directiva sobre el plan anual" className={`${inputClass} ${requiereDetalle && !detalle.trim() ? 'border-amber-400 bg-amber-50' : ''}`} />
          </Field>

          <Field id="viaticos-fecha" label="Fecha de la sesión o actividad *">
            <input id="viaticos-fecha" type="date" value={fecha} onChange={event => setFecha(event.target.value)} className={inputClass} required/>
          </Field>

          {tieneAtribuciones ? (
            <fieldset className={`rounded-xl border p-3 ${faltaAtribuciones ? 'border-amber-400 bg-amber-50' : 'border-slate-300'}`}>
              <legend className="px-1 text-sm font-extrabold text-slate-700">Atribuciones del cargo que respaldan el informe ({articulo}) *</legend>
              <p className="mb-2 text-xs leading-5 text-slate-500">Marca todas las que apliquen a esta sesión; se sugiere una según el motivo elegido, pero puedes marcar varias si el cargo cumplió más de una función.</p>
              <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
                {atribuciones.map(item => (
                  <label key={item.literal} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                    <input type="checkbox" className="mt-0.5" checked={literales.includes(item.literal)} onChange={() => toggleLiteral(item.literal)} />
                    <span><span className="font-bold">{item.literal})</span> {item.texto}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : miembro ? (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><AlertCircle className="mt-0.5 shrink-0" size={15}/>El cargo "{cargo}" no tiene atribuciones definidas en el Reglamento de CAEDUC (arts. 6 a 11). El informe se redactará sin citar un literal específico.</p>
          ) : null}

          {esCoordinador ? (
            <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><User className="mt-0.5 shrink-0" size={15}/>Se usará la firma registrada del Coordinador. Los demás cargos se generan con la línea en blanco para firma física.</p>
          ) : null}

          {feedback ? (
            <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm leading-5 ${feedback.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              <AlertCircle className="mt-0.5 shrink-0" size={17}/>{feedback.text}
            </p>
          ) : null}

          <button type="button" onClick={handleDescargar} disabled={descargando || !puedeDescargar} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-caeduc-pink px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-45">
            <Download size={17}/> {descargando ? 'Generando PDF...' : 'Descargar informe en PDF'}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-inner sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Vista previa en tiempo real</p><h2 className="text-lg font-black text-slate-800">Hoja con membrete institucional</h2></div>
            <FileText className="text-slate-400" size={24}/>
          </div>
          {!miembro ? <p role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold leading-5 text-amber-800"><AlertCircle className="mt-0.5 shrink-0" size={17}/>Elige un miembro de la Comisión para ver el informe.</p> : null}
          <PaperPreview draft={draft} firmaUrl={firmaUrl} />
        </div>
      </section>
    </div>
  );
}
