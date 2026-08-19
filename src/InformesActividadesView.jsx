import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Download, FileCheck2, FileText,
  History, RotateCcw, Save, User,
} from 'lucide-react';
import {
  buildInformeActividadDraft,
  formatInformeDate,
  getInformePonentes,
} from './lib/informesActividad.js';

const inputClass = 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const Field = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-extrabold text-slate-700">{label}</label>
    {children}
    {hint ? <p className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p> : null}
  </div>
);

const PaperPreview = ({ draft }) => (
  <article className="mx-auto aspect-[8.5/11] w-full max-w-[640px] overflow-y-auto rounded-sm border border-slate-200 bg-white px-[9%] pb-[14%] pt-[12%] text-[clamp(8px,1.35vw,11.5px)] leading-[1.75] text-slate-800 shadow-xl" aria-label="Vista previa del informe">
    <p className="text-right text-slate-600">Guatemala, {formatInformeDate(draft.fecha_informe) || 'fecha pendiente'}</p>
    <div className="mt-[4%]">
      <p className="font-bold">Señores</p>
      <p className="font-bold">Junta Directiva</p>
      <p>Colegio de Psicólogos de Guatemala</p>
      <p>Presente</p>
    </div>
    <p className="mt-[4%] font-bold">Honorables miembros de la Junta Directiva:</p>
    <p className="mt-[3%] font-bold uppercase text-caeduc-blue">Asunto: Informe de realización de {draft.actividad_tipo || 'actividad'}: {draft.actividad_nombre}</p>
    <div className="mt-[3%] space-y-[2.5%] text-justify">
      {String(draft.cuerpo || '').split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </div>
    <p className="mt-[5%]">Atentamente,</p>
    <div className="mx-auto mt-[9%] w-[55%] border-t border-slate-700 pt-2 text-center font-bold">
      {draft.ponente_nombre || 'Nombre del ponente pendiente'}
    </div>
  </article>
);

export default function InformesActividadesView({
  oficios = [],
  informes = [],
  onSaveInforme,
  onDownloadInforme,
}) {
  const activityOficios = useMemo(() => oficios.filter(item => item.actividad_nombre), [oficios]);
  const [selectedOficioId, setSelectedOficioId] = useState('');
  const [draft, setDraft] = useState(() => buildInformeActividadDraft());
  const [savedId, setSavedId] = useState(null);
  const [dirty, setDirty] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const editorRef = useRef(null);

  const selectedOficio = activityOficios.find(item => item.id === selectedOficioId);
  const ponentesSugeridos = useMemo(() => getInformePonentes(selectedOficio), [selectedOficio]);
  const informesDelOficio = useMemo(
    () => informes.filter(item => item.oficio_id === selectedOficioId),
    [informes, selectedOficioId],
  );

  useEffect(() => {
    if (!selectedOficioId && activityOficios.length) setSelectedOficioId(activityOficios[0].id);
  }, [activityOficios, selectedOficioId]);

  useEffect(() => {
    if (!selectedOficio) return;
    const firstPresenter = ponentesSugeridos[0] || '';
    const existing = informes.find(item => item.oficio_id === selectedOficio.id && (!firstPresenter || item.ponente_nombre === firstPresenter));
    setDraft(existing || buildInformeActividadDraft(selectedOficio, firstPresenter));
    setSavedId(existing?.id || null);
    setDirty(!existing);
    setFeedback(null);
  }, [selectedOficio, ponentesSugeridos]);

  const update = (field, value) => {
    setDraft(current => ({ ...current, [field]: value }));
    setDirty(true);
    setFeedback(null);
  };

  const handlePonenteChange = (value) => {
    const existing = informesDelOficio.find(item => item.ponente_nombre === value);
    if (existing && existing.id !== savedId) {
      setDraft(existing);
      setSavedId(existing.id);
      setDirty(false);
      setFeedback({ type: 'info', text: 'Se abrió el informe ya guardado para este ponente.' });
      return;
    }
    const loaded = informes.find(item => item.id === savedId);
    if (loaded && value !== loaded.ponente_nombre && ponentesSugeridos.includes(value)) {
      setDraft(buildInformeActividadDraft(selectedOficio, value, draft.fecha_informe));
      setSavedId(null);
      setDirty(true);
      setFeedback({ type: 'info', text: 'Se preparó un informe independiente para el ponente seleccionado.' });
      return;
    }
    update('ponente_nombre', value);
  };

  const regenerate = () => {
    if (!selectedOficio) return;
    const next = buildInformeActividadDraft(selectedOficio, draft.ponente_nombre, draft.fecha_informe);
    setDraft({ ...next, id: savedId || undefined });
    setDirty(true);
    setFeedback({ type: 'info', text: 'El texto se regeneró con los datos originales del oficio. Revisa la vista previa antes de guardar.' });
  };

  const loadExisting = (informe) => {
    setSelectedOficioId(informe.oficio_id || '');
    setDraft(informe);
    setSavedId(informe.id);
    setDirty(false);
    setFeedback(null);
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSave = async () => {
    const speaker = String(draft.ponente_nombre || '').trim();
    if (!speaker) {
      setFeedback({ type: 'error', text: 'Antes de guardar y generar el PDF, escribe el nombre del ponente que firmará el informe.' });
      document.getElementById('informe-ponente')?.focus();
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await onSaveInforme({ ...draft, id: savedId || draft.id || undefined, ponente_nombre: speaker });
      setDraft(saved);
      setSavedId(saved.id);
      setDirty(false);
      setFeedback({ type: 'success', text: 'Informe guardado. Ya está disponible aquí y en el oficio correspondiente.' });
    } catch (error) {
      setFeedback({ type: 'error', text: `No se pudo guardar el informe: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7" ref={editorRef}>
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-caeduc-pink">Rendición de actividades</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-800"><FileCheck2 className="text-caeduc-blue" size={25}/> Informes de actividades para Junta Directiva</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Selecciona cualquier oficio con actividad, incluso si está en borrador. El sistema prepara un informe por ponente, editable y con vista previa antes de guardarlo.</p>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-black text-slate-800">Datos y redacción editable</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Los datos se toman del oficio y de su propuesta técnica. Puedes corregirlos antes de guardar.</p>
          </div>

          <Field id="informe-oficio" label="Actividad u oficio">
            <select id="informe-oficio" value={selectedOficioId} onChange={event => setSelectedOficioId(event.target.value)} disabled={!activityOficios.length} className={inputClass}>
              {!activityOficios.length ? <option>No hay oficios con actividad registrada</option> : null}
              {activityOficios.map(item => <option key={item.id} value={item.id}>{item.actividad_nombre} - {item.numero_oficio || 'Sin número'} ({item.estado || 'Sin estado'})</option>)}
            </select>
          </Field>

          <Field id="informe-ponente" label="Nombre del ponente *" hint={ponentesSugeridos.length ? 'Se encontró en el oficio. Si la actividad tuvo varios ponentes, elige o escribe el nombre correspondiente.' : 'Este oficio no incluye el nombre. Escríbelo antes de guardar; el PDF permanecerá bloqueado mientras falte.'}>
            <input id="informe-ponente" list="ponentes-oficio" value={draft.ponente_nombre || ''} onChange={event => handlePonenteChange(event.target.value)} placeholder="Nombre completo del ponente" className={`${inputClass} ${!draft.ponente_nombre ? 'border-amber-400 bg-amber-50' : ''}`} required/>
            <datalist id="ponentes-oficio">{ponentesSugeridos.map(name => <option key={name} value={name}/>)}</datalist>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="informe-fecha" label="Fecha del informe *"><input id="informe-fecha" type="date" value={draft.fecha_informe || ''} onChange={event => update('fecha_informe', event.target.value)} className={inputClass} required/></Field>
            <Field id="informe-actividad-fecha" label="Fecha de realización"><input id="informe-actividad-fecha" value={draft.actividad_fecha || ''} onChange={event => update('actividad_fecha', event.target.value)} className={inputClass}/></Field>
            <Field id="informe-modalidad" label="Modalidad"><select id="informe-modalidad" value={draft.actividad_modalidad || ''} onChange={event => update('actividad_modalidad', event.target.value)} className={inputClass}><option>Virtual</option><option>Híbrida</option><option>Presencial</option></select></Field>
            <Field id="informe-duracion" label="Duración" hint="Si el oficio no la indica, se colocan 2 horas como estándar."><input id="informe-duracion" value={draft.actividad_duracion || ''} onChange={event => update('actividad_duracion', event.target.value)} className={inputClass}/></Field>
          </div>

          <Field id="informe-cuerpo" label="Contenido del informe en tercera persona" hint="La firma se limita al nombre del ponente; el membrete se incorpora al PDF.">
            <textarea id="informe-cuerpo" rows={18} value={draft.cuerpo || ''} onChange={event => update('cuerpo', event.target.value)} className={`${inputClass} resize-y leading-6`}/>
          </Field>

          {feedback ? (
            <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm leading-5 ${feedback.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
              {feedback.type === 'error' ? <AlertCircle className="mt-0.5 shrink-0" size={17}/> : <CheckCircle2 className="mt-0.5 shrink-0" size={17}/>}{feedback.text}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={regenerate} disabled={!selectedOficio} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"><RotateCcw size={17}/> Regenerar</button>
            <button type="button" onClick={handleSave} disabled={saving || !selectedOficio} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><Save size={17}/>{saving ? 'Guardando...' : 'Guardar informe'}</button>
            <button type="button" onClick={() => onDownloadInforme(draft)} disabled={!savedId || dirty || !draft.ponente_nombre} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-caeduc-pink px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-45"><Download size={17}/> Descargar PDF</button>
          </div>
          {savedId && dirty ? <p className="text-center text-xs font-semibold text-amber-700">Guarda los cambios para habilitar nuevamente el PDF.</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-inner sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Vista previa primero</p><h2 className="text-lg font-black text-slate-800">Hoja con membrete institucional</h2></div>
            <FileText className="text-slate-400" size={24}/>
          </div>
          <PaperPreview draft={draft}/>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><History className="text-caeduc-blue" size={22}/><div><h2 className="text-lg font-black text-slate-800">Registro de informes de actividades</h2><p className="text-xs text-slate-500">Cada informe guardado se conserva y también aparece dentro de su oficio.</p></div></div>
        {informes.length ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {informes.map(informe => (
              <article key={informe.id} className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-300">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-extrabold text-slate-800">{informe.actividad_nombre}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><User size={13}/>{informe.ponente_nombre}</p><p className="mt-1 text-xs text-slate-400">{informe.numero_oficio || 'Oficio sin número'} - {formatInformeDate(informe.fecha_informe)}</p></div><CheckCircle2 className="shrink-0 text-emerald-600" size={19}/></div>
                <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => loadExisting(informe)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"><FileText size={15}/> Abrir y editar</button><button type="button" onClick={() => onDownloadInforme(informe)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700"><Download size={15}/> PDF</button></div>
              </article>
            ))}
          </div>
        ) : <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><FileCheck2 className="mx-auto text-slate-300" size={38}/><p className="mt-3 font-bold text-slate-600">Aún no hay informes guardados.</p><p className="mt-1 text-sm text-slate-500">Selecciona una actividad, revisa la vista previa y guarda el primer informe.</p></div>}
      </section>

      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5">
        <h2 className="font-extrabold text-indigo-900">Responsabilidades según el reglamento</h2>
        <p className="mt-2 text-sm leading-6 text-indigo-800">Coordinación representa a la Comisión y firma su correspondencia; Secretaría lleva el archivo de la correspondencia; el Gestor del Conocimiento administra el conocimiento científico-académico y promueve el aprovechamiento del Aula Virtual. La Comisión debe informar a Junta Directiva y velar por el cumplimiento del plan de capacitación.</p>
      </section>
    </div>
  );
}
