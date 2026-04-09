import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Calendar, FileText, Users, Settings, Menu, X, CheckCircle, Clock,
  AlertCircle, Download, LogOut, Plus, ExternalLink, Youtube, Lock,
  FileSignature, Upload, Save, AlertTriangle, FileSpreadsheet,
  UserPlus, Link2, File, Trash2, Eye, EyeOff, Play, RefreshCw,
  Search, Edit3, Hash, ClipboardCheck, ArrowLeft, Shield, BookOpen,
  Printer, FileDown, Send, Archive, FilePlus, Copy, ChevronDown, Mail, Gift
} from 'lucide-react';
import PlanificacionCAEDUCView from './PlanificacionCAEDUCView';
import AgendasView from './AgendasView';
import DirectorioView from './DirectorioView';
import CartasSection from './CartasView';
import SouvenirsView from './SouvenirsView';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Construye URL de storage soportando paths relativos Y URLs completas (post-migración)
const buildStorageUrl = (path, bucket) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CAEDUC: Variables de entorno faltantes. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel.');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// ── Error Boundary para diagnóstico ──────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }
  componentDidCatch(error, info) { this.setState({ error, info }); }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:'40px',fontFamily:'monospace',background:'#fff3f3',minHeight:'100vh'}}>
          <h1 style={{color:'#dc2626',fontSize:'24px',marginBottom:'16px'}}>⚠️ Error de la aplicación</h1>
          <p style={{color:'#dc2626',fontWeight:'bold',marginBottom:'8px'}}>{this.state.error?.toString()}</p>
          <pre style={{background:'#fee2e2',padding:'16px',borderRadius:'8px',overflow:'auto',fontSize:'12px',color:'#7f1d1d'}}>
            {this.state.info?.componentStack}
          </pre>
          <p style={{marginTop:'16px',color:'#666',fontSize:'12px'}}>
            Toma captura de este error y compártelo para diagnóstico.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}


const ROLES = ['Coordinador(a)','Subcoordinador(a)','Secretario(a)','Prosecretario(a)','Gestor(a) del Conocimiento','Vocal I','Vocal II','Asistente JD','Junta Directiva'];
const ACTIVITY_TYPES = ['Certificación','Diplomado','Taller','Conferencia','Seminario','Congreso','Curso','Simposio','Foro','Jornada','Otro'];
const MODALITIES = ['Virtual','Presencial','Híbrida'];
const MOTIVOS_OFICIO = [
  'Aprobación y asignación de recursos para realizar actividad',
  'Solicitud de salón y equipo audiovisual',
  'Solicitud de materiales e insumos',
  'Informe de actividad realizada',
  'Solicitud de difusión institucional',
  'Otro (personalizado)'
];

// ── PDF utilities ──────────────────────────────────────────────────────────────
const imgToBase64 = (url) => new Promise((resolve) => {
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

const convertImagesToBase64 = async (html) => {
  const urls = new Set();
  let m; const re = /src="(https?:\/\/[^"]+)"/g;
  while ((m = re.exec(html)) !== null) urls.add(m[1]);
  if (!urls.size) return html;
  const map = {};
  await Promise.all([...urls].map(async (u) => { map[u] = await imgToBase64(u); }));
  let result = html;
  for (const [u, b64] of Object.entries(map)) {
    if (b64 && b64.startsWith('data:')) result = result.split(u).join(b64);
  }
  return result;
};

