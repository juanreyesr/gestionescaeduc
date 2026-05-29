// src/CartasView.jsx — Sistema de Cartas CAEDUC v2
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Mail, Plus, Eye, Download, Edit3, Trash2, X, Save,
  FileText, Calendar, Clock, MapPin, CheckCircle, Square,
  ChevronDown, Search, User, AlertCircle, Send, Package
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
);
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

// Construye URL de storage soportando paths relativos Y URLs completas (post-migración)
const buildStorageUrl = (path, bucket) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

// ── Utilidades ────────────────────────────────────────────────────────────────
const formatDateLong = (iso) => {
  if (!iso) return '—';
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
};
const todayISO = () => new Date().toISOString().split('T')[0];

// Documentos que se esperan en la respuesta del ponente
const DOCS_ESPERADOS = [
  { id: 'carta_aceptacion', label: 'Carta de aceptación' },
  { id: 'rtu',             label: 'RTU' },
  { id: 'dpi',             label: 'DPI' },
  { id: 'cv',              label: 'CV actualizado' },
  { id: 'foto',            label: 'Fotografía para publicidad' },
  { id: 'firma_diploma',   label: 'Firma para el diploma (rúbrica no oficial)' },
];

// ── PLANTILLAS ────────────────────────────────────────────────────────────────
export const CARTA_TEMPLATES = [
  {
    id: 'invitacion_ponente',
    nombre: 'Invitación a Ponente / Facilitador',
    descripcion: 'Para invitar a profesionales a participar como ponentes en actividades académicas.',
    icon: '🎓',
  }
];

