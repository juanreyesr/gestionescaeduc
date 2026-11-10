import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar, Check, Copy, Download, Edit3, ExternalLink, FileText,
  GraduationCap, History, Image, Link2, Loader2, MapPin, MessageCircle, Plus,
  Printer, RotateCcw, Save, Search, Send, Trash2, Upload, User, X,
} from 'lucide-react';
import { supabase } from './supabaseClient.js';
import {
  activityFromOficio,
  buildPublicationMessage,
  DEFAULT_PUBLICATION_RESPONSIBLES,
  parseSettingJson,
  whatsappUrl,
} from './lib/publicaciones.js';
import { activitiesInDateRange, sortActivitiesByDateDesc } from './lib/registroActividadesReport.js';
import { formatoQuetzales, gradosDeTarifario, montoPorGrado, parseTarifas } from './lib/tarifario.js';
import {
  AREAS_PLANIFICACION, GASTOS_EXTRA_SUGERIDOS, MODALIDADES, TIPOS_ACTIVIDAD, AULA_URL_DEFAULT,
  enlaceReunion, faltaMigracion, faltantesPublicacion, normalizarGastosExtra, presupuestoDePublicacion, requiereGastosExtra,
} from './lib/sincronizacion.js';
import { AVISO_MIGRACION, importarPublicaciones, limpiarAlEliminarPublicacion, publicarEnAula, sincronizarPublicacion } from './lib/syncActividades.js';

// Columnas agregadas por supabase/2026_sincronizacion_actividades.sql.
const COLUMNAS_SINCRONIZACION = ['actividad_tipo', 'area', 'modalidad', 'duracion_horas', 'enlace_inscripcion', 'participantes_estimados', 'gastos_extra'];

const SETTINGS_KEY = 'publicacion_responsables';
const HISTORY_TABLE = 'caeduc_publicaciones';
const PHOTO_BUCKET = 'caeduc-publicaciones';
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const blankActivity = () => ({
  actividad_nombre: '',
  ponente_nombre: '',
  ponente_grado: '',
  actividad_fecha: '',
  actividad_hora: '',
  actividad_lugar: '',
  zoom_detalles: '',
  actividad_tipo: '',
  area: '',
  modalidad: '',
  duracion_horas: '',
  enlace_inscripcion: '',
  participantes_estimados: '',
  gastos_extra: [],
});

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