const loadHtml2Pdf = () => new Promise((resolve, reject) => {
  if (window.html2pdf) { resolve(window.html2pdf); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
  s.onload = () => resolve(window.html2pdf);
  s.onerror = () => reject(new Error('No se pudo cargar html2pdf'));
  document.head.appendChild(s);
});

const downloadPDF = async (htmlContent, filename) => {
  try {
    const html2pdf = await loadHtml2Pdf();
    const safeHtml = await convertImagesToBase64(htmlContent);
    const overlay = document.createElement('div');
    overlay.id = 'pdf-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.97);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
    overlay.innerHTML = '<div style="width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:pdfspin 0.8s linear infinite;"></div><p style="font-size:15px;color:#374151;font-weight:600;">Generando PDF...</p><style>@keyframes pdfspin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(overlay);
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:816px;max-width:816px;background:white;z-index:99998;overflow:hidden;';
    document.body.appendChild(container);
    container.innerHTML = safeHtml;
    await new Promise(r => setTimeout(r, 1200));
    const safeName = filename.replace(/[^a-zA-Z0-9_\-áéíóúñÁÉÍÓÚÑ ]/g, '') + '.pdf';
    await html2pdf().set({
      margin: 0, filename: safeName,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, scrollX: 0, scrollY: 0, width: 816, height: container.scrollHeight },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(container).save();
    if (container.parentNode) document.body.removeChild(container);
    if (overlay.parentNode) document.body.removeChild(overlay);
  } catch (err) {
    console.error('Error generando PDF:', err);
    ['pdf-overlay'].forEach(id => { const el = document.getElementById(id); if (el) el.parentNode.removeChild(el); });
    alert('Error al generar el PDF. Intenta de nuevo.');
  }
};

const previewHTML = (html) => {
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else alert('Permite las ventanas emergentes para ver la vista previa.');
};

// ── Carta de aprobación ────────────────────────────────────────────────────────
const generateApprovalLetterHTML = (aval, settings = {}) => {
  const f1Name = settings.firmante1_nombre || 'M. A. Juan J. Reyes';
  const f1Cargo = settings.firmante1_cargo || 'Coordinador';
  const f1FirmaUrl = buildStorageUrl(settings.firmante1_firma_path, 'firmas-sellos');
  const f2Name = settings.firmante2_nombre || 'Mgtr. Luisa Mazariegos';
  const f2Cargo = settings.firmante2_cargo || 'Secretaria';
  const f2FirmaUrl = buildStorageUrl(settings.firmante2_firma_path, 'firmas-sellos');
  const selloUrl = buildStorageUrl(settings.sello_path, 'firmas-sellos');
  const logoUrl = buildStorageUrl(settings.logo_path, 'firmas-sellos');
  const fmtDate = (ds) => { if (!ds) return '—'; const mo=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']; const d=new Date(ds+'T12:00:00'); return `${d.getDate()} de ${mo[d.getMonth()]} de ${d.getFullYear()}`; };
  const fmtReq = (ds) => { if (!ds) return '—'; const mo=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']; const d=new Date(ds); return `${String(d.getDate()).padStart(2,'0')} de ${mo[d.getMonth()]} de ${d.getFullYear()}`; };
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Aprobación ${aval.correlativo||''}</title><style>@page{size:letter;margin:0;}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#333;background:white;}.page{width:8.5in;height:11in;margin:0 auto;padding:0;position:relative;background:white;overflow:hidden;}.deco-left{position:absolute;left:0;top:200px;width:18px;height:300px;}.deco-left div{width:8px;margin-bottom:4px;border-radius:4px;}.deco-left div:nth-child(1){height:60px;background:#E91E63;}.deco-left div:nth-child(2){height:60px;background:#9C27B0;}.deco-left div:nth-child(3){height:60px;background:#2196F3;}.deco-left div:nth-child(4){height:60px;background:#4CAF50;}.content{padding:50px 70px 40px 70px;position:relative;z-index:1;}.title{text-align:center;font-size:24px;font-weight:800;color:#1a5276;letter-spacing:2px;margin:20px 0 30px 0;}.footer{position:absolute;bottom:0;left:0;right:0;border-top:2px solid #eee;padding:15px 30px;display:flex;justify-content:space-between;font-size:8.5px;color:#777;background:white;}.footer-col{text-align:center;flex:1;padding:0 5px;}.footer-col strong{display:block;color:#1a5276;font-size:9px;margin-bottom:2px;}.footer-bottom{position:absolute;bottom:5px;left:0;right:0;text-align:center;font-size:9px;color:#1a5276;font-weight:600;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body><div class="page"><div class="deco-left"><div></div><div></div><div></div><div></div></div><div class="content">${logoUrl?`<img src="${logoUrl}" alt="Logo" style="height:90px;width:auto;"/>`:'<div></div>'}<div class="title">APROBACIÓN DE AVAL</div><div style="text-align:right;color:#E91E63;font-weight:600;margin-bottom:25px;font-size:14px;">Guatemala, ${fmtDate(aval.approval_date)}</div><div style="margin-bottom:25px;font-size:14px;line-height:1.6;">Estimado(a) <span style="color:#E91E63;font-weight:600;">${aval.applicant_name||'—'}</span><br><span style="color:#E91E63;font-weight:600;">${aval.institution||''}</span></div><p style="font-size:13.5px;line-height:1.8;text-align:justify;margin-bottom:15px;">Reciban un cordial saludo por parte de la Comisión de Acreditación y Educación Continua - CAEDUC-.</p><p style="font-size:13.5px;line-height:1.8;text-align:justify;margin-bottom:15px;">Por medio de la presente carta se extiende la aprobación a su solicitud recibida el <span style="color:#E91E63;font-weight:700;">${fmtReq(aval.created_at)}</span>, con el Aval <span style="color:#E91E63;font-weight:700;">${aval.correlativo||'—'}</span>.</p><div style="margin:15px 0 20px 0;font-size:13.5px;line-height:2;"><div><span style="font-weight:600;">Actividad:</span> <span style="color:#E91E63;font-weight:600;">${aval.activity_type||'—'}</span></div><div><span style="font-weight:600;">Duración:</span> <span style="color:#E91E63;font-weight:600;">${aval.duration||'—'}</span></div><div><span style="font-weight:600;">Modalidad:</span> <span style="color:#E91E63;font-weight:600;">${aval.modality||'—'}</span></div><div><span style="font-weight:600;">Fecha y hora:</span> <span style="color:#E91E63;font-weight:600;">${aval.schedule||aval.activity_date||'—'}</span></div><div><span style="font-weight:600;">Lugar/Plataforma:</span> <span style="color:#E91E63;font-weight:600;">${aval.platform||'—'}</span></div><div><span style="font-weight:600;">Tema:</span> <span style="color:#E91E63;font-weight:600;">${aval.topic||aval.activity_name||'—'}</span></div></div><p style="font-size:13.5px;line-height:1.8;text-align:justify;margin-top:15px;">Agradecemos su trabajo y esfuerzo en la promoción del crecimiento continuo de los profesionales. Solicitamos incluir el número de AVAL en el material correspondiente.</p><div style="margin-top:30px;display:flex;justify-content:space-between;align-items:flex-end;">${f1FirmaUrl?`<div style="text-align:center;"><img src="${f1FirmaUrl}" alt="Firma" style="height:70px;width:auto;display:block;margin:0 auto -8px;"/><div style="width:220px;border-top:1px solid #333;padding-top:5px;"><div style="font-weight:700;font-size:13px;">${f1Name}</div><div style="font-size:12px;color:#555;">${f1Cargo} – CAEDUC</div></div></div>`:'<div></div>'}<div>${selloUrl?`<img src="${selloUrl}" alt="Sello" style="height:110px;width:auto;opacity:0.85;"/>`:'<div></div>'}</div>${f2FirmaUrl?`<div style="text-align:center;"><img src="${f2FirmaUrl}" alt="Firma" style="height:70px;width:auto;display:block;margin:0 auto -8px;"/><div style="width:220px;border-top:1px solid #333;padding-top:5px;"><div style="font-weight:700;font-size:13px;">${f2Name}</div><div style="font-size:12px;color:#555;">${f2Cargo} – CAEDUC</div></div></div>`:'<div></div>'}</div></div><div class="footer"><div class="footer-col"><strong>Sede central</strong>3ra Calle 6-63 Zona 9<br>+(502) 2218-3400<br>info@colegiodepsicologos.org.gt</div><div class="footer-col"><strong>Sub Sede Cobán</strong>Plaza Magdalena, 1er Nivel Of. 105<br>+(502) 7764-7109</div><div class="footer-col"><strong>Sub Sede Zacapa</strong>4a. Calle 10-34 Zona 1<br>+(502) 7941-0587</div><div class="footer-col"><strong>Sub Sede Quetzaltenango</strong>Diagonal 15, 29-91 Zona 1<br>+(502) 7767-3314</div></div><div class="footer-bottom">colegiodepsicologos.org.gt • @colpsicogt</div></div></body></html>`;
};

const openApprovalLetter = async (aval, settings = {}, mode = 'download') => {
  const html = generateApprovalLetterHTML(aval, settings);
  if (mode === 'preview') previewHTML(html);
  else await downloadPDF(html, `Aprobacion_Aval_${aval.correlativo || aval.request_number || 'CAEDUC'}`);
};

// ── Oficio ─────────────────────────────────────────────────────────────────────
const formatOficioDate = (ds) => {
  if (!ds) return '—';
  const mo = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = new Date(ds + 'T12:00:00');
  return `${d.getDate()} de ${mo[d.getMonth()]} de ${d.getFullYear()}`;
};

const generateOficioHTML = (oficio, settings = {}) => {
  const f1Name  = settings.firmante1_nombre || 'M. A. Juan J. Reyes';
  const f1Cargo = settings.firmante1_cargo  || 'Coordinador';
  const f1Inst  = settings.firmante1_institucion || 'Comisión de Acreditación Educación Continua, Colegio de Psicólogos de Guatemala';
  const f1FirmaUrl = buildStorageUrl(settings.firmante1_firma_path, 'firmas-sellos');
  const selloUrl   = buildStorageUrl(settings.sello_path, 'firmas-sellos');
  const membreteUrl = settings.membrete_path
    ? buildStorageUrl(settings.membrete_path, 'firmas-sellos')
    : '/fondo-oficios.jpg';
  const instLines = f1Inst.split(',').map(s => s.trim()).filter(Boolean);
  const isRecursos = (oficio.motivo || '').includes('recursos') || (oficio.motivo || '').includes('Aprobación');
  const parrafo = (txt) => `<p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 10px 0;word-wrap:break-word;">${txt}</p>`;
  let cuerpoHTML = '';
  if (oficio.cuerpo_personalizado) {
    cuerpoHTML = oficio.cuerpo_personalizado.split('\n').filter(l => l.trim()).map(p => parrafo(p)).join('');
  } else if (isRecursos && oficio.actividad_nombre) {
    cuerpoHTML = parrafo(`Por este medio, la Comisión de Acreditación y Educación Continua (CAEDUC) solicita respetuosamente la aprobación y asignación de recursos para realizar la ${oficio.actividad_tipo ? oficio.actividad_tipo.toLowerCase() : 'actividad'} ${oficio.actividad_modalidad ? oficio.actividad_modalidad.toLowerCase() : ''} titulada <strong>"${oficio.actividad_nombre}"</strong>.${oficio.actividad_descripcion ? ' ' + oficio.actividad_descripcion : ''}`);
  } else {
    cuerpoHTML = parrafo(`Por este medio, la Comisión de Acreditación y Educación Continua (CAEDUC) se dirige a ustedes para: <strong>${oficio.motivo || '—'}</strong>.`);
  }
  const dr = (label, val) => val ? `<tr><td style="font-weight:600;font-size:11px;padding:2px 10px 2px 0;white-space:nowrap;">${label}:</td><td style="font-size:11px;padding:2px 0;">${val}</td></tr>` : '';
  let detallesHTML = '';
  if (oficio.actividad_nombre && (oficio.actividad_tipo || oficio.actividad_fecha)) {
    detallesHTML = `<table style="margin:10px 0;border-collapse:collapse;">${dr('Tipo',oficio.actividad_tipo)}${dr('Modalidad',oficio.actividad_modalidad)}${dr('Duración',oficio.actividad_duracion)}${dr('Fecha',oficio.actividad_fecha)}${dr('Sede',oficio.actividad_sede)}</table>`;
  }
  let recursosHTML = oficio.monto ? `<div style="margin-top:12px;"><p style="font-size:10px;font-weight:700;color:#1a5276;text-transform:uppercase;margin-bottom:5px;">Recursos solicitados</p>${parrafo(`Honorarios: <strong>${oficio.monto}</strong>${oficio.monto_detalle ? '. ' + oficio.monto_detalle : '.'}`)}</div>` : '';
  let justHTML = oficio.justificacion ? `<div style="margin-top:12px;"><p style="font-size:10px;font-weight:700;color:#1a5276;text-transform:uppercase;margin-bottom:5px;">Justificación técnica</p>${oficio.justificacion.split('\n').filter(l=>l.trim()).map(p=>parrafo(p)).join('')}</div>` : '';
  let solHTML = oficio.solicitud_puntual ? `<div style="margin-top:12px;"><p style="font-size:10px;font-weight:700;color:#1a5276;text-transform:uppercase;margin-bottom:5px;">Solicitud puntual</p><ul style="padding-left:16px;margin:0;">${oficio.solicitud_puntual.split('\n').filter(l=>l.trim()).map(p=>`<li style="font-size:11.5px;line-height:1.75;margin-bottom:3px;">${p}</li>`).join('')}</ul></div>` : '';
  const firmaBlock = `<div style="margin-top:20px;text-align:center;"><p style="font-size:11.5px;margin-bottom:16px;">Cordialmente,</p><div style="display:inline-flex;align-items:flex-end;gap:20px;">${f1FirmaUrl?`<div style="text-align:center;"><img src="${f1FirmaUrl}" alt="Firma" style="height:55px;width:auto;display:block;margin:0 auto -4px;"/><div style="width:200px;border-top:1.5px solid #333;padding-top:4px;"><div style="font-size:11.5px;font-weight:700;">${f1Name}</div><div style="font-size:10.5px;color:#555;">${f1Cargo}</div>${instLines.map(l=>`<div style="font-size:10px;color:#666;">${l}</div>`).join('')}</div></div>`:'<div></div>'}${selloUrl?`<div style="margin-bottom:10px;"><img src="${selloUrl}" alt="Sello" style="height:80px;width:auto;opacity:0.88;"/></div>`:''}</div></div><p style="font-size:10px;color:#888;margin-top:10px;">C.C: Archivo / CAEDUC</p>`;
  const footerHTML = `<div style="border-top:2px solid #E91E63;padding-top:10px;display:flex;justify-content:space-between;font-size:8px;color:#777;gap:8px;"><div style="flex:1;text-align:center;"><strong style="display:block;color:#1a5276;font-size:8.5px;margin-bottom:2px;">Sede central</strong>3ra Calle 6-63 Zona 9<br>+(502) 2218-3400<br>info@colegiodepsicologos.org.gt</div><div style="flex:1;text-align:center;"><strong style="display:block;color:#1a5276;font-size:8.5px;margin-bottom:2px;">Sub Sede Cobán</strong>Plaza Magdalena, 1er Nivel<br>+(502) 7764-7109</div><div style="flex:1;text-align:center;"><strong style="display:block;color:#1a5276;font-size:8.5px;margin-bottom:2px;">Sub Sede Zacapa</strong>4a. Calle 10-34 Zona 1<br>+(502) 7941-0587</div><div style="flex:1;text-align:center;"><strong style="display:block;color:#1a5276;font-size:8.5px;margin-bottom:2px;">Sub Sede Quetzaltenango</strong>Diagonal 15, 29-91 Zona 1<br>+(502) 7767-3314</div></div><p style="text-align:center;font-size:8.5px;color:white;background:#E91E63;padding:3px 0;margin:0;">colegiodepsicologos.org.gt • @colpsicogt</p>`;
  const mainPage = `<div style="position:relative;width:8.5in;min-height:11in;font-family:'Segoe UI',Arial,sans-serif;color:#333;background:white;page-break-after:always;box-sizing:border-box;"><img src="${membreteUrl}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;"/><div style="position:relative;z-index:1;padding:1.35in 0.75in 1.9in 0.9in;min-height:11in;box-sizing:border-box;display:flex;flex-direction:column;"><div style="flex:1;"><div style="text-align:right;margin-bottom:18px;"><div style="font-size:12px;font-weight:700;color:#111;">${oficio.numero_oficio||'Of. ___.CAEDUC'}</div><div style="font-size:11.5px;color:#555;margin-top:1px;">Guatemala ${formatOficioDate(oficio.fecha)}</div></div><div style="margin-bottom:15px;font-size:11.5px;line-height:1.7;">${(oficio.dirigido_a||'').split(',').map(l=>l.trim()).filter(Boolean).join('<br>')}<br>Presente</div><p style="font-size:11.5px;font-weight:700;margin-bottom:12px;">Honorables miembros de la Junta Directiva:</p>${cuerpoHTML}${detallesHTML}${parrafo('Agradeciendo su tiempo a la presente solicitud y quedando a su disposición para cualquier consulta adicional.')}<p style="font-size:11.5px;margin-bottom:0;">Sin otro particular, me suscribo.</p>${firmaBlock}</div></div></div>`;
  const hasExtra = oficio.justificacion || oficio.solicitud_puntual || oficio.monto;
  const extraPage = hasExtra ? `<div style="position:relative;width:8.5in;min-height:11in;font-family:'Segoe UI',Arial,sans-serif;color:#333;background:white;box-sizing:border-box;"><img src="${membreteUrl}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;"/><div style="position:relative;z-index:1;padding:1.35in 0.75in 1.9in 0.9in;box-sizing:border-box;"><h2 style="font-size:14px;font-weight:800;color:#1a5276;text-align:center;margin:0 0 5px;">Justificación técnica y aporte gremial</h2>${oficio.actividad_nombre?`<h3 style="font-size:12px;font-weight:600;color:#374151;text-align:center;margin:0 0 16px;">${oficio.actividad_nombre}</h3>`:''} ${justHTML}${recursosHTML}${solHTML}${parrafo('Agradecemos de antemano su atención y quedamos a su disposición para ampliar detalles técnicos, perfil del ponente y cronograma operativo.')}</div></div>` : '';
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Oficio ${oficio.numero_oficio||''}</title><style>@page{size:letter;margin:0;}*{margin:0;padding:0;box-sizing:border-box;}body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact;}@media print{body{-webkit-print-color-adjust:exact;}}</style></head><body>${mainPage}${extraPage}</body></html>`;
};

const openOficioLetter = async (oficio, settings = {}, mode = 'download') => {
  const html = generateOficioHTML(oficio, settings);
  if (mode === 'preview') previewHTML(html);
  else await downloadPDF(html, `Oficio_${(oficio.numero_oficio || 'CAEDUC').replace(/\s+/g, '_')}`);
};

// ── UI Components ──────────────────────────────────────────────────────────────
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className={`bg-white rounded-lg shadow-xl w-full ${sizes[size]} m-auto`}>
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose}><X size={24} className="text-gray-500 hover:text-red-500" /></button>
        </div>
        <div className="p-6 max-h-screen-80 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden ${className}`}>
    <div className="p-6">{children}</div>
  </div>
);

const Badge = ({ status }) => {
  const colors = {
    'Pendiente':'bg-yellow-100 text-yellow-800','En Proceso':'bg-blue-100 text-blue-800',
    'Aprobado':'bg-green-100 text-green-800','Rechazado':'bg-red-100 text-red-800',
    'Eliminado':'bg-gray-200 text-gray-600','Finalizado':'bg-gray-100 text-gray-800',
    'Borrador':'bg-yellow-100 text-yellow-800','Enviado':'bg-green-100 text-green-800',
    'Archivado':'bg-gray-200 text-gray-600'
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
};

const BackButton = ({ onClick, label = '← Volver al Menú Principal' }) => (
  <button onClick={onClick} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4">
    <ArrowLeft size={16} /> {label}
  </button>
);

// ── LoginView ─────────────────────────────────────────────────────────────────
const LoginView = ({ handleLogin, loading, authError, setUserMode, appSettings }) => {
  const [showAdmin, setShowAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const youtubeUrl = appSettings?.youtube_tutorial_url || '';
  const reglamentoPath = appSettings?.reglamento_file_path || '';
  const reglamentoUrl = reglamentoPath ? buildStorageUrl(reglamentoPath, 'reglamento-avales') : null;
  const logoPath = appSettings?.logo_path || '';
  const logoUrl = logoPath ? buildStorageUrl(logoPath, 'firmas-sellos') : '/logo-CAEDUC.png';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-blue-50 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 px-6 pt-8 pb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex flex-col items-center">
            <img
              src={logoUrl}
              alt="CAEDUC — Comisión de Acreditación y Educación Continua"
              className="w-38 h-38 object-contain drop-shadow-lg"
            />
            <p className="text-white/50 text-xs tracking-widest uppercase mt-2">
              Comisión de Acreditación y Educación Continua
            </p>
          </div>
        </div>

        <div className="relative -mt-5">
          <div className="bg-white rounded-t-3xl px-6 pt-6 pb-2">
            <h2 className="text-2xl font-extrabold text-gray-800 text-center tracking-tight">
              Solicitud de Avales
            </h2>
            <p className="text-sm text-gray-400 text-center mt-1 mb-6">
              Portal oficial de gestión y acreditación
            </p>

            <button
              onClick={() => setUserMode('external')}
              className="w-full bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-sm shadow-green-200 flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              Ingresar al portal de solicitudes
            </button>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setUserMode('consultar_estado')}
                className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Search size={18} className="text-blue-600" />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                  Consultar estado
                </span>
              </button>
              <button
                onClick={() => setUserMode('verificar_aval')}
                className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Shield size={18} className="text-green-600" />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                  Verificar validez
                </span>
              </button>
            </div>

            <div className="space-y-2.5 mt-4">
              {reglamentoUrl && (
                <a
                  href={reglamentoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full py-3 px-4 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-all"
                >
                  <BookOpen size={18} className="text-purple-600 shrink-0" />
                  <span className="text-sm font-semibold text-purple-700">Descargar reglamento</span>
                  <Download size={14} className="text-purple-400 ml-auto" />
                </a>
              )}
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full py-3 px-4 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                    <Play size={12} className="text-white ml-0.5" fill="white" />
                  </div>
                  <span className="text-sm font-semibold text-red-600">Ver tutorial del proceso</span>
                </a>
              )}
            </div>

            <div className="border-t border-gray-200 my-5" />

            <button
              onClick={() => setShowAdmin(true)}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 border-slate-700 text-slate-700 font-bold text-sm hover:bg-slate-700 hover:text-white transition-all active:scale-[0.98]"
            >
              <Lock size={15} />
              Acceso administrativo
            </button>

            <p className="text-center text-xs text-gray-300 mt-5 mb-3">
              © {new Date().getFullYear()} CAEDUC — Colegio de Psicólogos de Guatemala
            </p>
          </div>
        </div>
      </div>

      <Modal isOpen={showAdmin} onClose={() => setShowAdmin(false)} title="Acceso Comisión" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(email, password); }} className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-2">
            <Lock size={18} className="text-slate-500 shrink-0" />
            <p className="text-sm text-slate-600">
              Acceso exclusivo para miembros de la comisión CAEDUC.
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Correo electrónico</label>
            <input type="email" placeholder="usuario@ejemplo.com" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all" value={email} onChange={e => setEmail(e.target.value)} required/>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
            <input type="password" placeholder="••••••••" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-all" value={password} onChange={e => setPassword(e.target.value)} required/>
          </div>
          {authError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <p className="text-red-600 text-sm">{authError}</p>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {loading ? (
              <><RefreshCw size={16} className="animate-spin" /> Ingresando...</>
            ) : (
              <><Lock size={16} /> Iniciar sesión</>
            )}
          </button>
        </form>
      </Modal>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out both;
        }
      `}</style>
    </div>
  );
};

// ── ExternalAvalesView ─────────────────────────────────────────────────────────
const ExternalAvalesView = ({ submitAval, onBack, appSettings }) => {
  const [data, setData] = useState({ applicantName:'',institution:'',activityName:'',activityDate:'',email:'',activityType:'',duration:'',modality:'',schedule:'',platform:'',topic:'',targetAudience:'' });
  const [file, setFile] = useState(null);
  const [submittedNumber, setSubmittedNumber] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const formFilePath = appSettings?.aval_form_file_path || '';
  const formFileUrl = formFilePath ? buildStorageUrl(formFilePath, 'aval-form-template') : null;
  const reglamentoPath = appSettings?.reglamento_file_path || '';
  const reglamentoUrl = reglamentoPath ? buildStorageUrl(reglamentoPath, 'reglamento-avales') : null;
  const handleSubmit = async (e) => { e.preventDefault(); setSubmitting(true); const rn = await submitAval(data, file); if (rn) setSubmittedNumber(rn); setSubmitting(false); };
  if (submittedNumber) return (
    <div className="max-w-lg mx-auto space-y-6 mt-10">
      <Card className="border-t-4 border-t-green-500">
        <div className="text-center space-y-4 py-6">
          <CheckCircle size={48} className="text-green-600 mx-auto"/>
          <h2 className="text-2xl font-bold">¡Solicitud Enviada!</h2>
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6"><p className="text-amber-800 font-semibold text-sm flex items-center justify-center gap-2"><AlertTriangle size={16}/> Anota este número</p><p className="text-5xl font-black text-amber-700">#{submittedNumber}</p></div>
          <button onClick={onBack} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700">Volver al Menú</button>
        </div>
      </Card>
    </div>
  );
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackButton onClick={onBack}/>
      <div className="grid gap-4 md:grid-cols-2">
        {formFileUrl && <Card className="border-l-4 border-l-blue-500"><div className="flex items-center gap-3"><Download size={24} className="text-blue-600 shrink-0"/><div className="flex-1"><p className="font-bold">Formulario de Solicitud</p><p className="text-sm text-gray-500">Descarga, llena y adjunta.</p></div><a href={formFileUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm shrink-0">Descargar</a></div></Card>}
        {reglamentoUrl && <Card className="border-l-4 border-l-purple-500"><div className="flex items-center gap-3"><BookOpen size={24} className="text-purple-600 shrink-0"/><div className="flex-1"><p className="font-bold">Reglamento de Avales</p></div><a href={reglamentoUrl} target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm shrink-0">Descargar</a></div></Card>}
      </div>
      <Card>
        <h2 className="text-xl font-bold mb-4">Solicitud de Aval</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-gray-700 text-sm uppercase">Datos del Solicitante</h3>
            <input required placeholder="Nombre completo" className="w-full border p-2 rounded" value={data.applicantName} onChange={e=>setData({...data,applicantName:e.target.value})}/>
            <input required placeholder="Institución" className="w-full border p-2 rounded" value={data.institution} onChange={e=>setData({...data,institution:e.target.value})}/>
            <input required type="email" placeholder="Email de Contacto" className="w-full border p-2 rounded" value={data.email} onChange={e=>setData({...data,email:e.target.value})}/>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-gray-700 text-sm uppercase">Datos de la Actividad</h3>
            <input required placeholder="Nombre / Tema de la Actividad" className="w-full border p-2 rounded" value={data.activityName} onChange={e=>setData({...data,activityName:e.target.value})}/>
            <input placeholder="Tema específico" className="w-full border p-2 rounded" value={data.topic} onChange={e=>setData({...data,topic:e.target.value})}/>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-bold mb-1">Tipo *</label><select required className="w-full border p-2 rounded" value={data.activityType} onChange={e=>setData({...data,activityType:e.target.value})}><option value="">Seleccionar...</option>{ACTIVITY_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="block text-sm font-bold mb-1">Modalidad *</label><select required className="w-full border p-2 rounded" value={data.modality} onChange={e=>setData({...data,modality:e.target.value})}><option value="">Seleccionar...</option>{MODALITIES.map(m=><option key={m}>{m}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-bold mb-1">Duración *</label><input required placeholder="Ej: 12 horas" className="w-full border p-2 rounded" value={data.duration} onChange={e=>setData({...data,duration:e.target.value})}/></div>
              <div><label className="block text-sm font-bold mb-1">Fecha *</label><input required type="date" className="w-full border p-2 rounded" value={data.activityDate} onChange={e=>setData({...data,activityDate:e.target.value})}/></div>
            </div>
            <input required placeholder="Fecha y Hora específica" className="w-full border p-2 rounded" value={data.schedule} onChange={e=>setData({...data,schedule:e.target.value})}/>
            <input required placeholder="Lugar o Plataforma" className="w-full border p-2 rounded" value={data.platform} onChange={e=>setData({...data,platform:e.target.value})}/>
            <input required placeholder="Dirigido a" className="w-full border p-2 rounded" value={data.targetAudience} onChange={e=>setData({...data,targetAudience:e.target.value})}/>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-gray-700 text-sm uppercase">Documento Adjunto (PDF)</h3>
            <input type="file" accept=".pdf" onChange={e=>{const f=e.target.files[0];if(f&&f.type!=='application/pdf'){alert('Solo PDF.');e.target.value='';setFile(null);return;}setFile(f);}}/>
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 disabled:opacity-50">{submitting?'Enviando...':'Enviar Solicitud'}</button>
        </form>
      </Card>
    </div>
  );
};

// ── ConsultarEstadoView ────────────────────────────────────────────────────────
const ConsultarEstadoView = ({ onBack, appSettings }) => {
  const [requestNum,setRequestNum]=useState('');const [result,setResult]=useState(null);const [searching,setSearching]=useState(false);const [notFound,setNotFound]=useState(false);
  const handleSearch=async(e)=>{e.preventDefault();setSearching(true);setNotFound(false);setResult(null);const{data,error}=await supabase.from('avales').select('*').eq('request_number',parseInt(requestNum)).single();if(error||!data)setNotFound(true);else if(data.is_deleted)setResult({...data,status:'Eliminado'});else setResult(data);setSearching(false);};
  return (
    <div className="max-w-lg mx-auto space-y-6 mt-10">
      <BackButton onClick={onBack}/>
      <Card className="border-t-4 border-t-blue-500">
        <div className="space-y-4">
          <div className="text-center"><Search size={40} className="text-blue-600 mx-auto mb-2"/><h2 className="text-2xl font-bold">Consultar Estado</h2></div>
          {!result&&!notFound&&(<form onSubmit={handleSearch} className="space-y-4"><div className="relative"><Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input required type="number" min="1" placeholder="Número de solicitud" className="w-full border p-3 pl-10 rounded-lg text-lg" value={requestNum} onChange={e=>setRequestNum(e.target.value)}/></div><button type="submit" disabled={searching} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{searching?'Buscando...':'Consultar'}</button></form>)}
          {notFound&&<div className="text-center space-y-4"><div className="bg-red-50 border border-red-200 rounded-lg p-4"><AlertCircle size={32} className="text-red-500 mx-auto mb-2"/><p className="text-red-700 font-medium">No se encontró solicitud #{requestNum}</p></div><div className="flex gap-3"><button onClick={()=>{setNotFound(false);setRequestNum('');}} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">Otra Consulta</button><button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold">Volver</button></div></div>}
          {result&&<div className="space-y-4"><div className="bg-gray-50 rounded-lg p-4 space-y-3"><div className="flex justify-between items-center"><span className="text-sm text-gray-500">Solicitud</span><span className="font-bold text-lg">#{result.request_number}</span></div><div className="border-t pt-3 space-y-2"><div className="flex justify-between"><span className="text-sm text-gray-500">Solicitante</span><span className="font-medium">{result.applicant_name}</span></div><div className="flex justify-between"><span className="text-sm text-gray-500">Actividad</span><span className="font-medium">{result.activity_name}</span></div><div className="flex justify-between items-center"><span className="text-sm text-gray-500">Estado</span><Badge status={result.status}/></div></div>{result.status==='Aprobado'&&result.correlativo&&<div className="border-t pt-3 space-y-3"><div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"><p className="text-sm text-green-600 font-medium">Número de Aval</p><p className="text-2xl font-black text-green-700">{result.correlativo}</p></div><div className="flex gap-2"><button onClick={()=>openApprovalLetter(result,appSettings,'preview')} className="flex-1 bg-blue-50 text-blue-700 py-3 rounded-lg font-bold hover:bg-blue-100 border border-blue-200 flex items-center justify-center gap-2"><Eye size={18}/> Vista Previa</button><button onClick={()=>openApprovalLetter(result,appSettings,'download')} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"><FileDown size={18}/> PDF</button></div></div>}</div><div className="flex gap-3"><button onClick={()=>{setResult(null);setRequestNum('');}} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">Otra Consulta</button><button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold">Volver</button></div></div>}
        </div>
      </Card>
    </div>
  );
};

// ── VerificarAvalView ──────────────────────────────────────────────────────────
const VerificarAvalView = ({ onBack }) => {
  const [correlativo,setCorrelativo]=useState('');const [result,setResult]=useState(null);const [searching,setSearching]=useState(false);const [notFound,setNotFound]=useState(false);
  const handleSearch=async(e)=>{e.preventDefault();setSearching(true);setNotFound(false);setResult(null);const{data,error}=await supabase.from('avales').select('*').eq('correlativo',correlativo.trim()).eq('is_deleted',false).single();if(error||!data)setNotFound(true);else setResult(data);setSearching(false);};
  return (
    <div className="max-w-lg mx-auto space-y-6 mt-10">
      <BackButton onClick={onBack}/>
      <Card className="border-t-4 border-t-indigo-500">
        <div className="space-y-4">
          <div className="text-center"><Shield size={40} className="text-indigo-600 mx-auto mb-2"/><h2 className="text-2xl font-bold">Verificar Validez de Aval</h2></div>
          {!result&&!notFound&&<form onSubmit={handleSearch} className="space-y-4"><input required placeholder="Número de correlativo" className="w-full border p-3 rounded-lg text-lg text-center" value={correlativo} onChange={e=>setCorrelativo(e.target.value)}/><button type="submit" disabled={searching} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">{searching?'Verificando...':'Verificar'}</button></form>}
          {notFound&&<div className="text-center space-y-4"><div className="bg-red-50 border border-red-200 rounded-lg p-4"><AlertCircle size={32} className="text-red-500 mx-auto mb-2"/><p className="text-red-700 font-medium">No se encontró aval: {correlativo}</p></div><div className="flex gap-3"><button onClick={()=>{setNotFound(false);setCorrelativo('');}} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold">Otra Consulta</button><button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold">Volver</button></div></div>}
          {result&&<div className="space-y-4">{result.status==='Aprobado'?<div className="bg-green-50 border border-green-300 rounded-lg p-4 text-center"><CheckCircle size={40} className="text-green-600 mx-auto mb-2"/><p className="text-green-800 font-bold text-lg">Aval Válido ✓</p></div>:<div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-center"><AlertTriangle size={40} className="text-yellow-600 mx-auto mb-2"/><p className="text-yellow-800 font-bold">Estado: {result.status}</p></div>}<div className="bg-gray-50 rounded-lg p-4 space-y-2"><div className="flex justify-between"><span className="text-sm text-gray-500">Correlativo</span><span className="font-bold">{result.correlativo}</span></div><div className="flex justify-between"><span className="text-sm text-gray-500">Actividad</span><span className="font-medium">{result.activity_name}</span></div><div className="flex justify-between items-center"><span className="text-sm text-gray-500">Estado</span><Badge status={result.status}/></div></div><div className="flex gap-3"><button onClick={()=>{setResult(null);setCorrelativo('');}} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold">Otra Consulta</button><button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold">Volver</button></div></div>}
        </div>
      </Card>
    </div>
  );
};

// ── OficioCard ────────────────────────────────────────────────────────────────
const OficioCard = ({ oficio: o, appSettings, onEdit, onStatusChange, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  if (!o.numero_oficio && !o.motivo) return null;
  return (
    <div className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow" style={{overflow:'hidden',maxWidth:'100%',boxSizing:'border-box'}}>
      <div className="flex items-center gap-2 px-3 py-3 cursor-pointer select-none" style={{minWidth:0,overflow:'hidden'}} onClick={() => setExpanded(e => !e)}>
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
            <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10}/>{o.fecha}</span>
          </div>
          <p style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%',fontSize:'13px',marginTop:'2px',color:o.titulo?'#374151':'#6b7280',fontWeight:o.titulo?'600':'400'}}>
            {o.titulo || o.motivo}
          </p>
          {o.titulo && <p style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%',fontSize:'11px',color:'#9ca3af'}}>{o.motivo}</p>}
        </div>
        <ChevronDown size={15} className="text-gray-400 shrink-0" style={{transform:expanded?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.2s'}}/>
      </div>
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-gray-50">
          {o.actividad_nombre && <p className="text-sm text-blue-700 font-medium flex items-center gap-1"><FileText size={13}/>{o.actividad_nombre}</p>}
          {o.monto && <span className="inline-block text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium border border-green-200">{o.monto}</span>}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={(e)=>{e.stopPropagation();openOficioLetter(o,appSettings,'preview');}} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1 font-medium"><Eye size={13}/> Vista Previa</button>
            <button onClick={(e)=>{e.stopPropagation();openOficioLetter(o,appSettings,'download');}} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-700 flex items-center gap-1 font-medium"><Download size={13}/> PDF</button>
            <button onClick={(e)=>{e.stopPropagation();onEdit();}} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200 flex items-center gap-1 font-medium"><Edit3 size={13}/> Editar</button>
            {o.estado==='Borrador' && <button onClick={(e)=>{e.stopPropagation();onStatusChange('Enviado');}} className="bg-green-50 text-green-600 px-2.5 py-1.5 rounded-lg text-xs hover:bg-green-100 flex items-center gap-1"><Send size={12}/> Enviado</button>}
            {o.estado==='Enviado' && <button onClick={(e)=>{e.stopPropagation();onStatusChange('Archivado');}} className="bg-gray-50 text-gray-500 px-2.5 py-1.5 rounded-lg text-xs hover:bg-gray-100 flex items-center gap-1"><Archive size={12}/> Archivar</button>}
            <button onClick={(e)=>{e.stopPropagation();onDelete();}} className="bg-red-50 text-red-500 px-2.5 py-1.5 rounded-lg text-xs hover:bg-red-100 flex items-center gap-1 ml-auto"><Trash2 size={12}/> Eliminar</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── OficiosAdminView ───────────────────────────────────────────────────────────
const OficiosAdminView = ({ oficios, onCreateOficio, onUpdateOficio, onDeleteOficio, appSettings, preFillData, onClearPreFill }) => {
  const [showForm,setShowForm]=useState(false);const [editingOficio,setEditingOficio]=useState(null);const [deleteModal,setDeleteModal]=useState(null);const [deleting,setDeleting]=useState(false);const [cartasTab,setCartasTab]=useState('oficios');
  useEffect(()=>{if(preFillData){setEditingOficio(null);setShowForm(true);}},[preFillData]);
  const handleNew=()=>{setEditingOficio(null);if(onClearPreFill)onClearPreFill();setShowForm(true);};
  const handleEdit=(o)=>{setEditingOficio(o);if(onClearPreFill)onClearPreFill();setShowForm(true);};
  const handleSave=async(data)=>{if(editingOficio)await onUpdateOficio(editingOficio.id,data);else await onCreateOficio(data);setShowForm(false);setEditingOficio(null);if(onClearPreFill)onClearPreFill();};
  const handleClose=()=>{setShowForm(false);setEditingOficio(null);if(onClearPreFill)onClearPreFill();};
  const handleDelete=async()=>{if(!deleteModal)return;setDeleting(true);await onDeleteOficio(deleteModal.id);setDeleteModal(null);setDeleting(false);};
  const handleStatusChange=async(oficio,newStatus)=>{await onUpdateOficio(oficio.id,{...oficio,estado:newStatus});};
  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl inline-flex">
        <button onClick={() => setCartasTab('oficios')}
          className={"flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all " + (cartasTab==='oficios' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          <FileSignature size={15}/> Oficios
        </button>
        <button onClick={() => setCartasTab('cartas')}
          className={"flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all " + (cartasTab==='cartas' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          <Mail size={15}/> Cartas
        </button>
      </div>
      {cartasTab === 'cartas' ? <CartasSection appSettings={appSettings}/> : (<>
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-gray-800">Oficios y Solicitudes</h2><p className="text-sm text-gray-500">Genera, edita y gestiona oficios internos de CAEDUC</p></div>
        <button onClick={handleNew} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium"><FilePlus size={20}/> Nuevo Oficio</button>
      </div>
      {preFillData && <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center gap-3"><FileText size={18} className="text-indigo-600 shrink-0"/><div className="flex-1 text-sm text-indigo-800"><span className="font-bold">Nuevo oficio desde Planificación:</span> "{preFillData.actividad_nombre}"</div><button onClick={onClearPreFill} className="text-indigo-400 hover:text-indigo-700"><X size={16}/></button></div>}
      <div className="grid grid-cols-3 gap-4">
        <Card><div className="text-center"><p className="text-3xl font-bold text-blue-700">{oficios.length}</p><p className="text-sm text-gray-500">Total</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-bold text-yellow-600">{oficios.filter(o=>o.estado==='Borrador').length}</p><p className="text-sm text-gray-500">Borradores</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-bold text-green-600">{oficios.filter(o=>o.estado==='Enviado').length}</p><p className="text-sm text-gray-500">Enviados</p></div></Card>
      </div>
      <div className="space-y-2">
        {oficios.map(o => <OficioCard key={o.id} oficio={o} appSettings={appSettings} onEdit={()=>handleEdit(o)} onStatusChange={(s)=>handleStatusChange(o,s)} onDelete={()=>setDeleteModal(o)}/>)}
        {oficios.length===0 && <div className="text-center py-16"><FileSignature size={48} className="text-gray-300 mx-auto mb-4"/><p className="text-gray-400 text-lg">No hay oficios generados aún.</p></div>}
      </div>
      {showForm && <OficioFormModal isOpen={showForm} onClose={handleClose} onSave={handleSave} initialData={editingOficio} preFillData={preFillData} existingCount={oficios.length} appSettings={appSettings}/>}
      <Modal isOpen={!!deleteModal} onClose={()=>setDeleteModal(null)} title="Eliminar Oficio" size="sm">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-700 font-medium">¿Eliminar "{deleteModal?.numero_oficio}"?</p></div>
          <div className="flex gap-3"><button onClick={()=>setDeleteModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold">Cancelar</button><button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50">{deleting?'Eliminando...':'Eliminar'}</button></div>
        </div>
      </Modal>
    </>)}
    </div>
  );
};

// ── OficioFormModal ────────────────────────────────────────────────────────────
const OficioFormModal = ({ isOpen, onClose, onSave, initialData, preFillData, existingCount, appSettings }) => {
  const today = new Date().toISOString().split('T')[0];
  const suggestedNum = 'Of. ' + String((existingCount||0)+1).padStart(3,'0') + '.CAEDUC';
  const [currentStep,setCurrentStep]=useState(1);const [saving,setSaving]=useState(false);const [fd,setFd]=useState(null);
  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(1);
    const isCustomMotivo = (m) => m && !MOTIVOS_OFICIO.includes(m);
    if (preFillData && !initialData) {
      setFd({ titulo:'', numero_oficio:suggestedNum, fecha:today, dirigido_a:'Miembros, Junta Directiva 2025-2027, Colegio de Psicólogos de Guatemala', motivo:MOTIVOS_OFICIO[0], motivo_custom:'', actividad_nombre:preFillData.actividad_nombre||'', actividad_tipo:preFillData.actividad_tipo||'', actividad_fecha:preFillData.actividad_fecha||'', actividad_duracion:preFillData.actividad_duracion||'', actividad_modalidad:preFillData.actividad_modalidad||'', actividad_sede:preFillData.actividad_sede||preFillData.t3_lugar||'', actividad_descripcion:'', monto:'', monto_detalle:'', justificacion:'', solicitud_puntual:'', cuerpo_personalizado:'', estado:'Borrador' });
    } else {
      const m = initialData?.motivo || MOTIVOS_OFICIO[0];
      setFd({ titulo:initialData?.titulo||'', numero_oficio:initialData?initialData.numero_oficio:suggestedNum, fecha:initialData?initialData.fecha:today, dirigido_a:initialData?initialData.dirigido_a:'Miembros, Junta Directiva 2025-2027, Colegio de Psicólogos de Guatemala', motivo:isCustomMotivo(m)?'Otro (personalizado)':m, motivo_custom:isCustomMotivo(m)?m:'', actividad_nombre:initialData?.actividad_nombre||'', actividad_tipo:initialData?.actividad_tipo||'', actividad_fecha:initialData?.actividad_fecha||'', actividad_duracion:initialData?.actividad_duracion||'', actividad_modalidad:initialData?.actividad_modalidad||'', actividad_sede:initialData?.actividad_sede||'', actividad_descripcion:initialData?.actividad_descripcion||'', monto:initialData?.monto||'', monto_detalle:initialData?.monto_detalle||'', justificacion:initialData?.justificacion||'', solicitud_puntual:initialData?.solicitud_puntual||'', cuerpo_personalizado:initialData?.cuerpo_personalizado||'', estado:initialData?.estado||'Borrador' });
    }
  }, [isOpen, initialData, preFillData]);
  if (!isOpen||!fd) return null;
  const isRecursos = fd.motivo.includes('recursos') || fd.motivo.includes('Aprobación');
  const isCustomMotivo = fd.motivo === 'Otro (personalizado)';
  const upd = (k,v) => setFd(p => ({...p,[k]:v}));
  const goToPreview = (e) => { e.preventDefault(); setCurrentStep(2); };
  const handleSaveOficio = async () => { setSaving(true); const sd={...fd}; if(isCustomMotivo&&fd.motivo_custom)sd.motivo=fd.motivo_custom; delete sd.motivo_custom; await onSave(sd); setSaving(false); };
  const getPreviewData = () => { const pd={...fd}; if(fd.motivo==='Otro (personalizado)'&&fd.motivo_custom)pd.motivo=fd.motivo_custom; return pd; };

  if (currentStep === 2) return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full my-3" style={{maxWidth:'min(95vw,720px)',boxSizing:'border-box'}}>
        <div className="flex justify-between items-center p-4 border-b"><div><h3 className="text-lg font-bold">{initialData?'Editar Oficio':'Nuevo Oficio'}</h3><p className="text-sm text-gray-500">Paso 2: Vista previa</p></div><button onClick={onClose}><X size={22} className="text-gray-500 hover:text-red-500"/></button></div>
        <div className="p-4 overflow-y-auto space-y-4" style={{maxHeight:'calc(100dvh - 120px)'}}>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-blue-800 font-medium text-sm">Vista previa del oficio. Puedes volver atrás para editar o guardar.</p></div>
          <div className="border-2 border-gray-200 rounded-lg p-5 bg-gray-50 space-y-3">
            <div className="flex justify-between items-start"><div><p className="font-bold text-lg">{fd.numero_oficio}</p>{fd.titulo&&<p className="text-sm font-semibold text-blue-700">{fd.titulo}</p>}<p className="text-sm text-gray-500">Guatemala, {formatOficioDate(fd.fecha)}</p></div><Badge status={fd.estado}/></div>
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex gap-2"><span className="font-semibold text-gray-600 shrink-0">Motivo:</span><span className="text-gray-800">{isCustomMotivo?fd.motivo_custom:fd.motivo}</span></div>
              {fd.actividad_nombre && <div className="flex gap-2"><span className="font-semibold text-gray-600 shrink-0">Actividad:</span><span className="text-gray-800">{fd.actividad_nombre}</span></div>}
              {fd.monto && <div className="flex gap-2"><span className="font-semibold text-gray-600 shrink-0">Monto:</span><span className="text-green-700 font-bold">{fd.monto}</span></div>}
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex gap-3"><button onClick={()=>setCurrentStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold flex items-center justify-center gap-2"><ArrowLeft size={18}/> Volver</button><button onClick={()=>openOficioLetter(getPreviewData(),appSettings,'preview')} className="flex-1 bg-blue-50 text-blue-700 py-3 rounded-lg font-bold hover:bg-blue-100 border border-blue-200 flex items-center justify-center gap-2"><Eye size={18}/> Ver</button></div>
            <div className="flex gap-3"><button onClick={()=>openOficioLetter(getPreviewData(),appSettings,'download')} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"><Download size={18}/> PDF</button><button onClick={handleSaveOficio} disabled={saving} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"><Save size={18}/> {saving?'Guardando...':'Guardar'}</button></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full my-3" style={{maxWidth:'min(95vw,720px)',boxSizing:'border-box'}}>
        <div className="flex justify-between items-center p-4 border-b"><div><h3 className="text-lg font-bold">{initialData?'Editar Oficio':'Nuevo Oficio'}</h3><p className="text-sm text-gray-500">{preFillData?`Datos de Planificación — "${preFillData.actividad_nombre}"` : 'Paso 1: Datos del oficio'}</p></div><button onClick={onClose}><X size={22} className="text-gray-500 hover:text-red-500"/></button></div>
        <div className="p-4 overflow-y-auto" style={{maxHeight:'calc(100dvh - 120px)'}}>
          <form onSubmit={goToPreview} className="space-y-5">
            <div className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-100">
              <h4 className="font-bold text-blue-800 text-sm uppercase">Encabezado del Oficio</h4>
              <div><label className="block text-sm font-bold mb-1 flex items-center gap-1">Título / Identificador <span className="text-xs font-normal text-blue-400 bg-blue-100 px-1.5 py-0.5 rounded-full">No aparece en el PDF</span></label><input placeholder="Ej: Solicitud licencia Zoom..." className="w-full border p-2.5 rounded-lg text-sm" value={fd.titulo||''} onChange={e=>upd('titulo',e.target.value)}/></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-bold mb-1">Número *</label><input required className="w-full border p-2.5 rounded-lg" value={fd.numero_oficio} onChange={e=>upd('numero_oficio',e.target.value)}/></div><div><label className="block text-sm font-bold mb-1">Fecha *</label><input required type="date" className="w-full border p-2.5 rounded-lg" value={fd.fecha} onChange={e=>upd('fecha',e.target.value)}/></div></div>
              <div><label className="block text-sm font-bold mb-1">Dirigido a *</label><textarea required rows={2} className="w-full border p-2.5 rounded-lg" value={fd.dirigido_a} onChange={e=>upd('dirigido_a',e.target.value)}/></div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 space-y-3 border border-amber-100">
              <h4 className="font-bold text-amber-800 text-sm uppercase">Motivo del Oficio</h4>
              <select required className="w-full border p-2.5 rounded-lg font-medium" value={fd.motivo} onChange={e=>upd('motivo',e.target.value)}>{MOTIVOS_OFICIO.map(m=><option key={m} value={m}>{m}</option>)}</select>
              {isCustomMotivo && <textarea required rows={3} placeholder="Describe el motivo..." className="w-full border p-2.5 rounded-lg text-sm resize-none" value={fd.motivo_custom} onChange={e=>upd('motivo_custom',e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.stopPropagation();}}/>}
            </div>
            {isRecursos && (
              <div className="bg-green-50 rounded-lg p-4 space-y-3 border border-green-100">
                <h4 className="font-bold text-green-800 text-sm uppercase">Datos de la Actividad</h4>
                <input required placeholder="Nombre de la actividad *" className="w-full border p-2.5 rounded-lg" value={fd.actividad_nombre} onChange={e=>upd('actividad_nombre',e.target.value)}/>
                <textarea rows={3} placeholder="Descripción" className="w-full border p-2.5 rounded-lg" value={fd.actividad_descripcion} onChange={e=>upd('actividad_descripcion',e.target.value)}/>
                <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-bold mb-1">Tipo</label><select className="w-full border p-2.5 rounded-lg" value={fd.actividad_tipo} onChange={e=>upd('actividad_tipo',e.target.value)}><option value="">Seleccionar...</option>{ACTIVITY_TYPES.map(t=><option key={t}>{t}</option>)}</select></div><div><label className="block text-sm font-bold mb-1">Modalidad</label><select className="w-full border p-2.5 rounded-lg" value={fd.actividad_modalidad} onChange={e=>upd('actividad_modalidad',e.target.value)}><option value="">Seleccionar...</option>{MODALITIES.map(m=><option key={m}>{m}</option>)}</select></div></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-bold mb-1">Duración</label><input placeholder="Ej: 2-3 horas" className="w-full border p-2.5 rounded-lg" value={fd.actividad_duracion} onChange={e=>upd('actividad_duracion',e.target.value)}/></div><div><label className="block text-sm font-bold mb-1">Fecha</label><input placeholder="Ej: 29 de octubre" className="w-full border p-2.5 rounded-lg" value={fd.actividad_fecha} onChange={e=>upd('actividad_fecha',e.target.value)}/></div></div>
                <input placeholder="Sede / Plataforma" className="w-full border p-2.5 rounded-lg" value={fd.actividad_sede} onChange={e=>upd('actividad_sede',e.target.value)}/>
              </div>
            )}
            {isRecursos && (
              <div className="bg-rose-50 rounded-lg p-4 space-y-3 border border-rose-100">
                <h4 className="font-bold text-rose-800 text-sm uppercase">Recursos Solicitados</h4>
                <input placeholder="Monto (ej: Q3,000.00)" className="w-full border p-2.5 rounded-lg" value={fd.monto} onChange={e=>upd('monto',e.target.value)}/>
                <textarea rows={2} placeholder="Detalle de recursos" className="w-full border p-2.5 rounded-lg" value={fd.monto_detalle} onChange={e=>upd('monto_detalle',e.target.value)}/>
              </div>
            )}
            <div className="bg-purple-50 rounded-lg p-4 space-y-3 border border-purple-100">
              <h4 className="font-bold text-purple-800 text-sm uppercase">Justificación Técnica (opcional)</h4>
              <textarea rows={4} placeholder="Justificación técnica..." className="w-full border p-2.5 rounded-lg" value={fd.justificacion} onChange={e=>upd('justificacion',e.target.value)}/>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 space-y-3 border border-indigo-100">
              <h4 className="font-bold text-indigo-800 text-sm uppercase">Solicitud Puntual (opcional)</h4>
              <textarea rows={3} placeholder="Cada punto en una línea..." className="w-full border p-2.5 rounded-lg" value={fd.solicitud_puntual} onChange={e=>upd('solicitud_puntual',e.target.value)}/>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <h4 className="font-bold text-gray-700 text-sm uppercase">Cuerpo Personalizado (opcional)</h4>
              <textarea rows={4} placeholder="Déjalo vacío para texto automático..." className="w-full border p-2.5 rounded-lg" value={fd.cuerpo_personalizado} onChange={e=>upd('cuerpo_personalizado',e.target.value)}/>
            </div>
            <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold">Cancelar</button><button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2"><Eye size={18}/> Vista Previa</button></div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ── FirmaUploader ──────────────────────────────────────────────────────────────
const FirmaUploader = ({ label, settingKey, appSettings, onUpdateSetting }) => {
  const [uploading,setUploading]=useState(false);const [msg,setMsg]=useState(null);
  const fp = appSettings?.[settingKey]||'';
  const imgUrl = fp ? buildStorageUrl(fp, 'firmas-sellos') : null;
  const handleUpload = async (e) => { const f=e.target.files[0]; if(!f)return; if(!f.type.startsWith('image/')){alert('Solo imágenes.');return;} setUploading(true);setMsg(null); try { const fn=`${settingKey}_${Date.now()}.${f.name.split('.').pop()}`; if(fp)await supabase.storage.from('firmas-sellos').remove([fp]); const{data,error}=await supabase.storage.from('firmas-sellos').upload(fn,f,{upsert:true}); if(error)setMsg({type:'error',text:error.message}); else{await onUpdateSetting(settingKey,data.path);setMsg({type:'success',text:'Imagen actualizada.'});} }catch(err){setMsg({type:'error',text:err.message});} setUploading(false); };
  const handleRemove = async () => { if(!fp||!confirm('¿Eliminar?'))return; await supabase.storage.from('firmas-sellos').remove([fp]); await onUpdateSetting(settingKey,''); setMsg({type:'success',text:'Eliminada.'}); };
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-gray-700">{label}</p>
      {msg && <div className={`p-2 rounded text-xs ${msg.type==='success'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>{msg.text}</div>}
      {imgUrl ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 border rounded-lg">
          <img src={imgUrl} alt={label} className="h-16 w-auto object-contain border bg-white p-1 rounded"/>
          <div className="flex-1"><p className="text-xs text-green-600 font-medium">Activa</p></div>
          <label className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-xs cursor-pointer hover:bg-blue-200 font-medium">{uploading?'...':'Cambiar'}<input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept="image/*"/></label>
          <button onClick={handleRemove} className="bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-200"><Trash2 size={14} className="inline"/></button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50">
          <Upload size={18} className="text-gray-400"/>
          <span className="text-sm text-gray-500">{uploading?'Subiendo...':'Subir imagen'}</span>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept="image/*"/>
        </label>
      )}
    </div>
  );
};

// ── AdminConfigView ────────────────────────────────────────────────────────────
const AdminConfigView = ({ appSettings, onUpdateSetting, members, onUpdateMember }) => {
  const [activeTab,setActiveTab]=useState('users');
  const tabs = [{id:'users',label:'Usuarios',icon:<UserPlus size={18}/>},{id:'firmas',label:'Firmas y Sello',icon:<FileSignature size={18}/>},{id:'form_file',label:'Formulario Aval',icon:<File size={18}/>},{id:'reglamento',label:'Reglamento',icon:<BookOpen size={18}/>},{id:'tutorial',label:'Tutorial YouTube',icon:<Youtube size={18}/>}];
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-wrap">
        {tabs.map(tab => <button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all flex-1 justify-center ${activeTab===tab.id?'bg-white text-blue-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{tab.icon} {tab.label}</button>)}
      </div>
      {activeTab==='users' && <AdminUsersTab members={members} onUpdateMember={onUpdateMember} onRefreshMembers={()=>{}}/>}
      {activeTab==='firmas' && <AdminFirmasTab appSettings={appSettings} onUpdateSetting={onUpdateSetting}/>}
      {activeTab==='form_file' && <AdminFormFileTab appSettings={appSettings} onUpdateSetting={onUpdateSetting}/>}
      {activeTab==='reglamento' && <AdminReglamentoTab appSettings={appSettings} onUpdateSetting={onUpdateSetting}/>}
      {activeTab==='tutorial' && <AdminTutorialTab appSettings={appSettings} onUpdateSetting={onUpdateSetting}/>}
    </div>
  );
};

const AdminUsersTab = ({ members, onUpdateMember, onRefreshMembers }) => {
  const [showModal,setShowModal]=useState(false);const [editModal,setEditModal]=useState(null);const [pwModal,setPwModal]=useState(null);const [deleteModal,setDeleteModal]=useState(null);const [newUser,setNewUser]=useState({email:'',password:'',name:'',role:ROLES[0]});const [editData,setEditData]=useState({});const [newRole,setNewRole]=useState('');const [customRoles,setCustomRoles]=useState([]);const [creating,setCreating]=useState(false);const [saving,setSaving]=useState(false);const [deleting,setDeleting]=useState(false);const [showPw,setShowPw]=useState(false);const [showNewPw,setShowNewPw]=useState(false);const [newPassword,setNewPassword]=useState('');const [savingPw,setSavingPw]=useState(false);const [msg,setMsg]=useState(null);
  useEffect(()=>{supabase.from('app_settings').select('value').eq('key','custom_roles').single().then(({data})=>{if(data?.value)setCustomRoles(JSON.parse(data.value)||[]);});},[]);
  const allRoles = [...ROLES, ...customRoles];
  const saveCustomRoles = async (roles) => {setCustomRoles(roles);const val = JSON.stringify(roles);const {error} = await supabase.from('app_settings').update({value:val}).eq('key','custom_roles');if(error) await supabase.from('app_settings').insert([{key:'custom_roles',value:val}]);};
  const addCustomRole = () => {const r = newRole.trim();if(!r || allRoles.includes(r)) return;saveCustomRoles([...customRoles, r]);setNewRole('');};
  const removeCustomRole = (r) => saveCustomRoles(customRoles.filter(x=>x!==r));
  const handleCreate=async(e)=>{e.preventDefault();setCreating(true);setMsg(null);try{const{data:ad,error:ae}=await supabase.auth.signUp({email:newUser.email,password:newUser.password});if(ae){setMsg({type:'error',text:ae.message});setCreating(false);return;}if(ad.user){const{error:pe}=await supabase.from('profiles').insert([{id:ad.user.id,name:newUser.name,role:newUser.role,email:newUser.email}]);if(pe)setMsg({type:'warning',text:'Auth OK pero error perfil: '+pe.message});else{setMsg({type:'success',text:`"${newUser.name}" creado.`});setNewUser({email:'',password:'',name:'',role:allRoles[0]});setShowModal(false);if(onRefreshMembers)onRefreshMembers();}}}catch(err){setMsg({type:'error',text:err.message});}setCreating(false);};
  const openEdit=(m)=>{setEditData({id:m.id,name:m.name||'',role:m.role||allRoles[0],email:m.email||''});setEditModal(true);setMsg(null);};
  const handleEdit=async(e)=>{e.preventDefault();setSaving(true);setMsg(null);try{await onUpdateMember(editData.id,{name:editData.name,role:editData.role,email:editData.email});setMsg({type:'success',text:'Actualizado.'});setEditModal(null);}catch(err){setMsg({type:'error',text:err.message});}setSaving(false);};
  const handleDelete=async()=>{setDeleting(true);try{await supabase.from('profiles').delete().eq('id',deleteModal.id);setMsg({type:'success',text:`${deleteModal.name} eliminado del sistema.`});setDeleteModal(null);if(onRefreshMembers)onRefreshMembers();}catch(err){setMsg({type:'error',text:err.message});}setDeleting(false);};
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-gray-700">Usuarios del Sistema</h3><button onClick={()=>{setShowModal(true);setMsg(null);}} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm font-medium"><UserPlus size={18}/> Nuevo usuario</button></div>
      {msg && <div className={`p-3 rounded-lg text-sm border ${msg.type==='success'?'bg-green-50 text-green-700 border-green-200':msg.type==='warning'?'bg-yellow-50 text-yellow-700 border-yellow-200':'bg-red-50 text-red-700 border-red-200'}`}>{msg.text}</div>}
      <div className="grid gap-2">{members.map(m=>(<Card key={m.id} className="!shadow-sm !p-4"><div className="flex items-center justify-between gap-3 flex-wrap"><div className="flex items-center gap-3 flex-1 min-w-0"><div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{m.name?.charAt(0)?.toUpperCase()||'?'}</div><div className="min-w-0"><p className="font-semibold text-gray-800 truncate">{m.name||'Sin nombre'}</p><p className="text-xs text-gray-500 truncate">{m.email||''}</p></div></div><div className="flex items-center gap-2 flex-wrap justify-end"><span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium shrink-0">{m.role||'Sin rol'}</span><button onClick={()=>openEdit(m)} className="bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1 shrink-0 font-medium"><Edit3 size={12}/> Editar</button><button onClick={()=>{setPwModal(m);setNewPassword('');setMsg(null);}} className="bg-amber-50 text-amber-600 px-2.5 py-1.5 rounded-lg text-xs hover:bg-amber-100 flex items-center gap-1 shrink-0 font-medium"><Lock size={12}/> Contraseña</button><button onClick={()=>setDeleteModal(m)} className="bg-red-50 text-red-500 px-2.5 py-1.5 rounded-lg text-xs hover:bg-red-100 flex items-center gap-1 shrink-0 font-medium"><Trash2 size={12}/> Eliminar</button></div></div></Card>))}</div>
      <Card className="!shadow-sm"><h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Settings size={16} className="text-blue-600"/> Roles disponibles</h4><div className="flex flex-wrap gap-2 mb-3">{ROLES.map(r=><span key={r} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-medium">{r}</span>)}{customRoles.map(r=>(<span key={r} className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">{r}<button onClick={()=>removeCustomRole(r)} className="ml-1 text-purple-400 hover:text-red-500"><X size={11}/></button></span>))}</div><div className="flex gap-2"><input className="flex-1 border p-2 rounded-lg text-sm" placeholder="Nuevo rol personalizado..." value={newRole} onChange={e=>setNewRole(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addCustomRole();}}}/><button onClick={addCustomRole} disabled={!newRole.trim()} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-40 flex items-center gap-1"><Plus size={14}/> Agregar</button></div><p className="text-xs text-gray-400 mt-2">Azul = predeterminados · Morado = personalizados (× para eliminar)</p></Card>
      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Crear Usuario" size="sm"><form onSubmit={handleCreate} className="space-y-4"><input required placeholder="Nombre completo" className="w-full border p-2.5 rounded-lg" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})}/><input required type="email" placeholder="email@ejemplo.com" className="w-full border p-2.5 rounded-lg" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})}/><div className="relative"><input required type={showPw?'text':'password'} placeholder="Contraseña (mín 6 caracteres)" minLength={6} className="w-full border p-2.5 rounded-lg pr-10" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})}/><button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{showPw?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><div><label className="block text-sm font-bold mb-1">Rol</label><select className="w-full border p-2.5 rounded-lg" value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>{allRoles.map(r=><option key={r}>{r}</option>)}</select></div><button type="submit" disabled={creating} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{creating?'Creando...':'Crear usuario'}</button></form></Modal>
      <Modal isOpen={!!editModal} onClose={()=>setEditModal(null)} title="Editar Usuario" size="sm"><form onSubmit={handleEdit} className="space-y-4"><div><label className="block text-sm font-bold mb-1">Nombre</label><input required className="w-full border p-2.5 rounded-lg" value={editData.name||''} onChange={e=>setEditData({...editData,name:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Email</label><input required type="email" className="w-full border p-2.5 rounded-lg" value={editData.email||''} onChange={e=>setEditData({...editData,email:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Rol</label><select className="w-full border p-2.5 rounded-lg" value={editData.role||allRoles[0]} onChange={e=>setEditData({...editData,role:e.target.value})}>{allRoles.map(r=><option key={r}>{r}</option>)}</select></div><button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{saving?'Guardando...':'Guardar cambios'}</button></form></Modal>
      <Modal isOpen={!!pwModal} onClose={()=>{setPwModal(null);setNewPassword('');}} title="Cambiar Contraseña" size="sm"><div className="space-y-4"><div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-sm font-bold text-amber-800">{pwModal?.name}</p><p className="text-xs text-amber-600">{pwModal?.email}</p></div><div className="relative"><input type={showNewPw?'text':'password'} placeholder="Nueva contraseña (mín 6 caracteres)" minLength={6} className="w-full border p-2.5 rounded-lg pr-10" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/><button type="button" onClick={()=>setShowNewPw(!showNewPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">{showNewPw?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1"><p className="font-bold">Opción A — Enviar reset por correo:</p><p>El usuario recibirá un enlace para crear su nueva contraseña.</p><p className="font-bold mt-1">Opción B — Desde Supabase Dashboard:</p><p>Authentication → Users → buscar {pwModal?.email} → Send password reset</p></div><div className="flex gap-3"><button onClick={()=>{setPwModal(null);setNewPassword('');}} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold text-sm">Cancelar</button><button onClick={async()=>{if(!pwModal?.email)return;setSavingPw(true);const{error}=await supabase.auth.resetPasswordForEmail(pwModal.email,{redirectTo:window.location.origin});if(error)setMsg({type:'error',text:error.message});else setMsg({type:'success',text:'✓ Email de reset enviado a '+pwModal.email});setPwModal(null);setNewPassword('');setSavingPw(false);}} disabled={savingPw} className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg font-bold hover:bg-amber-600 disabled:opacity-50 text-sm flex items-center justify-center gap-1">{savingPw?'Enviando...':'📧 Enviar reset por email'}</button></div></div></Modal>
      <Modal isOpen={!!deleteModal} onClose={()=>setDeleteModal(null)} title="Eliminar Usuario" size="sm"><div className="space-y-4"><div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-700 font-bold">{deleteModal?.name}</p><p className="text-red-500 text-sm">{deleteModal?.email} · {deleteModal?.role}</p><p className="text-red-600 text-sm mt-2">Se eliminará del directorio de usuarios. Esta acción no se puede deshacer.</p></div><div className="flex gap-3"><button onClick={()=>setDeleteModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button><button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50">{deleting?'Eliminando...':'Eliminar'}</button></div></div></Modal>
    </div>
  );
};

const AdminFirmasTab = ({ appSettings, onUpdateSetting }) => {
  const [saving,setSaving]=useState(false);const [msg,setMsg]=useState(null);
  const [f1,setF1]=useState({nombre:'',cargo:'',institucion:''});
  const [f2,setF2]=useState({nombre:'',cargo:'',institucion:''});
  useEffect(()=>{setF1({nombre:appSettings?.firmante1_nombre||'M. A. Juan J. Reyes',cargo:appSettings?.firmante1_cargo||'Coordinador',institucion:appSettings?.firmante1_institucion||'Comisión de Acreditación Educación continua, Colegio de Psicólogos de Guatemala'});setF2({nombre:appSettings?.firmante2_nombre||'Mgtr. Luisa Mazariegos',cargo:appSettings?.firmante2_cargo||'Secretaria',institucion:appSettings?.firmante2_institucion||'CAEDUC'});},[appSettings]);
  const handleSaveNames=async()=>{setSaving(true);setMsg(null);try{await onUpdateSetting('firmante1_nombre',f1.nombre);await onUpdateSetting('firmante1_cargo',f1.cargo);await onUpdateSetting('firmante1_institucion',f1.institucion);await onUpdateSetting('firmante2_nombre',f2.nombre);await onUpdateSetting('firmante2_cargo',f2.cargo);await onUpdateSetting('firmante2_institucion',f2.institucion);setMsg({type:'success',text:'Datos guardados.'});}catch(err){setMsg({type:'error',text:err.message});}setSaving(false);};
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-700">Logo, Firmas, Sello y Firmantes</h3>
      {msg && <div className={`p-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'} border`}>{msg.text}</div>}
      <Card><div className="space-y-4"><h4 className="font-bold text-blue-900">📄 Membrete de Oficios</h4><p className="text-xs text-gray-500">Imagen de fondo de los oficios PDF (carta 8.5x11in). Al subir uno nuevo reemplaza el predeterminado.</p><FirmaUploader label="Imagen del membrete (JPG/PNG)" settingKey="membrete_path" appSettings={appSettings} onUpdateSetting={onUpdateSetting}/></div></Card>
      <Card><div className="space-y-4"><h4 className="font-bold text-green-800">Logo de Encabezado</h4><FirmaUploader label="Imagen del logo" settingKey="logo_path" appSettings={appSettings} onUpdateSetting={onUpdateSetting}/></div></Card>
      <Card><div className="space-y-4"><h4 className="font-bold text-blue-800">Firmante 1 (Coordinador/a)</h4><div className="grid md:grid-cols-2 gap-4"><div className="space-y-3"><div><label className="block text-sm font-bold mb-1">Nombre</label><input className="w-full border p-2.5 rounded-lg" value={f1.nombre} onChange={e=>setF1({...f1,nombre:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Cargo</label><input className="w-full border p-2.5 rounded-lg" value={f1.cargo} onChange={e=>setF1({...f1,cargo:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Institución</label><input className="w-full border p-2.5 rounded-lg" value={f1.institucion} onChange={e=>setF1({...f1,institucion:e.target.value})}/></div></div><div><FirmaUploader label="Firma" settingKey="firmante1_firma_path" appSettings={appSettings} onUpdateSetting={onUpdateSetting}/></div></div></div></Card>
      <Card><div className="space-y-4"><h4 className="font-bold text-indigo-800">Firmante 2 (Secretaria/o)</h4><div className="grid md:grid-cols-2 gap-4"><div className="space-y-3"><div><label className="block text-sm font-bold mb-1">Nombre</label><input className="w-full border p-2.5 rounded-lg" value={f2.nombre} onChange={e=>setF2({...f2,nombre:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Cargo</label><input className="w-full border p-2.5 rounded-lg" value={f2.cargo} onChange={e=>setF2({...f2,cargo:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Institución</label><input className="w-full border p-2.5 rounded-lg" value={f2.institucion} onChange={e=>setF2({...f2,institucion:e.target.value})}/></div></div><div><FirmaUploader label="Firma" settingKey="firmante2_firma_path" appSettings={appSettings} onUpdateSetting={onUpdateSetting}/></div></div></div></Card>
      <Card><div className="space-y-4"><h4 className="font-bold text-purple-800">Sello de la Comisión</h4><FirmaUploader label="Imagen del sello" settingKey="sello_path" appSettings={appSettings} onUpdateSetting={onUpdateSetting}/></div></Card>
      <button onClick={handleSaveNames} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"><Save size={18}/> {saving?'Guardando...':'Guardar Nombres y Cargos'}</button>
    </div>
  );
};

const AdminFormFileTab = ({ appSettings, onUpdateSetting }) => {
  const [uploading,setUploading]=useState(false);const [msg,setMsg]=useState(null);
  const fp=appSettings?.aval_form_file_path||'';
  const fUrl=fp?buildStorageUrl(fp,'aval-form-template'):null;
  const handleUpload=async(e)=>{const f=e.target.files[0];if(!f)return;setUploading(true);setMsg(null);try{const fn=`formulario_aval_${Date.now()}.${f.name.split('.').pop()}`;if(fp)await supabase.storage.from('aval-form-template').remove([fp]);const{data,error}=await supabase.storage.from('aval-form-template').upload(fn,f,{upsert:true});if(error)setMsg({type:'error',text:error.message});else{await onUpdateSetting('aval_form_file_path',data.path);setMsg({type:'success',text:'Archivo subido.'});}}catch(err){setMsg({type:'error',text:err.message});}setUploading(false);};
  const handleRemove=async()=>{if(!fp||!confirm('¿Eliminar?'))return;await supabase.storage.from('aval-form-template').remove([fp]);await onUpdateSetting('aval_form_file_path','');setMsg({type:'success',text:'Eliminado.'});};
  return (<div className="space-y-4"><h3 className="text-lg font-bold text-gray-700">Formulario de Solicitud</h3>{msg&&<div className={`p-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'} border`}>{msg.text}</div>}<Card>{fUrl?(<div className="space-y-4"><div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"><FileText size={24} className="text-green-600 shrink-0"/><div className="flex-1"><p className="font-medium text-green-800">Archivo activo</p></div><a href={fUrl} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700">Ver</a><button onClick={handleRemove} className="bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-200">Eliminar</button></div><label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50"><Upload size={20} className="text-gray-400"/><span className="text-sm text-gray-500">{uploading?'Subiendo...':'Reemplazar'}</span><input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx"/></label></div>):(<div className="text-center space-y-4"><Upload size={28} className="text-gray-400 mx-auto"/><p className="font-medium text-gray-700">Sin formulario</p><label className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg cursor-pointer hover:bg-blue-700 font-medium"><Upload size={18}/>{uploading?'Subiendo...':'Subir Formulario'}<input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx,.xlsx"/></label></div>)}</Card></div>);
};

const AdminReglamentoTab = ({ appSettings, onUpdateSetting }) => {
  const [uploading,setUploading]=useState(false);const [msg,setMsg]=useState(null);
  const fp=appSettings?.reglamento_file_path||'';
  const fUrl=fp?buildStorageUrl(fp,'reglamento-avales'):null;
  const handleUpload=async(e)=>{const f=e.target.files[0];if(!f)return;setUploading(true);setMsg(null);try{const fn=`reglamento_avales_${Date.now()}.${f.name.split('.').pop()}`;if(fp)await supabase.storage.from('reglamento-avales').remove([fp]);const{data,error}=await supabase.storage.from('reglamento-avales').upload(fn,f,{upsert:true});if(error)setMsg({type:'error',text:error.message});else{await onUpdateSetting('reglamento_file_path',data.path);setMsg({type:'success',text:'Reglamento subido.'});}}catch(err){setMsg({type:'error',text:err.message});}setUploading(false);};
  const handleRemove=async()=>{if(!fp||!confirm('¿Eliminar el reglamento?'))return;await supabase.storage.from('reglamento-avales').remove([fp]);await onUpdateSetting('reglamento_file_path','');setMsg({type:'success',text:'Eliminado.'});};
  return (<div className="space-y-4"><h3 className="text-lg font-bold text-gray-700">Reglamento de Avales</h3>{msg&&<div className={`p-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'} border`}>{msg.text}</div>}<Card>{fUrl?(<div className="space-y-4"><div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg"><BookOpen size={24} className="text-purple-600 shrink-0"/><div className="flex-1"><p className="font-medium text-purple-800">Reglamento activo</p></div><a href={fUrl} target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700">Ver</a><button onClick={handleRemove} className="bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-200">Eliminar</button></div><label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-purple-400 hover:bg-purple-50"><Upload size={20} className="text-gray-400"/><span className="text-sm text-gray-500">{uploading?'Subiendo...':'Reemplazar'}</span><input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx"/></label></div>):(<div className="text-center space-y-4"><BookOpen size={28} className="text-gray-400 mx-auto"/><p className="font-medium text-gray-700">Sin reglamento</p><label className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg cursor-pointer hover:bg-purple-700 font-medium"><Upload size={18}/>{uploading?'Subiendo...':'Subir Reglamento'}<input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.doc,.docx"/></label></div>)}</Card></div>);
};

const AdminTutorialTab = ({ appSettings, onUpdateSetting }) => {
  const [url,setUrl]=useState('');const [saving,setSaving]=useState(false);const [msg,setMsg]=useState(null);
  useEffect(()=>{setUrl(appSettings?.youtube_tutorial_url||'');},[appSettings?.youtube_tutorial_url]);
  const getEmbed=(raw)=>{if(!raw)return null;let vid=null;try{const u=new URL(raw);if(u.hostname.includes('youtu.be'))vid=u.pathname.slice(1);else if(u.searchParams.get('v'))vid=u.searchParams.get('v');else if(u.pathname.includes('/embed/'))vid=u.pathname.split('/embed/')[1];}catch{return null;}return vid?`https://www.youtube.com/embed/${vid}`:null;};
  const handleSave=async()=>{setSaving(true);setMsg(null);try{await onUpdateSetting('youtube_tutorial_url',url.trim());setMsg({type:'success',text:'Guardado.'});}catch(err){setMsg({type:'error',text:err.message});}setSaving(false);};
  const embed=getEmbed(url);
  return (<div className="space-y-4"><h3 className="text-lg font-bold text-gray-700">Tutorial de YouTube</h3>{msg&&<div className={`p-3 rounded-lg text-sm ${msg.type==='success'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'} border`}>{msg.text}</div>}<Card><div className="space-y-4"><div className="flex gap-2"><div className="relative flex-1"><Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="url" placeholder="https://www.youtube.com/watch?v=..." className="w-full border p-2.5 pl-9 rounded-lg" value={url} onChange={e=>setUrl(e.target.value)}/></div><button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium shrink-0"><Save size={16}/>{saving?'...':'Guardar'}</button></div>{embed&&<div className="relative w-full bg-black rounded-lg overflow-hidden" style={{paddingTop:'56.25%'}}><iframe src={embed} className="absolute inset-0 w-full h-full" allowFullScreen title="Tutorial"/></div>}{url&&!embed&&<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700"><AlertTriangle size={16} className="inline mr-1"/>URL no válido.</div>}{url&&<button onClick={async()=>{await onUpdateSetting('youtube_tutorial_url','');setUrl('');}} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"><Trash2 size={14}/> Quitar</button>}</div></Card></div>);
};

// ── AvalesAdminView ────────────────────────────────────────────────────────────
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
      {visibleAvales.map(req => (
        <Card key={req.id}>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2"><h3 className="font-bold text-lg">{req.applicant_name}</h3><span className="text-xs text-gray-400">#{req.request_number}</span></div>
              <p className="text-gray-600">{req.activity_name}</p>
              {req.institution && <p className="text-sm text-gray-500">{req.institution}</p>}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {req.activity_date && <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12}/>{req.activity_date}</span>}
                {req.email && <span className="text-xs text-gray-500">{req.email}</span>}
                {req.correlativo && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">Aval: {req.correlativo}</span>}
              </div>
              {req.approval_reason && <p className="text-xs text-gray-500 mt-1 italic">Nota: {req.approval_reason}</p>}
              {req.form_url ? <a href={`${supabaseUrl}/storage/v1/object/public/avales-files/${req.form_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 text-xs mt-2 hover:underline font-medium"><Download size={12}/> PDF adjunto</a> : <p className="text-xs text-gray-400 mt-2">Sin archivo adjunto</p>}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge status={req.status}/>
              {req.status==='En Proceso' && <div className="flex gap-2"><button onClick={()=>openAction(req,'Aprobado')} className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs hover:bg-green-200">Aprobar</button><button onClick={()=>openAction(req,'Rechazado')} className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs hover:bg-red-200">Rechazar</button></div>}
              {req.status==='Aprobado' && <div className="flex gap-1"><button onClick={()=>openApprovalLetter(req,appSettings,'preview')} className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-100 flex items-center gap-1"><Eye size={12}/> Ver</button><button onClick={()=>openApprovalLetter(req,appSettings,'download')} className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-100 flex items-center gap-1"><FileDown size={12}/> PDF</button></div>}
              <div className="flex gap-2"><button onClick={()=>openEdit(req)} className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs hover:bg-blue-100 flex items-center gap-1"><Edit3 size={12}/> Editar</button><button onClick={()=>{setDeleteModal(req);setDeleteReason('');}} className="bg-gray-50 text-red-500 px-3 py-1 rounded text-xs hover:bg-red-50 flex items-center gap-1"><Trash2 size={12}/> Eliminar</button></div>
            </div>
          </div>
        </Card>
      ))}
      {visibleAvales.length===0 && <div className="text-gray-400 text-center py-10">No hay solicitudes.</div>}
      <Modal isOpen={!!actionModal} onClose={()=>setActionModal(null)} title={actionModal?.action==='Aprobado'?'Aprobar':'Rechazar'} size="sm"><div className="space-y-4"><p className="text-gray-600">Solicitud de: <strong>{actionModal?.name}</strong></p><div><label className="block text-sm font-bold mb-1">Justificación *</label><textarea required rows={3} className="w-full border p-2 rounded" value={reason} onChange={e=>setReason(e.target.value)}/></div>{actionModal?.action==='Aprobado'&&<div><label className="block text-sm font-bold mb-1">Número de Correlativo *</label><input required placeholder="Ej: CAEDUC-01-2026" className="w-full border p-2 rounded" value={correlativoInput} onChange={e=>setCorrelativoInput(e.target.value)}/></div>}<button onClick={handleAction} disabled={saving||!reason.trim()||(actionModal?.action==='Aprobado'&&!correlativoInput.trim())} className={`w-full py-2 rounded font-bold text-white disabled:opacity-50 ${actionModal?.action==='Aprobado'?'bg-green-600 hover:bg-green-700':'bg-red-600 hover:bg-red-700'}`}>{saving?'Guardando...':'Confirmar'}</button></div></Modal>
      <Modal isOpen={!!editModal} onClose={()=>setEditModal(null)} title="Editar Solicitud" size="sm"><div className="space-y-4"><div><label className="block text-sm font-bold mb-1">Estado</label><select className="w-full border p-2 rounded" value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})}><option value="En Proceso">En Proceso</option><option value="Aprobado">Aprobado</option><option value="Rechazado">Rechazado</option></select></div><div><label className="block text-sm font-bold mb-1">Razón</label><textarea rows={3} className="w-full border p-2 rounded" value={editData.approval_reason} onChange={e=>setEditData({...editData,approval_reason:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Correlativo</label><input className="w-full border p-2 rounded" value={editData.correlativo} onChange={e=>setEditData({...editData,correlativo:e.target.value})}/></div><div><label className="block text-sm font-bold mb-1">Fecha de Aprobación</label><input type="date" className="w-full border p-2 rounded" value={editData.approval_date} onChange={e=>setEditData({...editData,approval_date:e.target.value})}/></div><button onClick={handleEdit} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50">{saving?'Guardando...':'Guardar'}</button></div></Modal>
      <Modal isOpen={!!deleteModal} onClose={()=>setDeleteModal(null)} title="Eliminar Solicitud" size="sm"><div className="space-y-4"><div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-red-700 font-medium">¿Eliminar solicitud de "{deleteModal?.applicant_name}"?</p></div><div><label className="block text-sm font-bold mb-1">Razón *</label><textarea required rows={3} className="w-full border p-2 rounded" value={deleteReason} onChange={e=>setDeleteReason(e.target.value)}/></div><button onClick={handleDelete} disabled={saving||!deleteReason.trim()} className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 disabled:opacity-50">{saving?'Eliminando...':'Confirmar'}</button></div></Modal>
    </div>
  );
};

// ── ReportesView ───────────────────────────────────────────────────────────────
const ReportesView = ({ avales, docs, oficios }) => {
  const [reportTab, setReportTab] = useState('reportes');
  const [showModal,setShowModal]=useState(false);const [dateFrom,setDateFrom]=useState('');const [dateTo,setDateTo]=useState('');const [reportFormat,setReportFormat]=useState('pdf');const [generating,setGenerating]=useState(false);
  const generateReport=async()=>{if(!dateFrom||!dateTo){alert('Selecciona ambas fechas.');return;}setGenerating(true);const filtered=avales.filter(a=>{const d=a.activity_date||a.created_at?.substring(0,10);return d>=dateFrom&&d<=dateTo;});if(filtered.length===0){alert('No hay solicitudes en ese período.');setGenerating(false);return;}if(reportFormat==='excel')generateCSV(filtered);else await generatePDF_report(filtered);setGenerating(false);setShowModal(false);};
  const generateCSV=(data)=>{const h=['Actividad','Solicitante','Institución','Fecha','Estado','Correlativo','Tipo','Modalidad','Duración','Notas'];const rows=data.map(a=>[a.activity_name||'',a.applicant_name||'',a.institution||'',a.activity_date||'',a.is_deleted?'Eliminado':(a.status||''),a.correlativo||'',a.activity_type||'',a.modality||'',a.duration||'',a.approval_reason||'']);const csv=[h,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`reporte_avales_${dateFrom}_${dateTo}.csv`;a.click();};
  const generatePDF_report=async(data)=>{const rows=data.map(a=>`<tr><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.activity_name||''}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.applicant_name||''}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.institution||''}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.activity_date||''}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;font-weight:bold;color:${a.is_deleted?'#666':a.status==='Aprobado'?'#16a34a':a.status==='Rechazado'?'#dc2626':'#2563eb'}">${a.is_deleted?'Eliminado':(a.status||'')}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.correlativo||'—'}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.activity_type||'—'}</td><td style="border:1px solid #ddd;padding:6px;font-size:11px;">${a.approval_reason||'—'}</td></tr>`).join('');const html=`<div style="font-family:Arial;padding:30px;background:white;width:10in;"><h1 style="color:#1e3a5f;font-size:20px;">Reporte de Avales — CAEDUC</h1><p style="color:#666;font-size:12px;">Período: ${dateFrom} al ${dateTo} | Total: ${data.length}</p><table style="width:100%;border-collapse:collapse;margin-top:10px;"><thead><tr style="background:#1e3a5f;color:white;"><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Actividad</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Solicitante</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Institución</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Fecha</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Estado</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Correlativo</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Tipo</th><th style="border:1px solid #ddd;padding:8px;font-size:10px;text-align:left;">Notas</th></tr></thead><tbody>${rows}</tbody></table><p style="color:#999;font-size:10px;margin-top:20px;">Generado: ${new Date().toLocaleString()}</p></div>`;await downloadPDF(html,`Reporte_Avales_${dateFrom}_${dateTo}`);};
  const active=avales.filter(a=>!a.is_deleted);
 
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl inline-flex">
        <button onClick={() => setReportTab('reportes')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${reportTab === 'reportes' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <FileSpreadsheet size={15}/> Reportes de Avales
        </button>
        <button onClick={() => setReportTab('souvenirs')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${reportTab === 'souvenirs' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Gift size={15}/> Souvenirs
        </button>
      </div>
 
      {/* ── Tab Reportes de Avales ── */}
      {reportTab === 'reportes' && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Reportes e Historial</h2>
            <button onClick={()=>setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium"><FileSpreadsheet size={18}/> Generar Reporte</button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Card><div className="text-center"><p className="text-3xl font-bold text-blue-700">{avales.length}</p><p className="text-sm text-gray-500">Total Avales</p></div></Card>
            <Card><div className="text-center"><p className="text-3xl font-bold text-green-600">{active.filter(a=>a.status==='Aprobado').length}</p><p className="text-sm text-gray-500">Aprobadas</p></div></Card>
            <Card><div className="text-center"><p className="text-3xl font-bold text-red-600">{active.filter(a=>a.status==='Rechazado').length}</p><p className="text-sm text-gray-500">Rechazadas</p></div></Card>
            <Card><div className="text-center"><p className="text-3xl font-bold text-indigo-600">{oficios.length}</p><p className="text-sm text-gray-500">Oficios</p></div></Card>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card><h3 className="font-bold mb-2 text-indigo-700">Avales ({active.length})</h3><div className="h-64 overflow-y-auto text-sm border-t pt-2">{active.map(a=><div key={a.id} className="border-b py-2 flex justify-between items-center"><div><span className="font-medium">{a.activity_name}</span><span className="text-gray-400 text-xs ml-2">#{a.request_number}</span>{a.correlativo&&<span className="text-indigo-600 text-xs ml-2">[{a.correlativo}]</span>}</div><Badge status={a.status}/></div>)}{active.length===0&&<p className="text-gray-400 text-center py-8">Sin avales</p>}</div></Card>
            <Card><h3 className="font-bold mb-2 text-indigo-700">Oficios ({oficios.length})</h3><div className="h-64 overflow-y-auto text-sm border-t pt-2">{oficios.map(o=><div key={o.id} className="border-b py-2 flex justify-between items-center"><div><span className="font-semibold">{o.numero_oficio}</span><span className="text-gray-400 text-xs ml-2">{o.fecha}</span></div><Badge status={o.estado}/></div>)}{oficios.length===0&&<p className="text-gray-400 text-center py-8">Sin oficios</p>}</div></Card>
          </div>
          <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Generar Reporte" size="sm">
            <div className="space-y-4">
              <div><label className="block text-sm font-bold mb-1">Fecha Inicio</label><input type="date" className="w-full border p-2 rounded" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></div>
              <div><label className="block text-sm font-bold mb-1">Fecha Fin</label><input type="date" className="w-full border p-2 rounded" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></div>
              <div><label className="block text-sm font-bold mb-1">Formato</label>
                <div className="flex gap-3">
                  <label className={`flex-1 border rounded-lg p-3 cursor-pointer text-center transition-all ${reportFormat==='pdf'?'border-blue-500 bg-blue-50 text-blue-700':'border-gray-200'}`}><input type="radio" name="fmt" value="pdf" checked={reportFormat==='pdf'} onChange={()=>setReportFormat('pdf')} className="sr-only"/><FileText size={20} className="mx-auto mb-1"/><span className="text-sm font-medium">PDF</span></label>
                  <label className={`flex-1 border rounded-lg p-3 cursor-pointer text-center transition-all ${reportFormat==='excel'?'border-green-500 bg-green-50 text-green-700':'border-gray-200'}`}><input type="radio" name="fmt" value="excel" checked={reportFormat==='excel'} onChange={()=>setReportFormat('excel')} className="sr-only"/><FileSpreadsheet size={20} className="mx-auto mb-1"/><span className="text-sm font-medium">CSV</span></label>
                </div>
              </div>
              <button onClick={generateReport} disabled={generating} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{generating?'Generando...':'Generar Reporte'}</button>
            </div>
          </Modal>
        </>
      )}
 
      {/* ── Tab Souvenirs ── */}
      {reportTab === 'souvenirs' && <SouvenirsView/>}
    </div>
  );
};

// ── Sidebar ────────────────────────────────────────────────────────────────────
const Sidebar = ({ isOpen, toggle, current, setModule, logout }) => (
  <div className={`bg-slate-800 text-white fixed h-full z-20 transition-all ${isOpen?'w-64':'w-20'}`}>
    <div className="p-4 flex justify-between border-b border-slate-700">{isOpen&&<h1 className="font-bold">CAEDUC App</h1>}<button onClick={toggle}><Menu size={20}/></button></div>
    <nav className="p-2 space-y-2 mt-4">
      <SidebarBtn icon={<CheckCircle/>} label="Planificación" active={current==='planificacion'} onClick={()=>setModule('planificacion')} isOpen={isOpen}/>
      <SidebarBtn icon={<Users/>} label="Avales" active={current==='avales'} onClick={()=>setModule('avales')} isOpen={isOpen}/>
      <SidebarBtn icon={<FileSignature/>} label="Oficios y Cartas" active={current==='oficios'} onClick={()=>setModule('oficios')} isOpen={isOpen}/>
      <SidebarBtn icon={<BookOpen/>} label="Agendas" active={current==='agendas'} onClick={()=>setModule('agendas')} isOpen={isOpen}/>
      <SidebarBtn icon={<Users/>} label="Directorio" active={current==='directorio'} onClick={()=>setModule('directorio')} isOpen={isOpen}/>
      <SidebarBtn icon={<Clock/>} label="Reportes" active={current==='reportes'} onClick={()=>setModule('reportes')} isOpen={isOpen}/>
      <SidebarBtn icon={<Settings/>} label="Admin" active={current==='admin_config'} onClick={()=>setModule('admin_config')} isOpen={isOpen}/>
    </nav>
    <button onClick={logout} className="absolute bottom-4 left-4 flex gap-2 text-red-300 hover:text-white items-center"><LogOut size={18}/>{isOpen&&'Salir'}</button>
  </div>
);
const SidebarBtn = ({ icon, label, active, onClick, isOpen }) => (
  <button onClick={onClick} className={`flex items-center gap-3 p-3 w-full rounded ${active?'bg-blue-600':'hover:bg-slate-700'}`}>{icon}{isOpen&&<span>{label}</span>}</button>
);

// ── CAEDUCApp ──────────────────────────────────────────────────────────────────
export default function CAEDUCApp() {
  const [session,setSession]=useState(null);const [userMode,setUserMode]=useState('public');const [currentModule,setCurrentModule]=useState('planificacion');const [isSidebarOpen,setSidebarOpen]=useState(true);const [loading,setLoading]=useState(false);const [authError,setAuthError]=useState(null);const [avales,setAvales]=useState([]);const [members,setMembers]=useState([]);const [internalDocs,setInternalDocs]=useState([]);const [oficios,setOficios]=useState([]);const [appSettings,setAppSettings]=useState({});const [oficioPreFill,setOficioPreFill]=useState(null);

  const fetchPublicSettings=useCallback(async()=>{try{const{data}=await supabase.from('app_settings').select('key, value');if(data){const m={};data.forEach(r=>{m[r.key]=r.value;});setAppSettings(m);}}catch(e){console.error(e);}},[]);

  useEffect(()=>{fetchPublicSettings();supabase.auth.getSession().then(({data:{session}})=>{setSession(session);if(session){setUserMode('admin');fetchData();}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{setSession(session);if(session){setUserMode('admin');fetchData();}else setUserMode('public');});return()=>subscription.unsubscribe();},[fetchPublicSettings]);

  const fetchData=async()=>{setLoading(true);try{const[{data:avl},{data:mem},{data:docs},{data:ofi},{data:settings}]=await Promise.all([supabase.from('avales').select('*').order('created_at',{ascending:false}),supabase.from('profiles').select('*'),supabase.from('internal_documents').select('*').limit(50),supabase.from('oficios').select('*').order('created_at',{ascending:false}),supabase.from('app_settings').select('key, value')]);if(avl)setAvales(avl);if(mem)setMembers(mem);if(docs)setInternalDocs(docs);if(ofi)setOficios(ofi);if(settings){const m={};settings.forEach(r=>{m[r.key]=r.value;});setAppSettings(m);}}catch(e){console.error(e);}setLoading(false);};

  const handleLogin=async(email,password)=>{setLoading(true);setAuthError(null);const{data,error}=await supabase.auth.signInWithPassword({email,password});if(error)setAuthError(error.message);else{setSession(data.session);setUserMode('admin');fetchData();}setLoading(false);};
  const handleLogout=async()=>{await supabase.auth.signOut();setSession(null);setUserMode('public');setAuthError(null);};

  const submitAval=async(formData,file1)=>{let formUrl=null;if(file1){const{data:f1,error:ue}=await supabase.storage.from('avales-files').upload('forms/' + Date.now() + '_' + file1.name, file1);if(ue){alert('Error archivo: '+ue.message);return null;}if(f1)formUrl=f1.path;}const{data:inserted,error}=await supabase.from('avales').insert([{applicant_name:formData.applicantName,institution:formData.institution,activity_name:formData.activityName,activity_date:formData.activityDate,email:formData.email,activity_type:formData.activityType,duration:formData.duration,modality:formData.modality,schedule:formData.schedule,platform:formData.platform,topic:formData.topic,target_audience:formData.targetAudience,form_url:formUrl,status:'En Proceso'}]).select('request_number');if(error){alert(error.message);return null;}return inserted?.[0]?.request_number||null;};

  const updateAval=async(id,updates)=>{const{error}=await supabase.from('avales').update(updates).eq('id',id);if(error)alert(error.message);else fetchData();};
  const deleteAval=async(id,reason)=>{const{error}=await supabase.from('avales').update({is_deleted:true,deletion_reason:reason}).eq('id',id);if(error)alert(error.message);else fetchData();};
  const updateMember=async(id,updates)=>{const{error}=await supabase.from('profiles').update(updates).eq('id',id);if(error)throw error;else await fetchData();};
  const updateSetting=async(key,value)=>{const{error}=await supabase.from('app_settings').update({value,updated_at:new Date().toISOString()}).eq('key',key);if(error){const{error:ie}=await supabase.from('app_settings').insert([{key,value}]);if(ie)throw ie;}setAppSettings(prev=>({...prev,[key]:value}));};

  const createOficio=async(data)=>{const{error}=await supabase.from('oficios').insert([data]);if(error){alert('Error al crear: '+error.message);return;}fetchData();};
  const updateOficio=async(id,data)=>{
    const{estado,...rest}=data;
    let editFields={};
    const existing=oficios.find(o=>o.id===id);
    if(existing&&existing.estado==='Archivado'){
      const{data:userData}=await supabase.auth.getUser();
      const userName=userData?.user?.email||'usuario';
      editFields={ultima_edicion_en:new Date().toISOString(),ultima_edicion_por:userName,ultima_edicion_razon:data.ultima_edicion_razon||'Editado manualmente'};
    }
    const{error}=await supabase.from('oficios').update({...rest,estado,updated_at:new Date().toISOString(),...editFields}).eq('id',id);
    if(error){alert('Error: '+error.message);return;}
    fetchData();
  };
  const deleteOficio=async(id)=>{const{error}=await supabase.from('oficios').delete().eq('id',id);if(error){alert('Error: '+error.message);return;}fetchData();};

  const handleNavigateToOficios=(activityData)=>{setOficioPreFill({actividad_nombre:activityData.actividad||'',actividad_tipo:activityData.tipo||'',actividad_fecha:activityData.fecha||'',actividad_duracion:'',actividad_modalidad:activityData.sede_modalidad||'',actividad_sede:activityData.t3_lugar||activityData.sede_modalidad||''});setCurrentModule('oficios');};

  const adminClass = userMode === 'admin' ? (isSidebarOpen ? 'ml-64' : 'ml-20') : '';

  return (
    <ErrorBoundary>
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800">
      {userMode==='admin' && <Sidebar isOpen={isSidebarOpen} toggle={()=>setSidebarOpen(!isSidebarOpen)} current={currentModule} setModule={(mod)=>{if(mod!=='oficios')setOficioPreFill(null);setCurrentModule(mod);}} logout={handleLogout}/>}
      <main className={"flex-1 p-4 md:p-8 transition-all " + adminClass} style={{overflowX:'hidden',minWidth:0}}>
        {userMode==='public' && <LoginView handleLogin={handleLogin} loading={loading} authError={authError} setUserMode={setUserMode} appSettings={appSettings}/>}
        {userMode==='external' && <ExternalAvalesView submitAval={submitAval} onBack={()=>setUserMode('public')} appSettings={appSettings}/>}
        {userMode==='consultar_estado' && <ConsultarEstadoView onBack={()=>setUserMode('public')} appSettings={appSettings}/>}
        {userMode==='verificar_aval' && <VerificarAvalView onBack={()=>setUserMode('public')}/>}
        {userMode==='admin' && (
          <>
            {(currentModule==='planificacion'||currentModule==='dashboard') && <PlanificacionCAEDUCView onNavigateOficios={handleNavigateToOficios}/>}
            {currentModule==='avales' && <AvalesAdminView avales={avales} updateAval={updateAval} deleteAval={deleteAval} appSettings={appSettings}/>}
            {currentModule==='oficios' && <OficiosAdminView oficios={oficios} onCreateOficio={createOficio} onUpdateOficio={updateOficio} onDeleteOficio={deleteOficio} appSettings={appSettings} preFillData={oficioPreFill} onClearPreFill={()=>setOficioPreFill(null)}/>}
            {currentModule==='agendas' && <AgendasView/>}
            {currentModule==='directorio' && <DirectorioView/>}
            {currentModule==='reportes' && <ReportesView avales={avales} docs={internalDocs} oficios={oficios}/>}
            {currentModule==='admin_config' && <AdminConfigView appSettings={appSettings} onUpdateSetting={updateSetting} members={members} onUpdateMember={updateMember}/>}
          </>
        )}
      </main>
    </div>
    </ErrorBoundary>
  );
}
