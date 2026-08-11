import React, { useEffect, useMemo, useState } from 'react';
import {
  Check, Copy, Edit3, ExternalLink, MessageCircle, Plus,
  Save, Send, Trash2, User, X,
} from 'lucide-react';
import {
  buildPublicationMessage,
  DEFAULT_PUBLICATION_RESPONSIBLES,
  parseSettingJson,
  whatsappUrl,
} from './lib/publicaciones.js';

const SETTINGS_KEY = 'publicacion_responsables';

const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
    {children}
  </section>
);

const normalizeResponsibles = (value) => {
  const parsed = parseSettingJson(value, DEFAULT_PUBLICATION_RESPONSIBLES);
  if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_PUBLICATION_RESPONSIBLES;
  return parsed.map((item, index) => ({
    id: item.id || `responsable-${index + 1}`,
    name: item.name || '',
    role: item.role || '',
    phone: item.phone || '',
  }));
};

const copyPlainText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
};

export default function PublicacionesView({ oficios = [], appSettings = {}, onUpdateSetting }) {
  const [selectedOficioId, setSelectedOficioId] = useState('');
  const [selectedResponsibleId, setSelectedResponsibleId] = useState('');
  const [zoomUrl, setZoomUrl] = useState('');
  const [responsibles, setResponsibles] = useState(() => normalizeResponsibles(appSettings[SETTINGS_KEY]));
  const [draftResponsibles, setDraftResponsibles] = useState(responsibles);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const activityOficios = useMemo(
    () => oficios.filter(item => item.actividad_nombre),
    [oficios],
  );

  useEffect(() => {
    const next = normalizeResponsibles(appSettings[SETTINGS_KEY]);
    setResponsibles(next);
    if (!editing) setDraftResponsibles(next);
  }, [appSettings, editing]);

  useEffect(() => {
    if (!selectedOficioId && activityOficios.length) setSelectedOficioId(activityOficios[0].id);
  }, [activityOficios, selectedOficioId]);

  useEffect(() => {
    if (!responsibles.some(item => item.id === selectedResponsibleId)) {
      setSelectedResponsibleId(responsibles[0]?.id || '');
    }
  }, [responsibles, selectedResponsibleId]);

  const oficio = activityOficios.find(item => item.id === selectedOficioId);
  const responsible = responsibles.find(item => item.id === selectedResponsibleId);
  const message = buildPublicationMessage({ oficio, responsible, zoomUrl });

  const updateDraft = (id, field, value) => {
    setDraftResponsibles(current => current.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addResponsible = () => {
    setDraftResponsibles(current => [
      ...current,
      { id: `responsable-${Date.now()}`, name: '', role: '', phone: '' },
    ]);
  };

  const saveResponsibles = async () => {
    const clean = draftResponsibles
      .map(item => ({ ...item, name: item.name.trim(), role: item.role.trim(), phone: item.phone.replace(/\D/g, '') }))
      .filter(item => item.name && item.phone);
    if (!clean.length) {
      setFeedback('Agrega al menos un responsable con nombre y teléfono.');
      return;
    }
    setSaving(true);
    setFeedback('');
    try {
      await onUpdateSetting(SETTINGS_KEY, JSON.stringify(clean));
      setResponsibles(clean);
      setDraftResponsibles(clean);
      setEditing(false);
      setFeedback('Responsables actualizados.');
    } catch (error) {
      setFeedback(`No se pudieron guardar los responsables: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!message) return;
    try {
      await copyPlainText(message);
      setFeedback('Mensaje copiado en texto plano.');
    } catch {
      setFeedback('No se pudo copiar automáticamente. Selecciona el texto y cópialo manualmente.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-caeduc-pink">Comunicación institucional</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-800">
          <Send size={24} className="text-caeduc-blue"/> Solicitud de publicación en redes
        </h1>
        <p className="mt-1 text-sm text-slate-500">Reutiliza la información de un oficio y prepara el mensaje para el responsable seleccionado.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-extrabold text-slate-800">1. Selecciona la actividad</h2>
            <label htmlFor="publication-oficio" className="mt-4 block text-sm font-bold text-slate-700">Título del oficio o actividad</label>
            <select
              id="publication-oficio"
              value={selectedOficioId}
              onChange={event => setSelectedOficioId(event.target.value)}
              disabled={!activityOficios.length}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50"
            >
              {!activityOficios.length && <option>No hay oficios con actividad registrada</option>}
              {activityOficios.map(item => (
                <option key={item.id} value={item.id}>
                  {item.titulo || item.actividad_nombre} — {item.numero_oficio} ({item.estado || 'Sin estado'})
                </option>
              ))}
            </select>

            <label htmlFor="publication-zoom" className="mt-4 block text-sm font-bold text-slate-700">Enlace de Zoom</label>
            <input
              id="publication-zoom"
              type="url"
              value={zoomUrl}
              onChange={event => setZoomUrl(event.target.value)}
              placeholder="https://us06web.zoom.us/j/..."
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <p className="mt-2 text-xs text-slate-500">Este enlace se agrega solo al mensaje; no modifica el oficio.</p>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-800">2. Responsable de publicación</h2>
                <p className="text-xs text-slate-500">El nombre seleccionado cambia automáticamente en el saludo.</p>
              </div>
              <button
                type="button"
                onClick={() => { setDraftResponsibles(responsibles); setEditing(true); setFeedback(''); }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                <Edit3 size={16}/> Editar responsables
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {responsibles.map(item => {
                const selected = item.id === selectedResponsibleId;
                const waUrl = whatsappUrl(item.phone);
                return (
                  <div key={item.id} className={`rounded-xl border p-4 transition-colors ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="radio"
                        name="publication-responsible"
                        value={item.id}
                        checked={selected}
                        onChange={() => setSelectedResponsibleId(item.id)}
                        className="mt-1 h-4 w-4 accent-blue-600"
                      />
                      <span className="min-w-0">
                        <span className="block font-extrabold text-slate-800">{item.name}</span>
                        <span className="block text-xs leading-5 text-slate-500">{item.role || 'Responsable de comunicación'}</span>
                      </span>
                    </label>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                      >
                        <MessageCircle size={17}/> WhatsApp {item.phone} <ExternalLink size={13}/>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Vista previa</p>
              <h2 className="mt-1 text-lg font-black text-slate-800">Mensaje en texto plano</h2>
            </div>
            <Copy size={20} className="text-slate-400"/>
          </div>
          <textarea
            readOnly
            value={message}
            aria-label="Mensaje generado para solicitud de publicación"
            className="mt-4 min-h-[360px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!message}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-caeduc-pink px-4 py-3 font-extrabold text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy size={18}/> Copiar mensaje
          </button>
          {feedback && <p role="status" className="mt-3 flex items-start gap-2 text-sm text-slate-600"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600"/>{feedback}</p>}
        </Card>
      </div>

      <Card className="border-indigo-200 bg-indigo-50/60">
        <h2 className="flex items-center gap-2 font-extrabold text-indigo-900"><User size={18}/> Responsabilidad según el reglamento</h2>
        <p className="mt-2 text-sm leading-6 text-indigo-800">El Gestor del Conocimiento coordina con la persona responsable de redes la información que debe publicarse. Prosecretaría vela por la promoción y difusión de las actividades de la Comisión.</p>
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="responsibles-title">
          <div className="my-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 id="responsibles-title" className="text-lg font-black text-slate-800">Editar responsables de publicación</h2>
                <p className="text-xs text-slate-500">Nombre, cargo o rol y teléfono de WhatsApp.</p>
              </div>
              <button type="button" onClick={() => setEditing(false)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={20}/></button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              {draftResponsibles.map((item, index) => (
                <fieldset key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <legend className="px-2 text-sm font-extrabold text-slate-700">Responsable {index + 1}</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`responsible-name-${item.id}`} className="block text-sm font-bold text-slate-700">Nombre *</label>
                      <input id={`responsible-name-${item.id}`} value={item.name} onChange={event => updateDraft(item.id, 'name', event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2"/>
                    </div>
                    <div>
                      <label htmlFor={`responsible-phone-${item.id}`} className="block text-sm font-bold text-slate-700">Teléfono *</label>
                      <input id={`responsible-phone-${item.id}`} type="tel" inputMode="numeric" value={item.phone} onChange={event => updateDraft(item.id, 'phone', event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2"/>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor={`responsible-role-${item.id}`} className="block text-sm font-bold text-slate-700">Cargo o rol</label>
                      <input id={`responsible-role-${item.id}`} value={item.role} onChange={event => updateDraft(item.id, 'role', event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2"/>
                    </div>
                  </div>
                  {draftResponsibles.length > 1 && (
                    <button type="button" onClick={() => setDraftResponsibles(current => current.filter(currentItem => currentItem.id !== item.id))} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
                      <Trash2 size={16}/> Eliminar responsable
                    </button>
                  )}
                </fieldset>
              ))}
              <button type="button" onClick={addResponsible} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"><Plus size={16}/> Agregar responsable</button>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
              <button type="button" onClick={saveResponsibles} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Save size={16}/>{saving ? 'Guardando...' : 'Guardar responsables'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
