// src/AgendasView.jsx — Control de Agendas CAEDUC (Parte 5: memoria entre sesiones)
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Plus, Save, CheckCircle, FileText, Clock, User, Edit3, Trash2,
  X, Printer, ChevronDown, ChevronUp, ArrowLeft, BookOpen,
  Calendar, MapPin, RefreshCw, Info, Lock, Unlock, Copy,
  AlignLeft, Hash, ListChecks, CheckSquare, Square, History
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
);

// ── Constantes ────────────────────────────────────────────────────────────────
const MODALIDADES = ['Virtual', 'Presencial', 'Híbrida'];

const PUNTOS_FIJOS = [
  { tema: 'Apertura de la sesión, bienvenida y aprobación de agenda', responsable: 'M.A. Juan José Reyes', es_fijo: true },
  { tema: 'Lectura y aprobación del acta de la sesión anterior',       responsable: 'Secretaria CAEDUC',    es_fijo: true },
  { tema: 'Avales',                                                      responsable: '',                      es_fijo: true },
  { tema: 'Programación de actividades',                                 responsable: '',                      es_fijo: true },
  { tema: 'Cierre de sesión',                                            responsable: 'M.A. Juan José Reyes', es_fijo: true },
];

// ── Utilidades de tiempo ──────────────────────────────────────────────────────
const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

// Recalcula hora_inicio y hora_fin de todos los puntos en cascada
const recalcTimes = (puntos, horaInicioSesion) => {
  let cursor = timeToMinutes(horaInicioSesion || '18:00');
  return puntos.map(p => {
    const inicio = minutesToTime(cursor);
    const dur = Number(p.duracion_min) || 0;
    const fin = minutesToTime(cursor + dur);
    cursor += dur;
    return { ...p, hora_inicio: inicio, hora_fin: fin };
  });
};

const totalDuracion = (puntos) =>
  puntos.reduce((s, p) => s + (Number(p.duracion_min) || 0), 0);

const todayISO  = () => new Date().toISOString().split('T')[0];
const todayText = () => {
  const m = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const d = new Date();
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
};