// ── Generador HTML ────────────────────────────────────────────────────────────
const generateCartaInvitacionHTML = (campos, settings = {}) => {
  const {
    tratamiento = 'Estimada', grado = '', nombre = '',
    tipo_actividad = '', tema = '', fecha_actividad = '',
    hora = '', modalidad = 'Virtual', plataforma_o_direccion = '',
    fecha_carta = todayISO(),
  } = campos;

  const f1Name  = settings.firmante1_nombre || 'M. A. Juan J. Reyes';
  const f1Cargo = settings.firmante1_cargo  || 'Coordinador';
  const f1Inst  = settings.firmante1_institucion || 'Comisión de Acreditación y Educación Continua, Colegio de Psicólogos de Guatemala';
  const f1FirmaUrl = buildStorageUrl(settings.firmante1_firma_path, 'firmas-sellos');
  const selloUrl   = buildStorageUrl(settings.sello_path, 'firmas-sellos');
  const membreteUrl = settings.membrete_path
    ? buildStorageUrl(settings.membrete_path, 'firmas-sellos')
    : '/fondo-oficios.jpg';

  const instLines = f1Inst.split(',').map(s => s.trim()).filter(Boolean);
  const esEstimada = tratamiento === 'Estimada';
  const rol = tipo_actividad.toLowerCase().includes('taller')
    ? (esEstimada ? 'facilitadora' : 'facilitador')
    : tipo_actividad.toLowerCase().includes('diplomado')
    ? (esEstimada ? 'instructora' : 'instructor')
    : 'ponente';
  const articulo = esEstimada ? 'la' : 'el';
  const lugarTexto = modalidad === 'Presencial'
    ? `en las instalaciones ubicadas en: ${plataforma_o_direccion}`
    : modalidad === 'Virtual'
    ? `a través de la plataforma ${plataforma_o_direccion}`
    : `en modalidad híbrida${plataforma_o_direccion ? ' mediante ' + plataforma_o_direccion : ''}`;

  // Firma + sello centrados
  const firmaBlock = `
    <div style="margin-top:28px;text-align:center;">
      <p style="font-size:11.5px;margin-bottom:20px;">Atentamente,</p>
      <div style="display:inline-flex;align-items:flex-end;justify-content:center;gap:28px;">
        ${f1FirmaUrl ? `
          <div style="text-align:center;">
            <img src="${f1FirmaUrl}" alt="Firma" style="height:55px;width:auto;display:block;margin:0 auto -4px;"/>
            <div style="width:210px;border-top:1.5px solid #333;padding-top:5px;">
              <div style="font-size:11.5px;font-weight:700;">${f1Name}</div>
              <div style="font-size:10.5px;color:#555;">${f1Cargo}</div>
              ${instLines.map(l => `<div style="font-size:10px;color:#666;">${l}</div>`).join('')}
            </div>
          </div>` : ''}
        ${selloUrl ? `
          <div style="text-align:center;margin-bottom:6px;">
            <img src="${selloUrl}" alt="Sello" style="height:82px;width:auto;opacity:0.88;"/>
          </div>` : ''}
      </div>
    </div>`;


  const printButton = `
    <div style="text-align:right;padding:10px 30px 0;font-family:Arial;">
      <button onclick="window.print()" style="background:#1e3a5f;color:white;border:none;padding:7px 18px;border-radius:5px;font-size:11px;cursor:pointer;">
        🖨️ Imprimir / Guardar PDF
      </button>
    </div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Carta — ${nombre}</title>
    <style>
      @page{size:letter;margin:0;}
      *{margin:0;padding:0;box-sizing:border-box;}
      body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      @media print{.no-print{display:none!important;}}
    </style>
    <script>window.onafterprint=()=>{};<\/script>
  </head><body>
    <div class="no-print">${printButton}</div>
    <div style="position:relative;width:8.5in;min-height:11in;font-family:'Segoe UI',Arial,sans-serif;color:#333;">
      <img src="${membreteUrl}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;"/>
      <div style="position:relative;z-index:1;padding:1.35in 0.75in 1.9in 0.9in;min-height:11in;box-sizing:border-box;display:flex;flex-direction:column;">
        <div style="flex:1;">
          <div style="text-align:right;margin-bottom:20px;">
            <div style="font-size:11.5px;color:#555;">Guatemala, ${formatDateLong(fecha_carta)}</div>
          </div>
          <div style="margin-bottom:18px;font-size:11.5px;line-height:1.7;">
            <strong>${tratamiento}${grado ? ' ' + grado : ''} ${nombre || '—'}:</strong>
          </div>
          <p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 12px;">
            Reciba un cordial saludo de parte de la <strong>Comisión de Acreditación y Educación Continua —CAEDUC—</strong> del Colegio de Psicólogos de Guatemala.
          </p>
          <p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 12px;">
            Por medio de la presente, nos dirigimos a usted para extenderle una respetuosa invitación a participar como <strong>${rol}</strong> en ${tipo_actividad ? `<strong>${tipo_actividad}</strong>` : 'nuestra próxima actividad académica'}, considerando su valiosa trayectoria y preparación en el área de <strong>${tema || '—'}</strong>.
          </p>
          <p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 12px;">
            La actividad se llevará a cabo el día <strong>${formatDateLong(fecha_actividad)}</strong>, a las <strong>${hora || '—'}</strong>, en modalidad <strong>${modalidad}</strong>${plataforma_o_direccion ? `, ${lugarTexto}` : ''}.
          </p>
          <p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 8px;">
            De aceptar esta invitación, le solicitamos atentamente hacernos saber su confirmación a la brevedad posible, adjuntando los siguientes documentos:
          </p>
          <ul style="font-size:11.5px;line-height:1.9;margin:0 0 14px;padding-left:20px;">
            <li>Carta de aceptación en respuesta a la presente invitación</li>
            <li>RTU</li>
            <li>DPI</li>
            <li>Currículum Vitae actualizado</li>
            <li>Fotografía para material de publicidad</li>
            <li>Firma para el diploma (rúbrica no oficial)</li>
          </ul>
          <p style="font-size:11.5px;line-height:1.85;text-align:justify;margin:0 0 12px;">
            Agradecemos su disposición y valiosa contribución al fortalecimiento y actualización profesional de ${articulo} comunidad psicológica de Guatemala. Quedamos a su disposición para cualquier consulta o información adicional que requiera.
          </p>
          ${firmaBlock}
        </div>
      </div>
    </div>
  </body></html>`;
};

const CARTA_GENERATORS = { invitacion_ponente: generateCartaInvitacionHTML };