const safeName = (value, fallback = 'actividad') => {
  const clean = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || fallback;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const Field = ({ id, label, children, helper }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-bold text-slate-700">{label}</label>
    {children}
    {helper && <p className="mt-1.5 text-xs leading-5 text-slate-500">{helper}</p>}
  </div>
);

export default function PublicacionesView({ oficios = [], appSettings = {}, onUpdateSetting, onGenerateActivityReport }) {
  // Vacío hasta que se elija crear, buscar o editar: el formulario arranca
  // cerrado y limpio en vez de mostrar los datos de la última actividad.
  const [sourceMode, setSourceMode] = useState('');
  const [selectedOficioId, setSelectedOficioId] = useState('');
  const [activity, setActivity] = useState(blankActivity);
  const [selectedResponsibleId, setSelectedResponsibleId] = useState('');
  const [responsibles, setResponsibles] = useState(() => normalizeResponsibles(appSettings[SETTINGS_KEY]));
  const [draftResponsibles, setDraftResponsibles] = useState(responsibles);
  const [editingResponsibles, setEditingResponsibles] = useState(false);
  const [savingResponsibles, setSavingResponsibles] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [photoUrls, setPhotoUrls] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [existingPhotoPath, setExistingPhotoPath] = useState('');
  const [existingPhotoName, setExistingPhotoName] = useState('');
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState('');
  // Identificador del borrador en curso. Se mantiene entre intentos para que, si
  // un guardado falla y se vuelve a intentar, el segundo intento sobrescriba la
  // misma fila en vez de crear otra. Solo cambia al empezar una actividad nueva.
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const [savingActivity, setSavingActivity] = useState(false);
  const [porBorrar, setPorBorrar] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [borrarDePlan, setBorrarDePlan] = useState(true);
  const [messageOverride, setMessageOverride] = useState(null);
  const [reportDialog, setReportDialog] = useState(false);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportType, setReportType] = useState('detalle');
  // Enlaces con Planificación / aula: publicacion_id → fila de planificación.
  const [planes, setPlanes] = useState({});
  const [avisoMigracion, setAvisoMigracion] = useState('');
  const [publicandoAula, setPublicandoAula] = useState('');

  const activityOficios = useMemo(
    () => oficios.filter(item => item.actividad_nombre),
    [oficios],
  );

  // Tarifario vigente: el grado académico solo se usa aquí para calcular el
  // honorario en los oficios de pago y en el modelo de factura.
  const tarifas = useMemo(() => parseTarifas(appSettings.honorarios_tarifario), [appSettings]);
  const grados = useMemo(() => gradosDeTarifario(tarifas), [tarifas]);
  const montoGrado = montoPorGrado(activity.ponente_grado || '', tarifas);
  const presupuesto = presupuestoDePublicacion(activity, tarifas);
  const faltantes = faltantesPublicacion(activity, tarifas);
  const pideExtras = requiereGastosExtra(activity);

  // El formulario solo se muestra cuando hay algo que editar: al crear, al
  // buscar desde un oficio o al abrir un registro del historial.
  const editorAbierto = Boolean(sourceMode);
  const responsible = responsibles.find(item => item.id === selectedResponsibleId);
  const oficio = activityOficios.find(item => item.id === selectedOficioId);
  const generatedMessage = buildPublicationMessage({
    activity,
    responsible,
    zoomDetails: activity.zoom_detalles,
  });
  const message = messageOverride ?? generatedMessage;
  const currentPhotoUrl = photoPreview || (
    !removeExistingPhoto && existingPhotoPath ? photoUrls[editingHistoryId] : ''
  );

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    const visible = query ? history.filter(item => [
      item.actividad_nombre,
      item.ponente_nombre,
      item.actividad_fecha,
      item.responsable_nombre,
    ].some(value => String(value || '').toLowerCase().includes(query))) : history;
    return sortActivitiesByDateDesc(visible);
  }, [history, historySearch]);

  useEffect(() => {
    const next = normalizeResponsibles(appSettings[SETTINGS_KEY]);
    setResponsibles(next);
    if (!editingResponsibles) setDraftResponsibles(next);
  }, [appSettings, editingResponsibles]);

  useEffect(() => {
    if (!responsibles.some(item => item.id === selectedResponsibleId)) {
      setSelectedResponsibleId(responsibles[0]?.id || '');
    }
  }, [responsibles, selectedResponsibleId]);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from(HISTORY_TABLE)
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      setFeedback(`No se pudo cargar el historial: ${error.message}`);
      setHistoryLoading(false);
      return;
    }
    const rows = data || [];
    setHistory(rows);
    const withPhoto = rows.filter(item => item.ponente_foto_path);
    const signed = await Promise.all(withPhoto.map(async item => {
      const { data: urlData } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(item.ponente_foto_path, 3600);
      return [item.id, urlData?.signedUrl || ''];
    }));
    setPhotoUrls(Object.fromEntries(signed));
    setHistoryLoading(false);
  };

  const cargarPlanes = async () => {
    const { data, error } = await supabase.from('planificacion_actividades')
      .select('id, publicacion_id, aula_event_id, monto, estado_general')
      .not('publicacion_id', 'is', null);
    if (error) {
      if (faltaMigracion(error)) setAvisoMigracion(AVISO_MIGRACION);
      return;
    }
    setPlanes(Object.fromEntries((data || []).map(item => [item.publicacion_id, item])));
  };

  // Al entrar: toda publicación que aún no esté en la Planificación se carga ahí
  // (con su honorario) y se le abre su expediente.
  useEffect(() => {
    (async () => {
      await loadHistory();
      const res = await importarPublicaciones(supabase);
      if (res.migracion) setAvisoMigracion(AVISO_MIGRACION);
      else if (res.creadas || res.enlazadas || res.enAula) setFeedback(`Sincronizado: ${res.creadas} actividad(es) nueva(s) en Planificación, ${res.enlazadas} enlazada(s) con las que ya estaban planificadas y ${res.enAula || 0} reconocida(s) en el calendario del aula.`);
      await cargarPlanes();
    })();
  }, []);

  const clearPhotoDraft = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview('');
    setExistingPhotoPath('');
    setExistingPhotoName('');
    setRemoveExistingPhoto(false);
  };

  const startNew = (mode) => {
    setSourceMode(mode);
    setEditingHistoryId('');
    setDraftId(crypto.randomUUID());
    setMessageOverride(null);
    clearPhotoDraft();
    if (mode === 'oficio' && activityOficios.length) {
      const first = activityOficios[0];
      setSelectedOficioId(first.id);
      setActivity({ ...activityFromOficio(first), zoom_detalles: '' });
    } else {
      setSelectedOficioId('');
      setActivity(blankActivity());
    }
    setFeedback('');
  };

  // Vuelve a dejar la pantalla como al entrar.
  const cerrarEditor = () => {
    setSourceMode('');
    setSelectedOficioId('');
    setActivity(blankActivity());
    setEditingHistoryId('');
    setDraftId(crypto.randomUUID());
    setMessageOverride(null);
    clearPhotoDraft();
    setFeedback('');
  };

  const selectOficio = (id) => {
    setSelectedOficioId(id);
    const next = activityOficios.find(item => item.id === id);
    setActivity(next ? { ...activityFromOficio(next), zoom_detalles: '' } : blankActivity());
    setMessageOverride(null);
    setEditingHistoryId('');
    setDraftId(crypto.randomUUID());
    clearPhotoDraft();
  };

  const updateActivity = (field, value) => {
    setActivity(current => ({ ...current, [field]: value }));
  };

  const gastosEditables = Array.isArray(activity.gastos_extra) ? activity.gastos_extra : [];
  const setGasto = (index, field, value) => updateActivity('gastos_extra', gastosEditables.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  const addGasto = (concepto = '') => updateActivity('gastos_extra', [...gastosEditables, { concepto, monto: '' }]);
  const removeGasto = (index) => updateActivity('gastos_extra', gastosEditables.filter((_, i) => i !== index));

  const publicarAula = async (item) => {
    setPublicandoAula(item.id);
    const res = await publicarEnAula(supabase, item, planes[item.id]);
    setPublicandoAula('');
    if (!res.ok && !res.existe) { setFeedback(`No se pudo publicar en el aula: ${res.error || 'error desconocido'}`); return; }
    await cargarPlanes();
    const destino = enlaceReunion(item) ? 'el enlace de Zoom' : AULA_URL_DEFAULT.replace('https://', '');
    setFeedback(`${res.accion === 'actualizada' ? 'Actividad actualizada' : 'Actividad publicada'} en el calendario del aula virtual (enlace: ${destino}).${res.aviso ? ` ${res.aviso}` : ''}`);
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setFeedback('La fotografía debe estar en formato JPG, PNG, WebP o AVIF.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setFeedback('La fotografía no debe superar 5 MB.');
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemoveExistingPhoto(false);
    setFeedback('Fotografía preparada. Se guardará junto con la actividad.');
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview('');
    setRemoveExistingPhoto(Boolean(existingPhotoPath));
  };

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
    setSavingResponsibles(true);
    setFeedback('');
    try {
      await onUpdateSetting(SETTINGS_KEY, JSON.stringify(clean));
      setResponsibles(clean);
      setDraftResponsibles(clean);
      setEditingResponsibles(false);
      setFeedback('Responsables actualizados.');
    } catch (error) {
      setFeedback(`No se pudieron guardar los responsables: ${error.message}`);
    } finally {
      setSavingResponsibles(false);
    }
  };

  const handleCopy = async (text = message) => {
    if (!text) return;
    try {
      await copyPlainText(text);
      setFeedback('Mensaje copiado en texto plano.');
    } catch {
      setFeedback('No se pudo copiar automáticamente. Selecciona el texto y cópialo manualmente.');
    }
  };

  const saveActivity = async () => {
    // Dos clics seguidos no deben producir dos registros.
    if (savingActivity) return;
    if (!activity.actividad_nombre.trim()) {
      setFeedback('Escribe el nombre de la actividad antes de guardarla.');
      return;
    }
    if (!responsible) {
      setFeedback('Selecciona a la persona responsable de la publicación.');
      return;
    }
    setSavingActivity(true);
    setFeedback('');
    const recordId = editingHistoryId || draftId;
    const oldPath = existingPhotoPath;
    let photoPath = removeExistingPhoto ? null : oldPath || null;
    let photoName = removeExistingPhoto ? null : existingPhotoName || null;
    let uploadedPath = '';

    try {
      if (photoFile) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) throw userError || new Error('Sesión no disponible.');
        const extension = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        uploadedPath = `${userData.user.id}/${recordId}/${Date.now()}-${safeName(photoFile.name, 'ponente')}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(uploadedPath, photoFile, { upsert: false, contentType: photoFile.type });
        if (uploadError) throw uploadError;
        photoPath = uploadedPath;
        photoName = photoFile.name;
      }

      const payload = {
        origen: sourceMode,
        oficio_id: sourceMode === 'oficio' ? selectedOficioId || null : null,
        actividad_nombre: activity.actividad_nombre.trim(),
        ponente_nombre: activity.ponente_nombre.trim(),
        ponente_grado: String(activity.ponente_grado || '').trim(),
        actividad_fecha: activity.actividad_fecha.trim(),
        actividad_hora: activity.actividad_hora.trim(),
        actividad_lugar: activity.actividad_lugar.trim(),
        zoom_detalles: activity.zoom_detalles.trim(),
        responsable_nombre: responsible.name,
        responsable_telefono: responsible.phone,
        mensaje_publicacion: message,
        ponente_foto_path: photoPath,
        ponente_foto_nombre: photoName,
        actividad_tipo: activity.actividad_tipo || null,
        area: activity.area || null,
        modalidad: activity.modalidad || null,
        duracion_horas: Number(activity.duracion_horas) > 0 ? Number(activity.duracion_horas) : null,
        enlace_inscripcion: String(activity.enlace_inscripcion || '').trim() || null,
        participantes_estimados: Number(activity.participantes_estimados) > 0 ? Math.round(Number(activity.participantes_estimados)) : null,
        gastos_extra: normalizarGastosExtra(activity.gastos_extra),
        updated_at: new Date().toISOString(),
      };

      // `ponente_grado` es una columna nueva. Si la base todavía no la tiene, se
      // guarda el resto del registro y se avisa en vez de perder el trabajo.
      // `upsert` sobre la llave primaria: guardar dos veces el mismo borrador
      // actualiza esa fila, nunca agrega otra.
      const guardar = (body) => (editingHistoryId
        ? supabase.from(HISTORY_TABLE).update(body).eq('id', editingHistoryId)
        : supabase.from(HISTORY_TABLE).upsert([{ ...body, id: recordId }])).select().single();
      let { data, error } = await guardar(payload);
      let gradoOmitido = false;
      let sincronizacionOmitida = false;
      if (error && faltaMigracion(error)) {
        // Sin la migración de sincronización se guarda lo de siempre y se avisa.
        const basico = Object.fromEntries(Object.entries(payload).filter(([k]) => !COLUMNAS_SINCRONIZACION.includes(k)));
        ({ data, error } = await guardar(basico));
        sincronizacionOmitida = !error;
      }
      if (error && /ponente_grado/.test(error.message || '')) {
        const { ponente_grado: _omitido, ...sinGrado } = Object.fromEntries(Object.entries(payload).filter(([k]) => !COLUMNAS_SINCRONIZACION.includes(k)));
        ({ data, error } = await guardar(sinGrado));
        gradoOmitido = !error;
      }
      if (error) throw error;

      // Planificación (con presupuesto), expediente y aula se actualizan solos.
      const sync = await sincronizarPublicacion(supabase, data, { tarifas });
      if (sync.migracion) setAvisoMigracion(AVISO_MIGRACION);
      await cargarPlanes();
      const resumenSync = sync.ok
        ? ` Planificación ${sync.accionPlan === 'creada' ? 'creada' : sync.accionPlan === 'enlazada' ? 'enlazada' : 'al día'}, expediente al día${sync.aula?.ok ? ' y aula virtual actualizada' : ''}.${sync.avisos.length ? ` ${sync.avisos.join(' ')}` : ''}`
        : sync.avisos?.length ? ` ${sync.avisos.join(' ')}` : '';

      if (oldPath && oldPath !== photoPath) {
        await supabase.storage.from(PHOTO_BUCKET).remove([oldPath]);
      }
      setEditingHistoryId(data.id);
      setExistingPhotoPath(data.ponente_foto_path || '');
      setExistingPhotoName(data.ponente_foto_nombre || '');
      setRemoveExistingPhoto(false);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoFile(null);
      setPhotoPreview('');
      await loadHistory();
      setFeedback((gradoOmitido
        ? 'Actividad guardada, pero el grado académico no pudo almacenarse: falta la columna "ponente_grado" en la tabla caeduc_publicaciones (ver supabase/2026_ponente_grado.sql).'
        : editingHistoryId ? 'Actividad actualizada en el historial.' : 'Actividad guardada en el historial.')
        + (sincronizacionOmitida ? ` Tipo, área, modalidad, duración y gastos extra no se guardaron: ${AVISO_MIGRACION}` : '')
        + resumenSync);
    } catch (error) {
      if (uploadedPath) await supabase.storage.from(PHOTO_BUCKET).remove([uploadedPath]);
      setFeedback(`No se pudo guardar la actividad: ${error.message}`);
    } finally {
      setSavingActivity(false);
    }
  };

  const deleteHistoryItem = async () => {
    if (!porBorrar) return;
    setBorrando(true);
    // Primero se limpia lo enlazado (mientras la publicación todavía existe):
    // sale del calendario del aula y de la Planificación (o queda sin enlace).
    let avisosLimpieza = [];
    if (planes[porBorrar.id]) {
      const res = await limpiarAlEliminarPublicacion(supabase, planes[porBorrar.id], { borrarDePlanificacion: borrarDePlan });
      avisosLimpieza = res.avisos || [];
    }
    const { error } = await supabase.from(HISTORY_TABLE).delete().eq('id', porBorrar.id);
    if (planes[porBorrar.id]) await cargarPlanes();
    if (error) {
      setFeedback(`No se pudo eliminar: ${error.message}`);
    } else {
      if (porBorrar.ponente_foto_path) {
        await supabase.storage.from(PHOTO_BUCKET).remove([porBorrar.ponente_foto_path]);
      }
      // Si se estaba editando justo esa, el formulario vuelve a ser un borrador
      // nuevo para no intentar actualizar una fila que ya no existe.
      if (editingHistoryId === porBorrar.id) {
        setEditingHistoryId('');
        setDraftId(crypto.randomUUID());
        clearPhotoDraft();
      }
      await loadHistory();
      setFeedback(`Actividad eliminada del historial${planes[porBorrar.id]?.aula_event_id ? ' y del calendario del aula' : ''}${planes[porBorrar.id] ? (borrarDePlan ? ' y de la Planificación' : '; en la Planificación quedó sin enlace') : ''}.${avisosLimpieza.length ? ` ${avisosLimpieza.join(' ')}` : ''}`);
    }
    setPorBorrar(null);
    setBorrando(false);
  };

  const editHistoryItem = (item) => {
    setEditingHistoryId(item.id);
    setSourceMode(item.origen || 'manual');
    setSelectedOficioId(item.oficio_id || '');
    setActivity({
      actividad_nombre: item.actividad_nombre || '',
      ponente_nombre: item.ponente_nombre || '',
      ponente_grado: item.ponente_grado || '',
      actividad_fecha: item.actividad_fecha || '',
      actividad_hora: item.actividad_hora || '',
      actividad_lugar: item.actividad_lugar || '',
      zoom_detalles: item.zoom_detalles || '',
      actividad_tipo: item.actividad_tipo || '',
      area: item.area || '',
      modalidad: item.modalidad || '',
      duracion_horas: item.duracion_horas ?? '',
      enlace_inscripcion: item.enlace_inscripcion || '',
      participantes_estimados: item.participantes_estimados ?? '',
      gastos_extra: Array.isArray(item.gastos_extra) ? item.gastos_extra : [],
    });
    const matchingResponsible = responsibles.find(candidate => (
      candidate.phone.replace(/\D/g, '') === String(item.responsable_telefono || '').replace(/\D/g, '')
    ));
    if (matchingResponsible) setSelectedResponsibleId(matchingResponsible.id);
    setMessageOverride(item.mensaje_publicacion || null);
    clearPhotoDraft();
    setExistingPhotoPath(item.ponente_foto_path || '');
    setExistingPhotoName(item.ponente_foto_nombre || '');
    setFeedback('Actividad abierta para edición.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const downloadMessage = (item = null) => {
    const text = item?.mensaje_publicacion || message;
    const name = item?.actividad_nombre || activity.actividad_nombre;
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `publicacion-${safeName(name)}.txt`);
    setFeedback('Mensaje descargado en texto plano.');
  };

  const downloadStoredPhoto = async (item) => {
    if (!item?.ponente_foto_path) return;
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(item.ponente_foto_path);
    if (error) {
      setFeedback(`No se pudo descargar la fotografía: ${error.message}`);
      return;
    }
    downloadBlob(data, item.ponente_foto_nombre || `ponente-${safeName(item.actividad_nombre)}.jpg`);
    setFeedback('Fotografía descargada.');
  };

  const sharePublication = async ({ text, phone, photoPath, photoName, localFile }) => {
    let shareFile = localFile || null;
    if (!shareFile && photoPath) {
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(photoPath);
      if (error) {
        setFeedback(`No se pudo preparar la fotografía: ${error.message}`);
        return;
      }
      shareFile = new File([data], photoName || 'foto-ponente.jpg', { type: data.type || 'image/jpeg' });
    }

    if (shareFile && navigator.share && navigator.canShare?.({ files: [shareFile] })) {
      try {
        await navigator.share({
          title: 'Solicitud de publicación CAEDUC',
          text,
          files: [shareFile],
        });
        setFeedback('Solicitud y fotografía preparadas para compartir. Selecciona WhatsApp si aparece el menú de aplicaciones.');
      } catch (error) {
        if (error.name !== 'AbortError') setFeedback(`No se pudo compartir: ${error.message}`);
      }
      return;
    }

    const chatWindow = window.open('', '_blank');
    await copyPlainText(text);
    if (shareFile) downloadBlob(shareFile, shareFile.name || 'foto-ponente.jpg');
    const url = whatsappUrl(phone, text);
    if (chatWindow) chatWindow.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
    setFeedback(shareFile
      ? 'Abrimos el chat con el mensaje y descargamos la fotografía para que la adjuntes. WhatsApp Web no permite adjuntarla automáticamente.'
      : 'Abrimos el chat de WhatsApp con el mensaje preparado.');
  };

  const shareCurrent = () => sharePublication({
    text: message,
    phone: responsible?.phone,
    photoPath: removeExistingPhoto ? '' : existingPhotoPath,
    photoName: existingPhotoName,
    localFile: photoFile,
  });

  const generateSelectedReport = async () => {
    if (!reportFrom || !reportTo) {
      setFeedback('Selecciona la fecha inicial y la fecha final del informe.');
      return;
    }
    if (reportFrom > reportTo) {
      setFeedback('La fecha inicial debe ser anterior o igual a la fecha final.');
      return;
    }
    const selected = activitiesInDateRange(history, reportFrom, reportTo);
    if (!selected.length) {
      setFeedback('No hay actividades con fecha dentro del período seleccionado.');
      return;
    }
    await onGenerateActivityReport?.(selected.map(item => ({ ...item, ponente_foto_url: photoUrls[item.id] || '' })), {
      from: reportFrom,
      to: reportTo,
      type: reportType,
    });
    setReportDialog(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-caeduc-pink">Comunicación institucional</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-800">
          <Send size={24} className="text-caeduc-blue"/> Solicitud de publicación en redes
        </h1>
        <p className="mt-1 text-sm text-slate-500">Crea una actividad desde cero o recupera sus datos desde un oficio y conserva el material en el historial.</p>
      </header>
      {avisoMigracion && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{avisoMigracion}</p>}

      <div className={`grid gap-6 ${editorAbierto ? 'xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.75fr)]' : ''}`}>
        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-extrabold text-slate-800">1. Origen de la actividad</h2>
            <div className="mt-4 grid gap-2 rounded-xl bg-slate-100 p-1.5 sm:grid-cols-2" role="tablist" aria-label="Origen de la actividad">
              <button
                type="button"
                role="tab"
                aria-selected={sourceMode === 'oficio'}
                onClick={() => startNew('oficio')}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-extrabold transition-colors ${sourceMode === 'oficio' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}
              >
                <Search size={17}/> Buscar desde oficio
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sourceMode === 'manual'}
                onClick={() => startNew('manual')}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-extrabold transition-colors ${sourceMode === 'manual' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}
              >
                <Plus size={17}/> Crear actividad
              </button>
            </div>

            {sourceMode === 'oficio' && (
              <Field id="publication-oficio" label="Título del oficio o actividad" helper="Los datos se copian al formulario de publicación; no se modifica el oficio original.">
                <select
                  id="publication-oficio"
                  value={selectedOficioId}
                  onChange={event => selectOficio(event.target.value)}
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
              </Field>
            )}

            {sourceMode === 'manual' && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                Los espacios empiezan vacíos para que prepares una solicitud nueva dirigida al responsable de publicaciones.
              </div>
            )}

            {!editorAbierto && (
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Elige una opción para abrir el formulario, o toca “Editar” en una actividad del historial.
              </p>
            )}

            {editorAbierto && (
              <button type="button" onClick={cerrarEditor} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
                <X size={16}/> Cerrar y limpiar
              </button>
            )}
          </Card>

          {editorAbierto && (<>
          <Card>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-800">2. Datos para la publicación</h2>
                <p className="text-xs text-slate-500">Puedes corregir estos datos sin alterar el oficio de origen.</p>
              </div>
              {editingHistoryId && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Editando registro histórico</span>}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field id="publication-name" label="Nombre de la actividad *">
                  <input id="publication-name" value={activity.actividad_nombre} onChange={event => updateActivity('actividad_nombre', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="publication-speaker" label="Nombre del o la ponente">
                  <input id="publication-speaker" value={activity.ponente_nombre} onChange={event => updateActivity('ponente_nombre', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field
                  id="publication-degree"
                  label="Grado académico del profesional"
                  helper="Uso interno: define el honorario según el tarifario para los oficios de pago y el modelo de factura. No se publica ni se envía a nadie."
                >
                  <select
                    id="publication-degree"
                    value={activity.ponente_grado}
                    onChange={event => updateActivity('ponente_grado', event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Sin definir</option>
                    {grados.map(grado => <option key={grado} value={grado}>{grado}</option>)}
                    {activity.ponente_grado && !grados.includes(activity.ponente_grado) && (
                      <option value={activity.ponente_grado}>{activity.ponente_grado} (fuera del tarifario)</option>
                    )}
                  </select>
                  {activity.ponente_grado && (
                    <p className="mt-1.5 text-xs font-bold text-emerald-700">
                      {montoGrado !== null
                        ? `Honorario según tarifario: ${formatoQuetzales(montoGrado)}`
                        : 'Este grado ya no está en el tarifario; actualízalo en Directorio → Tarifario de Honorarios.'}
                    </p>
                  )}
                </Field>
              </div>
              <Field id="publication-date" label="Fecha">
                <input id="publication-date" type="text" value={activity.actividad_fecha} onChange={event => updateActivity('actividad_fecha', event.target.value)} placeholder="Ej. 20 de agosto de 2026" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
              </Field>
              <Field id="publication-time" label="Hora">
                <input id="publication-time" type="time" value={activity.actividad_hora} onChange={event => updateActivity('actividad_hora', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
              </Field>
              <div className="sm:col-span-2">
                <Field id="publication-place" label="Lugar, modalidad o plataforma">
                  <div className="relative mt-2">
                    <MapPin size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400"/>
                    <input id="publication-place" value={activity.actividad_lugar} onChange={event => updateActivity('actividad_lugar', event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
                  </div>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="publication-zoom" label="Datos de Zoom" helper="Pega el bloque completo tal como te lo envían: enlace, ID de reunión y código de acceso.">
                  <textarea
                    id="publication-zoom"
                    value={activity.zoom_detalles}
                    onChange={event => updateActivity('zoom_detalles', event.target.value)}
                    placeholder={'Enlace de Zoom:\nhttps://us06web.zoom.us/launch/jc/82260894830\nID de reunión: 822 6089 4830\nCódigo de acceso: 976254'}
                    className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-6 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </Field>
              </div>
              <Field id="publication-modality" label="Modalidad *">
                <select id="publication-modality" value={activity.modalidad} onChange={event => updateActivity('modalidad', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">Selecciona…</option>
                  {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field id="publication-hours" label="Duración (horas) *" helper="Se usa en los certificados del aula virtual.">
                <input id="publication-hours" type="number" min="0.5" step="0.5" value={activity.duracion_horas} onChange={event => updateActivity('duracion_horas', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
              </Field>
              <Field id="publication-type" label="Tipo de actividad *">
                <select id="publication-type" value={activity.actividad_tipo} onChange={event => updateActivity('actividad_tipo', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">Selecciona…</option>
                  {TIPOS_ACTIVIDAD.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field id="publication-area" label="Área (Planificación) *">
                <select id="publication-area" value={activity.area} onChange={event => updateActivity('area', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">Selecciona…</option>
                  {AREAS_PLANIFICACION.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              <Field id="publication-registration" label="Enlace de inscripción (opcional)" helper="Formulario o registro de Zoom; aparece en el calendario del aula.">
                <input id="publication-registration" type="url" value={activity.enlace_inscripcion} onChange={event => updateActivity('enlace_inscripcion', event.target.value)} placeholder="https://…" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
              </Field>
              <Field id="publication-participants" label="Participantes esperados (opcional)">
                <input id="publication-participants" type="number" min="0" value={activity.participantes_estimados} onChange={event => updateActivity('participantes_estimados', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
              </Field>
              <p className="sm:col-span-2 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                <Link2 size={14} className="mt-0.5 shrink-0"/>
                {enlaceReunion(activity)
                  ? <>Enlace que irá al calendario del aula: <span className="break-all font-semibold">{enlaceReunion(activity)}</span></>
                  : <>Sin enlace de Zoom: el calendario del aula enlazará a <strong>www.aulavirtualcpg.org</strong> hasta que lo agregues.</>}
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-800"><Calendar size={18}/> Planificación y presupuesto</h2>
            <p className="mt-1 text-xs text-slate-500">Al guardar, la actividad se carga sola en la Planificación general (con este presupuesto), en el Expediente del ponente y, si ya está publicada, en el calendario del aula virtual.</p>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-emerald-50 p-3"><span className="block text-xs font-bold uppercase text-emerald-700">Honorario ponente</span><span className="font-extrabold text-emerald-900">{presupuesto.honorario ? formatoQuetzales(presupuesto.honorario) : 'Define el grado académico'}</span></div>
              <div className="rounded-xl bg-amber-50 p-3"><span className="block text-xs font-bold uppercase text-amber-700">Gastos extra</span><span className="font-extrabold text-amber-900">{formatoQuetzales(presupuesto.total_extras)}</span></div>
              <div className="rounded-xl bg-blue-50 p-3"><span className="block text-xs font-bold uppercase text-blue-700">Total a planificar</span><span className="font-extrabold text-blue-900">{formatoQuetzales(presupuesto.total)}</span></div>
            </div>
            {(pideExtras || gastosEditables.length > 0) && (
              <div className={`mt-4 rounded-xl border p-3 ${presupuesto.faltan_extras ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
                <p className="text-sm font-bold text-slate-700">Gastos extra {pideExtras && <span className="font-normal text-amber-700">— actividad {activity.modalidad ? activity.modalidad.toLowerCase() : 'presencial'}: registra alimentación, souvenirs y demás</span>}</p>
                <div className="mt-2 space-y-2">
                  {gastosEditables.map((g, i) => (
                    <div key={i} className="flex gap-2">
                      <input aria-label="Concepto" value={g.concepto} onChange={event => setGasto(i, 'concepto', event.target.value)} placeholder="Concepto" className="min-h-10 flex-1 rounded-lg border border-slate-300 px-2 text-sm"/>
                      <input aria-label="Monto" type="number" min="0" value={g.monto} onChange={event => setGasto(i, 'monto', event.target.value)} placeholder="Q" className="min-h-10 w-28 rounded-lg border border-slate-300 px-2 text-sm"/>
                      <button type="button" onClick={() => removeGasto(i)} aria-label="Quitar gasto" className="min-h-10 rounded-lg px-2 text-red-600 hover:bg-red-50"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {GASTOS_EXTRA_SUGERIDOS.filter(c => !gastosEditables.some(g => g.concepto === c)).map(c => (
                    <button key={c} type="button" onClick={() => addGasto(c)} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">+ {c}</button>
                  ))}
                  <button type="button" onClick={() => addGasto('')} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50">+ Otro</button>
                </div>
              </div>
            )}
            {!pideExtras && !gastosEditables.length && (
              <button type="button" onClick={() => addGasto('')} className="mt-3 text-xs font-bold text-blue-700 underline">Agregar gastos extra</button>
            )}
            <div className={`mt-4 rounded-xl p-3 text-sm ${faltantes.completo ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
              {faltantes.completo
                ? <p className="flex items-center gap-2 font-bold"><Check size={16}/> Información completa para Planificación, Expediente y aula virtual.</p>
                : <><p className="font-bold">Falta información para que todo quede sincronizado:</p><ul className="mt-1 list-disc pl-5 text-xs leading-5">{faltantes.faltan.map(f => <li key={f}>{f}</li>)}</ul></>}
            </div>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-800"><Image size={18}/> 3. Fotografía del o la ponente</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                {currentPhotoUrl ? (
                  <img src={currentPhotoUrl} alt={`Fotografía de ${activity.ponente_nombre || 'la persona ponente'}`} className="h-full w-full object-cover"/>
                ) : (
                  <User size={44} className="text-slate-300" aria-hidden="true"/>
                )}
              </div>
              <div>
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700">
                  <Upload size={17}/> Cargar fotografía
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handlePhoto} className="sr-only"/>
                </label>
                {currentPhotoUrl && (
                  <button type="button" onClick={removePhoto} className="ml-2 min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">Quitar</button>
                )}
                <p className="mt-2 text-xs leading-5 text-slate-500">JPG, PNG, WebP o AVIF. Máximo 5 MB. La imagen se guarda de forma privada con el registro.</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-800">4. Responsable de publicación</h2>
                <p className="text-xs text-slate-500">El nombre seleccionado cambia automáticamente en el saludo.</p>
              </div>
              <button type="button" onClick={() => { setDraftResponsibles(responsibles); setEditingResponsibles(true); setFeedback(''); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200">
                <Edit3 size={16}/> Editar responsables
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {responsibles.map(item => {
                const selected = item.id === selectedResponsibleId;
                return (
                  <label key={item.id} className={`flex min-h-24 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="publication-responsible" value={item.id} checked={selected} onChange={() => setSelectedResponsibleId(item.id)} className="mt-1 h-4 w-4 accent-blue-600"/>
                    <span className="min-w-0">
                      <span className="block font-extrabold text-slate-800">{item.name}</span>
                      <span className="block text-xs leading-5 text-slate-500">{item.role || 'Responsable de comunicación'}</span>
                      <span className="mt-1 block text-xs font-bold text-emerald-700">WhatsApp {item.phone}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>
          </>)}
        </div>

        {editorAbierto && (
        <Card className="h-fit xl:sticky xl:top-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Vista previa editable</p>
              <h2 className="mt-1 text-lg font-black text-slate-800">Mensaje en texto plano</h2>
            </div>
            <button type="button" onClick={() => setMessageOverride(null)} aria-label="Restablecer mensaje generado" title="Restablecer mensaje generado" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><RotateCcw size={19}/></button>
          </div>
          <textarea
            value={message}
            onChange={event => setMessageOverride(event.target.value)}
            aria-label="Mensaje para solicitud de publicación"
            className="mt-4 min-h-[390px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <button type="button" onClick={() => handleCopy()} disabled={!message} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
              <Copy size={18}/> Copiar
            </button>
            <button type="button" onClick={() => downloadMessage()} disabled={!message} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
              <Download size={18}/> Descargar
            </button>
          </div>
          <button type="button" onClick={shareCurrent} disabled={!message || !responsible} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-extrabold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
            <MessageCircle size={19}/> Enviar por WhatsApp
          </button>
          <button type="button" onClick={saveActivity} disabled={savingActivity} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-caeduc-pink px-4 py-3 font-extrabold text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50">
            {savingActivity ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} {savingActivity ? 'Guardando...' : editingHistoryId ? 'Actualizar actividad' : 'Guardar en historial'}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">En celulares compatibles, el botón comparte el texto y la foto juntos. En WhatsApp Web abre el chat, copia el texto y descarga la foto para adjuntarla.</p>
          {feedback && <p role="status" aria-live="polite" className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600"/>{feedback}</p>}
        </Card>
        )}
      </div>

      {/* Con el formulario cerrado el aviso no tiene dónde salir, y aquí llegan
          los de eliminar o descargar desde el historial. */}
      {!editorAbierto && feedback && (
        <p role="status" aria-live="polite" className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <Check size={16} className="mt-0.5 shrink-0 text-emerald-600"/>{feedback}
        </p>
      )}

      <Card className="border-indigo-200 bg-indigo-50/60">
        <h2 className="flex items-center gap-2 font-extrabold text-indigo-900"><User size={18}/> Responsabilidad según el reglamento</h2>
        <p className="mt-2 text-sm leading-6 text-indigo-800">El Gestor del Conocimiento coordina con la persona responsable de redes la información que debe publicarse. Prosecretaría vela por la promoción y difusión de las actividades de la Comisión.</p>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Registro compacto</p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-slate-800"><History size={20}/> Historial de actividades</h2>
            <p className="mt-1 text-sm text-slate-500">Cada registro permanece colapsado hasta que necesites editarlo, descargarlo o enviarlo.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <button type="button" onClick={() => { setReportType('detalle'); setReportDialog(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-caeduc-blue px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-blue-800"><Printer size={17}/> Imprimir informe</button>
            <button type="button" onClick={() => { setReportType('junta'); setReportDialog(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-indigo-700"><FileText size={17}/> Informe a Junta Directiva</button>
            <div className="relative w-full lg:w-80">
              <Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400"/>
              <input aria-label="Buscar en el historial" value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Buscar actividad, ponente o fecha" className="min-h-11 w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {historyLoading && <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-6 text-sm text-slate-500"><Loader2 size={18} className="animate-spin"/> Cargando historial...</div>}
          {!historyLoading && !filteredHistory.length && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><History size={30} className="mx-auto text-slate-300"/><p className="mt-2 text-sm font-bold text-slate-600">Aún no hay actividades guardadas.</p><p className="mt-1 text-xs text-slate-500">Completa el formulario y selecciona “Guardar en historial”.</p></div>}
          {filteredHistory.map(item => (
            <details key={item.id} className="group rounded-xl border border-slate-200 bg-white open:border-blue-200 open:shadow-sm">
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 marker:content-none">
                {item.ponente_foto_path ? (
                  <img src={photoUrls[item.id]} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-slate-100 object-cover"/>
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100"><Calendar size={19} className="text-slate-500"/></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-slate-800">{item.actividad_nombre}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{item.actividad_fecha || 'Fecha pendiente'} · {item.responsable_nombre || 'Sin responsable'}</span>
                </span>
                {planes[item.id]?.aula_event_id && <span title="Publicada en el calendario del aula virtual. Si la editas aquí, el cambio también se actualiza en el aula." className="hidden cursor-help rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700 sm:inline">En aula ✓</span>}
                {planes[item.id] && <span title="Ya está en la Planificación general, con su presupuesto (honorario del ponente + gastos extra)." className="hidden cursor-help rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 sm:inline">Planificada ✓</span>}
                <span title={item.origen === 'oficio' ? 'Solicitud armada con los datos de un oficio (nombre, fecha y ponente).' : 'Solicitud creada directamente en este módulo.'} className="cursor-help rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{item.origen === 'oficio' ? 'Desde oficio' : 'Creada aquí'}</span>
                <Plus size={18} className="shrink-0 text-slate-400 transition-transform group-open:rotate-45" aria-hidden="true"/>
              </summary>
              <div className="border-t border-slate-100 px-4 py-4">
                <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                  <p><span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Ponente</span>{item.ponente_nombre || 'Pendiente'}</p>
                  <p><span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Grado académico</span>{item.ponente_grado ? `${item.ponente_grado}${montoPorGrado(item.ponente_grado, tarifas) !== null ? ` · ${formatoQuetzales(montoPorGrado(item.ponente_grado, tarifas))}` : ''}` : 'Sin definir'}</p>
                  <p><span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Hora</span>{item.actividad_hora || 'Pendiente'}</p>
                  <p><span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Lugar</span>{item.actividad_lugar || 'Pendiente'}</p>
                  <p><span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Actualizado</span>{new Date(item.updated_at).toLocaleDateString('es-GT')}</p>
                  <p><span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Modalidad · horas</span>{item.modalidad || 'Pendiente'}{item.duracion_horas ? ` · ${item.duracion_horas} h` : ''}</p>
                  <p><span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Presupuesto planificado</span>{planes[item.id]?.monto ? formatoQuetzales(planes[item.id].monto) : 'Sin planificar'}</p>
                </div>
                {!faltantesPublicacion(item, tarifas).completo && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"><strong>Falta:</strong> {faltantesPublicacion(item, tarifas).faltan.join(' · ')}. Toca “Editar” para completarlo.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => editHistoryItem(item)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"><Edit3 size={16}/> Editar</button>
                  <button type="button" onClick={() => publicarAula(item)} disabled={publicandoAula === item.id} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{publicandoAula === item.id ? <Loader2 size={16} className="animate-spin"/> : <GraduationCap size={16}/>} {planes[item.id]?.aula_event_id ? 'Actualizar en aula' : 'Publicar en aula'}</button>
                  <button type="button" onClick={() => downloadMessage(item)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"><FileText size={16}/> Descargar mensaje</button>
                  {item.ponente_foto_path && <button type="button" onClick={() => downloadStoredPhoto(item)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"><Image size={16}/> Descargar foto</button>}
                  <button type="button" onClick={() => sharePublication({ text: item.mensaje_publicacion, phone: item.responsable_telefono, photoPath: item.ponente_foto_path, photoName: item.ponente_foto_nombre })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"><MessageCircle size={16}/> WhatsApp <ExternalLink size={13}/></button>
                  <button type="button" onClick={() => setPorBorrar(item)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100"><Trash2 size={16}/> Eliminar</button>
                </div>
              </div>
            </details>
          ))}
        </div>
      </Card>

      {reportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="activity-report-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Registro de actividades</p><h2 id="activity-report-title" className="mt-1 text-xl font-black text-slate-800">{reportType === 'junta' ? 'Informe para Junta Directiva' : 'Imprimir informe de actividades'}</h2><p className="mt-2 text-sm leading-5 text-slate-500">Selecciona el período que debe aparecer en el PDF.</p></div>
              <button type="button" onClick={() => setReportDialog(false)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={20}/></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="activity-report-from" label="Fecha inicial"><input id="activity-report-from" type="date" value={reportFrom} onChange={event => setReportFrom(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/></Field>
              <Field id="activity-report-to" label="Fecha final"><input id="activity-report-to" type="date" value={reportTo} onChange={event => setReportTo(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"/></Field>
            </div>
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{reportType === 'junta' ? 'Se generará una hoja membretada dirigida a Junta Directiva, con tabla y la firma institucional de Coordinación.' : 'Se generará una ficha por actividad, con fotografía, actividad, ponente, fecha, lugar y hora.'}</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setReportDialog(false)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button><button type="button" onClick={generateSelectedReport} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-caeduc-pink px-5 py-2 text-sm font-extrabold text-white hover:bg-pink-700"><Download size={17}/> Generar PDF</button></div>
          </div>
        </div>
      )}

      {porBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="borrar-actividad-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <h2 id="borrar-actividad-title" className="text-xl font-black text-slate-800">Eliminar del historial</h2>
            <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">
              Se eliminará <strong>{porBorrar.actividad_nombre || 'esta actividad'}</strong>{porBorrar.actividad_fecha ? ` (${porBorrar.actividad_fecha})` : ''}{porBorrar.ponente_foto_path ? ', junto con la fotografía del ponente' : ''}. No se puede deshacer.
            </p>
            {planes[porBorrar.id]?.aula_event_id && <p className="mt-3 text-sm text-slate-600">También se quitará del calendario del aula virtual.</p>}
            {planes[porBorrar.id] && (
              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={borrarDePlan} onChange={event => setBorrarDePlan(event.target.checked)} className="mt-1 h-4 w-4 accent-red-600"/>
                <span>Eliminarla también de la Planificación (si ya no se realizará). Desmarca para conservarla en el plan anual sin enlace.</span>
              </label>
            )}
            <p className="mt-3 text-xs text-slate-500">El expediente del ponente se conserva con sus documentos.</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPorBorrar(null)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
              <button type="button" onClick={deleteHistoryItem} disabled={borrando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                {borrando ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>} {borrando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingResponsibles && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="responsibles-title">
          <div className="my-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 id="responsibles-title" className="text-lg font-black text-slate-800">Editar responsables de publicación</h2>
                <p className="text-xs text-slate-500">Nombre, cargo o rol y teléfono de WhatsApp.</p>
              </div>
              <button type="button" onClick={() => setEditingResponsibles(false)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X size={20}/></button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              {draftResponsibles.map((item, index) => (
                <fieldset key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <legend className="px-2 text-sm font-extrabold text-slate-700">Responsable {index + 1}</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={`responsible-name-${item.id}`} label="Nombre *"><input id={`responsible-name-${item.id}`} value={item.name} onChange={event => updateDraft(item.id, 'name', event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2"/></Field>
                    <Field id={`responsible-phone-${item.id}`} label="Teléfono *"><input id={`responsible-phone-${item.id}`} type="tel" inputMode="numeric" value={item.phone} onChange={event => updateDraft(item.id, 'phone', event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2"/></Field>
                    <div className="sm:col-span-2"><Field id={`responsible-role-${item.id}`} label="Cargo o rol"><input id={`responsible-role-${item.id}`} value={item.role} onChange={event => updateDraft(item.id, 'role', event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2"/></Field></div>
                  </div>
                  {draftResponsibles.length > 1 && <button type="button" onClick={() => setDraftResponsibles(current => current.filter(currentItem => currentItem.id !== item.id))} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"><Trash2 size={16}/> Eliminar responsable</button>}
                </fieldset>
              ))}
              <button type="button" onClick={addResponsible} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"><Plus size={16}/> Agregar responsable</button>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditingResponsibles(false)} className="min-h-11 rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">Cancelar</button>
              <button type="button" onClick={saveResponsibles} disabled={savingResponsibles} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Save size={16}/>{savingResponsibles ? 'Guardando...' : 'Guardar responsables'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
