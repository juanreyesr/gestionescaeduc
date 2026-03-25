import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Calendar, FileText, Users, Settings, Menu, X, CheckCircle, Clock, 
  AlertCircle, Download, LogOut, Plus, ExternalLink, Youtube, Lock, 
  FileSignature, Upload, Save, AlertTriangle, FileSpreadsheet,
  UserPlus, Link2, File, Trash2, Eye, EyeOff, Play, RefreshCw,
  Search, Edit3, Hash, ClipboardCheck, ArrowLeft, Shield, BookOpen,
  Printer, FileDown, Send, Archive, FilePlus, Copy, ChevronDown
} from 'lucide-react';
import PlanificacionCAEDUCView from './PlanificacionCAEDUCView';
import AgendasView from './AgendasView';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);



const ROLES = [
  "Coordinadora", "Subcoordinador", "Secretaria", "Prosecretaria", 
  "Gestor del Conocimiento", "Vocal I", "Vocal II"
];

const TASK_TEMPLATES = {
  "Coordinadora": [
    { title: "Aprobar agenda y lineamientos", desc: "Convoca, preside y dirige (Art. 6).", evidenceRequired: true },
    { title: "Firmar solicitudes", desc: "Gestión ante Junta Directiva.", evidenceRequired: true }
  ],
  "Secretaria": [
    { title: "Abrir expediente interno", desc: "Archivo y correspondencia (Art. 8).", evidenceRequired: true },
    { title: "Redactar actas", desc: "Documentación oficial.", evidenceRequired: true }
  ],
  "Gestor del Conocimiento": [
    { title: "Revisión científica", desc: "Verificación académica (Art. 10).", evidenceRequired: true },
    { title: "Coordinar difusión", desc: "Enlace con redes.", evidenceRequired: true }
  ],
  "Vocal I": [{ title: "Apoyo logístico", desc: "Cooperación (Art. 11).", evidenceRequired: false }],
  "Vocal II": [{ title: "Apoyo logístico", desc: "Cooperación (Art. 11).", evidenceRequired: false }],
  "Subcoordinador": [{ title: "Seguimiento ejecución", desc: "Supervisión (Art. 7).", evidenceRequired: false }],
  "Prosecretaria": [{ title: "Apoyo actas y difusión", desc: "Colaboración (Art. 9).", evidenceRequired: false }]
};

const ACTIVITY_TYPES = [
  "Certificación", "Diplomado", "Taller", "Conferencia", "Seminario",
  "Congreso", "Curso", "Simposio", "Foro", "Jornada", "Otro"
];

const MODALITIES = ["Virtual", "Presencial", "Híbrida"];

const MOTIVOS_OFICIO = [
  "Aprobación y asignación de recursos para realizar actividad",
  "Solicitud de salón y equipo audiovisual",
  "Solicitud de materiales e insumos",
  "Informe de actividad realizada",
  "Solicitud de difusión institucional",
  "Otro (personalizado)"
];

// ==========================================
// UTILIDAD: DESCARGA PDF + VISTA PREVIA
// ==========================================
const imgToBase64 = (url) => {
  return new Promise((resolve) => {
    if (!url || url.startsWith('data:')) { resolve(url || ''); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      } catch { resolve(url); }
    };
    img.onerror = () => resolve(url);
    img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
  });
};

const convertImagesToBase64 = async (html) => {
  const imgRegex = /src="(https?:\/\/[^"]+)"/g;
  const urls = new Set();
  let m;
  while ((m = imgRegex.exec(html)) !== null) urls.add(m[1]);
  if (urls.size === 0) return html;
  const map = {};
  await Promise.all([...urls].map(async (url) => { map[url] = await imgToBase64(url); }));
  let result = html;
  for (const [url, b64] of Object.entries(map)) {
    if (b64 && b64.startsWith('data:')) result = result.split(url).join(b64);
  }
  return result;
};

const loadHtml2Pdf = () => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) { resolve(window.html2pdf); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
    script.onload = () => resolve(window.html2pdf);
    script.onerror = () => reject(new Error('No se pudo cargar html2pdf'));
    document.head.appendChild(script);
  });
};