// ── PDF ───────────────────────────────────────────────────────────────────────
const loadHtml2Pdf = () => new Promise((res, rej) => {
  if (window.html2pdf) { res(window.html2pdf); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
  s.onload = () => res(window.html2pdf);
  s.onerror = () => rej(new Error('html2pdf no cargó'));
  document.head.appendChild(s);
});

// PARTE 5: la agenda en PDF ahora incluye "Pendientes de la reunión anterior" (✓/✗)
// y "Pendientes registrados en esta sesión" (con responsables).
const generateAgendaPDF = async (agenda, puntos, pendientesActuales = [], pendientesAnteriores = [], sesionAnteriorNum = null) => {
  const rows = puntos.map((p, i) => `
    <tr>
      <td style="border:1px solid #d1d5db;padding:8px 10px;font-size:11px;vertical-align:top;text-align:center;white-space:nowrap;">${i+1}.</td>
      <td style="border:1px solid #d1d5db;padding:8px 10px;font-size:11px;vertical-align:top;">
        <strong>${p.tema}</strong>
        ${p.descripcion ? `<br><span style="font-size:10px;color:#6b7280;">${p.descripcion}</span>` : ''}
      </td>
      <td style="border:1px solid #d1d5db;padding:8px 10px;font-size:11px;vertical-align:top;">${p.responsable || '—'}</td>
      <td style="border:1px solid #d1d5db;padding:8px 10px;font-size:11px;vertical-align:top;text-align:center;white-space:nowrap;">
        ${p.hora_inicio && p.hora_fin ? `${p.hora_inicio} a ${p.hora_fin}` : p.duracion_min ? `${p.duracion_min} min` : '—'}
      </td>
    </tr>
    ${p.notas_seguimiento ? `<tr><td colspan="4" style="border:1px solid #d1d5db;padding:4px 10px 6px 24px;background:#fffbeb;"><span style="font-size:9px;font-weight:700;color:#92400e;">📋 Seguimiento: </span><span style="font-size:9px;color:#78350f;">${p.notas_seguimiento}</span></td></tr>` : ''}
  `).join('');

  const durTotal = totalDuracion(puntos);
  const horaFin = puntos.length > 0 ? puntos[puntos.length-1].hora_fin : '';

  const pendAnterioresRows = pendientesAnteriores.map(p => `
    <tr>
      <td style="border:1px solid #d1d5db;padding:6px 10px;font-size:10.5px;text-align:center;width:26px;">${p.completado ? '✅' : '❌'}</td>
      <td style="border:1px solid #d1d5db;padding:6px 10px;font-size:10.5px;">${p.descripcion}</td>
      <td style="border:1px solid #d1d5db;padding:6px 10px;font-size:10.5px;">${p.responsable || '—'}</td>
    </tr>
  `).join('');

  const pendActualesRows = pendientesActuales.map(p => `
    <tr>
      <td style="border:1px solid #d1d5db;padding:6px 10px;font-size:10.5px;text-align:center;width:26px;">${p.completado ? '✅' : '❌'}</td>
      <td style="border:1px solid #d1d5db;padding:6px 10px;font-size:10.5px;">${p.descripcion}</td>
      <td style="border:1px solid #d1d5db;padding:6px 10px;font-size:10.5px;">${p.responsable || '—'}</td>
    </tr>
  `).join('');

  const seccionPendAnt = pendientesAnteriores.length > 0 ? `
    <h3 style="font-size:12px;font-weight:800;color:#1a5276;margin:22px 0 8px;border-bottom:2px solid #E91E63;padding-bottom:4px;">
      Pendientes de la reunión anterior${sesionAnteriorNum ? ` (Sesión No. ${sesionAnteriorNum})` : ''}
    </h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f1f5f9;color:#334155;">
        <th style="padding:6px 10px;font-size:10px;border:1px solid #d1d5db;">✓</th>
        <th style="padding:6px 10px;font-size:10px;text-align:left;border:1px solid #d1d5db;">Pendiente</th>
        <th style="padding:6px 10px;font-size:10px;text-align:left;border:1px solid #d1d5db;width:160px;">Responsable</th>
      </tr></thead>
      <tbody>${pendAnterioresRows}</tbody>
    </table>` : '';

  const seccionPendAct = pendientesActuales.length > 0 ? `
    <h3 style="font-size:12px;font-weight:800;color:#1a5276;margin:22px 0 8px;border-bottom:2px solid #E91E63;padding-bottom:4px;">
      Pendientes registrados en esta sesión
    </h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#f1f5f9;color:#334155;">
        <th style="padding:6px 10px;font-size:10px;border:1px solid #d1d5db;">✓</th>
        <th style="padding:6px 10px;font-size:10px;text-align:left;border:1px solid #d1d5db;">Pendiente</th>
        <th style="padding:6px 10px;font-size:10px;text-align:left;border:1px solid #d1d5db;width:160px;">Responsable</th>
      </tr></thead>
      <tbody>${pendActualesRows}</tbody>
    </table>` : '';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Agenda Sesión No. ${agenda.numero_sesion} CAEDUC</title>
  <style>
    @page { size: letter; margin: 0.7in 0.8in; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: white; margin: 0; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #1a5276; padding-bottom: 16px; }
    .header h1 { font-size: 15px; font-weight: 800; color: #1a5276; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
    .header h2 { font-size: 13px; font-weight: 700; color: #374151; margin: 0 0 6px; }
    .header p  { font-size: 11px; color: #6b7280; margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    thead tr { background: #1a5276; color: white; }
    thead th { padding: 8px 10px; font-size: 11px; text-align: left; border: 1px solid #1a5276; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700;
      background: ${agenda.estado === 'Aprobada' ? '#dcfce7' : '#fef9c3'};
      color: ${agenda.estado === 'Aprobada' ? '#166534' : '#854d0e'}; }
  </style></head><body>
  <div class="header">
    <h1>Comisión de Acreditación y Educación Continua — CAEDUC</h1>
    <h2>AGENDA — Sesión de Trabajo No. ${agenda.numero_sesion} &nbsp;|&nbsp; Modalidad ${agenda.modalidad}</h2>
    <p><strong>Fecha:</strong> ${agenda.fecha} &nbsp;&nbsp;
       <strong>Horario:</strong> ${agenda.hora_inicio}${horaFin ? ` a ${horaFin}` : ''} horas
       ${agenda.lugar ? `&nbsp;&nbsp;<strong>Lugar:</strong> ${agenda.lugar}` : ''}
    </p>
    <p>Estado: <span class="status-badge">${agenda.estado}</span>
       &nbsp;&nbsp;Duración total: <strong>${durTotal} minutos</strong>
    </p>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px;">No.</th>
        <th>Tema</th>
        <th style="width:180px;">Responsable</th>
        <th style="width:130px;">Tiempo asignado</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  ${seccionPendAnt}
  ${seccionPendAct}
  <div class="footer">
    <span>CAEDUC ${new Date().getFullYear()} — colegiodepsicologos.org.gt</span>
    <span>Generado: ${new Date().toLocaleString('es-GT')}</span>
  </div>
  </body></html>`;

  try {
    const h2p = await loadHtml2Pdf();
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.97);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
    ov.innerHTML = '<div style="width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:sp 0.8s linear infinite;"></div><p style="font-size:14px;color:#374151;font-weight:600;">Generando agenda PDF...</p><style>@keyframes sp{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(ov);
    const ct = document.createElement('div');
    ct.style.cssText = 'position:fixed;top:0;left:0;width:8.5in;background:white;z-index:99998;';
    document.body.appendChild(ct);
    ct.innerHTML = html;
    await new Promise(r => setTimeout(r, 800));
    await h2p().set({
      margin: 0, filename: `Agenda_Sesion_${agenda.numero_sesion}_CAEDUC.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0, width: ct.scrollWidth, height: ct.scrollHeight },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(ct).save();
    ct.parentNode && ct.parentNode.removeChild(ct);
    ov.parentNode && ov.parentNode.removeChild(ov);
  } catch (e) { console.error(e); alert('Error al generar PDF.'); }
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function AgendasView() {
  const [view, setView]       = useState('lista');   // 'lista' | 'editor' | 'detalle'
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAgenda, setActiveAgenda] = useState(null);  // agenda en edición/detalle
  const [puntos, setPuntos]   = useState([]);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const autoSaveRef = React.useRef(null);

  // PARTE 5: memoria entre sesiones
  const [resumenAnterior, setResumenAnterior] = useState(null); // {agenda, puntos}
  const [resumenOpen, setResumenOpen] = useState(true);
  const [pendientesAnteriores, setPendientesAnteriores] = useState([]); // completado=false de sesiones previas
  const [pendientesActuales, setPendientesActuales] = useState([]); // ligados a activeAgenda.id
  const [nuevoPendiente, setNuevoPendiente] = useState({ descripcion:'', responsable:'' });
  const [savingPendiente, setSavingPendiente] = useState(false);

  // Auto-guardado silencioso de borradores
  useEffect(() => {
    if (view !== 'editor' || !activeAgenda || activeAgenda.estado === 'Aprobada') return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        let agendaId = activeAgenda.id;
        const puntosCalc = recalcTimes(puntos, activeAgenda.hora_inicio);
        const agendaData = {
          numero_sesion: activeAgenda.numero_sesion,
          fecha: activeAgenda.fecha,
          fecha_iso: activeAgenda.fecha_iso || todayISO(),
          hora_inicio: activeAgenda.hora_inicio,
          modalidad: activeAgenda.modalidad,
          lugar: activeAgenda.lugar,
          estado: 'Borrador',
          notas: activeAgenda.notas,
          updated_at: new Date().toISOString(),
        };
        if (agendaId) {
          await supabase.from('caeduc_agendas').update(agendaData).eq('id', agendaId);
          await supabase.from('caeduc_agenda_puntos').delete().eq('agenda_id', agendaId);
        } else {
          const { data, error } = await supabase.from('caeduc_agendas').insert([agendaData]).select();
          if (!error && data) {
            agendaId = data[0].id;
            setActiveAgenda(a => ({ ...a, id: agendaId }));
          }
        }
        if (agendaId) {
          const puntosToInsert = puntosCalc.map((p, i) => ({
            agenda_id: agendaId, orden: i + 1, tema: p.tema,
            descripcion: p.descripcion || '', responsable: p.responsable || '',
            hora_inicio: p.hora_inicio, duracion_min: Number(p.duracion_min) || 0,
            hora_fin: p.hora_fin, es_fijo: p.es_fijo || false,
            notas_seguimiento: p.notas_seguimiento || '',
          }));
          await supabase.from('caeduc_agenda_puntos').insert(puntosToInsert);
        }
        setLastAutoSave(new Date());
      } catch (_) { /* silencioso */ }
      setAutoSaving(false);
    }, 3000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [activeAgenda, puntos, view]);

  // Fetch all agendas
  const fetchAgendas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('caeduc_agendas')
      .select('*')
      .order('numero_sesion', { ascending: false });
    if (data) setAgendas(data);
    setLoading(false);
    return data || [];
  }, []);

  useEffect(() => { fetchAgendas(); }, [fetchAgendas]);

  // Fetch puntos de una agenda
  const fetchPuntos = async (agendaId) => {
    const { data } = await supabase
      .from('caeduc_agenda_puntos')
      .select('*')
      .eq('agenda_id', agendaId)
      .order('orden');
    return data || [];
  };

  // Encuentra la agenda con numero_sesion inmediatamente anterior (cualquier estado)
  const findAgendaAnterior = (numeroSesion, agendasList) => {
    const candidatas = (agendasList || agendas).filter(a => Number(a.numero_sesion) < Number(numeroSesion));
    if (!candidatas.length) return null;
    return candidatas.sort((a,b) => Number(b.numero_sesion) - Number(a.numero_sesion))[0];
  };

  // PARTE 5.1: resumen de la reunión anterior (solo lectura, puntos con notas_seguimiento)
  const loadResumenAnterior = async (numeroSesion, agendasList) => {
    const prev = findAgendaAnterior(numeroSesion, agendasList);
    if (!prev) { setResumenAnterior(null); return; }
    const pts = await fetchPuntos(prev.id);
    const conSeguimiento = pts.filter(p => p.notas_seguimiento && p.notas_seguimiento.trim());
    setResumenAnterior({ agenda: prev, puntos: conSeguimiento });
  };

  // PARTE 5.2: pendientes con completado=false de CUALQUIER agenda anterior (excluye la actual)
  const loadPendientesAnteriores = async (agendaIdActual) => {
    const { data } = await supabase
      .from('caeduc_agenda_pendientes')
      .select('*')
      .eq('completado', false)
      .order('created_at');
    const lista = (data || []).filter(p => p.agenda_id !== agendaIdActual);
    setPendientesAnteriores(lista);
  };

  const loadPendientesActuales = async (agendaId) => {
    if (!agendaId) { setPendientesActuales([]); return; }
    const { data } = await supabase
      .from('caeduc_agenda_pendientes')
      .select('*')
      .eq('agenda_id', agendaId)
      .order('orden');
    setPendientesActuales(data || []);
  };

  // Asegura que la agenda tenga un id en BD (crea un registro mínimo si aún no existe)
  const ensureAgendaId = async () => {
    if (activeAgenda.id) return activeAgenda.id;
    const agendaData = {
      numero_sesion: activeAgenda.numero_sesion,
      fecha: activeAgenda.fecha,
      fecha_iso: activeAgenda.fecha_iso || todayISO(),
      hora_inicio: activeAgenda.hora_inicio,
      modalidad: activeAgenda.modalidad,
      lugar: activeAgenda.lugar,
      estado: 'Borrador',
      notas: activeAgenda.notas,
    };
    const { data, error } = await supabase.from('caeduc_agendas').insert([agendaData]).select();
    if (error || !data) { alert('No se pudo guardar la agenda: ' + (error?.message || '')); return null; }
    const id = data[0].id;
    setActiveAgenda(a => ({ ...a, id }));
    return id;
  };

  // Marcar pendiente (anterior o actual) como completado — persiste de inmediato
  const togglePendienteCompletado = async (pendiente, listaSetter) => {
    const nuevoEstado = !pendiente.completado;
    listaSetter(prev => prev.map(p => p.id === pendiente.id ? { ...p, completado: nuevoEstado } : p));
    const { error } = await supabase.from('caeduc_agenda_pendientes')
      .update({ completado: nuevoEstado, completado_en: nuevoEstado ? new Date().toISOString() : null })
      .eq('id', pendiente.id);
    if (error) alert('Error al actualizar pendiente: ' + error.message);
    // Si se completó un pendiente "de la reunión anterior", ya no debe listarse ahí
    if (nuevoEstado) setPendientesAnteriores(prev => prev.filter(p => p.id !== pendiente.id));
  };

  const addPendienteActual = async () => {
    if (!nuevoPendiente.descripcion.trim()) return;
    setSavingPendiente(true);
    const agendaId = await ensureAgendaId();
    if (!agendaId) { setSavingPendiente(false); return; }
    const { data, error } = await supabase.from('caeduc_agenda_pendientes').insert([{
      agenda_id: agendaId,
      descripcion: nuevoPendiente.descripcion.trim(),
      responsable: nuevoPendiente.responsable.trim(),
      orden: pendientesActuales.length,
    }]).select();
    if (error) { alert('Error al agregar pendiente: ' + error.message); setSavingPendiente(false); return; }
    setPendientesActuales(prev => [...prev, ...(data || [])]);
    setNuevoPendiente({ descripcion:'', responsable:'' });
    setSavingPendiente(false);
  };

  const updatePendienteActual = async (id, campo, valor) => {
    setPendientesActuales(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  };
  const savePendienteActualEdit = async (pendiente) => {
    const { error } = await supabase.from('caeduc_agenda_pendientes')
      .update({ descripcion: pendiente.descripcion, responsable: pendiente.responsable })
      .eq('id', pendiente.id);
    if (error) alert('Error al guardar pendiente: ' + error.message);
  };
  const removePendienteActual = async (id) => {
    setPendientesActuales(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('caeduc_agenda_pendientes').delete().eq('id', id);
    if (error) alert('Error al eliminar pendiente: ' + error.message);
  };

  // Abrir nueva agenda
  const handleNewAgenda = async () => {
    const maxNum = agendas.reduce((m, a) => Math.max(m, Number(a.numero_sesion || 0)), 9);
    const nuevaAgenda = {
      id: null,
      numero_sesion: maxNum + 1,
      fecha: todayText(),
      fecha_iso: todayISO(),
      hora_inicio: '18:00',
      modalidad: 'Virtual',
      lugar: '',
      estado: 'Borrador',
      notas: '',
    };
    const puntosIniciales = PUNTOS_FIJOS.map((p, i) => ({
      ...p, orden: i + 1, descripcion: '', duracion_min: 0,
      hora_inicio: '', hora_fin: '', id: null, agenda_id: null,
    }));
    setActiveAgenda(nuevaAgenda);
    setPuntos(puntosIniciales);
    setPendientesActuales([]);
    setNuevoPendiente({ descripcion:'', responsable:'' });
    setView('editor');
    await loadResumenAnterior(nuevaAgenda.numero_sesion, agendas);
    await loadPendientesAnteriores(null);
  };

  // Abrir agenda existente para ver/editar
  const handleOpenAgenda = async (agenda) => {
    setLoading(true);
    const pts = await fetchPuntos(agenda.id);
    setActiveAgenda({ ...agenda });
    setPuntos(pts.length > 0
      ? pts
      : PUNTOS_FIJOS.map((p, i) => ({
          ...p, orden: i + 1, descripcion: '', duracion_min: 0,
          hora_inicio: '', hora_fin: '', id: null, agenda_id: agenda.id,
        }))
    );
    setView('editor');
    await loadResumenAnterior(agenda.numero_sesion, agendas);
    await loadPendientesAnteriores(agenda.id);
    await loadPendientesActuales(agenda.id);
    setLoading(false);
  };

  // Guardar agenda completa (borrador o aprobada)
  const handleSave = async (estadoDestino) => {
    if (!activeAgenda) return;

    let agendaId = activeAgenda.id;

    const puntosCalc = recalcTimes(puntos, activeAgenda.hora_inicio);

    let editFields = {};
    if (activeAgenda.estado === 'Aprobada' && agendaId) {
      const { data: userData } = await supabase.auth.getUser();
      const userName = userData?.user?.email || 'usuario';
      editFields = {
        editado_en:    new Date().toISOString(),
        editado_por:   userName,
        veces_editada: (activeAgenda.veces_editada || 0) + 1,
      };
    }

    const agendaData = {
      numero_sesion: activeAgenda.numero_sesion,
      fecha:         activeAgenda.fecha,
      fecha_iso:     activeAgenda.fecha_iso || todayISO(),
      hora_inicio:   activeAgenda.hora_inicio,
      modalidad:     activeAgenda.modalidad,
      lugar:         activeAgenda.lugar,
      estado:        estadoDestino,
      notas:         activeAgenda.notas,
      updated_at:    new Date().toISOString(),
      ...editFields,
    };

    if (agendaId) {
      const { error } = await supabase.from('caeduc_agendas').update(agendaData).eq('id', agendaId);
      if (error) { alert('Error al guardar: ' + error.message); return; }
    } else {
      const { data, error } = await supabase.from('caeduc_agendas').insert([agendaData]).select();
      if (error) { alert('Error al crear agenda: ' + error.message); return; }
      agendaId = data[0].id;
      setActiveAgenda(a => ({ ...a, id: agendaId }));
    }

    // Puntos: se mantiene delete+reinsert (riesgo controlado, sin cambios en esta fase)
    await supabase.from('caeduc_agenda_puntos').delete().eq('agenda_id', agendaId);
    const puntosToInsert = puntosCalc.map((p, i) => ({
      agenda_id:         agendaId,
      orden:             i + 1,
      tema:              p.tema,
      descripcion:       p.descripcion || '',
      responsable:       p.responsable || '',
      hora_inicio:       p.hora_inicio,
      duracion_min:      Number(p.duracion_min) || 0,
      hora_fin:          p.hora_fin,
      es_fijo:           p.es_fijo || false,
      notas_seguimiento: p.notas_seguimiento || '',
    }));
    const { error: ep } = await supabase.from('caeduc_agenda_puntos').insert(puntosToInsert);
    if (ep) { alert('Error al guardar puntos: ' + ep.message); return; }

    setPuntos(puntosCalc.map(p => ({ ...p, agenda_id: agendaId })));
    setActiveAgenda(a => ({ ...a, id: agendaId, estado: estadoDestino }));
    await fetchAgendas();
    alert(estadoDestino === 'Aprobada' ? '✅ Agenda aprobada y guardada en el registro oficial.' : '💾 Borrador guardado.');
  };

  const handleDownloadPDF = async (agenda, puntosParam) => {
    const prev = findAgendaAnterior(agenda.numero_sesion, agendas);
    const [{ data: actuales }, prevData] = await Promise.all([
      supabase.from('caeduc_agenda_pendientes').select('*').eq('agenda_id', agenda.id).order('orden'),
      prev ? supabase.from('caeduc_agenda_pendientes').select('*').eq('agenda_id', prev.id).order('orden') : Promise.resolve({ data: [] }),
    ]);
    await generateAgendaPDF(agenda, puntosParam, actuales || [], prevData.data || [], prev?.numero_sesion);
  };

  // ── LISTA DE AGENDAS ────────────────────────────────────────────────────────
  if (view === 'lista') {
    return (
      <div className="space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Agendas de Sesión — CAEDUC</h2>
            <p className="text-sm text-gray-500">Registro y control de todas las sesiones de la comisión</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAgendas} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm">
              <RefreshCw size={15}/> Actualizar
            </button>
            <button onClick={handleNewAgenda}
              className="bg-caeduc-pink text-white px-5 py-2.5 rounded-xl font-bold hover:bg-caeduc-pinkDark flex items-center gap-2 shadow-sm">
              <Plus size={18}/> Nueva agenda
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800 flex items-start gap-2">
          <Info size={15} className="shrink-0 mt-0.5"/>
          <span>Las agendas en <strong>Borrador</strong> son editables. Al <strong>Aprobar</strong> quedan en el registro oficial. Cualquier agenda puede descargarse en PDF.</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={28} className="text-caeduc-pink animate-spin"/>
          </div>
        ) : agendas.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-40"/>
            <p className="font-medium">No hay agendas registradas</p>
            <p className="text-sm">Haz clic en "Nueva agenda" para comenzar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {agendas.map(a => (
              <AgendaCard
                key={a.id}
                agenda={a}
                onOpen={() => handleOpenAgenda(a)}
                onDownload={async () => {
                  const pts = await fetchPuntos(a.id);
                  await handleDownloadPDF(a, pts);
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR DE AGENDA ────────────────────────────────────────────────────────
  if (view === 'editor' && activeAgenda) {
    const puntosCalc = recalcTimes(puntos, activeAgenda.hora_inicio);
    const durTotal   = totalDuracion(puntos);
    const horaFin    = puntosCalc.length > 0 ? puntosCalc[puntosCalc.length - 1].hora_fin : '';
    const aprobada   = activeAgenda.estado === 'Aprobada';

    const updatePunto = (idx, field, val) => {
      setPuntos(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: val };
        return next;
      });
    };

    const addPunto = () => {
      setPuntos(prev => [
        ...prev.slice(0, -1),
        { tema: '', descripcion: '', responsable: '', duracion_min: 0,
          hora_inicio: '', hora_fin: '', es_fijo: false, id: null, orden: prev.length },
        prev[prev.length - 1],
      ]);
    };

    const removePunto = (idx) => {
      setPuntos(prev => prev.filter((_, i) => i !== idx));
    };

    const movePunto = (idx, dir) => {
      const newPuntos = [...puntos];
      const target = idx + dir;
      if (target < 0 || target >= newPuntos.length) return;
      [newPuntos[idx], newPuntos[target]] = [newPuntos[target], newPuntos[idx]];
      setPuntos(newPuntos);
    };

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => setView('lista')} className="text-gray-400 hover:text-gray-700 mt-1">
            <ArrowLeft size={20}/>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-800">
                Sesión No. {activeAgenda.numero_sesion}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                aprobada ? 'bg-green-100 text-green-800 border-green-300'
                         : 'bg-yellow-100 text-yellow-800 border-yellow-300'
              }`}>
                {aprobada ? <span className="flex items-center gap-1"><Lock size={11}/> Aprobada — editable con registro</span>
                          : <span className="flex items-center gap-1"><Unlock size={11}/> Borrador</span>}
              </span>
            </div>
            <p className="text-sm text-gray-500">{activeAgenda.fecha} · {activeAgenda.modalidad} · {activeAgenda.hora_inicio}{horaFin ? ` – ${horaFin}` : ''} · Duración total: {durTotal} min</p>
          </div>
          {/* Acciones */}
          <div className="flex gap-2 flex-wrap items-center">
            {!aprobada && autoSaving && (
              <span className="text-xs text-blue-500 flex items-center gap-1 animate-pulse">
                <Save size={12}/> Guardando...
              </span>
            )}
            {!aprobada && !autoSaving && lastAutoSave && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Save size={12}/> Guardado {lastAutoSave.toLocaleTimeString('es-GT', {hour:'2-digit',minute:'2-digit'})}
              </span>
            )}
            {!aprobada && (
              <button onClick={() => handleSave('Borrador')}
                className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-xl font-bold hover:bg-yellow-500 flex items-center gap-1.5 text-sm">
                <Save size={15}/> Guardar borrador
              </button>
            )}
            {!aprobada && (
              <button onClick={() => {
                if (window.confirm('¿Aprobar esta agenda? Quedará en el registro oficial.')) handleSave('Aprobada');
              }}
                className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 flex items-center gap-1.5 text-sm">
                <CheckCircle size={15}/> Aprobar agenda
              </button>
            )}
            {aprobada && (
              <button onClick={() => handleSave('Aprobada')}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1.5 text-sm">
                <Save size={15}/> Guardar cambios
              </button>
            )}
            <button
              onClick={() => handleDownloadPDF(activeAgenda, puntosCalc)}
              className="bg-caeduc-blue text-white px-4 py-2 rounded-xl font-bold hover:bg-caeduc-blueDark flex items-center gap-1.5 text-sm">
              <Printer size={15}/> Descargar PDF
            </button>
          </div>
        </div>

        {/* Datos generales de la sesión */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Calendar size={15}/> Datos de la sesión
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">No. de Sesión</label>
              <input type="number"  className="w-full border p-2.5 rounded-lg text-sm font-bold"
                value={activeAgenda.numero_sesion}
                onChange={e => setActiveAgenda(a => ({ ...a, numero_sesion: e.target.value }))}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Fecha</label>
              <input type="date"  className="w-full border p-2.5 rounded-lg text-sm cursor-pointer"
                value={activeAgenda.fecha_iso || todayISO()}
                onChange={e => {
                  const iso = e.target.value;
                  const [y,m,d] = iso.split('-');
                  const MESES = ['','ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
                  setActiveAgenda(a => ({
                    ...a,
                    fecha_iso: iso,
                    fecha: `${parseInt(d)} ${MESES[parseInt(m)]} ${y}`,
                  }));
                }}/>
              {activeAgenda.fecha && <p className="text-xs text-gray-400 mt-0.5">{activeAgenda.fecha}</p>}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Hora de inicio</label>
              <input type="time"  className="w-full border p-2.5 rounded-lg text-sm cursor-pointer"
                value={activeAgenda.hora_inicio}
                onChange={e => setActiveAgenda(a => ({ ...a, hora_inicio: e.target.value }))}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Modalidad</label>
              <select  className="w-full border p-2.5 rounded-lg text-sm"
                value={activeAgenda.modalidad}
                onChange={e => setActiveAgenda(a => ({ ...a, modalidad: e.target.value }))}>
                {MODALIDADES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Lugar / Plataforma</label>
              <input  className="w-full border p-2.5 rounded-lg text-sm"
                placeholder="Ej: Zoom, Sede Central CPG..."
                value={activeAgenda.lugar}
                onChange={e => setActiveAgenda(a => ({ ...a, lugar: e.target.value }))}/>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Notas generales</label>
              <input  className="w-full border p-2.5 rounded-lg text-sm"
                placeholder="Observaciones opcionales..."
                value={activeAgenda.notas}
                onChange={e => setActiveAgenda(a => ({ ...a, notas: e.target.value }))}/>
            </div>
          </div>
        </div>

        {/* Resumen de tiempo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
            <p className="text-xs text-blue-500 font-semibold">Inicio</p>
            <p className="text-xl font-black text-blue-700">{activeAgenda.hora_inicio}</p>
          </div>
          <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-3 text-center">
            <p className="text-xs text-indigo-500 font-semibold">Fin estimado</p>
            <p className="text-xl font-black text-indigo-700">{horaFin || '—'}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
            <p className="text-xs text-green-500 font-semibold">Duración total</p>
            <p className="text-xl font-black text-green-700">{durTotal} min</p>
          </div>
        </div>

        {/* PARTE 5.1 — Resumen de la sesión anterior (solo lectura, colapsable) */}
        {resumenAnterior && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <button onClick={()=>setResumenOpen(o=>!o)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <History size={15} className="text-caeduc-blue"/> Resumen de la sesión anterior (Sesión No. {resumenAnterior.agenda.numero_sesion})
              </span>
              {resumenOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
            </button>
            {resumenOpen && (
              <div className="px-4 pb-4 space-y-2 border-t pt-3">
                {resumenAnterior.puntos.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">La sesión anterior no dejó notas de seguimiento registradas.</p>
                ) : resumenAnterior.puntos.map(p => (
                  <div key={p.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-amber-900">{p.tema}</p>
                    <p className="text-sm text-amber-800 mt-0.5">{p.notas_seguimiento}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PARTE 5.2 — Pendientes de la reunión anterior (checkbox, persiste de inmediato) */}
        {pendientesAnteriores.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
              <ListChecks size={15} className="text-amber-600"/> Pendientes de la reunión anterior
            </h3>
            {pendientesAnteriores.map(p => (
              <label key={p.id} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer hover:bg-amber-100 transition-colors">
                <button type="button" onClick={()=>togglePendienteCompletado(p, setPendientesAnteriores)} className="mt-0.5 shrink-0 text-amber-600 hover:text-green-600">
                  {p.completado ? <CheckSquare size={18}/> : <Square size={18}/>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-900 font-medium">{p.descripcion}</p>
                  {p.responsable && <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5"><User size={11}/>{p.responsable}</p>}
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Puntos de la agenda */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <AlignLeft size={15}/> Puntos de la agenda
            </h3>
            {!aprobada && (
              <button onClick={addPunto}
                className="bg-caeduc-pinkLight text-caeduc-pink px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-pink-100 flex items-center gap-1 border border-pink-200">
                <Plus size={13}/> Agregar punto
              </button>
            )}
          </div>

          {puntosCalc.map((p, idx) => (
            <PuntoCard
              key={idx}
              punto={p}
              idx={idx}
              total={puntosCalc.length}
              aprobada={aprobada}
              onChange={(field, val) => updatePunto(idx, field, val)}
              onRemove={() => removePunto(idx)}
              onMove={(dir) => movePunto(idx, dir)}
            />
          ))}
        </div>

        {/* PARTE 5.2 — Pendientes de esta reunión (CRUD propio, con responsable) */}
        <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <ListChecks size={15} className="text-caeduc-pink"/> Pendientes de esta reunión
          </h3>
          {pendientesActuales.length === 0 && (
            <p className="text-sm text-gray-400 italic">Sin pendientes registrados todavía.</p>
          )}
          {pendientesActuales.map(p => (
            <div key={p.id} className="flex items-start gap-2 bg-slate-50 border rounded-lg p-3">
              <button type="button" onClick={()=>togglePendienteCompletado(p, setPendientesActuales)} className="mt-2 shrink-0 text-slate-400 hover:text-green-600">
                {p.completado ? <CheckSquare size={18} className="text-green-600"/> : <Square size={18}/>}
              </button>
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr,160px] gap-2">
                <input
                  className="w-full border p-2 rounded-lg text-sm"
                  value={p.descripcion}
                  onChange={e=>updatePendienteActual(p.id,'descripcion',e.target.value)}
                  onBlur={()=>savePendienteActualEdit(pendientesActuales.find(x=>x.id===p.id))}
                />
                <input
                  className="w-full border p-2 rounded-lg text-sm"
                  placeholder="Responsable"
                  value={p.responsable||''}
                  onChange={e=>updatePendienteActual(p.id,'responsable',e.target.value)}
                  onBlur={()=>savePendienteActualEdit(pendientesActuales.find(x=>x.id===p.id))}
                />
              </div>
              <button onClick={()=>removePendienteActual(p.id)} className="text-gray-300 hover:text-red-500 shrink-0 mt-2"><Trash2 size={15}/></button>
            </div>
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,160px,auto] gap-2 pt-1">
            <input
              className="w-full border p-2.5 rounded-lg text-sm"
              placeholder="Nuevo pendiente..."
              value={nuevoPendiente.descripcion}
              onChange={e=>setNuevoPendiente(p=>({...p,descripcion:e.target.value}))}
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addPendienteActual();}}}
            />
            <input
              className="w-full border p-2.5 rounded-lg text-sm"
              placeholder="Responsable"
              value={nuevoPendiente.responsable}
              onChange={e=>setNuevoPendiente(p=>({...p,responsable:e.target.value}))}
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addPendienteActual();}}}
            />
            <button onClick={addPendienteActual} disabled={savingPendiente||!nuevoPendiente.descripcion.trim()}
              className="bg-caeduc-pink text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-caeduc-pinkDark disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Plus size={14}/> Agregar
            </button>
          </div>
        </div>

        {/* Botones de guardado al fondo */}
        <div className="flex gap-3 pt-2 pb-6">
          <button onClick={() => setView('lista')}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200">
            Volver
          </button>
          {!aprobada && (
            <button onClick={() => handleSave('Borrador')}
              className="flex-1 bg-yellow-400 text-yellow-900 py-3 rounded-xl font-bold hover:bg-yellow-500 flex items-center justify-center gap-2">
              <Save size={16}/> Guardar borrador
            </button>
          )}
          {!aprobada && (
            <button onClick={() => {
              if (window.confirm('¿Aprobar esta agenda? Quedará en el registro oficial.')) handleSave('Aprobada');
            }}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2">
              <CheckCircle size={16}/> Aprobar agenda
            </button>
          )}
          {aprobada && (
            <button onClick={() => handleSave('Aprobada')}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
              <Save size={16}/> Guardar cambios
            </button>
          )}
        </div>
        {aprobada && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Lock size={18} className="text-blue-600 shrink-0 mt-0.5"/>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-800">Agenda aprobada — editable con registro</p>
              <p className="text-xs text-blue-600">Cualquier cambio guardado quedará registrado con fecha y usuario.</p>
              {activeAgenda.editado_en && (
                <p className="text-xs text-orange-600 mt-1">
                  ✏ Última edición: {new Date(activeAgenda.editado_en).toLocaleString('es-GT')}
                  {activeAgenda.editado_por ? ` · ${activeAgenda.editado_por.split('@')[0]}` : ''}
                  {activeAgenda.veces_editada > 1 ? ` (${activeAgenda.veces_editada} ediciones)` : ''}
                </p>
              )}
            </div>
            <button onClick={() => handleSave('Aprobada')}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 text-sm flex items-center gap-1.5">
              <Save size={14}/> Guardar cambios
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ── Tarjeta de agenda en la lista ────────────────────────────────────────────
function AgendaCard({ agenda, onOpen, onDownload }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-4 flex items-center gap-4">
        {/* Número de sesión */}
        <div className="bg-caeduc-blue text-white rounded-xl w-14 h-14 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-semibold opacity-80">Sesión</span>
          <span className="text-xl font-black leading-none">{agenda.numero_sesion}</span>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
              agenda.estado === 'Aprobada'
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'bg-yellow-100 text-yellow-800 border-yellow-300'
            }`}>
              {agenda.estado === 'Aprobada' ? '✓ Aprobada' : '✏ Borrador'}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{agenda.modalidad}</span>
          </div>
          <p className="font-bold text-gray-800">{agenda.fecha}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1"><Clock size={11}/> {agenda.hora_inicio}</span>
            {agenda.lugar && <span className="flex items-center gap-1"><MapPin size={11}/> {agenda.lugar}</span>}
          </div>
        </div>
        {/* Acciones */}
        <div className="flex gap-2 shrink-0">
          <button onClick={onOpen}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 ${
              agenda.estado === 'Aprobada'
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-caeduc-pink text-white hover:bg-caeduc-pinkDark'
            }`}>
            {agenda.estado === 'Aprobada' ? <><FileText size={14}/> Ver</> : <><Edit3 size={14}/> Editar</>}
          </button>
          <button onClick={onDownload}
            className="bg-blue-50 text-caeduc-blue px-3 py-2 rounded-xl hover:bg-blue-100 border border-blue-200 flex items-center gap-1 font-bold text-sm"
            title="Descargar PDF">
            <Printer size={14}/> PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de punto de agenda ────────────────────────────────────────────────
function PuntoCard({ punto, idx, total, aprobada, onChange, onRemove, onMove }) {
  const [expanded, setExpanded] = useState(true);

  const borderColor = punto.es_fijo
    ? 'border-l-blue-500'
    : 'border-l-gray-300';

  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColor} overflow-hidden`}>
      {/* Header del punto */}
      <div className="flex items-center gap-3 p-3 cursor-pointer select-none"
           onClick={() => !aprobada && setExpanded(e => !e)}>
        {/* Número */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0
          ${punto.es_fijo ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
          {idx + 1}
        </div>
        {/* Tema */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-snug ${punto.es_fijo ? 'text-blue-900' : 'text-gray-800'}`}>
            {punto.tema || <span className="text-gray-400 italic">Sin tema</span>}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
            {punto.responsable && <span className="flex items-center gap-1"><User size={10}/>{punto.responsable}</span>}
            {punto.hora_inicio && punto.hora_fin && (
              <span className="flex items-center gap-1 font-medium text-indigo-600">
                <Clock size={10}/>{punto.hora_inicio} – {punto.hora_fin}
                {punto.duracion_min > 0 && ` (${punto.duracion_min} min)`}
              </span>
            )}
            {punto.duracion_min === 0 && <span className="text-amber-500 font-medium">Sin duración asignada</span>}
          </div>
        </div>
        {/* Controles */}
        {!aprobada && (
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <>
              <button onClick={() => onMove(-1)} disabled={idx === 0}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-30 p-1"><ChevronUp size={15}/></button>
              <button onClick={() => onMove(1)} disabled={idx === total - 1}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-30 p-1"><ChevronDown size={15}/></button>
              <button onClick={onRemove} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
            </>
            <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-700 p-1">
              {expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
            </button>
          </div>
        )}
      </div>

      {/* Cuerpo expandible */}
      {expanded && !aprobada && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1.5">
              Tema *
              {punto.es_fijo && (
                <span className="text-blue-400 font-normal text-xs bg-blue-50 px-1.5 py-0.5 rounded-full">
                  punto habitual
                </span>
              )}
            </label>
            <input className="w-full border p-2 rounded-lg text-sm"
              placeholder="Escribe el tema de este punto..."
              value={punto.tema}
              onChange={e => onChange('tema', e.target.value)}/>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Descripción / detalles (opcional)</label>
            <textarea rows={2} className="w-full border p-2 rounded-lg text-sm resize-none"
              placeholder="Sub-puntos, notas adicionales..."
              value={punto.descripcion || ''}
              onChange={e => onChange('descripcion', e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Responsable</label>
              <input className="w-full border p-2 rounded-lg text-sm"
                placeholder="Nombre del responsable"
                value={punto.responsable || ''}
                onChange={e => onChange('responsable', e.target.value)}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1">
                <Clock size={11}/> Duración (minutos) *
              </label>
              <input type="number" min="0" max="180"
                className="w-full border p-2 rounded-lg text-sm font-bold"
                placeholder="0"
                value={punto.duracion_min || ''}
                onChange={e => onChange('duracion_min', Number(e.target.value))}/>
              {punto.duracion_min > 0 && punto.hora_inicio && (
                <p className="text-xs text-indigo-600 mt-1 font-medium">
                  {punto.hora_inicio} → {punto.hora_fin}
                </p>
              )}
            </div>
          </div>
          <div className="border-t mt-3 pt-3">
            <label className="text-xs font-bold text-amber-700 mb-1 block flex items-center gap-1">
              📋 Notas de seguimiento y resolución
            </label>
            <textarea rows={3}
              className="w-full border border-amber-200 bg-amber-50 p-2 rounded-lg text-sm resize-none focus:ring-2 focus:ring-amber-300 focus:outline-none"
              placeholder="Anotar aquí acuerdos, resoluciones, pendientes o notas de seguimiento de este punto..."
              value={punto.notas_seguimiento || ''}
              onChange={e => onChange('notas_seguimiento', e.target.value)}/>
          </div>
        </div>
      )}
      {/* Vista cuando está aprobada — todos los campos editables */}
      {expanded && aprobada && (
        <div className="px-4 pb-4 border-t pt-3 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Tema</label>
            <input className="w-full border p-2 rounded-lg text-sm"
              value={punto.tema}
              onChange={e => onChange('tema', e.target.value)}/>
          </div>
          {punto.descripcion !== undefined && (
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Descripción</label>
              <textarea rows={2} className="w-full border p-2 rounded-lg text-sm resize-none"
                value={punto.descripcion || ''}
                onChange={e => onChange('descripcion', e.target.value)}/>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Responsable</label>
              <input className="w-full border p-2 rounded-lg text-sm"
                value={punto.responsable || ''}
                onChange={e => onChange('responsable', e.target.value)}/>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Duración (min)</label>
              <input type="number" min="0" className="w-full border p-2 rounded-lg text-sm font-bold"
                value={punto.duracion_min || ''}
                onChange={e => onChange('duracion_min', Number(e.target.value))}/>
            </div>
          </div>
          <div className="border-t mt-2 pt-3">
            <label className="text-xs font-bold text-amber-700 mb-1 block">📋 Notas de seguimiento y resolución</label>
            <textarea rows={3}
              className="w-full border border-amber-200 bg-amber-50 p-2 rounded-lg text-sm resize-none"
              placeholder="Acuerdos, resoluciones, pendientes..."
              value={punto.notas_seguimiento || ''}
              onChange={e => onChange('notas_seguimiento', e.target.value)}/>
          </div>
        </div>
      )}
    </div>
  );
}