// ── Formulario de campos ──────────────────────────────────────────────────────
function FormInvitacionPonente({ campos, onChange }) {
  const upd = (k, v) => onChange({ ...campos, [k]: v });
  const isPresencial = campos.modalidad === 'Presencial';
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
        <h4 className="font-bold text-blue-800 text-sm">Datos del/la profesional</h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Tratamiento *</label>
            <select required className="w-full border p-2.5 rounded-lg text-sm"
              value={campos.tratamiento} onChange={e => upd('tratamiento', e.target.value)}>
              <option value="Estimada">Estimada</option>
              <option value="Estimado">Estimado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Grado académico</label>
            <input list="grados-list" className="w-full border p-2.5 rounded-lg text-sm" placeholder="Ej: Mtr., Dr."
              value={campos.grado} onChange={e => upd('grado', e.target.value)}/>
            <datalist id="grados-list">{['Lic.','Licda.','Mtr.','Mgtr.','Dr.','Dra.','Ph.D.','MSc.'].map(g=><option key={g} value={g}/>)}</datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Nombre completo *</label>
            <input required className="w-full border p-2.5 rounded-lg text-sm" placeholder="Nombre y apellidos"
              value={campos.nombre} onChange={e => upd('nombre', e.target.value)}/>
          </div>
        </div>
      </div>
      <div className="bg-green-50 rounded-xl p-4 space-y-3 border border-green-100">
        <h4 className="font-bold text-green-800 text-sm">Datos de la actividad</h4>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Tipo de actividad *</label>
          <input list="tipo-act-list" required className="w-full border p-2.5 rounded-lg text-sm"
            placeholder="Ej: Taller, Conferencia, Diplomado..."
            value={campos.tipo_actividad} onChange={e => upd('tipo_actividad', e.target.value)}/>
          <datalist id="tipo-act-list">{['Conferencia','Taller','Diplomado','Seminario','Ponencia Webinar','Congreso','Simposio','Curso'].map(t=><option key={t} value={t}/>)}</datalist>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Tema de la actividad *</label>
          <input required className="w-full border p-2.5 rounded-lg text-sm"
            placeholder="Ej: Neuropsicología aplicada al contexto educativo"
            value={campos.tema} onChange={e => upd('tema', e.target.value)}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Fecha *</label>
            <input required type="date" className="w-full border p-2.5 rounded-lg text-sm"
              value={campos.fecha_actividad} onChange={e => upd('fecha_actividad', e.target.value)}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Hora *</label>
            <input required type="time" className="w-full border p-2.5 rounded-lg text-sm"
              value={campos.hora} onChange={e => upd('hora', e.target.value)}/>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Modalidad *</label>
          <select required className="w-full border p-2.5 rounded-lg text-sm"
            value={campos.modalidad} onChange={e => upd('modalidad', e.target.value)}>
            <option value="Virtual">Virtual</option>
            <option value="Presencial">Presencial</option>
            <option value="Híbrida">Híbrida</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            {isPresencial ? 'Dirección / Sede *' : 'Plataforma (Zoom, Teams...) *'}
          </label>
          <input className="w-full border p-2.5 rounded-lg text-sm"
            placeholder={isPresencial ? 'Ej: Sede Central CPG, 3ra Calle 6-63 Zona 9' : 'Ej: Zoom, enlace se enviará por correo'}
            value={campos.plataforma_o_direccion} onChange={e => upd('plataforma_o_direccion', e.target.value)}/>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <label className="block text-xs font-bold text-gray-600 mb-1">Fecha de la carta</label>
        <input type="date" className="w-full border p-2.5 rounded-lg text-sm"
          value={campos.fecha_carta || todayISO()} onChange={e => upd('fecha_carta', e.target.value)}/>
      </div>
    </div>
  );
}

const CARTA_FORMS    = { invitacion_ponente: FormInvitacionPonente };
const CAMPOS_DEFAULTS = {
  invitacion_ponente: {
    tratamiento:'Estimada', grado:'', nombre:'', tipo_actividad:'', tema:'',
    fecha_actividad:'', hora:'', modalidad:'Virtual', plataforma_o_direccion:'', fecha_carta: todayISO(),
  }
};