const downloadPDF = async (htmlContent, filename) => {
  try {
    const html2pdf = await loadHtml2Pdf();
    const safeHtml = await convertImagesToBase64(htmlContent);
    const overlay = document.createElement('div');
    overlay.id = 'pdf-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.97);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
    overlay.innerHTML = '<div style="width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:pdfspin 0.8s linear infinite;"></div><p style="font-size:15px;color:#374151;font-weight:600;">Generando PDF...</p><p style="font-size:12px;color:#9ca3af;">Espera un momento</p><style>@keyframes pdfspin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(overlay);
    const container = document.createElement('div');
    container.id = 'pdf-render-container';
    container.style.cssText = 'position:fixed;top:0;left:0;width:8.5in;max-width:8.5in;background:white;z-index:99998;overflow:hidden;';
    document.body.appendChild(container);
    container.innerHTML = safeHtml;
    await new Promise(r => setTimeout(r, 1200));
    const safeName = filename.replace(/[^a-zA-Z0-9_\-áéíóúñÁÉÍÓÚÑ ]/g, '') + '.pdf';
    await html2pdf().set({
      margin: 0, filename: safeName,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, scrollX: 0, scrollY: 0, x: 0, y: 0, width: 816, height: container.scrollHeight },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(container).save();
    if (container.parentNode) document.body.removeChild(container);
    if (overlay.parentNode) document.body.removeChild(overlay);
  } catch (err) {
    console.error('Error generando PDF:', err);
    const ov = document.getElementById('pdf-overlay');
    const ct = document.getElementById('pdf-render-container');
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    if (ct && ct.parentNode) ct.parentNode.removeChild(ct);
    alert('Error al generar el PDF. Intenta de nuevo.');
  }
};

const previewHTML = (htmlContent) => {
  const w = window.open('', '_blank');
  if (w) { w.document.write(htmlContent); w.document.close(); }
  else alert('Permite las ventanas emergentes para ver la vista previa.');
};

// ==========================================
// GENERAR CARTA DE APROBACIÓN PDF
// ==========================================
const generateApprovalLetterHTML = (aval, settings = {}) => {
  const f1Name = settings.firmante1_nombre || 'M. A. Juan J. Reyes';
  const f1Cargo = settings.firmante1_cargo || 'Coordinador';
  const f1FirmaPath = settings.firmante1_firma_path || '';
  const f2Name = settings.firmante2_nombre || 'Mgtr. Luisa Mazariegos';
  const f2Cargo = settings.firmante2_cargo || 'Secretaria';
  const f2FirmaPath = settings.firmante2_firma_path || '';
  const selloPath = settings.sello_path || '';
  const f1FirmaUrl = f1FirmaPath ? `${supabaseUrl}/storage/v1/object/public/firmas-sellos/${f1FirmaPath}` : '';
  const f2FirmaUrl = f2FirmaPath ? `${supabaseUrl}/storage/v1/object/public/firmas-sellos/${f2FirmaPath}` : '';
  const selloUrl = selloPath ? `${supabaseUrl}/storage/v1/object/public/firmas-sellos/${selloPath}` : '';
  const logoPath = settings.logo_path || '';
  const logoUrl = logoPath ? `${supabaseUrl}/storage/v1/object/public/firmas-sellos/${logoPath}` : '';
  const formatApprovalDate = (dateStr) => {
    if (!dateStr) return '—';
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const d = new Date(dateStr + 'T12:00:00');
    return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  };
  const formatRequestDate = (dateStr) => {
    if (!dateStr) return '—';
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2,'0')} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  };
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Aprobación de Aval - ${aval.correlativo || ''}</title>
  <style>@page{size:letter;margin:0;}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#333;background:white;}
  .page{width:8.5in;height:11in;margin:0 auto;padding:0;position:relative;background:white;overflow:hidden;}
  .deco-left{position:absolute;left:0;top:200px;width:18px;height:300px;}.deco-left div{width:8px;margin-bottom:4px;border-radius:4px;}
  .deco-left div:nth-child(1){height:60px;background:#E91E63;}.deco-left div:nth-child(2){height:60px;background:#9C27B0;}
  .deco-left div:nth-child(3){height:60px;background:#2196F3;}.deco-left div:nth-child(4){height:60px;background:#4CAF50;}
  .deco-curve{position:absolute;right:0;top:0;width:200px;height:100%;overflow:hidden;pointer-events:none;}
  .deco-curve::before{content:'';position:absolute;right:-100px;top:100px;width:300px;height:300px;border-radius:50%;border:40px solid rgba(200,200,200,0.15);}
  .deco-curve::after{content:'';position:absolute;right:-50px;bottom:150px;width:250px;height:250px;border-radius:50%;border:30px solid rgba(200,200,200,0.12);}
  .content{padding:50px 70px 40px 70px;position:relative;z-index:1;}
  .header img{height:90px;width:auto;}.title{text-align:center;font-size:24px;font-weight:800;color:#1a5276;letter-spacing:2px;margin:20px 0 30px 0;}
  .date-line{text-align:right;color:#E91E63;font-weight:600;margin-bottom:25px;font-size:14px;}
  .body-text{font-size:13.5px;line-height:1.8;text-align:justify;margin-bottom:15px;}
  .body-text .highlight{color:#E91E63;font-weight:700;}
  .details{margin:15px 0 20px 0;font-size:13.5px;line-height:2;}
  .details .label{font-weight:600;color:#333;}.details .value{color:#E91E63;font-weight:600;}
  .thanks{font-size:13.5px;line-height:1.8;text-align:justify;margin:20px 0;}
  .signatures{display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px;position:relative;}
  .sig-block{text-align:center;}.sig-img{height:70px;width:auto;display:block;margin:0 auto -8px;}
  .sig-line{width:220px;border-top:1px solid #333;padding-top:5px;}
  .sig-name{font-weight:700;font-size:13px;}.sig-role{font-size:12px;color:#555;}
  .sello-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;}
  .sello-center img{height:110px;width:auto;opacity:0.85;}
  .footer{position:absolute;bottom:0;left:0;right:0;border-top:2px solid #eee;padding:15px 30px;display:flex;justify-content:space-between;font-size:8.5px;color:#777;background:white;}
  .footer-col{text-align:center;flex:1;padding:0 5px;}.footer-col strong{display:block;color:#1a5276;font-size:9px;margin-bottom:2px;}
  .footer-bottom{position:absolute;bottom:5px;left:0;right:0;text-align:center;font-size:9px;color:#1a5276;font-weight:600;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{margin:0;box-shadow:none;}}</style></head>
  <body><div class="page"><div class="deco-left"><div></div><div></div><div></div><div></div></div><div class="deco-curve"></div>
  <div class="content"><div class="header">${logoUrl?`<img src="${logoUrl}" alt="Logo"/>`:''}
  </div><div class="title">APROBACIÓN DE AVAL</div>
  <div class="date-line">Guatemala, ${formatApprovalDate(aval.approval_date)}</div>
  <div style="margin-bottom:25px;font-size:14px;line-height:1.6;">Estimado(a) <span style="color:#E91E63;font-weight:600;">${aval.applicant_name||'—'}</span><br><span style="color:#E91E63;font-weight:600;">${aval.institution||''}</span></div>
  <div class="body-text">Reciban un cordial saludo por parte de la Comisión de Acreditación y Educación Continua - CAEDUC-.</div>
  <div class="body-text">Por medio de la presente carta se extiende la aprobación a su solicitud recibida el <span class="highlight">${formatRequestDate(aval.created_at)}</span>, con el Aval <span class="highlight">${aval.correlativo||'—'}</span>. En resumen el Aval refleja la cobertura de:</div>
  <div class="details">
    <div><span class="label">Actividad:</span> <span class="value">${aval.activity_type||'—'}</span></div>
    <div><span class="label">Duración:</span> <span class="value">${aval.duration||'—'}</span></div>
    <div><span class="label">Modalidad:</span> <span class="value">${aval.modality||'—'}</span></div>
    <div><span class="label">Fecha y hora:</span> <span class="value">${aval.schedule||aval.activity_date||'—'}</span></div>
    <div><span class="label">Lugar/Plataforma:</span> <span class="value">${aval.platform||'—'}</span></div>
    <div><span class="label">Tema:</span> <span class="value">${aval.topic||aval.activity_name||'—'}</span></div>
    <div><span class="label">Dirigido a:</span> <span class="value">${aval.target_audience||'—'}</span></div>
  </div>
  <div class="thanks">Agradecemos y valoramos el trabajo y esfuerzo constante que implementa en la promoción del crecimiento continuo de los profesionales. Así mismo, solicitamos incluir el número de AVAL en el material correspondiente a la actividad aprobada.</div>
  <div style="margin-top:15px;font-size:13.5px;">Sin otro particular, nos despedimos.</div>
  <div class="signatures">
    <div class="sig-block">${f1FirmaUrl?`<img src="${f1FirmaUrl}" alt="Firma" class="sig-img"/>`:'<div style="height:70px;"></div>'}
      <div class="sig-line"><div class="sig-name">${f1Name}</div><div class="sig-role">${f1Cargo} – CAEDUC</div></div></div>
    <div class="sello-center">${selloUrl?`<img src="${selloUrl}" alt="Sello CAEDUC"/>`:''}  </div>
    <div class="sig-block">${f2FirmaUrl?`<img src="${f2FirmaUrl}" alt="Firma" class="sig-img"/>`:'<div style="height:70px;"></div>'}
      <div class="sig-line"><div class="sig-name">${f2Name}</div><div class="sig-role">${f2Cargo} - CAEDUC</div></div></div>
  </div></div>
  <div class="footer">
    <div class="footer-col"><strong>Sede central</strong>3ra Calle 6-63 Zona 9, Ciudad de Guatemala<br>+(502) 2218 - 3400<br>info@colegiodepsicologos.org.gt</div>
    <div class="footer-col"><strong>Sub Sede Cobán</strong>Centro Comercial Plaza Magdalena, Centro de Negocios, 1er Nivel Of. 105 Cobán<br>+(502) 7764-7109<br>infocoban@colegiodepsicologos.org.gt</div>
    <div class="footer-col"><strong>Sub Sede Zacapa</strong>4a. Calle 10-34 Zona 1, Plaza Salguero, Local 4, Zacapa.<br>+(502) 7941-0587<br>infozacapa@colegiodepsicologos.org.gt</div>
    <div class="footer-col"><strong>Sub Sede Quetzaltenango</strong>Diagonal 15, 29-91 Zona 1, Residenciales Las Américas, Quetzaltenango.<br>+(502) 7767-3314<br>infoquetzaltenango@colegiodepsicologos.org.gt</div>
  </div>
  <div class="footer-bottom">colegiodepsicologos.org.gt • @colpsicogt</div>
  </div></body></html>`;
};

const openApprovalLetter = async (aval, settings = {}, mode = 'download') => {
  const html = generateApprovalLetterHTML(aval, settings);
  if (mode === 'preview') previewHTML(html);
  else await downloadPDF(html, `Aprobacion_Aval_${aval.correlativo || aval.request_number || 'CAEDUC'}`);
};

// ==========================================
// GENERAR OFICIO HTML
// ==========================================
const formatOficioDate = (dateStr) => {
  if (!dateStr) return '—';
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
};

const generateOficioHTML = (oficio, settings = {}) => {
  const f1Name     = settings.firmante1_nombre      || 'M. A. Juan J. Reyes';
  const f1Cargo    = settings.firmante1_cargo       || 'Coordinador';
  const f1Inst     = settings.firmante1_institucion || 'Comisión de Acreditación Educación Continua, Colegio de Psicólogos de Guatemala';
  const f1FirmaUrl = settings.firmante1_firma_path  ? `${supabaseUrl}/storage/v1/object/public/firmas-sellos/${settings.firmante1_firma_path}` : '';
  const selloUrl   = settings.sello_path            ? `${supabaseUrl}/storage/v1/object/public/firmas-sellos/${settings.sello_path}`           : '';
  // Membrete: usar el personalizado si existe, si no el embebido
  // Membrete: usar el personalizado si existe, si no el archivo estático en /public/
  const membreteUrl = settings.membrete_path
    ? `${supabaseUrl}/storage/v1/object/public/firmas-sellos/${settings.membrete_path}`
    : '/fondo-oficios.jpg';

  const instLines = f1Inst.split(',').map(s => s.trim()).filter(Boolean);
  const isRecursos = oficio.motivo?.includes('recursos') || oficio.motivo?.includes('Aprobación');

  // ── Helpers ──────────────────────────────────────────────────────────────
  const parrafo = (txt) =>
    `<p style="font-size:11.5px;line-height:1.8;text-align:justify;margin:0 0 10px 0;word-wrap:break-word;overflow-wrap:break-word;">${txt}</p>`;

  const seccion = (titulo, html) =>
    `<div style="margin-top:12px;">
      <p style="font-size:10px;font-weight:700;color:#1a5276;text-transform:uppercase;letter-spacing:.4px;margin:0 0 5px;">${titulo}</p>
      ${html}
    </div>`;

  // ── Cuerpo principal ──────────────────────────────────────────────────────
  let cuerpoHTML = '';
  if (oficio.cuerpo_personalizado) {
    cuerpoHTML = oficio.cuerpo_personalizado
      .split('\n').map(l => l.trimEnd())
      .reduce((acc, line) => {
        if (line === '') { acc.push(''); return acc; }
        if (acc.length === 0 || acc[acc.length-1] === '') acc.push(line);
        else acc[acc.length-1] += ' ' + line;
        return acc;
      }, []).filter(p => p !== '').map(p => parrafo(p)).join('');
  } else if (isRecursos && oficio.actividad_nombre) {
    cuerpoHTML = parrafo(`Por este medio, la Comisión de Acreditación y Educación Continua (CAEDUC) solicita respetuosamente la aprobación y asignación de recursos para realizar la ${oficio.actividad_tipo ? oficio.actividad_tipo.toLowerCase() : 'actividad'} ${oficio.actividad_modalidad ? oficio.actividad_modalidad.toLowerCase() : ''} titulada <strong>"${oficio.actividad_nombre}"</strong>.${oficio.actividad_descripcion ? ' ' + oficio.actividad_descripcion : ''}`);
  } else {
    cuerpoHTML = parrafo(`Por este medio, la Comisión de Acreditación y Educación Continua (CAEDUC) se dirige a ustedes para: <strong>${oficio.motivo || '—'}</strong>.`);
  }

  // ── Detalles actividad ─────────────────────────────────────────────────────
  const detalleRow = (label, val) => val
    ? `<tr><td style="font-weight:600;font-size:11px;padding:2px 10px 2px 0;white-space:nowrap;color:#374151;">${label}:</td><td style="font-size:11px;padding:2px 0;">${val}</td></tr>`
    : '';
  let detallesHTML = '';
  if (oficio.actividad_nombre && (oficio.actividad_tipo || oficio.actividad_modalidad || oficio.actividad_fecha || oficio.actividad_duracion || oficio.actividad_sede)) {
    detallesHTML = `<table style="margin:10px 0;border-collapse:collapse;">
      ${detalleRow('Tipo de actividad', oficio.actividad_tipo)}
      ${detalleRow('Modalidad', oficio.actividad_modalidad)}
      ${detalleRow('Duración estimada', oficio.actividad_duracion)}
      ${detalleRow('Fecha de la actividad', oficio.actividad_fecha)}
      ${detalleRow('Sede / Plataforma', oficio.actividad_sede)}
    </table>`;
  }

  // ── Recursos ───────────────────────────────────────────────────────────────
  let recursosHTML = '';
  if (oficio.monto) {
    recursosHTML = seccion('Recursos solicitados',
      parrafo(`Honorarios del profesional invitado: <strong>${oficio.monto}</strong>${oficio.monto_detalle ? '. ' + oficio.monto_detalle : '.'}`) +
      parrafo('Pormenores logísticos esenciales: salón y audio, materiales de apoyo, registro de asistencia, apoyo de protocolo y difusión institucional.')
    );
  }

  // ── Justificación ──────────────────────────────────────────────────────────
  let justificacionHTML = '';
  if (oficio.justificacion) {
    justificacionHTML = seccion('Justificación técnica',
      oficio.justificacion.split('\n').filter(l=>l.trim()).map(p=>parrafo(p)).join('')
    );
  }

  // ── Solicitud puntual ──────────────────────────────────────────────────────
  let solicitudHTML = '';
  if (oficio.solicitud_puntual) {
    solicitudHTML = seccion('Solicitud puntual a la Junta Directiva',
      `<ul style="padding-left:16px;margin:0;">
        ${oficio.solicitud_puntual.split('\n').filter(l=>l.trim()).map(p=>`<li style="font-size:11.5px;line-height:1.75;margin-bottom:3px;">${p}</li>`).join('')}
      </ul>`
    );
  }

  // ── Bloque firma ───────────────────────────────────────────────────────────
  const firmaBlock = `
    <div style="margin-top:20px;text-align:center;">
      <p style="font-size:11.5px;margin-bottom:16px;">Cordialmente,</p>
      <div style="display:inline-flex;align-items:flex-end;gap:20px;">
        <div style="text-align:center;">
          ${f1FirmaUrl ? `<img src="${f1FirmaUrl}" alt="Firma" style="height:55px;width:auto;display:block;margin:0 auto -4px;"/>` : '<div style="height:55px;"></div>'}
          <div style="width:200px;border-top:1.5px solid #333;padding-top:4px;">
            <div style="font-size:11.5px;font-weight:700;">${f1Name}</div>
            <div style="font-size:10.5px;color:#555;">${f1Cargo}</div>
            ${instLines.map(l => `<div style="font-size:10px;color:#666;">${l}</div>`).join('')}
          </div>
        </div>
        ${selloUrl ? `<div style="margin-bottom:10px;"><img src="${selloUrl}" alt="Sello" style="height:80px;width:auto;opacity:0.88;"/></div>` : ''}
      </div>
    </div>
    <p style="font-size:10px;color:#888;margin-top:10px;">C.C: Archivo / CAEDUC</p>`;

  // ── Página principal con membrete de fondo ────────────────────────────────
  // El membrete es 1546x2000px ~ 8.5x11in a 182dpi
  // Área útil del membrete: left ~0.85in, top ~1.4in, right ~0.65in, bottom ~1.75in
  const mainPage = `
    <div style="position:relative;width:8.5in;min-height:11in;font-family:'Segoe UI',Arial,sans-serif;color:#333;background:white;page-break-after:always;box-sizing:border-box;">
      <!-- Membrete de fondo -->
      <img src="${membreteUrl}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;"/>
      <!-- Contenido sobre el membrete -->
      <div style="position:relative;z-index:1;padding:1.35in 0.75in 1.9in 0.9in;min-height:11in;box-sizing:border-box;display:flex;flex-direction:column;">
        <div style="flex:1;">
          <!-- Referencia y fecha -->
          <div style="text-align:right;margin-bottom:18px;">
            <div style="font-size:12px;font-weight:700;color:#111;">${oficio.numero_oficio || 'Of. ___.CAEDUC'}</div>
            <div style="font-size:11.5px;color:#555;margin-top:1px;">Guatemala ${formatOficioDate(oficio.fecha)}</div>
          </div>
          <!-- Destinatario -->
          <div style="margin-bottom:15px;font-size:11.5px;line-height:1.7;">
            ${(oficio.dirigido_a || '').split(',').map(l => l.trim()).filter(Boolean).join('<br>')}
            <br>Presente
          </div>
          <!-- Saludo -->
          <p style="font-size:11.5px;font-weight:700;margin-bottom:12px;">Honorables miembros de la Junta Directiva:</p>
          <!-- Cuerpo -->
          ${cuerpoHTML}${detallesHTML}
          <!-- Cierre -->
          ${parrafo('Agradeciendo su tiempo a la presente solicitud y quedando a su disposición para cualquier consulta adicional.')}
          <p style="font-size:11.5px;margin-bottom:0;">Sin otro particular, me suscribo.</p>
          <!-- Firma -->
          ${firmaBlock}
        </div>
      </div>
    </div>`;

  // ── Página extra (justificación/recursos) si hay contenido ───────────────
  const hasExtra = oficio.justificacion || oficio.solicitud_puntual || oficio.monto;
  const extraPage = hasExtra ? `
    <div style="position:relative;width:8.5in;min-height:11in;font-family:'Segoe UI',Arial,sans-serif;color:#333;background:white;box-sizing:border-box;">
      <img src="${membreteUrl}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;"/>
      <div style="position:relative;z-index:1;padding:1.35in 0.75in 1.9in 0.9in;min-height:11in;box-sizing:border-box;">
        <h2 style="font-size:14px;font-weight:800;color:#1a5276;text-align:center;margin:0 0 5px;">Justificación técnica y aporte gremial</h2>
        ${oficio.actividad_nombre ? `<h3 style="font-size:12px;font-weight:600;color:#374151;text-align:center;margin:0 0 16px;">${oficio.actividad_nombre}</h3>` : ''}
        ${justificacionHTML}${recursosHTML}${solicitudHTML}
        ${parrafo('Agradecemos de antemano su atención y quedamos a su disposición para ampliar detalles técnicos, perfil del ponente y cronograma operativo.')}
      </div>
    </div>` : '';

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Oficio ${oficio.numero_oficio || ''}</title>
  <style>
    @page { size: letter; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
  </head><body>${mainPage}${extraPage}</body></html>`;
};

const openOficioLetter = async (oficio, settings = {}, mode = 'download') => {
  const html = generateOficioHTML(oficio, settings);
  if (mode === 'preview') previewHTML(html);
  else await downloadPDF(html, `Oficio_${(oficio.numero_oficio || 'CAEDUC').replace(/\s+/g, '_')}`);
};

// ==========================================
// COMPONENTES UI
// ==========================================
const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;
  const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-lg shadow-xl w-full ${sizes[size]} m-auto`}>
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose}><X size={24} className="text-gray-500 hover:text-red-500" /></button>
        </div>
        <div className="p-4 overflow-y-auto" style={{maxHeight:'calc(100dvh - 120px)',overflowY:'auto'}}>{children}</div>
      </div>
    </div>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden ${className}`}>
    <div className="p-6">{children}</div>
  </div>
);

const Badge = ({ status }) => {
  const colors = {
    'Pendiente': 'bg-yellow-100 text-yellow-800','En Proceso': 'bg-blue-100 text-blue-800',
    'Aprobado': 'bg-green-100 text-green-800','Rechazado': 'bg-red-100 text-red-800',
    'Eliminado': 'bg-gray-200 text-gray-600','Finalizado': 'bg-gray-100 text-gray-800',
    'Borrador': 'bg-yellow-100 text-yellow-800','Enviado': 'bg-green-100 text-green-800',
    'Archivado': 'bg-gray-200 text-gray-600'
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
};

const BackButton = ({ onClick, label = "← Volver al Menú Principal" }) => (
  <button onClick={onClick} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4">
    <ArrowLeft size={16} /> {label}
  </button>
);

// ==========================================
// VISTA PÚBLICA: LANDING
// ==========================================
const LoginView = ({ handleLogin, loading, authError, setUserMode, appSettings }) => {
  const [showAdmin, setShowAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const youtubeUrl = appSettings?.youtube_tutorial_url || '';
  const reglamentoPath = appSettings?.reglamento_file_path || '';
  const reglamentoUrl = reglamentoPath ? `${supabaseUrl}/storage/v1/object/public/reglamento-avales/${reglamentoPath}` : null;
  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] bg-gray-50 p-6 relative">
      <Card className="max-w-lg w-full border-t-8 border-t-green-600 hover:shadow-2xl transition-all">
        <div className="flex flex-col items-center text-center space-y-5 py-8">
          <img src="/logo-CAEDUC.png" alt="CAEDUC Logo" className="w-32 h-32 object-contain" />
          <div><h2 className="text-3xl font-bold text-gray-800 mb-2">Solicitud de Avales</h2><p className="text-gray-600 px-4">Portal oficial para solicitudes externas — CAEDUC</p></div>
          <button onClick={() => setUserMode('external')} className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold w-full transition-colors">Ingresar al Portal de Solicitudes</button>
          <button onClick={() => setUserMode('consultar_estado')} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-6 py-3 rounded-lg hover:bg-blue-100 font-semibold w-full justify-center border border-blue-200 transition-colors"><Search size={20}/> Consultar Estado de Solicitud</button>
          <button onClick={() => setUserMode('verificar_aval')} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-6 py-3 rounded-lg hover:bg-indigo-100 font-semibold w-full justify-center border border-indigo-200 transition-colors"><Shield size={20}/> Verificar Validez de Aval</button>
          {reglamentoUrl && (<a href={reglamentoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-purple-50 text-purple-700 px-6 py-3 rounded-lg hover:bg-purple-100 font-semibold w-full justify-center border border-purple-200 transition-colors"><BookOpen size={20}/> Descargar Reglamento de Avales</a>)}
          {youtubeUrl && (<a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-lg hover:bg-red-100 font-semibold w-full justify-center border border-red-200 transition-colors"><Play size={20} fill="currentColor"/> Ver Tutorial de Avales</a>)}
        </div>
      </Card>
      <button onClick={() => setShowAdmin(true)} className="absolute bottom-4 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><Lock size={12}/> Acceso Administrativo</button>
      <Modal isOpen={showAdmin} onClose={() => setShowAdmin(false)} title="Acceso Comisión" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(email, password); }} className="space-y-4">
          <input type="email" placeholder="Email" className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} required/>
          <input type="password" placeholder="Contraseña" className="w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} required/>
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-800 text-white py-2 rounded font-bold hover:bg-blue-900">{loading ? 'Entrando...' : 'Iniciar Sesión'}</button>
        </form>
      </Modal>
    </div>
  );
};

// ==========================================
// VISTA PÚBLICA: FORMULARIO SOLICITUD
// ==========================================
const ExternalAvalesView = ({ submitAval, onBack, appSettings }) => {
  const [data, setData] = useState({ applicantName:'', institution:'', activityName:'', activityDate:'', email:'', activityType:'', duration:'', modality:'', schedule:'', platform:'', topic:'', targetAudience:'' });
  const [file, setFile] = useState(null);
  const [submittedNumber, setSubmittedNumber] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const formFilePath = appSettings?.aval_form_file_path || '';
  const formFileUrl = formFilePath ? `${supabaseUrl}/storage/v1/object/public/aval-form-template/${formFilePath}` : null;
  const reglamentoPath = appSettings?.reglamento_file_path || '';
  const reglamentoUrl = reglamentoPath ? `${supabaseUrl}/storage/v1/object/public/reglamento-avales/${reglamentoPath}` : null;
  const handleSubmit = async (e) => { e.preventDefault(); setSubmitting(true); const reqNum = await submitAval(data, file); if (reqNum) setSubmittedNumber(reqNum); setSubmitting(false); };
  if (submittedNumber) {
    return (
      <div className="max-w-lg mx-auto space-y-6 mt-10">
        <Card className="border-t-4 border-t-green-500">
          <div className="text-center space-y-4 py-6">
            <div className="bg-green-100 p-4 rounded-full inline-block"><CheckCircle size={48} className="text-green-600"/></div>
            <h2 className="text-2xl font-bold text-gray-800">¡Solicitud Enviada!</h2>
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 space-y-2">
              <p className="text-amber-800 font-semibold text-sm flex items-center justify-center gap-2"><AlertTriangle size={16}/> Anota este número de solicitud</p>
              <p className="text-5xl font-black text-amber-700">#{submittedNumber}</p>
            </div>
            <button onClick={onBack} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700">Volver al Menú Principal</button>
          </div>
        </Card>
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackButton onClick={onBack}/>
      <div className="grid gap-4 md:grid-cols-2">
        {formFileUrl && (<Card className="border-l-4 border-l-blue-500"><div className="flex items-center gap-3"><div className="bg-blue-100 p-3 rounded-lg shrink-0"><Download size={24} className="text-blue-600"/></div><div className="flex-1"><p className="font-bold text-gray-800">Formulario de Solicitud</p><p className="text-sm text-gray-500">Descarga, llena y adjunta.</p></div><a href={formFileUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shrink-0 text-sm"><Download size={16}/> Descargar</a></div></Card>)}
        {reglamentoUrl && (<Card className="border-l-4 border-l-purple-500"><div className="flex items-center gap-3"><div className="bg-purple-100 p-3 rounded-lg shrink-0"><BookOpen size={24} className="text-purple-600"/></div><div className="flex-1"><p className="font-bold text-gray-800">Reglamento de Avales</p><p className="text-sm text-gray-500">Consulta el reglamento vigente.</p></div><a href={reglamentoUrl} target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium shrink-0 text-sm"><Download size={16}/> Descargar</a></div></Card>)}
      </div>
      <Card>
        <h2 className="text-xl font-bold mb-4">Solicitud de Aval</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Datos del Solicitante</h3>
            <input required placeholder="Nombre completo del Solicitante" className="w-full border p-2 rounded" value={data.applicantName} onChange={e => setData({...data,applicantName:e.target.value})}/>
            <input required placeholder="Institución (o escriba 'Solicitud propia')" className="w-full border p-2 rounded" value={data.institution} onChange={e => setData({...data,institution:e.target.value})}/>
            <input required type="email" placeholder="Email de Contacto" className="w-full border p-2 rounded" value={data.email} onChange={e => setData({...data,email:e.target.value})}/>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Datos de la Actividad</h3>
            <input required placeholder="Nombre / Tema de la Actividad" className="w-full border p-2 rounded" value={data.activityName} onChange={e => setData({...data,activityName:e.target.value})}/>
            <input placeholder="Tema específico" className="w-full border p-2 rounded" value={data.topic} onChange={e => setData({...data,topic:e.target.value})}/>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-bold mb-1">Tipo de Actividad *</label><select required className="w-full border p-2 rounded" value={data.activityType} onChange={e => setData({...data,activityType:e.target.value})}><option value="">Seleccionar...</option>{ACTIVITY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="block text-sm font-bold mb-1">Modalidad *</label><select required className="w-full border p-2 rounded" value={data.modality} onChange={e => setData({...data,modality:e.target.value})}><option value="">Seleccionar...</option>{MODALITIES.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-bold mb-1">Duración *</label><input required placeholder="Ej: 12 horas" className="w-full border p-2 rounded" value={data.duration} onChange={e => setData({...data,duration:e.target.value})}/></div>
              <div><label className="block text-sm font-bold mb-1">Fecha de la Actividad *</label><input required type="date" className="w-full border p-2 rounded" value={data.activityDate} onChange={e => setData({...data,activityDate:e.target.value})}/></div>
            </div>
            <input required placeholder="Fecha y Hora específica" className="w-full border p-2 rounded" value={data.schedule} onChange={e => setData({...data,schedule:e.target.value})}/>
            <input required placeholder="Lugar o Plataforma" className="w-full border p-2 rounded" value={data.platform} onChange={e => setData({...data,platform:e.target.value})}/>
            <input required placeholder="Dirigido a" className="w-full border p-2 rounded" value={data.targetAudience} onChange={e => setData({...data,targetAudience:e.target.value})}/>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Documento Adjunto</h3>
            <input type="file" accept=".pdf" onChange={e=>{const sel=e.target.files[0];if(sel&&sel.type!=='application/pdf'){alert('Solo se admiten archivos en formato PDF.');e.target.value='';setFile(null);return;}setFile(sel);}} className="w-full"/>
            <p className="text-red-600 font-black text-lg mt-2">⚠️ Solo se admiten archivos completos en formato PDF.</p>
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 disabled:opacity-50">{submitting?'Enviando...':'Enviar Solicitud'}</button>
        </form>
      </Card>
    </div>
  );
};

// ==========================================
// VISTA PÚBLICA: CONSULTAR ESTADO
// ==========================================
const ConsultarEstadoView = ({ onBack, appSettings }) => {
  const [requestNum, setRequestNum] = useState('');
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const handleSearch = async (e) => { e.preventDefault(); setSearching(true); setNotFound(false); setResult(null); const {data,error}=await supabase.from('avales').select('*').eq('request_number',parseInt(requestNum)).single(); if(error||!data)setNotFound(true); else if(data.is_deleted)setResult({...data,status:'Eliminado'}); else setResult(data); setSearching(false); };
  const handleReset = () => { setResult(null); setNotFound(false); setRequestNum(''); };
  return (
    <div className="max-w-lg mx-auto space-y-6 mt-10">
      <BackButton onClick={onBack}/>
      <Card className="border-t-4 border-t-blue-500">
        <div className="space-y-4">
          <div className="text-center"><Search size={40} className="text-blue-600 mx-auto mb-2"/><h2 className="text-2xl font-bold text-gray-800">Consultar Estado de Solicitud</h2><p className="text-gray-500 text-sm">Ingresa el número de solicitud que recibiste.</p></div>
          {!result&&!notFound&&(<form onSubmit={handleSearch} className="space-y-4"><div className="relative"><Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input required type="number" min="1" placeholder="Número de solicitud" className="w-full border p-3 pl-10 rounded-lg text-lg" value={requestNum} onChange={e=>setRequestNum(e.target.value)}/></div><button type="submit" disabled={searching} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{searching?'Buscando...':'Consultar'}</button></form>)}
          {notFound&&(<div className="text-center space-y-4"><div className="bg-red-50 border border-red-200 rounded-lg p-4"><AlertCircle size={32} className="text-red-500 mx-auto mb-2"/><p className="text-red-700 font-medium">No se encontró solicitud #{requestNum}</p></div><div className="flex gap-3"><button onClick={handleReset} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700">Hacer Otra Consulta</button><button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200">Volver al Menú</button></div></div>)}
          {result&&(<div className="space-y-4"><div className="bg-gray-50 rounded-lg p-4 space-y-3"><div className="flex justify-between items-center"><span className="text-sm text-gray-500">Solicitud</span><span className="font-bold text-lg">#{result.request_number}</span></div><div className="border-t pt-3 space-y-2"><div className="flex justify-between"><span className="text-sm text-gray-500">Solicitante</span><span className="font-medium">{result.applicant_name}</span></div><div className="flex justify-between"><span className="text-sm text-gray-500">Actividad</span><span className="font-medium">{result.activity_name}</span></div><div className="flex justify-between"><span className="text-sm text-gray-500">Fecha Actividad</span><span className="font-medium">{result.activity_date||'—'}</span></div><div className="flex justify-between items-center"><span className="text-sm text-gray-500">Estado</span><Badge status={result.status}/></div></div>{result.status==='Aprobado'&&(<div className="border-t pt-3 space-y-3">{result.correlativo&&(<div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"><p className="text-sm text-green-600 font-medium">Número de Aval</p><p className="text-2xl font-black text-green-700">{result.correlativo}</p></div>)}<div className="flex gap-2"><button onClick={()=>openApprovalLetter(result,appSettings,'preview')} className="flex-1 bg-blue-50 text-blue-700 py-3 rounded-lg font-bold hover:bg-blue-100 flex items-center justify-center gap-2 border border-blue-200"><Eye size={18}/> Vista Previa</button><button onClick={()=>openApprovalLetter(result,appSettings,'download')} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"><FileDown size={18}/> Descargar PDF</button></div></div>)}{result.status==='Rechazado'&&result.approval_reason&&(<div className="border-t pt-3"><div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-600 font-medium">Razón del Rechazo:</p><p className="text-red-800 text-sm">{result.approval_reason}</p></div></div>)}</div><div className="flex gap-3"><button onClick={handleReset} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700">Hacer Otra Consulta</button><button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200">Volver al Menú</button></div></div>)}
        </div>
      </Card>
    </div>
  );
};

// ==========================================
// VISTA PÚBLICA: VERIFICAR AVAL
// ==========================================
const VerificarAvalView = ({ onBack }) => {
  const [correlativo, setCorrelativo] = useState('');
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const handleSearch = async (e) => { e.preventDefault(); setSearching(true); setNotFound(false); setResult(null); const {data,error}=await supabase.from('avales').select('*').eq('correlativo',correlativo.trim()).eq('is_deleted',false).single(); if(error||!data)setNotFound(true); else setResult(data); setSearching(false); };
  const handleReset = () => { setResult(null); setNotFound(false); setCorrelativo(''); };
  return (
    <div className="max-w-lg mx-auto space-y-6 mt-10">
      <BackButton onClick={onBack}/>
      <Card className="border-t-4 border-t-indigo-500">
        <div className="space-y-4">
          <div className="text-center"><Shield size={40} className="text-indigo-600 mx-auto mb-2"/><h2 className="text-2xl font-bold text-gray-800">Verificar Validez de Aval</h2></div>
          {!result&&!notFound&&(<form onSubmit={handleSearch} className="space-y-4"><input required placeholder="Número de correlativo del aval" className="w-full border p-3 rounded-lg text-lg text-center" value={correlativo} onChange={e=>setCorrelativo(e.target.value)}/><button type="submit" disabled={searching} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">{searching?'Verificando...':'Verificar Aval'}</button></form>)}
          {notFound&&(<div className="text-center space-y-4"><div className="bg-red-50 border border-red-200 rounded-lg p-4"><AlertCircle size={32} className="text-red-500 mx-auto mb-2"/><p className="text-red-700 font-medium">No se encontró un aval válido con correlativo: {correlativo}</p></div><div className="flex gap-3"><button onClick={handleReset} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700">Otra Consulta</button><button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200">Volver al Menú</button></div></div>)}
          {result&&(<div className="space-y-4">{result.status==='Aprobado'?(<div className="bg-green-50 border border-green-300 rounded-lg p-4 text-center"><CheckCircle size={40} className="text-green-600 mx-auto mb-2"/><p className="text-green-800 font-bold text-lg">Aval Válido ✓</p></div>):(<div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-center"><AlertTriangle size={40} className="text-yellow-600 mx-auto mb-2"/><p className="text-yellow-800 font-bold text-lg">Estado: {result.status}</p></div>)}<div className="bg-gray-50 rounded-lg p-4 space-y-2"><div className="flex justify-between"><span className="text-sm text-gray-500">Correlativo</span><span className="font-bold">{result.correlativo}</span></div><div className="flex justify-between"><span className="text-sm text-gray-500">Actividad</span><span className="font-medium">{result.activity_name}</span></div><div className="flex justify-between"><span className="text-sm text-gray-500">Solicitante</span><span className="font-medium">{result.applicant_name}</span></div><div className="flex justify-between items-center"><span className="text-sm text-gray-500">Estado</span><Badge status={result.status}/></div></div><div className="flex gap-3"><button onClick={handleReset} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700">Otra Consulta</button><button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200">Volver al Menú</button></div></div>)}
        </div>
      </Card>
    </div>
  );
};

// ==========================================
// ADMIN: OFICIOS
// ==========================================
const OficiosAdminView = ({ oficios, onCreateOficio, onUpdateOficio, onDeleteOficio, appSettings, preFillData, onClearPreFill }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingOficio, setEditingOficio] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { if (preFillData) { setEditingOficio(null); setShowForm(true); } }, [preFillData]);
  const handleNew = () => { setEditingOficio(null); if(onClearPreFill)onClearPreFill(); setShowForm(true); };
  const handleEdit = (o) => { setEditingOficio(o); if(onClearPreFill)onClearPreFill(); setShowForm(true); };
  const handleSave = async (data) => { if(editingOficio)await onUpdateOficio(editingOficio.id,data); else await onCreateOficio(data); setShowForm(false); setEditingOficio(null); if(onClearPreFill)onClearPreFill(); };
  const handleClose = () => { setShowForm(false); setEditingOficio(null); if(onClearPreFill)onClearPreFill(); };
  const handleDelete = async () => { if(!deleteModal)return; setDeleting(true); await onDeleteOficio(deleteModal.id); setDeleteModal(null); setDeleting(false); };
  const handleStatusChange = async (oficio, newStatus) => { await onUpdateOficio(oficio.id,{...oficio,estado:newStatus}); };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-gray-800">Oficios y Solicitudes</h2><p className="text-sm text-gray-500">Genera, edita y gestiona oficios internos de CAEDUC</p></div>
        <button onClick={handleNew} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium shadow-sm"><FilePlus size={20}/> Nuevo Oficio</button>
      </div>
      {preFillData&&(<div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center gap-3"><FileText size={18} className="text-indigo-600 shrink-0"/><div className="flex-1 text-sm text-indigo-800"><span className="font-bold">Nuevo oficio desde Planificación:</span> "{preFillData.actividad_nombre}" — datos pre-llenados.</div><button onClick={onClearPreFill} className="text-indigo-400 hover:text-indigo-700"><X size={16}/></button></div>)}
      <div className="grid grid-cols-3 gap-4">
        <Card><div className="text-center"><p className="text-3xl font-bold text-blue-700">{oficios.length}</p><p className="text-sm text-gray-500">Total Oficios</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-bold text-yellow-600">{oficios.filter(o=>o.estado==='Borrador').length}</p><p className="text-sm text-gray-500">Borradores</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-bold text-green-600">{oficios.filter(o=>o.estado==='Enviado').length}</p><p className="text-sm text-gray-500">Enviados</p></div></Card>
      </div>
      <div className="space-y-2">
        {oficios.map(o=>(
          <OficioCard key={o.id} oficio={o} appSettings={appSettings}
            onEdit={()=>handleEdit(o)}
            onStatusChange={(s)=>handleStatusChange(o,s)}
            onDelete={()=>setDeleteModal(o)}
          />
        ))}
        {oficios.length===0&&(<div className="text-center py-16"><FileSignature size={48} className="text-gray-300 mx-auto mb-4"/><p className="text-gray-400 text-lg">No hay oficios generados aún.</p></div>)}
      </div>
      {showForm&&<OficioFormModal isOpen={showForm} onClose={handleClose} onSave={handleSave} initialData={editingOficio} preFillData={preFillData} existingCount={oficios.length} appSettings={appSettings}/>}
      <Modal isOpen={!!deleteModal} onClose={()=>setDeleteModal(null)} title="Eliminar Oficio" size="sm">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-700 font-medium">¿Seguro que deseas eliminar "{deleteModal?.numero_oficio}"?</p></div>
          <div className="flex gap-3"><button onClick={()=>setDeleteModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200">Cancelar</button><button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50">{deleting?'Eliminando...':'Eliminar'}</button></div>
        </div>
      </Modal>
    </div>
  );
};

// ==========================================
// FORMULARIO OFICIO
// ==========================================
// ── Tarjeta colapsable de oficio ──────────────────────────────────────────────
const OficioCard = ({ oficio: o, appSettings, onEdit, onStatusChange, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  // No renderizar tarjetas vacías
  if (!o.numero_oficio && !o.motivo) return null;
  return (
    <div className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow" style={{overflow:'hidden',maxWidth:'100%',boxSizing:'border-box'}}>
      {/* Fila siempre visible — clic para expandir */}
      <div className="flex items-center gap-2 px-3 py-3 cursor-pointer select-none"
           style={{minWidth:0,overflow:'hidden'}}
           onClick={() => setExpanded(e => !e)}>
        {/* Número de oficio + estado */}
        <div style={{flex:'1',minWidth:0,overflow:'hidden'}}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-gray-800 text-sm">{o.numero_oficio}</span>
            <Badge status={o.estado}/>
            {o.ultima_edicion_en && (
              <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200">
                ✏ {new Date(o.ultima_edicion_en).toLocaleDateString('es-GT')}
                {o.ultima_edicion_por ? ` · ${o.ultima_edicion_por.split('@')[0]}` : ''}
              </span>
            )}
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar size={10}/>{o.fecha}
            </span>
          </div>
          {/* Título o motivo — truncado estrictamente */}
          <p style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%',fontSize:'13px',marginTop:'2px',color: o.titulo ? '#374151' : '#6b7280',fontWeight: o.titulo ? '600' : '400'}}>
            {o.titulo || o.motivo}
          </p>
          {o.titulo && (
            <p style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%',fontSize:'11px',color:'#9ca3af'}}>
              {o.motivo}
            </p>
          )}
        </div>
        {/* Indicador expandir/colapsar */}
        <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}/>
      </div>

      {/* Contenido expandido */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-gray-50">
          {/* Detalle */}
          <div className="space-y-1">
            {o.actividad_nombre && (
              <p className="text-sm text-blue-700 font-medium flex items-center gap-1">
                <FileText size={13}/> {o.actividad_nombre}
              </p>
            )}
            {o.monto && (
              <span className="inline-block text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium border border-green-200">
                {o.monto}
              </span>
            )}
          </div>
          {/* Acciones */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={(e)=>{e.stopPropagation();openOficioLetter(o,appSettings,'preview');}}
              className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1 font-medium">
              <Eye size={13}/> Vista Previa
            </button>
            <button onClick={(e)=>{e.stopPropagation();openOficioLetter(o,appSettings,'download');}}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-700 flex items-center gap-1 font-medium">
              <Download size={13}/> PDF
            </button>
            <button onClick={(e)=>{e.stopPropagation();onEdit();}}
              className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200 flex items-center gap-1 font-medium">
              <Edit3 size={13}/> Editar
            </button>
            {o.estado==='Borrador' && (
              <button onClick={(e)=>{e.stopPropagation();onStatusChange('Enviado');}}
                className="bg-green-50 text-green-600 px-2.5 py-1.5 rounded-lg text-xs hover:bg-green-100 flex items-center gap-1">
                <Send size={12}/> Enviado
              </button>
            )}
            {o.estado==='Enviado' && (
              <button onClick={(e)=>{e.stopPropagation();onStatusChange('Archivado');}}
                className="bg-gray-50 text-gray-500 px-2.5 py-1.5 rounded-lg text-xs hover:bg-gray-100 flex items-center gap-1">
                <Archive size={12}/> Archivar
              </button>
            )}
            <button onClick={(e)=>{e.stopPropagation();onDelete();}}
              className="bg-red-50 text-red-500 px-2.5 py-1.5 rounded-lg text-xs hover:bg-red-100 flex items-center gap-1 ml-auto">
              <Trash2 size={12}/> Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


const OficioFormModal = ({ isOpen, onClose, onSave, initialData, preFillData, existingCount, appSettings }) => {
  const today = new Date().toISOString().split('T')[0];
  const suggestedNum = 'Of. ' + String((existingCount||0)+1).padStart(3,'0') + '.CAEDUC';
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [fd, setFd] = useState(null);
  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(1);
    if (preFillData && !initialData) {
      setFd({ numero_oficio:suggestedNum, fecha:today, dirigido_a:'Miembros, Junta Directiva 2025-2027, Colegio de Psicólogos de Guatemala', titulo:'', motivo:MOTIVOS_OFICIO[0], motivo_custom:'', actividad_nombre:preFillData.actividad_nombre||'', actividad_tipo:preFillData.actividad_tipo||'', actividad_fecha:preFillData.actividad_fecha||'', actividad_duracion:preFillData.actividad_duracion||'', actividad_modalidad:preFillData.actividad_modalidad||'', actividad_sede:preFillData.actividad_sede||preFillData.t3_lugar||'', actividad_descripcion:'', monto:'', monto_detalle:'', justificacion:'', solicitud_puntual:'', cuerpo_personalizado:'', estado:'Borrador' });
    } else {
      setFd({ numero_oficio:initialData?initialData.numero_oficio:suggestedNum, fecha:initialData?initialData.fecha:today, dirigido_a:initialData?initialData.dirigido_a:'Miembros, Junta Directiva 2025-2027, Colegio de Psicólogos de Guatemala', titulo:initialData?(initialData.titulo||''):'', motivo:(()=>{ const m=initialData?.motivo||MOTIVOS_OFICIO[0]; return MOTIVOS_OFICIO.includes(m)?m:'Otro (personalizado)'; })(), motivo_custom:(()=>{ const m=initialData?.motivo||''; return MOTIVOS_OFICIO.includes(m)?'':m; })(), actividad_nombre:initialData?(initialData.actividad_nombre||''):'', actividad_tipo:initialData?(initialData.actividad_tipo||''):'', actividad_fecha:initialData?(initialData.actividad_fecha||''):'', actividad_duracion:initialData?(initialData.actividad_duracion||''):'', actividad_modalidad:initialData?(initialData.actividad_modalidad||''):'', actividad_sede:initialData?(initialData.actividad_sede||''):'', actividad_descripcion:initialData?(initialData.actividad_descripcion||''):'', monto:initialData?(initialData.monto||''):'', monto_detalle:initialData?(initialData.monto_detalle||''):'', justificacion:initialData?(initialData.justificacion||''):'', solicitud_puntual:initialData?(initialData.solicitud_puntual||''):'', cuerpo_personalizado:initialData?(initialData.cuerpo_personalizado||''):'', estado:initialData?(initialData.estado||'Borrador'):'Borrador' });
    }
  }, [isOpen, initialData, preFillData]);
  if (!isOpen||!fd) return null;
  const isRecursos = fd.motivo.includes('recursos')||fd.motivo.includes('Aprobación');
  const isCustomMotivo = fd.motivo==='Otro (personalizado)';
  const goToPreview = (e) => { e.preventDefault(); setCurrentStep(2); };
  const handleSaveOficio = async () => { setSaving(true); const saveData={...fd}; if(isCustomMotivo&&fd.motivo_custom)saveData.motivo=fd.motivo_custom; delete saveData.motivo_custom; await onSave(saveData); setSaving(false); }; // titulo is included automatically via spread
  const handlePreviewOpen = () => { const pd={...fd}; if(fd.motivo==='Otro (personalizado)'&&fd.motivo_custom)pd.motivo=fd.motivo_custom; openOficioLetter(pd,appSettings,'preview'); };
  const handleDownloadPdf = () => { const pd={...fd}; if(fd.motivo==='Otro (personalizado)'&&fd.motivo_custom)pd.motivo=fd.motivo_custom; openOficioLetter(pd,appSettings,'download'); };
  const updateField = (field,value) => setFd(prev=>({...prev,[field]:value}));
  if (currentStep===2) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl w-full my-3" style={{maxWidth:'min(95vw,720px)',boxSizing:'border-box'}}>
          <div className="flex justify-between items-center p-4 border-b"><div><h3 className="text-lg font-bold text-gray-800">{initialData?'Editar Oficio':'Nuevo Oficio'}</h3><p className="text-sm text-gray-500">Paso 2: Vista previa</p></div><button onClick={onClose}><X size={22} className="text-gray-500 hover:text-red-500"/></button></div>
          <div className="p-4 overflow-y-auto space-y-4" style={{maxHeight:'calc(100dvh - 120px)'}}>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-blue-800 font-medium text-sm">Vista previa del oficio. Puedes volver atrás para editar o guardar directamente.</p></div>
            <div className="border-2 border-gray-200 rounded-lg p-5 bg-gray-50 space-y-3">
              <div className="flex justify-between items-start"><div><p className="font-bold text-lg text-gray-800">{fd.numero_oficio}</p><p className="text-sm text-gray-500">Guatemala, {formatOficioDate(fd.fecha)}</p></div><Badge status={fd.estado}/></div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex gap-2"><span className="font-semibold text-gray-600 shrink-0">Dirigido a:</span><span className="text-gray-800">{fd.dirigido_a}</span></div>
                <div className="flex gap-2"><span className="font-semibold text-gray-600 shrink-0">Motivo:</span><span className="text-gray-800">{(fd.motivo==='Otro (personalizado)'&&fd.motivo_custom)?fd.motivo_custom:fd.motivo}</span></div>
                {fd.actividad_nombre&&<div className="flex gap-2"><span className="font-semibold text-gray-600 shrink-0">Actividad:</span><span className="text-gray-800">{fd.actividad_nombre}</span></div>}
                {fd.monto&&<div className="flex gap-2"><span className="font-semibold text-gray-600 shrink-0">Monto:</span><span className="text-green-700 font-bold">{fd.monto}</span></div>}
                {fd.justificacion&&<p className="text-xs text-purple-600 font-medium pt-1">✓ Incluye justificación técnica (página 2)</p>}
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex gap-3"><button type="button" onClick={()=>setCurrentStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 flex items-center justify-center gap-2"><ArrowLeft size={18}/> Volver a Editar</button><button type="button" onClick={handlePreviewOpen} className="flex-1 bg-blue-50 text-blue-700 py-3 rounded-lg font-bold hover:bg-blue-100 flex items-center justify-center gap-2 border border-blue-200"><Eye size={18}/> Vista Previa</button></div>
              <div className="flex gap-3"><button type="button" onClick={handleDownloadPdf} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"><Download size={18}/> Descargar PDF</button><button type="button" onClick={handleSaveOficio} disabled={saving} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"><Save size={18}/> {saving?'Guardando...':'Guardar Oficio'}</button></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full my-3" style={{maxWidth:'min(95vw,720px)',boxSizing:'border-box'}}>
        <div className="flex justify-between items-center p-4 border-b"><div><h3 className="text-lg font-bold text-gray-800">{initialData?'Editar Oficio':'Nuevo Oficio'}</h3><p className="text-sm text-gray-500">{preFillData?`Datos importados desde Planificación — "${preFillData.actividad_nombre}"` : 'Paso 1: Datos del oficio'}</p></div><button onClick={onClose}><X size={24} className="text-gray-500 hover:text-red-500"/></button></div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {preFillData&&(<div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-sm text-indigo-800"><FileText size={15} className="shrink-0 mt-0.5"/><span>Datos importados desde <strong>Planificación CAEDUC 2026</strong>. Revisa y complementa antes de guardar.</span></div>)}
          <form onSubmit={goToPreview} className="space-y-5">
            <div className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-100">
              <h4 className="font-bold text-blue-800 text-sm uppercase tracking-wide">Encabezado del Oficio</h4>
              <div>
                <label className="block text-sm font-bold mb-1 flex items-center gap-1">
                  Título / Identificador
                  <span className="text-xs font-normal text-blue-400 bg-blue-100 px-1.5 py-0.5 rounded-full">Solo visible en la lista, no aparece en el PDF</span>
                </label>
                <input placeholder="Ej: Solicitud licencia Zoom, Oficio reunión CAEDUC..." className="w-full border p-2.5 rounded-lg text-sm" value={fd.titulo||''} onChange={e=>updateField('titulo',e.target.value)}/>
              </div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-bold mb-1">Número de Oficio *</label><input required className="w-full border p-2.5 rounded-lg" value={fd.numero_oficio} onChange={e=>updateField('numero_oficio',e.target.value)}/></div><div><label className="block text-sm font-bold mb-1">Fecha *</label><input required type="date" className="w-full border p-2.5 rounded-lg" value={fd.fecha} onChange={e=>updateField('fecha',e.target.value)}/></div></div>
              <div><label className="block text-sm font-bold mb-1">Dirigido a *</label><textarea required rows={2} className="w-full border p-2.5 rounded-lg" value={fd.dirigido_a} onChange={e=>updateField('dirigido_a',e.target.value)}/></div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 space-y-3 border border-amber-100">
              <h4 className="font-bold text-amber-800 text-sm uppercase tracking-wide">Motivo del Oficio</h4>
              <select required className="w-full border p-2.5 rounded-lg font-medium" value={fd.motivo} onChange={e=>updateField('motivo',e.target.value)}>{MOTIVOS_OFICIO.map(m=><option key={m} value={m}>{m}</option>)}</select>
              {isCustomMotivo&&(<textarea required rows={3} placeholder="Describe el motivo del oficio..." className="w-full border p-2.5 rounded-lg text-sm resize-none" value={fd.motivo_custom} onChange={e=>updateField('motivo_custom',e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.stopPropagation();}}/>)}
            </div>
            {isRecursos&&(<div className="bg-green-50 rounded-lg p-4 space-y-3 border border-green-100">
              <h4 className="font-bold text-green-800 text-sm uppercase tracking-wide">Datos de la Actividad</h4>
              <input required placeholder="Nombre de la actividad *" className="w-full border p-2.5 rounded-lg" value={fd.actividad_nombre} onChange={e=>updateField('actividad_nombre',e.target.value)}/>
              <textarea rows={3} placeholder="Descripción de la actividad" className="w-full border p-2.5 rounded-lg" value={fd.actividad_descripcion} onChange={e=>updateField('actividad_descripcion',e.target.value)}/>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-bold mb-1">Tipo</label><select className="w-full border p-2.5 rounded-lg" value={fd.actividad_tipo} onChange={e=>updateField('actividad_tipo',e.target.value)}><option value="">Seleccionar...</option>{ACTIVITY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div><label className="block text-sm font-bold mb-1">Modalidad</label><select className="w-full border p-2.5 rounded-lg" value={fd.actividad_modalidad} onChange={e=>updateField('actividad_modalidad',e.target.value)}><option value="">Seleccionar...</option>{MODALITIES.map(m=><option key={m} value={m}>{m}</option>)}</select></div></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-bold mb-1">Duración</label><input placeholder="Ej: 2-3 horas" className="w-full border p-2.5 rounded-lg" value={fd.actividad_duracion} onChange={e=>updateField('actividad_duracion',e.target.value)}/></div><div><label className="block text-sm font-bold mb-1">Fecha</label><input placeholder="Ej: 29 de octubre" className="w-full border p-2.5 rounded-lg" value={fd.actividad_fecha} onChange={e=>updateField('actividad_fecha',e.target.value)}/></div></div>
              <input placeholder="Sede / Plataforma" className="w-full border p-2.5 rounded-lg" value={fd.actividad_sede} onChange={e=>updateField('actividad_sede',e.target.value)}/>
            </div>)}
            {isRecursos&&(<div className="bg-rose-50 rounded-lg p-4 space-y-3 border border-rose-100">
              <h4 className="font-bold text-rose-800 text-sm uppercase tracking-wide">Recursos Solicitados</h4>
              <input placeholder="Monto (ej: US$400 o Q3,000.00)" className="w-full border p-2.5 rounded-lg" value={fd.monto} onChange={e=>updateField('monto',e.target.value)}/>
              <textarea rows={2} placeholder="Detalle de recursos" className="w-full border p-2.5 rounded-lg" value={fd.monto_detalle} onChange={e=>updateField('monto_detalle',e.target.value)}/>
            </div>)}
            <div className="bg-purple-50 rounded-lg p-4 space-y-3 border border-purple-100">
              <h4 className="font-bold text-purple-800 text-sm uppercase tracking-wide">Justificación Técnica (opcional)</h4>
              <textarea rows={4} placeholder="Justificación técnica y aporte gremial..." className="w-full border p-2.5 rounded-lg" value={fd.justificacion} onChange={e=>updateField('justificacion',e.target.value)}/>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 space-y-3 border border-indigo-100">
              <h4 className="font-bold text-indigo-800 text-sm uppercase tracking-wide">Solicitud Puntual (opcional)</h4>
              <textarea rows={3} placeholder="Cada punto en una línea separada..." className="w-full border p-2.5 rounded-lg" value={fd.solicitud_puntual} onChange={e=>updateField('solicitud_puntual',e.target.value)}/>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Cuerpo Personalizado (opcional)</h4>
              <textarea rows={4} placeholder="Déjalo vacío para usar el texto generado automáticamente..." className="w-full border p-2.5 rounded-lg" value={fd.cuerpo_personalizado} onChange={e=>updateField('cuerpo_personalizado',e.target.value)}/>
            </div>
            <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200">Cancelar</button><button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2"><Eye size={18}/> Vista Previa</button></div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// ADMIN: CONFIGURACIÓN
// ==========================================
const AdminConfigView = ({ appSettings, onUpdateSetting, members, onUpdateMember }) => {
  const [activeTab, setActiveTab] = useState('users');
  const tabs = [
    {id:'users',label:'Usuarios',icon:<UserPlus size={18}/>},{id:'firmas',label:'Firmas y Sello',icon:<FileSignature size={18}/>},
    {id:'form_file',label:'Formulario Aval',icon:<File size={18}/>},{id:'reglamento',label:'Reglamento',icon:<BookOpen size={18}/>},
    {id:'tutorial',label:'Tutorial YouTube',icon:<Youtube size={18}/>},
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-wrap">
        {tabs.map(tab=>(<button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all flex-1 justify-center ${activeTab===tab.id?'bg-white text-blue-700 shadow-sm':'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{tab.icon} {tab.label}</button>))}
      </div>
      {activeTab==='users'&&<AdminUsersTab members={members} onUpdateMember={onUpdateMember}/>}
      {activeTab==='firmas'&&<AdminFirmasTab appSettings={appSettings} onUpdateSetting={onUpdateSetting}/>}
      {activeTab==='form_file'&&<AdminFormFileTab appSettings={appSettings} onUpdateSetting={onUpdateSetting}/>}
      {activeTab==='reglamento'&&<AdminReglamentoTab appSettings={appSettings} onUpdateSetting={onUpdateSetting}/>}
      {activeTab==='tutorial'&&<AdminTutorialTab appSettings={appSettings} onUpdateSetting={onUpdateSetting}/>}
    </div>
  );
};

const AdminUsersTab = ({ members, onUpdateMember }) => {
  const [showModal,setShowModal]=useState(false);const [editModal,setEditModal]=useState(null);const [newUser,setNewUser]=useState({email:'',password:'',name:'',role:ROLES[0]});const [editData,setEditData]=useState({name:'',role:'',email:''});const [creating,setCreating]=useState(false);const [saving,setSaving]=useState(false);const [showPw,setShowPw]=useState(false);const [msg,setMsg]=useState(null);
  const handleCreate=async(e)=>{e.preventDefault();setCreating(true);setMsg(null);try{const{data:ad,error:ae}=await supabase.auth.signUp({email:newUser.email,password:newUser.password});if(ae){setMsg({type:'error',text:ae.message});setCreating(false);return;}if(ad.user){const{error:pe}=await supabase.from('profiles').insert([{id:ad.user.id,name:newUser.name,role:newUser.role,email:newUser.email}]);if(pe)setMsg({type:'warning',text:'Auth OK pero error perfil: '+pe.message});else{setMsg({type:'success',text:`"${newUser.name}" creado.`});setNewUser({email:'',password:'',name:'',role:ROLES[0]});setShowModal(false);}}}catch(err){setMsg({type:'error',text:err.message});}setCreating(false);};
  const openEdit=(m)=>{setEditData({id:m.id,name:m.name||'',role:m.role||ROLES[0],email:m.email||''});setEditModal(true);setMsg(null);};
  const handleEdit=async(e)=>{e.preventDefault();setSaving(true);setMsg(null);try{await onUpdateMember(editData.id,{name:editData.name,role:editData.role,email:editData.email});setMsg({type:'success',text:'Usuario actualizado.'});setEditModal(null);}catch(err){setMsg({type:'error',text:err.message});}setSaving(false);};
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-gray-700">Usuarios Administradores</h3><button onClick={()=>{setShowModal(true);setMsg(null);}} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"><UserPlus size={18}/> Nuevo</button></div>
      {msg&&<div className={`p-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700 border border-green-200':msg.type==='warning'?'bg-yellow-50 text-yellow-700 border border-yellow-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}
      <div className="grid gap-3">{members.length>0?members.map(m=>(<Card key={m.id} className="!shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">{m.name?.charAt(0)?.toUpperCase()||'?'}</div><div><p className="font-semibold">{m.name||'Sin nombre'}</p><p className="text-xs text-gray-500">{m.email||''}</p></div></div><div className="flex items-center gap-2"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">{m.role||'Sin rol'}</span><button onClick={()=>openEdit(m)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1 font-medium"><Edit3 size={14}/> Editar</button></div></div></Card>)):<div className="text-gray-400 text-center py-8">No hay miembros.</div>}</div>
      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Crear Usuario" size="sm">
        <form onSubmit={handleCreate} className="space-y-4"><input required placeholder="Nombre completo" className="w-full border p-2.5 rounded-lg" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})}/><input required type="email" placeholder="email@ejemplo.com" className="w-full border p-2.5 rounded-lg" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})}/><div className="relative"><input required type={showPw?'text':'password'} placeholder="Contraseña (min 6)" minLength={6} className="w-full border p-2.5 rounded-lg pr-10" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})}/><button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{showPw?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><select className="w-full border p-2.5 rounded-lg" value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>{ROLES.map(r=><option key={r}>{r}</option>)}</select><button type="submit" disabled={creating} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{creating?'Creando...':'Crear'}</button></form>
      </Modal>
      <Modal isOpen={!!editModal} onClose={()=>setEditModal(null)} title="Editar Usuario" size="sm">
        <form onSubmit={handleEdit} className="space-y-4"><div><label className="block text-sm font-bold mb-1">Nombre completo</label><input required className="w-full border p-2.5 rounded-lg" value={editData.name} onChange={e=>setEditData({...editData,name:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Email</label><input required type="email" className="w-full border p-2.5 rounded-lg" value={editData.email} onChange={e=>setEditData({...editData,email:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Rol</label><select className="w-full border p-2.5 rounded-lg" value={editData.role} onChange={e=>setEditData({...editData,role:e.target.value})}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></div><button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{saving?'Guardando...':'Guardar Cambios'}</button></form>
      </Modal>
    </div>
  );
};

const FirmaUploader = ({ label, settingKey, appSettings, onUpdateSetting }) => {
  const [uploading,setUploading]=useState(false);const [msg,setMsg]=useState(null);const fp=appSettings?.[settingKey]||'';const imgUrl=fp?`${supabaseUrl}/storage/v1/object/public/firmas-sellos/${fp}`:null;
  const handleUpload=async(e)=>{const f=e.target.files[0];if(!f)return;if(!f.type.startsWith('image/')){alert('Solo imágenes.');return;}setUploading(true);setMsg(null);try{const fn=`${settingKey}_${Date.now()}.${f.name.split('.').pop()}`;if(fp)await supabase.storage.from('firmas-sellos').remove([fp]);const{data,error}=await supabase.storage.from('firmas-sellos').upload(fn,f,{upsert:true});if(error)setMsg({type:'error',text:error.message});else{await onUpdateSetting(settingKey,data.path);setMsg({type:'success',text:'Imagen actualizada.'});}}catch(err){setMsg({type:'error',text:err.message});}setUploading(false);};
  const handleRemove=async()=>{if(!fp||!confirm('¿Eliminar?'))return;await supabase.storage.from('firmas-sellos').remove([fp]);await onUpdateSetting(settingKey,'');setMsg({type:'success',text:'Eliminada.'});};
  return (<div className="space-y-2"><p className="text-sm font-bold text-gray-700">{label}</p>{msg&&<div className={`p-2 rounded text-xs ${msg.type==='success'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>{msg.text}</div>}{imgUrl?(<div className="flex items-center gap-3 p-3 bg-gray-50 border rounded-lg"><img src={imgUrl} alt={label} className="h-16 w-auto object-contain border bg-white p-1 rounded"/><div className="flex-1"><p className="text-xs text-green-600 font-medium">Imagen activa</p></div><label className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-xs cursor-pointer hover:bg-blue-200 font-medium">{uploading?'...':'Cambiar'}<input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept="image/*"/></label><button onClick={handleRemove} className="bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-200"><Trash2 size={14} className="inline"/></button></div>):(<label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50"><Upload size={18} className="text-gray-400"/><span className="text-sm text-gray-500">{uploading?'Subiendo...':'Subir imagen'}</span><input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept="image/*"/></label>)}</div>);
};

const AdminFirmasTab = ({ appSettings, onUpdateSetting }) => {
  const [saving,setSaving]=useState(false);const [msg,setMsg]=useState(null);const [f1,setF1]=useState({nombre:'',cargo:'',institucion:''});const [f2,setF2]=useState({nombre:'',cargo:'',institucion:''});
  useEffect(()=>{setF1({nombre:appSettings?.firmante1_nombre||'M. A. Juan J. Reyes',cargo:appSettings?.firmante1_cargo||'Coordinador',institucion:appSettings?.firmante1_institucion||'Comisión de Acreditación Educación continua, Colegio de Psicólogos de Guatemala'});setF2({nombre:appSettings?.firmante2_nombre||'Mgtr. Luisa Mazariegos',cargo:appSettings?.firmante2_cargo||'Secretaria',institucion:appSettings?.firmante2_institucion||'CAEDUC'});},[appSettings]);
  const handleSaveNames=async()=>{setSaving(true);setMsg(null);try{await onUpdateSetting('firmante1_nombre',f1.nombre);await onUpdateSetting('firmante1_cargo',f1.cargo);await onUpdateSetting('firmante1_institucion',f1.institucion);await onUpdateSetting('firmante2_nombre',f2.nombre);await onUpdateSetting('firmante2_cargo',f2.cargo);await onUpdateSetting('firmante2_institucion',f2.institucion);setMsg({type:'success',text:'Datos guardados.'});}catch(err){setMsg({type:'error',text:err.message});}setSaving(false);};
  return (<div className="space-y-6"><div><h3 className="text-lg font-bold text-gray-700">Logo, Firmas, Sello y Firmantes</h3></div>{msg&&<div className={`p-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}<Card><div className="space-y-4">
          <h4 className="font-bold text-blue-900 flex items-center gap-2">📄 Membrete de Oficios</h4>
          <p className="text-xs text-gray-500">Imagen de fondo que se usa en todos los oficios PDF. Debe ser carta (8.5x11in) con el diseño oficial. Al subirlo reemplaza el membrete predeterminado.</p>
          <FirmaUploader label="Imagen del membrete (JPG/PNG, carta)" settingKey="membrete_path" appSettings={appSettings} onUpdateSetting={onUpdateSetting}/>
        </div></Card>
        <Card><div className="space-y-4"><h4 className="font-bold text-green-800">Logo de Encabezado (otros documentos)</h4><FirmaUploader label="Imagen del logo" settingKey="logo_path" appSettings={appSettings} onUpdateSetting={onUpdateSetting}/></div></Card><Card><div className="space-y-4"><h4 className="font-bold text-blue-800">Firmante 1 (Coordinador/a)</h4><div className="grid md:grid-cols-2 gap-4"><div className="space-y-3"><div><label className="block text-sm font-bold mb-1">Nombre</label><input className="w-full border p-2.5 rounded-lg" value={f1.nombre} onChange={e=>setF1({...f1,nombre:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Cargo</label><input className="w-full border p-2.5 rounded-lg" value={f1.cargo} onChange={e=>setF1({...f1,cargo:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Institución</label><input className="w-full border p-2.5 rounded-lg" value={f1.institucion} onChange={e=>setF1({...f1,institucion:e.target.value})}/></div></div><div><FirmaUploader label="Imagen de firma" settingKey="firmante1_firma_path" appSettings={appSettings} onUpdateSetting={onUpdateSetting}/></div></div></div></Card><Card><div className="space-y-4"><h4 className="font-bold text-indigo-800">Firmante 2 (Secretaria/o)</h4><div className="grid md:grid-cols-2 gap-4"><div className="space-y-3"><div><label className="block text-sm font-bold mb-1">Nombre</label><input className="w-full border p-2.5 rounded-lg" value={f2.nombre} onChange={e=>setF2({...f2,nombre:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Cargo</label><input className="w-full border p-2.5 rounded-lg" value={f2.cargo} onChange={e=>setF2({...f2,cargo:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Institución</label><input className="w-full border p-2.5 rounded-lg" value={f2.institucion} onChange={e=>setF2({...f2,institucion:e.target.value})}/></div></div><div><FirmaUploader label="Imagen de firma" settingKey="firmante2_firma_path" appSettings={appSettings} onUpdateSetting={onUpdateSetting}/></div></div></div></Card><Card><div className="space-y-4"><h4 className="font-bold text-purple-800">Sello de la Comisión</h4><FirmaUploader label="Imagen del sello" settingKey="sello_path" appSettings={appSettings} onUpdateSetting={onUpdateSetting}/></div></Card><button onClick={handleSaveNames} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"><Save size={18}/> {saving?'Guardando...':'Guardar Nombres y Cargos'}</button></div>);
};

const AdminFormFileTab = ({ appSettings, onUpdateSetting }) => {
  const [uploading,setUploading]=useState(false);const [msg,setMsg]=useState(null);const fp=appSettings?.aval_form_file_path||'';const fUrl=fp?`${supabaseUrl}/storage/v1/object/public/aval-form-template/${fp}`:null;
  const handleUpload=async(e)=>{const f=e.target.files[0];if(!f)return;setUploading(true);setMsg(null);try{const fn=`formulario_aval_${Date.now()}.${f.name.split('.').pop()}`;if(fp)await supabase.storage.from('aval-form-template').remove([fp]);const{data,error}=await supabase.storage.from('aval-form-template').upload(fn,f,{upsert:true});if(error)setMsg({type:'error',text:error.message});else{await onUpdateSetting('aval_form_file_path',data.path);setMsg({type:'success',text:'Archivo subido.'});}}catch(err){setMsg({type:'error',text:err.message});}setUploading(false);};
  const handleRemove=async()=>{if(!fp||!confirm('¿Eliminar?'))return;await supabase.storage.from('aval-form-template').remove([fp]);await onUpdateSetting('aval_form_file_path','');setMsg({type:'success',text:'Eliminado.'});};
  return (<div className="space-y-4"><h3 className="text-lg font-bold text-gray-700">Formulario de Solicitud de Aval</h3>{msg&&<div className={`p-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}<Card>{fUrl?(<div className="space-y-4"><div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"><FileText size={24} className="text-green-600 shrink-0"/><div className="flex-1"><p className="font-medium text-green-800">Archivo activo</p></div><a href={fUrl} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700"><Download size={14} className="inline mr-1"/>Ver</a><button onClick={handleRemove} className="bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-200"><Trash2 size={14} className="inline mr-1"/>Eliminar</button></div><label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50"><Upload size={20} className="text-gray-400"/><span className="text-sm text-gray-500">{uploading?'Subiendo...':'Reemplazar'}</span><input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx"/></label></div>):(<div className="text-center space-y-4"><Upload size={28} className="text-gray-400 mx-auto"/><p className="font-medium text-gray-700">No hay formulario cargado</p><label className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg cursor-pointer hover:bg-blue-700 font-medium"><Upload size={18}/>{uploading?'Subiendo...':'Subir Formulario'}<input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx"/></label></div>)}</Card></div>);
};

const AdminReglamentoTab = ({ appSettings, onUpdateSetting }) => {
  const [uploading,setUploading]=useState(false);const [msg,setMsg]=useState(null);const fp=appSettings?.reglamento_file_path||'';const fUrl=fp?`${supabaseUrl}/storage/v1/object/public/reglamento-avales/${fp}`:null;
  const handleUpload=async(e)=>{const f=e.target.files[0];if(!f)return;setUploading(true);setMsg(null);try{const fn=`reglamento_avales_${Date.now()}.${f.name.split('.').pop()}`;if(fp)await supabase.storage.from('reglamento-avales').remove([fp]);const{data,error}=await supabase.storage.from('reglamento-avales').upload(fn,f,{upsert:true});if(error)setMsg({type:'error',text:error.message});else{await onUpdateSetting('reglamento_file_path',data.path);setMsg({type:'success',text:'Reglamento subido.'});}}catch(err){setMsg({type:'error',text:err.message});}setUploading(false);};
  const handleRemove=async()=>{if(!fp||!confirm('¿Eliminar el reglamento?'))return;await supabase.storage.from('reglamento-avales').remove([fp]);await onUpdateSetting('reglamento_file_path','');setMsg({type:'success',text:'Reglamento eliminado.'});};
  return (<div className="space-y-4"><h3 className="text-lg font-bold text-gray-700">Reglamento de Avales</h3><p className="text-sm text-gray-500">Disponible para descarga pública en el portal.</p>{msg&&<div className={`p-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}<Card>{fUrl?(<div className="space-y-4"><div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg"><BookOpen size={24} className="text-purple-600 shrink-0"/><div className="flex-1"><p className="font-medium text-purple-800">Reglamento activo</p></div><a href={fUrl} target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700"><Download size={14} className="inline mr-1"/>Ver</a><button onClick={handleRemove} className="bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-200"><Trash2 size={14} className="inline mr-1"/>Eliminar</button></div><label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-purple-400 hover:bg-purple-50"><Upload size={20} className="text-gray-400"/><span className="text-sm text-gray-500">{uploading?'Subiendo...':'Reemplazar'}</span><input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx"/></label></div>):(<div className="text-center space-y-4"><BookOpen size={28} className="text-gray-400 mx-auto"/><p className="font-medium text-gray-700">No hay reglamento cargado</p><label className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg cursor-pointer hover:bg-purple-700 font-medium"><Upload size={18}/>{uploading?'Subiendo...':'Subir Reglamento'}<input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx"/></label></div>)}</Card></div>);
};

const AdminTutorialTab = ({ appSettings, onUpdateSetting }) => {
  const [url,setUrl]=useState(appSettings?.youtube_tutorial_url||'');const [saving,setSaving]=useState(false);const [msg,setMsg]=useState(null);
  useEffect(()=>{setUrl(appSettings?.youtube_tutorial_url||'');},[appSettings?.youtube_tutorial_url]);
  const getEmbed=(raw)=>{if(!raw)return null;let vid=null;try{const u=new URL(raw);if(u.hostname.includes('youtu.be'))vid=u.pathname.slice(1);else if(u.searchParams.get('v'))vid=u.searchParams.get('v');else if(u.pathname.includes('/embed/'))vid=u.pathname.split('/embed/')[1];}catch{return null;}return vid?`https://www.youtube.com/embed/${vid}`:null;};
  const handleSave=async()=>{setSaving(true);setMsg(null);try{await onUpdateSetting('youtube_tutorial_url',url.trim());setMsg({type:'success',text:'Guardado.'});}catch(err){setMsg({type:'error',text:err.message});}setSaving(false);};
  const handleRemove=async()=>{setSaving(true);try{await onUpdateSetting('youtube_tutorial_url','');setUrl('');setMsg({type:'success',text:'Eliminado.'});}catch(err){setMsg({type:'error',text:err.message});}setSaving(false);};
  const embed=getEmbed(url);
  return (<div className="space-y-4"><h3 className="text-lg font-bold text-gray-700">Tutorial de YouTube</h3>{msg&&<div className={`p-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}<Card><div className="space-y-4"><div className="flex gap-2"><div className="relative flex-1"><Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="url" placeholder="https://www.youtube.com/watch?v=..." className="w-full border p-2.5 pl-9 rounded-lg" value={url} onChange={e=>setUrl(e.target.value)}/></div><button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium shrink-0"><Save size={16}/>{saving?'...':'Guardar'}</button></div>{embed&&<div className="relative w-full bg-black rounded-lg overflow-hidden" style={{paddingTop:'56.25%'}}><iframe src={embed} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div>}{url&&!embed&&<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700"><AlertTriangle size={16} className="inline mr-1"/>URL no válido.</div>}{url&&<button onClick={handleRemove} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"><Trash2 size={14}/> Quitar</button>}</div></Card></div>);
};

// ==========================================
// ADMIN: AVALES
// ==========================================
const AvalesAdminView = ({ avales, updateAval, deleteAval, appSettings }) => {
  const [actionModal,setActionModal]=useState(null);const [editModal,setEditModal]=useState(null);const [deleteModal,setDeleteModal]=useState(null);const [reason,setReason]=useState('');const [correlativoInput,setCorrelativoInput]=useState('');const [deleteReason,setDeleteReason]=useState('');const [editData,setEditData]=useState({});const [saving,setSaving]=useState(false);
  const visibleAvales=avales.filter(a=>!a.is_deleted);
  const openAction=(aval,action)=>{setActionModal({id:aval.id,action,name:aval.applicant_name});setReason('');setCorrelativoInput('');};
  const handleAction=async()=>{if(!reason.trim()){alert('La justificación es obligatoria.');return;}setSaving(true);const updates={status:actionModal.action,approval_reason:reason};if(actionModal.action==='Aprobado'){updates.approval_date=new Date().toISOString().split('T')[0];if(correlativoInput.trim())updates.correlativo=correlativoInput.trim();}await updateAval(actionModal.id,updates);setActionModal(null);setSaving(false);};
  const openEdit=(a)=>{setEditData({id:a.id,status:a.status,approval_reason:a.approval_reason||'',correlativo:a.correlativo||'',approval_date:a.approval_date||''});setEditModal(true);};
  const handleEdit=async()=>{setSaving(true);await updateAval(editData.id,{status:editData.status,approval_reason:editData.approval_reason,correlativo:editData.correlativo,approval_date:editData.approval_date||null});setEditModal(null);setSaving(false);};
  const handleDelete=async()=>{if(!deleteReason.trim()){alert('Debes indicar la razón.');return;}setSaving(true);await deleteAval(deleteModal.id,deleteReason);setDeleteModal(null);setDeleteReason('');setSaving(false);};
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Solicitudes Recibidas</h2>
      {visibleAvales.map(req=>(
        <Card key={req.id}><div className="flex justify-between items-start gap-4"><div className="flex-1"><div className="flex items-center gap-2"><h3 className="font-bold text-lg">{req.applicant_name}</h3><span className="text-xs text-gray-400">#{req.request_number}</span></div><p className="text-gray-600">{req.activity_name}</p>{req.institution&&<p className="text-sm text-gray-500">{req.institution}</p>}<div className="flex items-center gap-3 mt-1 flex-wrap">{req.activity_date&&<span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12}/> {req.activity_date}</span>}{req.email&&<span className="text-xs text-gray-500">{req.email}</span>}{req.correlativo&&<span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">Correlativo: {req.correlativo}</span>}{req.activity_type&&<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{req.activity_type}</span>}{req.modality&&<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{req.modality}</span>}</div>{req.approval_reason&&<p className="text-xs text-gray-500 mt-1 italic">Nota: {req.approval_reason}</p>}{req.form_url?(<a href={`${supabaseUrl}/storage/v1/object/public/avales-files/${req.form_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 text-xs mt-2 hover:underline font-medium"><Download size={12}/> Descargar PDF adjunto</a>):<p className="text-xs text-gray-400 mt-2">Sin archivo adjunto</p>}</div><div className="flex flex-col items-end gap-2 shrink-0"><Badge status={req.status}/>{req.status==='En Proceso'&&(<div className="flex gap-2"><button onClick={()=>openAction(req,'Aprobado')} className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs hover:bg-green-200">Aprobar</button><button onClick={()=>openAction(req,'Rechazado')} className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs hover:bg-red-200">Rechazar</button></div>)}{req.status==='Aprobado'&&(<div className="flex gap-1"><button onClick={()=>openApprovalLetter(req,appSettings,'preview')} className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-100 flex items-center gap-1 font-medium"><Eye size={12}/> Vista Previa</button><button onClick={()=>openApprovalLetter(req,appSettings,'download')} className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-100 flex items-center gap-1 font-medium"><FileDown size={12}/> PDF</button></div>)}<div className="flex gap-2"><button onClick={()=>openEdit(req)} className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-100 flex items-center gap-1"><Edit3 size={12}/> Editar</button><button onClick={()=>{setDeleteModal(req);setDeleteReason('');}} className="bg-gray-50 text-red-500 px-3 py-1 rounded text-xs hover:bg-red-50 flex items-center gap-1"><Trash2 size={12}/> Eliminar</button></div></div></div></Card>
      ))}
      {visibleAvales.length===0&&<div className="text-gray-400 text-center py-10">No hay solicitudes.</div>}
      <Modal isOpen={!!actionModal} onClose={()=>setActionModal(null)} title={actionModal?.action==='Aprobado'?'Aprobar Solicitud':'Rechazar Solicitud'} size="sm"><div className="space-y-4"><p className="text-gray-600">Solicitud de: <strong>{actionModal?.name}</strong></p><div><label className="block text-sm font-bold mb-1">{actionModal?.action==='Aprobado'?'¿Por qué se aprueba?':'¿Por qué se rechaza?'} *</label><textarea required rows={3} className="w-full border p-2 rounded" value={reason} onChange={e=>setReason(e.target.value)}/></div>{actionModal?.action==='Aprobado'&&(<div><label className="block text-sm font-bold mb-1">Número de Correlativo *</label><input required placeholder="Ej: CAEDUC-01-2026" className="w-full border p-2 rounded" value={correlativoInput} onChange={e=>setCorrelativoInput(e.target.value)}/></div>)}<button onClick={handleAction} disabled={saving||!reason.trim()||(actionModal?.action==='Aprobado'&&!correlativoInput.trim())} className={`w-full py-2 rounded font-bold text-white disabled:opacity-50 ${actionModal?.action==='Aprobado'?'bg-green-600 hover:bg-green-700':'bg-red-600 hover:bg-red-700'}`}>{saving?'Guardando...':(actionModal?.action==='Aprobado'?'Confirmar Aprobación':'Confirmar Rechazo')}</button></div></Modal>
      <Modal isOpen={!!editModal} onClose={()=>setEditModal(null)} title="Editar Solicitud" size="sm"><div className="space-y-4"><div><label className="block text-sm font-bold mb-1">Estado</label><select className="w-full border p-2 rounded" value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})}><option value="En Proceso">En Proceso</option><option value="Aprobado">Aprobado</option><option value="Rechazado">Rechazado</option></select></div><div><label className="block text-sm font-bold mb-1">Razón / Notas</label><textarea rows={3} className="w-full border p-2 rounded" value={editData.approval_reason} onChange={e=>setEditData({...editData,approval_reason:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Correlativo</label><input className="w-full border p-2 rounded" value={editData.correlativo} onChange={e=>setEditData({...editData,correlativo:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Fecha de Aprobación</label><input type="date" className="w-full border p-2 rounded" value={editData.approval_date} onChange={e=>setEditData({...editData,approval_date:e.target.value})}/></div><button onClick={handleEdit} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">{saving?'Guardando...':'Guardar Cambios'}</button></div></Modal>
      <Modal isOpen={!!deleteModal} onClose={()=>setDeleteModal(null)} title="Eliminar Solicitud" size="sm"><div className="space-y-4"><div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-red-700 font-medium">¿Eliminar la solicitud de "{deleteModal?.applicant_name}"?</p></div><div><label className="block text-sm font-bold mb-1">¿Por qué se elimina? *</label><textarea required rows={3} className="w-full border p-2 rounded" value={deleteReason} onChange={e=>setDeleteReason(e.target.value)}/></div><button onClick={handleDelete} disabled={saving||!deleteReason.trim()} className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 disabled:opacity-50">{saving?'Eliminando...':'Confirmar Eliminación'}</button></div></Modal>
    </div>
  );
};

// ==========================================
// ADMIN: REPORTES
// ==========================================
const ReportesView = ({ avales, docs, oficios }) => {
  const [showModal,setShowModal]=useState(false);const [dateFrom,setDateFrom]=useState('');const [dateTo,setDateTo]=useState('');const [reportFormat,setReportFormat]=useState('pdf');const [generating,setGenerating]=useState(false);
  const generateReport=async()=>{if(!dateFrom||!dateTo){alert('Selecciona ambas fechas.');return;}setGenerating(true);const filtered=avales.filter(a=>{const d=a.activity_date||a.created_at?.substring(0,10);return d>=dateFrom&&d<=dateTo;});if(filtered.length===0){alert('No hay solicitudes en ese período.');setGenerating(false);return;}if(reportFormat==='excel')generateCSV(filtered);else await generatePDF(filtered);setGenerating(false);setShowModal(false);};
  const generateCSV=(data)=>{const h=['Actividad','Solicitante','Institución','Fecha','Estado','Correlativo','Tipo','Modalidad','Duración','Notas','Razón Eliminación'];const rows=data.map(a=>[a.activity_name||'',a.applicant_name||'',a.institution||'',a.activity_date||'',a.is_deleted?'Eliminado':(a.status||''),a.correlativo||'',a.activity_type||'',a.modality||'',a.duration||'',a.approval_reason||'',a.deletion_reason||'']);const csv=[h,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`reporte_avales_${dateFrom}_${dateTo}.csv`;a.click();};
  const generatePDF=async(data)=>{const rows=data.map(a=>`<tr><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.activity_name||''}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.applicant_name||''}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.institution||''}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.activity_date||''}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;font-weight:bold;color:${a.is_deleted?'#666':a.status==='Aprobado'?'#16a34a':a.status==='Rechazado'?'#dc2626':'#2563eb'}">${a.is_deleted?'Eliminado':(a.status||'')}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.correlativo||'—'}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.activity_type||'—'}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.approval_reason||'—'}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.deletion_reason||'—'}</td></tr>`).join('');const html=`<div style="font-family:Arial;padding:30px;background:white;width:10in;"><h1 style="color:#1e3a5f;font-size:20px;">Reporte de Avales — CAEDUC</h1><p style="color:#666;font-size:12px;">Período: ${dateFrom} al ${dateTo} | Total: ${data.length}</p><table style="width:100%;border-collapse:collapse;margin-top:10px;"><thead><tr style="background:#1e3a5f;color:white;"><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Actividad</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Solicitante</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Institución</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Fecha</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Estado</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Correlativo</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Tipo</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Notas</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Razón Elim.</th></tr></thead><tbody>${rows}</tbody></table><p style="color:#999;font-size:10px;margin-top:20px;">Generado: ${new Date().toLocaleString()}</p></div>`;await downloadPDF(html,`Reporte_Avales_${dateFrom}_${dateTo}`);};
  const active=avales.filter(a=>!a.is_deleted);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Reportes e Historial</h2><button onClick={()=>setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium"><FileSpreadsheet size={18}/> Generar Reporte</button></div>
      <div className="grid grid-cols-4 gap-4">
        <Card><div className="text-center"><p className="text-3xl font-bold text-blue-700">{avales.length}</p><p className="text-sm text-gray-500">Total Avales</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-bold text-green-600">{active.filter(a=>a.status==='Aprobado').length}</p><p className="text-sm text-gray-500">Aprobadas</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-bold text-red-600">{active.filter(a=>a.status==='Rechazado').length}</p><p className="text-sm text-gray-500">Rechazadas</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-bold text-indigo-600">{oficios.length}</p><p className="text-sm text-gray-500">Oficios</p></div></Card>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card><h3 className="font-bold mb-2 text-indigo-700">Avales ({active.length})</h3><div className="h-64 overflow-y-auto text-sm border-t pt-2">{active.map(a=>(<div key={a.id} className="border-b py-2 flex justify-between items-center"><div><span className="font-medium">{a.activity_name}</span><span className="text-gray-400 text-xs ml-2">#{a.request_number}</span>{a.correlativo&&<span className="text-indigo-600 text-xs ml-2">[{a.correlativo}]</span>}</div><Badge status={a.status}/></div>))}{active.length===0&&<p className="text-gray-400 text-center py-8">Sin avales</p>}</div></Card>
        <Card><h3 className="font-bold mb-2 text-indigo-700">Oficios ({oficios.length})</h3><div className="h-64 overflow-y-auto text-sm border-t pt-2">{oficios.map(o=>(<div key={o.id} className="border-b py-2 flex justify-between items-center"><div><span className="font-semibold">{o.numero_oficio}</span><span className="text-gray-400 text-xs ml-2">{o.fecha}</span>{o.actividad_nombre&&<span className="text-blue-500 text-xs ml-2">{o.actividad_nombre}</span>}</div><Badge status={o.estado}/></div>))}{oficios.length===0&&<p className="text-gray-400 text-center py-8">Sin oficios</p>}</div></Card>
      </div>
      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Generar Reporte" size="sm">
        <div className="space-y-4"><div><label className="block text-sm font-bold mb-1">Fecha Inicio</label><input type="date" className="w-full border p-2 rounded" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div><div><label className="block text-sm font-bold mb-1">Fecha Fin</label><input type="date" className="w-full border p-2 rounded" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div><div><label className="block text-sm font-bold mb-1">Formato</label><div className="flex gap-3"><label className={`flex-1 border rounded-lg p-3 cursor-pointer text-center transition-all ${reportFormat==='pdf'?'border-blue-500 bg-blue-50 text-blue-700':'border-gray-200'}`}><input type="radio" name="fmt" value="pdf" checked={reportFormat==='pdf'} onChange={()=>setReportFormat('pdf')} className="sr-only"/><FileText size={20} className="mx-auto mb-1"/><span className="text-sm font-medium">PDF</span></label><label className={`flex-1 border rounded-lg p-3 cursor-pointer text-center transition-all ${reportFormat==='excel'?'border-green-500 bg-green-50 text-green-700':'border-gray-200'}`}><input type="radio" name="fmt" value="excel" checked={reportFormat==='excel'} onChange={()=>setReportFormat('excel')} className="sr-only"/><FileSpreadsheet size={20} className="mx-auto mb-1"/><span className="text-sm font-medium">Excel (CSV)</span></label></div></div><button onClick={generateReport} disabled={generating} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{generating?'Generando...':'Generar Reporte'}</button></div>
      </Modal>
    </div>
  );
};

// ==========================================
// SIDEBAR
// ==========================================
const Sidebar = ({ isOpen, toggle, current, setModule, logout }) => (
  <div className={`bg-slate-800 text-white fixed h-full z-20 transition-all ${isOpen?'w-64':'w-20'}`}>
    <div className="p-4 flex justify-between border-b border-slate-700">{isOpen&&<h1 className="font-bold">CAEDUC App</h1>}<button onClick={toggle}><Menu size={20}/></button></div>
    <nav className="p-2 space-y-2 mt-4">
      <SidebarBtn icon={<CheckCircle/>} label="Planificación" active={current==='planificacion'} onClick={()=>setModule('planificacion')} isOpen={isOpen}/>
      <SidebarBtn icon={<Users/>} label="Avales" active={current==='avales'} onClick={()=>setModule('avales')} isOpen={isOpen}/>
      <SidebarBtn icon={<FileSignature/>} label="Oficios" active={current==='oficios'} onClick={()=>setModule('oficios')} isOpen={isOpen}/>
      <SidebarBtn icon={<BookOpen/>} label="Agendas" active={current==='agendas'} onClick={()=>setModule('agendas')} isOpen={isOpen}/>
      <SidebarBtn icon={<Clock/>} label="Reportes" active={current==='reportes'} onClick={()=>setModule('reportes')} isOpen={isOpen}/>
      <SidebarBtn icon={<Settings/>} label="Admin" active={current==='admin_config'} onClick={()=>setModule('admin_config')} isOpen={isOpen}/>
    </nav>
    <button onClick={logout} className="absolute bottom-4 left-4 flex gap-2 text-red-300 hover:text-white"><LogOut/> {isOpen&&"Salir"}</button>
  </div>
);

const SidebarBtn = ({ icon, label, active, onClick, isOpen }) => (
  <button onClick={onClick} className={`flex items-center gap-3 p-3 w-full rounded ${active?'bg-blue-600':'hover:bg-slate-700'}`}>{icon} {isOpen&&<span>{label}</span>}</button>
);

// ==========================================
// APP PRINCIPAL
// ==========================================
export default function CAEDUCApp() {
  const [session,setSession]=useState(null);const [userMode,setUserMode]=useState('public');const [currentModule,setCurrentModule]=useState('planificacion');const [isSidebarOpen,setSidebarOpen]=useState(true);const [loading,setLoading]=useState(false);const [authError,setAuthError]=useState(null);const [activities,setActivities]=useState([]);const [avales,setAvales]=useState([]);const [members,setMembers]=useState([]);const [internalDocs,setInternalDocs]=useState([]);const [oficios,setOficios]=useState([]);const [appSettings,setAppSettings]=useState({});const [oficioPreFill,setOficioPreFill]=useState(null);

  const fetchPublicSettings=useCallback(async()=>{try{const{data}=await supabase.from('app_settings').select('key, value');if(data){const m={};data.forEach(r=>{m[r.key]=r.value;});setAppSettings(m);}}catch(e){console.error(e);}},[]); 

  useEffect(()=>{fetchPublicSettings();supabase.auth.getSession().then(({data:{session}})=>{setSession(session);if(session){setUserMode('admin');fetchData();}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{setSession(session);if(session){setUserMode('admin');fetchData();}else setUserMode('public');});return()=>subscription.unsubscribe();},[fetchPublicSettings]);

  const fetchData=async()=>{setLoading(true);try{const{data:act}=await supabase.from('activities').select('*').order('created_at',{ascending:false});const{data:avl}=await supabase.from('avales').select('*').order('created_at',{ascending:false});const{data:mem}=await supabase.from('profiles').select('*');const{data:docs}=await supabase.from('internal_documents').select('*');const{data:ofi}=await supabase.from('oficios').select('*').order('created_at',{ascending:false});const{data:settings}=await supabase.from('app_settings').select('key, value');if(act)setActivities(act);if(avl)setAvales(avl);if(mem)setMembers(mem);if(docs)setInternalDocs(docs);if(ofi)setOficios(ofi);if(settings){const m={};settings.forEach(r=>{m[r.key]=r.value;});setAppSettings(m);}}catch(e){console.error(e);}setLoading(false);};

  const handleLogin=async(email,password)=>{setLoading(true);setAuthError(null);const{data,error}=await supabase.auth.signInWithPassword({email,password});if(error)setAuthError(error.message);else{setSession(data.session);setUserMode('admin');fetchData();}setLoading(false);};
  const handleLogout=async()=>{await supabase.auth.signOut();setSession(null);setUserMode('public');setAuthError(null);};

  const submitAval=async(formData,file1)=>{let formUrl=null;if(file1){const{data:f1,error:ue}=await supabase.storage.from('avales-files').upload(`forms/${Date.now()}_${file1.name}`,file1);if(ue){alert("Error archivo: "+ue.message);return null;}if(f1)formUrl=f1.path;}const{data:inserted,error}=await supabase.from('avales').insert([{applicant_name:formData.applicantName,institution:formData.institution,activity_name:formData.activityName,activity_date:formData.activityDate,email:formData.email,activity_type:formData.activityType,duration:formData.duration,modality:formData.modality,schedule:formData.schedule,platform:formData.platform,topic:formData.topic,target_audience:formData.targetAudience,form_url:formUrl,status:'En Proceso'}]).select('request_number');if(error){alert(error.message);return null;}return inserted?.[0]?.request_number||null;};

  const updateAval=async(id,updates)=>{const{error}=await supabase.from('avales').update(updates).eq('id',id);if(error)alert(error.message);else fetchData();};
  const deleteAval=async(id,reason)=>{const{error}=await supabase.from('avales').update({is_deleted:true,deletion_reason:reason}).eq('id',id);if(error)alert(error.message);else fetchData();};
  const updateMember=async(id,updates)=>{const{error}=await supabase.from('profiles').update(updates).eq('id',id);if(error)throw error;else await fetchData();};
  const updateSetting=async(key,value)=>{const{error}=await supabase.from('app_settings').update({value,updated_at:new Date().toISOString()}).eq('key',key);if(error){const{error:ie}=await supabase.from('app_settings').insert([{key,value}]);if(ie)throw ie;}setAppSettings(prev=>({...prev,[key]:value}));};

  const createOficio=async(data)=>{const{error}=await supabase.from('oficios').insert([data]);if(error){alert('Error al crear oficio: '+error.message);return;}fetchData();};
  const updateOficio=async(id,data)=>{
    const{estado,...rest}=data;
    // Track edit if the oficio was archived
    let editFields={};
    const existing=oficios.find(o=>o.id===id);
    if(existing&&existing.estado==='Archivado'){
      const{data:userData}=await supabase.auth.getUser();
      const userName=userData?.user?.email||'usuario';
      editFields={
        ultima_edicion_en:new Date().toISOString(),
        ultima_edicion_por:userName,
        ultima_edicion_razon:data.ultima_edicion_razon||'Editado manualmente',
      };
    }
    const{error}=await supabase.from('oficios').update({...rest,estado,updated_at:new Date().toISOString(),...editFields}).eq('id',id);
    if(error){alert('Error al actualizar: '+error.message);return;}
    fetchData();
  };
  const deleteOficio=async(id)=>{const{error}=await supabase.from('oficios').delete().eq('id',id);if(error){alert('Error al eliminar: '+error.message);return;}fetchData();};

  const handleNavigateToOficios=(activityData)=>{setOficioPreFill({actividad_nombre:activityData.actividad||'',actividad_tipo:activityData.tipo||'',actividad_fecha:activityData.fecha||'',actividad_duracion:'',actividad_modalidad:activityData.sede_modalidad||'',actividad_sede:activityData.t3_lugar||activityData.sede_modalidad||'',_source_trimestre:activityData.trimestre||'',_source_area:activityData.area||''});setCurrentModule('oficios');};

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800">
      {userMode==='admin'&&(
        <Sidebar isOpen={isSidebarOpen} toggle={()=>setSidebarOpen(!isSidebarOpen)}
          current={currentModule}
          setModule={(mod)=>{if(mod!=='oficios')setOficioPreFill(null);setCurrentModule(mod);}}
          logout={handleLogout}/>
      )}
      <main className={`flex-1 p-4 md:p-8 transition-all ${userMode==='admin'?(isSidebarOpen?'ml-64':'ml-20'):''}`} style={{overflowX:'hidden',minWidth:0}}>
        {userMode==='public'&&<LoginView handleLogin={handleLogin} loading={loading} authError={authError} setUserMode={setUserMode} appSettings={appSettings}/>}
        {userMode==='external'&&<ExternalAvalesView submitAval={submitAval} onBack={()=>setUserMode('public')} appSettings={appSettings}/>}
        {userMode==='consultar_estado'&&<ConsultarEstadoView onBack={()=>setUserMode('public')} appSettings={appSettings}/>}
        {userMode==='verificar_aval'&&<VerificarAvalView onBack={()=>setUserMode('public')}/>}
        {userMode==='admin'&&(
          <>
            {(currentModule==='planificacion'||currentModule==='dashboard')&&(
              <PlanificacionCAEDUCView onNavigateOficios={handleNavigateToOficios}/>
            )}
            {currentModule==='avales'&&(
              <AvalesAdminView avales={avales} updateAval={updateAval} deleteAval={deleteAval} appSettings={appSettings}/>
            )}
            {currentModule==='oficios'&&(
              <OficiosAdminView oficios={oficios} onCreateOficio={createOficio} onUpdateOficio={updateOficio} onDeleteOficio={deleteOficio} appSettings={appSettings} preFillData={oficioPreFill} onClearPreFill={()=>setOficioPreFill(null)}/>
            )}
            {currentModule==='agendas'&&(
              <AgendasView/>
            )}
            {currentModule==='reportes'&&(
              <ReportesView avales={avales} docs={internalDocs} oficios={oficios}/>
            )}
            {currentModule==='admin_config'&&(
              <AdminConfigView appSettings={appSettings} onUpdateSetting={updateSetting} members={members} onUpdateMember={updateMember}/>
            )}
          </>
        )}
      </main>
    </div>
  );
}