// ── NuevaCartaModal ────────────────────────────────────────────────────────────
function NuevaCartaModal({ isOpen, onClose, onSave, appSettings, saving, editData, currentUserEmail }) {
  const [step, setStep]           = useState(1);
  const [templateId, setTemplateId] = useState(null);
  const [campos, setCampos]       = useState({});

  useEffect(() => {
    if (!isOpen) { setStep(1); setTemplateId(null); setCampos({}); return; }
    if (editData) {
      setTemplateId(editData.template_id);
      setCampos(editData.campos || {});
      setStep(2);
    }
  }, [isOpen, editData]);

  const selectTemplate = (id) => { setTemplateId(id); setCampos(CAMPOS_DEFAULTS[id]||{}); setStep(2); };
  const template = CARTA_TEMPLATES.find(t => t.id === templateId);
  const FormComponent = templateId ? CARTA_FORMS[templateId] : null;
  const generateHTML  = templateId ? CARTA_GENERATORS[templateId] : null;

  const openPreview = () => {
    if (!generateHTML) return;
    const html = generateHTML(campos, appSettings);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handleSave = async () => {
    const html = generateHTML(campos, appSettings);
    await onSave({
      template_id: templateId,
      template_nombre: template?.nombre,
      destinatario_nombre: campos.nombre || '',
      destinatario_tratamiento: campos.tratamiento || '',
      campos,
      fecha_envio: campos.fecha_carta || todayISO(),
      solicitante_email: currentUserEmail || '',
    }, html, editData?.id);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h3 className="text-lg font-bold">{editData ? 'Editar carta' : step===1 ? 'Nueva Carta' : template?.nombre}</h3>
            {!editData && (
              <div className="flex gap-2 mt-1">
                {[1,2,3].map(s=><div key={s} className={`h-1.5 w-12 rounded-full ${step>=s?'bg-blue-600':'bg-gray-200'}`}/>)}
              </div>
            )}
          </div>
          <button onClick={onClose}><X size={22} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {step===1 && !editData && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">Selecciona el tipo de carta:</p>
              {CARTA_TEMPLATES.map(t=>(
                <button key={t.id} onClick={()=>selectTemplate(t.id)}
                  className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.icon}</span>
                    <div><p className="font-bold text-gray-800 group-hover:text-blue-700">{t.nombre}</p><p className="text-sm text-gray-500">{t.descripcion}</p></div>
                    <ChevronDown size={18} className="ml-auto text-gray-400 -rotate-90"/>
                  </div>
                </button>
              ))}
              <p className="text-xs text-gray-400 text-center pt-2">Próximamente más plantillas</p>
            </div>
          )}
          {(step===2 || editData) && FormComponent && (
            <form onSubmit={e=>{e.preventDefault();editData?setStep(3):setStep(3);}} className="space-y-5">
              <FormComponent campos={campos} onChange={setCampos}/>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-center gap-2">
                <User size={14} className="text-amber-600 shrink-0"/>
                <div>
                  <p className="text-xs font-bold text-amber-700">Solicitada por</p>
                  <p className="text-xs text-amber-600">{currentUserEmail || 'Usuario no identificado'}</p>
                </div>
                <p className="text-xs text-amber-500 ml-auto">No aparece en la carta</p>
              </div>
              <div className="flex gap-3 pt-2">
                {!editData && <button type="button" onClick={()=>setStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">← Volver</button>}
                {editData && <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>}
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Eye size={16}/> Vista previa
                </button>
              </div>
            </form>
          )}
          {step===3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1.5">
                <p className="font-bold text-blue-800 text-sm mb-2">Resumen</p>
                <p className="text-sm"><span className="font-medium">Destinatario/a:</span> {campos.tratamiento} {campos.grado} {campos.nombre}</p>
                <p className="text-sm"><span className="font-medium">Actividad:</span> {campos.tipo_actividad} — {campos.tema}</p>
                <p className="text-sm"><span className="font-medium">Fecha:</span> {formatDateLong(campos.fecha_actividad)} {campos.hora && `a las ${campos.hora}`}</p>
                <p className="text-sm"><span className="font-medium">Modalidad:</span> {campos.modalidad} {campos.plataforma_o_direccion && `· ${campos.plataforma_o_direccion}`}</p>
                <p className="text-sm text-amber-700"><span className="font-medium">Solicitada por:</span> {currentUserEmail}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setStep(2)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">← Editar</button>
                <button onClick={openPreview} className="flex-1 bg-indigo-50 text-indigo-700 py-2.5 rounded-lg font-bold hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center gap-2">
                  <Eye size={16}/> Ver carta
                </button>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={18}/> {saving ? 'Guardando...' : editData ? 'Guardar cambios' : 'Guardar y registrar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CartaBadge ─────────────────────────────────────────────────────────────────
const CartaBadge = ({ estado }) => {
  const map = { 'Pendiente':'bg-yellow-100 text-yellow-800', 'Enviada':'bg-blue-100 text-blue-800', 'Recibida':'bg-green-100 text-green-800' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${map[estado]||'bg-gray-100 text-gray-600'}`}>{estado}</span>;
};

// ── CartaCard ──────────────────────────────────────────────────────────────────
function CartaCard({ carta, appSettings, onUpdate, onDelete, onEdit }) {
  const [expanded, setExpanded]   = useState(false);
  const campos = carta.campos || {};
  const docs   = carta.docs_recibidos || {};

  const toggleDoc = async (docId) => {
    const newDocs = { ...docs, [docId]: !docs[docId] };
    await onUpdate(carta.id, { docs_recibidos: newDocs });
  };

  const setEstado = async (nuevoEstado) => {
    await onUpdate(carta.id, { estado: nuevoEstado });
  };

  const openCarta = () => {
    const gen = CARTA_GENERATORS[carta.template_id];
    if (!gen) return;
    const html = gen(campos, appSettings);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const docsTotal    = DOCS_ESPERADOS.length;
  const docsRecibidos = DOCS_ESPERADOS.filter(d => docs[d.id]).length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-800">
                {carta.destinatario_tratamiento} {campos.grado || ''} {carta.destinatario_nombre || '—'}
              </span>
              <CartaBadge estado={carta.estado || 'Pendiente'}/>
              {carta.editado_por && (
                <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
                  ✏ Editado por: {carta.editado_por.split('@')[0]}
                </span>
              )}
            </div>
            <p className="text-xs text-rose-600 font-medium mt-0.5">{carta.template_nombre}</p>
            {campos.tema && <p className="text-xs text-gray-500 mt-0.5 truncate">{campos.tipo_actividad} · {campos.tema}</p>}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {campos.fecha_actividad && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10}/>{formatDateLong(campos.fecha_actividad)}</span>}
              {campos.hora && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10}/>{campos.hora}</span>}
              {campos.modalidad && <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10}/>{campos.modalidad}</span>}
            </div>
            {carta.solicitante_email && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><User size={10}/> {carta.solicitante_email}</p>
            )}
            {carta.estado === 'Recibida' && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{width: `${(docsRecibidos/docsTotal)*100}%`}}/>
                </div>
                <span className="text-xs text-gray-500 shrink-0">{docsRecibidos}/{docsTotal} docs</span>
              </div>
            )}
          </div>
          <div className="flex gap-1 shrink-0 flex-col items-end">
            <div className="flex gap-1">
              <button onClick={openCarta} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Ver/Imprimir">
                <Eye size={14}/>
              </button>
              <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                <Edit3 size={14}/>
              </button>
              <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar">
                <Trash2 size={14}/>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <div onClick={() => setEstado(carta.estado === 'Enviada' || carta.estado === 'Recibida' ? 'Pendiente' : 'Enviada')}
              className={`w-8 h-4 rounded-full transition-colors flex items-center cursor-pointer ${carta.estado === 'Enviada' || carta.estado === 'Recibida' ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform mx-0.5 ${carta.estado === 'Enviada' || carta.estado === 'Recibida' ? 'translate-x-3.5' : 'translate-x-0'}`}/>
            </div>
            <span className="text-xs font-medium text-gray-600">Enviada</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={() => setEstado(carta.estado === 'Recibida' ? 'Enviada' : 'Recibida')}
              className={`w-8 h-4 rounded-full transition-colors flex items-center cursor-pointer ${carta.estado === 'Recibida' ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform mx-0.5 ${carta.estado === 'Recibida' ? 'translate-x-3.5' : 'translate-x-0'}`}/>
            </div>
            <span className="text-xs font-medium text-gray-600">Respuesta recibida</span>
          </label>
          {carta.estado === 'Recibida' && (
            <button onClick={() => setExpanded(e=>!e)}
              className="text-xs text-green-600 font-medium flex items-center gap-1 hover:text-green-800">
              <Package size={12}/> Documentos {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {carta.estado === 'Recibida' && expanded && (
        <div className="border-t px-4 pb-4 pt-3 bg-green-50">
          <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1"><CheckCircle size={12}/> Documentos recibidos en la respuesta</p>
          <div className="space-y-1.5">
            {DOCS_ESPERADOS.map(doc => (
              <label key={doc.id} className="flex items-center gap-2.5 cursor-pointer group">
                <div onClick={() => toggleDoc(doc.id)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${docs[doc.id] ? 'bg-green-500 border-green-500' : 'border-gray-300 group-hover:border-green-400'}`}>
                  {docs[doc.id] && <CheckCircle size={10} className="text-white"/>}
                </div>
                <span className={`text-xs transition-colors ${docs[doc.id] ? 'text-green-700 font-medium' : 'text-gray-600'}`}>{doc.label}</span>
                {!docs[doc.id] && <span className="text-xs text-amber-500 ml-auto">pendiente</span>}
              </label>
            ))}
          </div>
          {docsRecibidos < docsTotal && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle size={11}/> {docsTotal - docsRecibidos} documento(s) pendiente(s) de seguimiento
            </p>
          )}
          {docsRecibidos === docsTotal && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle size={11}/> ✓ Todos los documentos recibidos
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── CartasSection principal ────────────────────────────────────────────────────
export default function CartasSection({ appSettings }) {
  const [cartas,      setCartas]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [editData,    setEditData]    = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data?.user || null));
  }, []);

  const fetchCartas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cartas').select('*').order('created_at', { ascending: false });
    if (data) setCartas(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCartas(); }, [fetchCartas]);

  const handleSave = async (cartaData, _html, editId) => {
    setSaving(true);
    const userEmail = currentUser?.email || '';
    if (editId) {
      await supabase.from('cartas').update({
        ...cartaData,
        editado_por: userEmail,
        editado_en:  new Date().toISOString(),
      }).eq('id', editId);
    } else {
      await supabase.from('cartas').insert([{ ...cartaData, estado: 'Pendiente' }]);
    }
    await fetchCartas();
    setShowModal(false);
    setEditData(null);
    setSaving(false);
  };

  const handleUpdate = async (id, updates) => {
    await supabase.from('cartas').update(updates).eq('id', id);
    await fetchCartas();
  };

  const handleDelete = async () => {
    await supabase.from('cartas').delete().eq('id', deleteModal.id);
    await fetchCartas();
    setDeleteModal(null);
  };

  const openEdit = (carta) => { setEditData(carta); setShowModal(true); };

  const filtered = cartas.filter(c => {
    const q = search.toLowerCase();
    return !q || c.destinatario_nombre?.toLowerCase().includes(q) ||
      c.template_nombre?.toLowerCase().includes(q) ||
      JSON.stringify(c.campos||{}).toLowerCase().includes(q);
  });

  const pendientes = cartas.filter(c => c.estado === 'Pendiente').length;
  const enviadas   = cartas.filter(c => c.estado === 'Enviada').length;
  const recibidas  = cartas.filter(c => c.estado === 'Recibida').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Mail size={18} className="text-rose-600"/> Cartas</h3>
          <p className="text-sm text-gray-500">Sin número de oficio · Con membrete y firma oficial</p>
        </div>
        <button onClick={() => { setEditData(null); setShowModal(true); }}
          className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-rose-700 flex items-center gap-2 shrink-0">
          <Plus size={18}/> Nueva carta
        </button>
      </div>

      {cartas.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-yellow-600">{pendientes}</p>
            <p className="text-xs text-yellow-700">Pendientes</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-blue-600">{enviadas}</p>
            <p className="text-xs text-blue-700">Enviadas</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-green-600">{recibidas}</p>
            <p className="text-xs text-green-700">Con respuesta</p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="w-full border p-2.5 pl-9 rounded-xl text-sm"
          placeholder="Buscar por nombre, tema, tipo..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {!loading && cartas.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
          <Mail size={48} className="text-gray-200 mx-auto mb-3"/>
          <p className="text-gray-400 text-lg font-medium">Sin cartas generadas</p>
          <p className="text-gray-400 text-sm mb-6">Genera cartas profesionales con membrete y firma a partir de plantillas.</p>
          <button onClick={() => setShowModal(true)}
            className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-rose-700 inline-flex items-center gap-2">
            <Plus size={16}/> Crear primera carta
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(carta => (
          <CartaCard
            key={carta.id}
            carta={carta}
            appSettings={appSettings}
            onUpdate={handleUpdate}
            onDelete={() => setDeleteModal(carta)}
            onEdit={() => openEdit(carta)}
          />
        ))}
      </div>

      {!loading && cartas.length > 0 && filtered.length === 0 && (
        <p className="text-center text-gray-400 py-8">No se encontraron cartas con ese criterio.</p>
      )}

      <NuevaCartaModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditData(null); }}
        onSave={handleSave}
        appSettings={appSettings}
        saving={saving}
        editData={editData}
        currentUserEmail={currentUser?.email || ''}
      />

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg">Eliminar carta</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 font-medium text-sm">¿Eliminar la carta enviada a <strong>{deleteModal.destinatario_nombre}</strong>?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700">Eliminar registro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
