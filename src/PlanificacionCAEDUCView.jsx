// src/PlanificacionCAEDUCView.jsx  –  v2  (presupuesto completo)
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Calendar, Users, CheckCircle, Clock, AlertCircle, BarChart2,
  Edit3, Save, X, User, RefreshCw, Filter, Target, Clipboard,
  TrendingUp, DollarSign, MapPin, FileText, Phone, Mail,
  Info, Plus, Trash2, Printer,
  PlusCircle, MinusCircle, Banknote, Receipt, Package
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
);

const AREAS = [
  'Clínico','Educativo','Deportivo','Social/Comunitario',
  'Organizacional/Indust.','Reunión CAEDUC','Actividades CAEDUC',
];
const TIPOS = [
  'Certificación','Diplomado','Taller','Conferencia','Seminario',
  'Congreso','Curso','Simposio','Foro','Jornada','Reunión',
  'Reunión interna','Especialización','Webinar','Diagnóstico','Retiro','Otro',
];
const TRIMESTRES = ['T1 – Ene/Mar','T2 – Abr/Jun','T3 – Jul/Sep','T4 – Oct/Dic'];
const ESTADOS    = ['Pendiente','En proceso','Completado','Cancelado'];

const AREA_STYLE = {
  'Clínico':                {bg:'bg-blue-100',   text:'text-blue-800',   border:'border-l-blue-500',   dot:'bg-blue-500'},
  'Educativo':              {bg:'bg-green-100',  text:'text-green-800',  border:'border-l-green-500',  dot:'bg-green-500'},
  'Deportivo':              {bg:'bg-orange-100', text:'text-orange-800', border:'border-l-orange-500', dot:'bg-orange-500'},
  'Social/Comunitario':     {bg:'bg-purple-100', text:'text-purple-800', border:'border-l-purple-500', dot:'bg-purple-500'},
  'Organizacional/Indust.': {bg:'bg-yellow-100', text:'text-yellow-800', border:'border-l-yellow-500', dot:'bg-yellow-400'},
  'Reunión CAEDUC':         {bg:'bg-gray-100',   text:'text-gray-700',   border:'border-l-gray-400',   dot:'bg-gray-400'},
  'Actividades CAEDUC':     {bg:'bg-rose-100',   text:'text-rose-800',   border:'border-l-rose-500',   dot:'bg-rose-500'},
};
const ESTADO_BADGE = {
  'Pendiente':  'bg-yellow-100 text-yellow-800 border-yellow-300',
  'En proceso': 'bg-blue-100   text-blue-800   border-blue-300',
  'Completado': 'bg-green-100  text-green-800  border-green-300',
  'Cancelado':  'bg-gray-200   text-gray-600   border-gray-300',
};
const TASKS_META = [
  {key:'t1',label:'Solicitud de Actividad',   color:'blue',   fields:[{k:'t1_fecha',label:'Fecha solicitud',type:'date'},{k:'t1_obs',label:'Observaciones',type:'text'}]},
  {key:'t2',label:'Confirmación con Ponente', color:'indigo', fields:[{k:'t2_fecha',label:'Fecha confirmación',type:'date'},{k:'t2_ponente',label:'Nombre del ponente',type:'text'}]},
  {key:'t3',label:'Solicitud del Lugar',      color:'amber',  fields:[{k:'t3_fecha',label:'Fecha confirmación lugar',type:'date'},{k:'t3_lugar',label:'Lugar / Plataforma',type:'text'}]},
  {key:'t4',label:'Elaboración de Oficios',   color:'violet', fields:[{k:'t4_fecha',label:'Fecha elaboración',type:'date'},{k:'t4_num_oficio',label:'N° de oficio',type:'text'}]},
];

const fmt = (n) => Number(n||0).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtShort = (n) => { const v=Number(n||0); return v>=1000?`Q${(v/1000).toFixed(1)}K`:`Q${v.toFixed(0)}`; };
const todayStr = () => new Date().toISOString().split('T')[0];
const nowTs = () => new Date().toLocaleString('es-GT');

const AreaTag = ({area}) => {
  const c=AREA_STYLE[area]||{};
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>{area}</span>;
};
const StatusBadge = ({status}) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${ESTADO_BADGE[status]||ESTADO_BADGE['Pendiente']}`}>{status}</span>
);
const ProgressBar = ({done,total}) => {
  const pct=total>0?Math.round((done/total)*100):0;
  const color=pct===100?'bg-green-500':pct>50?'bg-blue-500':pct>0?'bg-yellow-400':'bg-gray-200';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{width:`${pct}%`}}/>
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
};
const TaskDots = ({act}) => (
  <div className="flex gap-1 items-center">
    {['t1_estado','t2_estado','t3_estado','t4_estado'].map((k,i)=>{
      const c=act[k]==='Completado'?'bg-green-500':act[k]==='En proceso'?'bg-blue-400':'bg-gray-300';
      return <div key={i} className={`w-2.5 h-2.5 rounded-full ${c}`}/>;
    })}
  </div>
);

// PDF util
const loadHtml2Pdf = () => new Promise((res,rej)=>{
  if(window.html2pdf){res(window.html2pdf);return;}
  const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
  s.onload=()=>res(window.html2pdf); s.onerror=()=>rej(new Error('html2pdf no cargó'));
  document.head.appendChild(s);
});
const downloadReport = async(html,filename) => {
  try {
    const h2p=await loadHtml2Pdf();
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(255,255,255,0.97);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;';
    ov.innerHTML='<div style="width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:sp 0.8s linear infinite;"></div><p style="font-size:15px;color:#374151;font-weight:600;">Generando reporte PDF...</p><style>@keyframes sp{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(ov);
    const ct=document.createElement('div');
    // Landscape letter = 11in x 8.5in = 1056px x 816px at 96dpi
    ct.style.cssText='position:fixed;top:0;left:0;width:1056px;max-width:1056px;background:white;z-index:99998;overflow:hidden;';
    document.body.appendChild(ct); ct.innerHTML=html;
    await new Promise(r=>setTimeout(r,1000));
    await h2p().set({margin:0,filename:filename+'.pdf',image:{type:'jpeg',quality:0.92},
      html2canvas:{scale:2,useCORS:true,logging:false,scrollX:0,scrollY:0,width:1056,height:ct.scrollHeight},
      jsPDF:{unit:'in',format:'letter',orientation:'landscape'},
      pagebreak:{mode:['css','legacy']}
    }).from(ct).save();
    ct.parentNode&&ct.parentNode.removeChild(ct);
    ov.parentNode&&ov.parentNode.removeChild(ov);
  } catch(e){ console.error(e); alert('Error al generar PDF'); }
};

// ─────────────────────────────────────────────────────────────────────────────
export default function PlanificacionCAEDUCView({onNavigateOficios}){
  const [tab,setTab]         = useState('actividades');
  const [loading,setLoading] = useState(true);
  const [responsables,setResponsables]   = useState([]);
  const [actividades,setActividades]     = useState([]);
  const [rubros,setRubros]               = useState([]);
  const [gastosRubro,setGastosRubro]     = useState([]);
  const [gastosAct,setGastosAct]         = useState([]);
  const [fondos,setFondos]               = useState([]);
  const [presAnual,setPresAnual]         = useState([]);   // [{anio, monto, id, notas}]
  const [editPresModal,setEditPresModal] = useState(false);
  const [actModal,setActModal]           = useState(null);
  const [deleteActId,setDeleteActId]     = useState(null);
  const [taskModal,setTaskModal]         = useState(null);
  const [fondoModal,setFondoModal]       = useState(false);
  const [gastoRubroModal,setGastoRubroModal] = useState(null);
  const [editingArea,setEditingArea]     = useState(null);
  const [respForm,setRespForm]           = useState({responsable:'',email:'',telefono:''});
  const [filters,setFilters]             = useState({trimestre:'',area:'',estado:'activas',anio:String(new Date().getFullYear())});

  const fetchAll = useCallback(async()=>{
    setLoading(true);
    const [r1,r2,r3,r4,r5,r6,r7]=await Promise.all([
      supabase.from('planificacion_responsables').select('*').order('area'),
      supabase.from('planificacion_actividades').select('*').order('numero',{nullsFirst:false}).order('created_at',{ascending:true}),
      supabase.from('planificacion_rubros').select('*').eq('activo',true).order('orden'),
      supabase.from('planificacion_gastos_rubro').select('*').order('created_at'),
      supabase.from('planificacion_gastos_actividad').select('*').order('created_at'),
      supabase.from('planificacion_fondos_adicionales').select('*').order('created_at'),
      supabase.from('planificacion_presupuesto_anual').select('*').order('anio'),
    ]);
    if(r1.data)setResponsables(r1.data);
    if(r2.data)setActividades(r2.data);
    if(r3.data)setRubros(r3.data);
    if(r4.data)setGastosRubro(r4.data);
    if(r5.data)setGastosAct(r5.data);
    if(r6.data)setFondos(r6.data);
    if(r7.data)setPresAnual(r7.data);
    setLoading(false);
  },[]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  // Totales
  const totalActAsig   = actividades.reduce((s,a)=>s+Number(a.monto||0),0);
  const totalActGast   = actividades.reduce((s,a)=>s+Number(a.monto_gastado||0),0);
  const totalRubAsig   = rubros.reduce((s,r)=>s+Number(r.monto_asignado||0),0);
  const totalRubGast   = gastosRubro.reduce((s,g)=>s+Number(g.monto||0),0);
  const totalFondos    = fondos.reduce((s,f)=>s+Number(f.monto||0),0);
  const totalGast      = totalActGast+totalRubGast;

  // Presupuesto base = monto fijo aprobado por año (NO suma de actividades)
  const anioActual     = new Date().getFullYear();
  const presAnualActual= presAnual.find(p=>p.anio===anioActual) || presAnual[presAnual.length-1] || {monto:0,anio:anioActual};
  const presBase       = Number(presAnualActual.monto||0);
  // Total disponible = presupuesto aprobado + fondos adicionales
  const totalDisp      = presBase + totalFondos;
  const saldo          = totalDisp - totalGast;

  // Guardar/actualizar presupuesto anual
  const savePresAnual  = async(anio, monto, notas) => {
    const existing = presAnual.find(p=>p.anio===anio);
    if(existing){
      await supabase.from('planificacion_presupuesto_anual')
        .update({monto, notas, updated_at:new Date().toISOString()}).eq('id',existing.id);
    } else {
      await supabase.from('planificacion_presupuesto_anual').insert([{anio, monto, notas}]);
    }
    await fetchAll();
  };

  const getRespName = area=>(responsables.find(r=>r.area===area)||{}).responsable||'Sin asignar';

  // CRUD actividades
  const saveActividad = async(data)=>{
    // Siempre extraer id para no enviarlo accidentalmente en inserts
    const {id, ...cleanData} = data;
    if(id){
      const {error} = await supabase.from('planificacion_actividades')
        .update({...cleanData, updated_at:new Date().toISOString()}).eq('id',id);
      if(error){ alert('Error al actualizar actividad: ' + error.message); return; }
    } else {
      // Auto-asignar número correlativo (siguiente al máximo existente)
      const maxNum = actividades.reduce((m,a)=>Math.max(m,Number(a.numero||0)),0);
      const {data:inserted, error} = await supabase
        .from('planificacion_actividades')
        .insert([{...cleanData, numero:maxNum+1}])
        .select();
      if(error){ alert('Error al crear actividad: ' + error.message); return; }
    }
    setActModal(null);
    await fetchAll();
  };
  const deleteActividad = async(id)=>{
    await supabase.from('planificacion_actividades').delete().eq('id',id);
    setDeleteActId(null); await fetchAll();
  };
  const updateEstado = async(id,estado_general)=>{
    setActividades(p=>p.map(a=>a.id===id?{...a,estado_general}:a));
    await supabase.from('planificacion_actividades')
      .update({estado_general,updated_at:new Date().toISOString()}).eq('id',id);
  };

  // Gastos actividad
  const addGastoAct = async(actividad_id,desc,monto,fecha)=>{
    await supabase.from('planificacion_gastos_actividad')
      .insert([{actividad_id,descripcion:desc,monto:Number(monto),fecha}]);
    const {data}=await supabase.from('planificacion_gastos_actividad')
      .select('monto').eq('actividad_id',actividad_id);
    const total=(data||[]).reduce((s,g)=>s+Number(g.monto),0);
    await supabase.from('planificacion_actividades')
      .update({monto_gastado:total,updated_at:new Date().toISOString()}).eq('id',actividad_id);
    await fetchAll();
  };
  const deleteGastoAct = async(gid,actividad_id)=>{
    await supabase.from('planificacion_gastos_actividad').delete().eq('id',gid);
    const {data}=await supabase.from('planificacion_gastos_actividad')
      .select('monto').eq('actividad_id',actividad_id);
    const total=(data||[]).reduce((s,g)=>s+Number(g.monto),0);
    await supabase.from('planificacion_actividades')
      .update({monto_gastado:total,updated_at:new Date().toISOString()}).eq('id',actividad_id);
    await fetchAll();
  };

  // Gastos rubro
  const addGastoRubro = async(rubro_id,desc,monto,fecha)=>{
    await supabase.from('planificacion_gastos_rubro')
      .insert([{rubro_id,descripcion:desc,monto:Number(monto),fecha}]);
    await fetchAll();
  };
  const deleteGastoRubro = async(gid)=>{
    await supabase.from('planificacion_gastos_rubro').delete().eq('id',gid);
    await fetchAll();
  };

  // Fondos
  const addFondo = async(fd)=>{
    await supabase.from('planificacion_fondos_adicionales').insert([fd]);
    setFondoModal(false); await fetchAll();
  };
  const deleteFondo = async(id)=>{
    await supabase.from('planificacion_fondos_adicionales').delete().eq('id',id);
    await fetchAll();
  };

  // Responsables
  const openEditResp = area=>{
    const r=responsables.find(x=>x.area===area)||{};
    setRespForm({responsable:r.responsable||'',email:r.email||'',telefono:r.telefono||''});
    setEditingArea(area);
  };
  const saveResp = async()=>{
    await supabase.from('planificacion_responsables')
      .upsert({area:editingArea,...respForm,updated_at:new Date().toISOString()},{onConflict:'area'});
    setEditingArea(null); await fetchAll();
  };

  const enriched = actividades.map(a=>({
    ...a,
    responsable_nombre:getRespName(a.area),
    lineas_gasto:gastosAct.filter(g=>g.actividad_id===a.id),
  }));
  // Años disponibles para el filtro (extraídos de las fechas de las actividades)
  const aniosDisponibles = [...new Set(
    actividades
      .map(a=>{ const m=String(a.fecha||'').match(/(\d{4})$/); return m?m[1]:null; })
      .filter(Boolean)
  )].sort();

  const filteredActs = enriched
    .filter(a=>{
      if(filters.trimestre&&a.trimestre!==filters.trimestre)return false;
      if(filters.area&&a.area!==filters.area)return false;
      // Filtro por año: comparar con el año en la fecha de la actividad
      if(filters.anio){
        const anioAct = String(a.fecha||'').match(/(\d{4})$/)?.[1]||'';
        if(anioAct!==filters.anio)return false;
      }
      // 'activas' = oculta Completado y Cancelado (comportamiento por defecto)
      if(filters.estado==='activas'){
        if(a.estado_general==='Completado'||a.estado_general==='Cancelado')return false;
      } else if(filters.estado&&filters.estado!=='todas'){
        if(a.estado_general!==filters.estado)return false;
      }
      return true;
    })
    .sort((a,b)=>{
      // Ordenar por fecha — intentar parsear texto como "21 mar 2026"
      const MONTHS = {ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11};
      const parseDate = (str) => {
        if(!str)return new Date(9999,0,1);
        // Formato ISO YYYY-MM-DD
        if(/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str);
        // Formato "21 mar 2026"
        const m = str.match(/(\d{1,2})\s+([a-záéíóú]{3})\s+(\d{4})/i);
        if(m) return new Date(Number(m[3]), MONTHS[m[2].toLowerCase()]||0, Number(m[1]));
        return new Date(9999,0,1);
      };
      return parseDate(a.fecha) - parseDate(b.fecha);
    });
  const areaStats = AREAS.map(area=>{
    const acts=actividades.filter(a=>a.area===area);
    return {area,total:acts.length,
      completadas:acts.filter(a=>a.estado_general==='Completado').length,
      enProceso:acts.filter(a=>a.estado_general==='En proceso').length,
      pendientes:acts.filter(a=>a.estado_general==='Pendiente').length,
      asignado:acts.reduce((s,a)=>s+Number(a.monto||0),0),
      gastado:acts.reduce((s,a)=>s+Number(a.monto_gastado||0),0),
      resp:responsables.find(r=>r.area===area)||{}};
  }).filter(s=>s.total>0);

  // Reporte PDF
  const generateReport = ()=>{
    const pctEjec=totalDisp>0?Math.round((totalGast/totalDisp)*100):0;

    // Rows: constrained columns
    const rowsActs=actividades.map((a,i)=>{
      const lineas=gastosAct.filter(g=>g.actividad_id===a.id);
      const gast=Number(a.monto_gastado||0);
      const disp=Number(a.monto||0)-gast;
      const estadoColor=a.estado_general==='Completado'?'#166534':a.estado_general==='En proceso'?'#1e40af':a.estado_general==='Cancelado'?'#4b5563':'#854d0e';
      const estadoBg=a.estado_general==='Completado'?'#dcfce7':a.estado_general==='En proceso'?'#dbeafe':a.estado_general==='Cancelado'?'#f3f4f6':'#fef9c3';
      return `
        <tr style="background:${i%2===0?'#f9fafb':'white'};">
          <td style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${a.trimestre||''}</td>
          <td style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;font-weight:600;white-space:nowrap;">${(a.area||'').replace('/','/ ')}</td>
          <td style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;max-width:200px;word-wrap:break-word;">${a.actividad||''}</td>
          <td style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${a.fecha||''}</td>
          <td style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">Q${fmt(a.monto)}</td>
          <td style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;text-align:right;color:#dc2626;white-space:nowrap;">Q${fmt(gast)}</td>
          <td style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;text-align:right;color:${disp>=0?'#16a34a':'#dc2626'};white-space:nowrap;">Q${fmt(disp)}</td>
          <td style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">
            <span style="padding:1px 5px;border-radius:9999px;font-size:8px;font-weight:700;background:${estadoBg};color:${estadoColor};">${a.estado_general||'Pendiente'}</span>
          </td>
        </tr>
        ${lineas.length>0?`<tr><td colspan="8" style="padding:2px 5px 4px 16px;background:#f1f5f9;border-bottom:1px solid #e5e7eb;"><span style="font-size:8px;color:#475569;font-weight:600;">Gastos: </span>${lineas.map(l=>`<span style="font-size:8px;color:#334155;margin-right:8px;">• ${l.descripcion}: Q${fmt(l.monto)}${l.fecha?' ('+l.fecha+')':''}</span>`).join('')}</td></tr>`:''}
      `;
    }).join('');

    const rowsRubros=rubros.map(r=>{
      const lineas=gastosRubro.filter(g=>g.rubro_id===r.id);
      const gast=lineas.reduce((s,g)=>s+Number(g.monto||0),0);
      const disp=Number(r.monto_asignado||0)-gast;
      return `
        <tr style="background:#eff6ff;">
          <td colspan="3" style="padding:5px;font-size:9px;font-weight:700;border-bottom:1px solid #dbeafe;">${r.nombre}</td>
          <td style="padding:5px;font-size:9px;border-bottom:1px solid #dbeafe;"></td>
          <td style="padding:5px;font-size:9px;text-align:right;font-weight:700;border-bottom:1px solid #dbeafe;">Q${fmt(r.monto_asignado)}</td>
          <td style="padding:5px;font-size:9px;text-align:right;color:#dc2626;border-bottom:1px solid #dbeafe;">Q${fmt(gast)}</td>
          <td style="padding:5px;font-size:9px;text-align:right;color:${disp>=0?'#16a34a':'#dc2626'};font-weight:700;border-bottom:1px solid #dbeafe;">Q${fmt(disp)}</td>
          <td style="border-bottom:1px solid #dbeafe;"></td>
        </tr>
        ${lineas.map(l=>`<tr><td colspan="8" style="padding:2px 5px 3px 16px;background:#f8fafc;font-size:8px;color:#475569;border-bottom:1px solid #f1f5f9;">• ${l.descripcion}: <strong>Q${fmt(l.monto)}</strong>${l.fecha?' — '+l.fecha:''}</td></tr>`).join('')}
      `;
    }).join('');

    const rowsFondos=fondos.map(f=>`
      <tr>
        <td style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;">${f.fecha||''}</td>
        <td style="padding:4px 5px;font-size:9px;font-weight:600;border-bottom:1px solid #e5e7eb;">Q${fmt(f.monto)}</td>
        <td colspan="4" style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;">${f.origen||''}</td>
        <td colspan="2" style="padding:4px 5px;font-size:9px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${f.razon||''}</td>
      </tr>
    `).join('');

    const thStyle = 'background:#1e3a5f;color:white;padding:5px;font-size:9px;text-align:left;';

    const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Ejecución CAEDUC 2026</title>
    <style>
      @page{size:letter landscape;margin:0.4in;}
      body{font-family:Arial,sans-serif;color:#111;background:white;font-size:9px;}
      h1{font-size:15px;color:#1e3a5f;margin:0 0 3px;}
      h2{font-size:11px;color:#1e3a5f;border-bottom:2px solid #3b82f6;padding-bottom:3px;margin:14px 0 6px;}
      table{width:100%;border-collapse:collapse;margin-bottom:12px;table-layout:fixed;}
      .card{display:inline-block;border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;margin:3px;text-align:center;min-width:90px;}
      .card .val{font-size:13px;font-weight:800;}.card .lbl{font-size:8px;color:#6b7280;}
    </style></head><body>
    <div style="border-bottom:3px solid #1e3a5f;padding-bottom:8px;margin-bottom:12px;">
      <h1>Reporte de Ejecución Presupuestaria — CAEDUC 2026</h1>
      <p style="color:#6b7280;font-size:9px;margin:0;">Colegio de Psicólogos de Guatemala &nbsp;|&nbsp; Generado: ${nowTs()}</p>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
      <div class="card"><div class="val" style="color:#1e3a5f;">Q${fmt(presBase)}</div><div class="lbl">Presupuesto Base</div></div>
      <div class="card"><div class="val" style="color:#2563eb;">Q${fmt(totalFondos)}</div><div class="lbl">Fondos Adicionales</div></div>
      <div class="card"><div class="val" style="color:#16a34a;">Q${fmt(totalDisp)}</div><div class="lbl">Total Disponible</div></div>
      <div class="card"><div class="val" style="color:#dc2626;">Q${fmt(totalGast)}</div><div class="lbl">Total Ejecutado</div></div>
      <div class="card"><div class="val" style="color:${saldo>=0?'#16a34a':'#dc2626'};">Q${fmt(saldo)}</div><div class="lbl">Saldo Disponible</div></div>
      <div class="card"><div class="val" style="color:#7c3aed;">${pctEjec}%</div><div class="lbl">% Ejecutado</div></div>
    </div>

    <h2>Actividades Planificadas (${actividades.length})</h2>
    <table style="table-layout:fixed;">
      <colgroup>
        <col style="width:12%"/>
        <col style="width:13%"/>
        <col style="width:30%"/>
        <col style="width:9%"/>
        <col style="width:9%"/>
        <col style="width:9%"/>
        <col style="width:9%"/>
        <col style="width:9%"/>
      </colgroup>
      <thead><tr>
        <th style="${thStyle}">Trimestre</th>
        <th style="${thStyle}">Área</th>
        <th style="${thStyle}">Actividad</th>
        <th style="${thStyle}">Fecha</th>
        <th style="${thStyle}text-align:right;">Asignado</th>
        <th style="${thStyle}text-align:right;">Gastado</th>
        <th style="${thStyle}text-align:right;">Disponible</th>
        <th style="${thStyle}">Estado</th>
      </tr></thead>
      <tbody>${rowsActs}</tbody>
      <tfoot><tr style="background:#1e3a5f;color:white;font-weight:700;">
        <td colspan="4" style="padding:5px;font-size:9px;">TOTAL ACTIVIDADES</td>
        <td style="padding:5px;font-size:9px;text-align:right;">Q${fmt(totalActAsig)}</td>
        <td style="padding:5px;font-size:9px;text-align:right;">Q${fmt(totalActGast)}</td>
        <td style="padding:5px;font-size:9px;text-align:right;">Q${fmt(totalActAsig-totalActGast)}</td>
        <td></td>
      </tr></tfoot>
    </table>

    <h2>Rubros Especiales</h2>
    <table style="table-layout:fixed;">
      <colgroup><col style="width:12%"/><col style="width:13%"/><col style="width:30%"/><col style="width:9%"/><col style="width:9%"/><col style="width:9%"/><col style="width:9%"/><col style="width:9%"/></colgroup>
      <thead><tr>
        <th colspan="4" style="${thStyle}">Rubro</th>
        <th style="${thStyle}text-align:right;">Asignado</th>
        <th style="${thStyle}text-align:right;">Gastado</th>
        <th style="${thStyle}text-align:right;">Disponible</th>
        <th></th>
      </tr></thead>
      <tbody>${rowsRubros}</tbody>
      <tfoot><tr style="background:#1e3a5f;color:white;font-weight:700;">
        <td colspan="4" style="padding:5px;font-size:9px;">TOTAL RUBROS</td>
        <td style="padding:5px;font-size:9px;text-align:right;">Q${fmt(totalRubAsig)}</td>
        <td style="padding:5px;font-size:9px;text-align:right;">Q${fmt(totalRubGast)}</td>
        <td style="padding:5px;font-size:9px;text-align:right;">Q${fmt(totalRubAsig-totalRubGast)}</td>
        <td></td>
      </tr></tfoot>
    </table>

    ${fondos.length>0?`
    <h2>Fondos Adicionales</h2>
    <table style="table-layout:fixed;">
      <colgroup><col style="width:10%"/><col style="width:12%"/><col style="width:38%"/><col style="width:40%"/></colgroup>
      <thead><tr><th style="${thStyle}" colspan="2">Fecha / Monto</th><th style="${thStyle}">Origen</th><th style="${thStyle}">Razón</th></tr></thead>
      <tbody>${rowsFondos}</tbody>
      <tfoot><tr style="background:#1e3a5f;color:white;font-weight:700;">
        <td style="padding:5px;font-size:9px;">TOTAL</td>
        <td style="padding:5px;font-size:9px;">Q${fmt(totalFondos)}</td>
        <td colspan="2"></td>
      </tr></tfoot>
    </table>`:''}

    <div style="margin-top:16px;border-top:2px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="font-size:8px;color:#9ca3af;">CAEDUC App — colegiodepsicologos.org.gt</div>
      <div style="text-align:right;">
        <div style="font-size:15px;font-weight:800;color:${saldo>=0?'#16a34a':'#dc2626'};">Saldo: Q${fmt(saldo)}</div>
        <div style="font-size:8px;color:#6b7280;">${pctEjec}% del presupuesto ejecutado</div>
      </div>
    </div>
    </body></html>`;
    downloadReport(html,`Reporte_Ejecucion_CAEDUC_2026_${todayStr()}`);
  };

  if(loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={32} className="text-blue-500 animate-spin"/>
      <span className="ml-3 text-gray-500">Cargando planificación...</span>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Planificación CAEDUC 2026</h2>
          <p className="text-sm text-gray-500">Actividades · Presupuesto · Seguimiento</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateReport} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium shadow-sm">
            <Printer size={16}/> Reporte PDF
          </button>
          <button onClick={fetchAll} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm">
            <RefreshCw size={15}/> Actualizar
          </button>
        </div>
      </div>

      {/* Budget cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

        {/* Presupuesto base — con botón editar */}
        <div className="bg-slate-50 rounded-xl p-3 border flex flex-col gap-1 col-span-2 md:col-span-1">
          <div className="text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs font-semibold"><Package size={15}/><span>Presupuesto {presAnualActual.anio}</span></div>
            <button onClick={()=>setEditPresModal(true)}
              title="Modificar presupuesto aprobado"
              className="text-slate-400 hover:text-blue-600 transition-colors">
              <Edit3 size={13}/>
            </button>
          </div>
          <div className="text-lg font-black text-slate-700">{fmtShort(presBase)}</div>
          <div className="text-xs text-slate-400">Aprobado {presAnualActual.anio}</div>
        </div>

        {/* Fondos adicionales */}
        <div className="bg-blue-50 rounded-xl p-3 border flex flex-col gap-1">
          <div className="text-blue-700 flex items-center gap-1 text-xs font-semibold"><PlusCircle size={15}/><span>Fondos extra</span></div>
          <div className="text-lg font-black text-blue-700">{fmtShort(totalFondos)}</div>
          <div className="text-xs text-blue-400">{fondos.length} ingreso{fondos.length!==1?'s':''}</div>
        </div>

        {/* Total disponible */}
        <div className="bg-green-50 rounded-xl p-3 border flex flex-col gap-1">
          <div className="text-green-700 flex items-center gap-1 text-xs font-semibold"><DollarSign size={15}/><span>Total disponible</span></div>
          <div className="text-lg font-black text-green-700">{fmtShort(totalDisp)}</div>
          <div className="text-xs text-green-500">base + fondos extra</div>
        </div>

        {/* Total ejecutado */}
        <div className="bg-red-50 rounded-xl p-3 border flex flex-col gap-1">
          <div className="text-red-600 flex items-center gap-1 text-xs font-semibold"><MinusCircle size={15}/><span>Ejecutado</span></div>
          <div className="text-lg font-black text-red-600">{fmtShort(totalGast)}</div>
          <div className="text-xs text-red-400">gastos registrados</div>
        </div>

        {/* Saldo */}
        <div className={`${saldo>=0?'bg-green-50':'bg-red-50'} rounded-xl p-3 border flex flex-col gap-1`}>
          <div className={`${saldo>=0?'text-green-700':'text-red-700'} flex items-center gap-1 text-xs font-semibold`}><Receipt size={15}/><span>Saldo</span></div>
          <div className={`text-lg font-black ${saldo>=0?'text-green-700':'text-red-700'}`}>{fmtShort(saldo)}</div>
          <div className={`text-xs ${saldo>=0?'text-green-400':'text-red-400'}`}>{saldo>=0?'disponible':'déficit'}</div>
        </div>

        {/* % Ejecutado */}
        <div className="bg-violet-50 rounded-xl p-3 border flex flex-col gap-1">
          <div className="text-violet-700 flex items-center gap-1 text-xs font-semibold"><TrendingUp size={15}/><span>Avance</span></div>
          <div className="text-lg font-black text-violet-700">{totalDisp>0?Math.round((totalGast/totalDisp)*100):0}%</div>
          <div className="text-xs text-violet-400">del presupuesto</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {[
          {id:'actividades',label:'Actividades',icon:<Calendar size={14}/>},
          {id:'presupuesto',label:'Rubros',icon:<Package size={14}/>},
          {id:'fondos',label:'Fondos Extra',icon:<Banknote size={14}/>},
          {id:'dashboard',label:'Responsables',icon:<Users size={14}/>},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium flex-1 justify-center whitespace-nowrap transition-all
              ${tab===t.id?'bg-white text-blue-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── TAB ACTIVIDADES ── */}
      {tab==='actividades'&&(
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center bg-white rounded-xl border p-3">
            <Filter size={14} className="text-gray-400"/>
            <select className="border p-2 rounded-lg text-xs" value={filters.trimestre} onChange={e=>setFilters({...filters,trimestre:e.target.value})}>
              <option value="">Todos los trimestres</option>
              {TRIMESTRES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <select className="border p-2 rounded-lg text-xs" value={filters.area} onChange={e=>setFilters({...filters,area:e.target.value})}>
              <option value="">Todas las áreas</option>
              {AREAS.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
            <select className="border p-2 rounded-lg text-xs" value={filters.estado} onChange={e=>setFilters({...filters,estado:e.target.value})}>
              <option value="activas">Solo activas (Pendiente + En proceso)</option>
              <option value="todas">Todos los estados</option>
              <option value="Pendiente">Solo Pendientes</option>
              <option value="En proceso">Solo En proceso</option>
              <option value="Completado">Solo Completadas</option>
              <option value="Cancelado">Solo Canceladas</option>
            </select>
            {/* Filtro por año — botones rápidos */}
            <div className="flex items-center gap-1 flex-wrap">
              {aniosDisponibles.map(a=>(
                <button key={a} onClick={()=>setFilters({...filters,anio:filters.anio===a?'':a})}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    filters.anio===a
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                  }`}>
                  {a}{a===String(new Date().getFullYear())?' ★':''}
                </button>
              ))}
            </div>
            {(filters.trimestre||filters.area||filters.estado!=='activas'||filters.anio!==String(new Date().getFullYear()))&&(
              <button onClick={()=>setFilters({trimestre:'',area:'',estado:'activas',anio:String(new Date().getFullYear())})} className="text-xs text-red-500 underline">Restablecer</button>
            )}
            <span className="ml-auto text-xs text-gray-400">{filteredActs.length} actividades</span>
            <button onClick={()=>setActModal({mode:'new',data:{}})}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5">
              <Plus size={14}/> Nueva actividad
            </button>
          </div>

          <div className="space-y-2">
            {filteredActs.map((act,idx)=>{
              const c=AREA_STYLE[act.area]||{};
              const asig=Number(act.monto||0);
              const gast=Number(act.monto_gastado||0);
              const disp=asig-gast;
              return (
                <div key={act.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${c.border} hover:shadow-md transition-shadow`}>
                  <div className="p-3 flex items-start gap-3">
                    <span className="text-xs font-bold text-gray-200 w-6 text-center shrink-0 mt-1">{idx+1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <AreaTag area={act.area}/>
                        <span className="text-xs text-gray-400">{act.trimestre}</span>
                        {act.responsable_nombre!=='Sin asignar'&&<span className="text-xs text-gray-500 flex items-center gap-1"><User size={10}/>{act.responsable_nombre}</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{act.actividad}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10}/>{act.fecha}</span>
                        <span className="text-xs font-medium text-slate-600">Asig: Q{fmt(asig)}</span>
                        <span className="text-xs font-medium text-red-500">Gast: Q{fmt(gast)}</span>
                        <span className={`text-xs font-bold ${disp>=0?'text-green-600':'text-red-600'}`}>Disp: Q{fmt(disp)}</span>
                        <TaskDots act={act}/>
                      </div>
                      {act.lineas_gasto.length>0&&(
                        <div className="mt-1.5 space-y-0.5">
                          {act.lineas_gasto.map(g=>(
                            <div key={g.id} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded px-2 py-0.5">
                              <Receipt size={10}/>
                              <span className="flex-1">{g.descripcion}</span>
                              <span className="font-medium text-red-500">-Q{fmt(g.monto)}</span>
                              {g.fecha&&<span className="text-gray-400">{g.fecha}</span>}
                              <button onClick={()=>deleteGastoAct(g.id,act.id)} className="text-gray-300 hover:text-red-500 ml-1"><Trash2 size={11}/></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <select
                        className={`border rounded-lg text-xs p-1.5 font-semibold cursor-pointer ${ESTADO_BADGE[act.estado_general]||''} border-current`}
                        value={act.estado_general}
                        onChange={e=>updateEstado(act.id,e.target.value)}>
                        {ESTADOS.map(e=><option key={e} value={e}>{e}</option>)}
                      </select>
                      <div className="flex gap-1">
                        <button onClick={()=>setActModal({mode:'edit',data:act})}
                          className="bg-gray-50 text-gray-600 px-2.5 py-1.5 rounded-lg text-xs hover:bg-gray-100 flex items-center gap-1">
                          <Edit3 size={12}/> Editar
                        </button>
                        <button onClick={()=>setTaskModal(act)}
                          className="bg-blue-600 text-white px-2.5 py-1.5 rounded-lg text-xs hover:bg-blue-700 flex items-center gap-1">
                          <Clipboard size={12}/> Tareas
                        </button>
                        <button onClick={()=>setDeleteActId(act.id)}
                          className="bg-red-50 text-red-400 p-1.5 rounded-lg hover:bg-red-100">
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredActs.length===0&&(
              <div className="text-center py-12 text-gray-400">
                <Target size={36} className="mx-auto mb-2 opacity-40"/>
                <p>Sin actividades con los filtros seleccionados</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB RUBROS ── */}
      {tab==='presupuesto'&&(
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800 flex items-start gap-2">
            <Info size={16} className="shrink-0 mt-0.5"/>
            <span>Registra cada gasto de los rubros especiales. Cada línea se resta automáticamente del saldo disponible del rubro y del total general.</span>
          </div>
          {rubros.map(r=>{
            const lineas=gastosRubro.filter(g=>g.rubro_id===r.id);
            const gast=lineas.reduce((s,g)=>s+Number(g.monto||0),0);
            const disp=Number(r.monto_asignado||0)-gast;
            const pct=r.monto_asignado>0?Math.round((gast/r.monto_asignado)*100):0;
            return (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border">
                <div className="p-4 border-b bg-slate-50 rounded-t-xl">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                      <Package size={18} className="text-slate-500"/>{r.nombre}
                    </h3>
                    <button onClick={()=>setGastoRubroModal(r)}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1">
                      <Plus size={13}/> Registrar gasto
                    </button>
                  </div>
                  <div className="flex gap-6 mt-3 flex-wrap">
                    <div><p className="text-xs text-gray-500">Asignado</p><p className="text-lg font-bold text-slate-700">Q{fmt(r.monto_asignado)}</p></div>
                    <div><p className="text-xs text-gray-500">Gastado</p><p className="text-lg font-bold text-red-500">Q{fmt(gast)}</p></div>
                    <div><p className="text-xs text-gray-500">Disponible</p><p className={`text-lg font-bold ${disp>=0?'text-green-600':'text-red-600'}`}>Q{fmt(disp)}</p></div>
                    <div className="flex-1 min-w-32"><p className="text-xs text-gray-500 mb-1">Ejecución ({pct}%)</p><ProgressBar done={gast} total={Number(r.monto_asignado)}/></div>
                  </div>
                </div>
                <div className="p-3">
                  {lineas.length===0?(
                    <p className="text-sm text-gray-400 text-center py-4">Sin gastos registrados</p>
                  ):(
                    <div className="space-y-1.5">
                      {lineas.map((g,i)=>(
                        <div key={g.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${i%2===0?'bg-gray-50':'bg-white'} border border-gray-100`}>
                          <Receipt size={14} className="text-gray-400 shrink-0"/>
                          <span className="flex-1 text-gray-700">{g.descripcion}</span>
                          {g.fecha&&<span className="text-xs text-gray-400">{g.fecha}</span>}
                          <span className="font-bold text-red-500 shrink-0">-Q{fmt(g.monto)}</span>
                          <button onClick={()=>deleteGastoRubro(g.id)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={14}/></button>
                        </div>
                      ))}
                      <div className="flex justify-end pt-1 text-xs font-bold text-gray-500">
                        Total gastado: Q{fmt(gast)} &nbsp;|&nbsp; <span className={disp>=0?'text-green-600':'text-red-600'}>Disponible: Q{fmt(disp)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB FONDOS ── */}
      {tab==='fondos'&&(
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Fondos Adicionales</h3>
              <p className="text-sm text-gray-500">Origen y razón obligatorios para trazabilidad.</p>
            </div>
            <button onClick={()=>setFondoModal(true)}
              className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-green-700 flex items-center gap-2 text-sm">
              <PlusCircle size={18}/> Agregar fondos
            </button>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
            <DollarSign size={28} className="text-green-600 shrink-0"/>
            <div>
              <p className="text-xs text-green-600 font-semibold">Total fondos adicionales acumulados</p>
              <p className="text-2xl font-black text-green-700">Q{fmt(totalFondos)}</p>
            </div>
          </div>
          {fondos.length===0?(
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <Banknote size={36} className="mx-auto mb-2 opacity-40"/>
              <p>Sin fondos adicionales registrados</p>
            </div>
          ):(
            <div className="space-y-2">
              {fondos.map(f=>(
                <div key={f.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4">
                  <div className="bg-green-100 rounded-lg p-2 shrink-0"><DollarSign size={20} className="text-green-600"/></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xl font-black text-green-700">+Q{fmt(f.monto)}</span>
                      {f.fecha&&<span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={11}/>{f.fecha}</span>}
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mt-1">{f.origen}</p>
                    <p className="text-sm text-gray-500">{f.razon}</p>
                  </div>
                  <button onClick={()=>deleteFondo(f.id)} className="text-gray-300 hover:text-red-500 shrink-0 mt-1"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB RESPONSABLES ── */}
      {tab==='dashboard'&&(
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
            <Info size={16} className="shrink-0 mt-0.5"/>
            <span>Asigna el responsable de cada área. El nombre se propaga automáticamente a todas sus actividades.</span>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-semibold">Avance global 2026</span>
              <span>{actividades.filter(a=>a.estado_general==='Completado').length}/{actividades.length} completadas</span>
            </div>
            <ProgressBar done={actividades.filter(a=>a.estado_general==='Completado').length} total={actividades.length}/>
          </div>
          <div className="grid gap-4">
            {areaStats.map(({area,total,completadas,enProceso,pendientes,asignado,gastado,resp})=>{
              const c=AREA_STYLE[area]||{};
              const isEditing=editingArea===area;
              return (
                <div key={area} className={`bg-white rounded-xl shadow-sm border-l-4 ${c.border}`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`w-3 h-3 rounded-full ${c.dot}`}/>
                        <span className="font-bold text-gray-800">{area}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{total} act.</span>
                        {asignado>0&&<span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">Q{fmt(asignado)}</span>}
                        {gastado>0&&<span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Gast: Q{fmt(gastado)}</span>}
                      </div>
                      {!isEditing&&(
                        <button onClick={()=>openEditResp(area)}
                          className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-100 flex items-center gap-1 font-medium border border-blue-200">
                          <Edit3 size={12}/>{resp.responsable?'Editar':'Asignar'}
                        </button>
                      )}
                    </div>
                    {isEditing?(
                      <div className="space-y-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <input placeholder="Nombre del responsable *" className="w-full border p-2 rounded-lg text-sm" value={respForm.responsable} onChange={e=>setRespForm({...respForm,responsable:e.target.value})}/>
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="Email" className="border p-2 rounded-lg text-sm" value={respForm.email} onChange={e=>setRespForm({...respForm,email:e.target.value})}/>
                          <input placeholder="Teléfono" className="border p-2 rounded-lg text-sm" value={respForm.telefono} onChange={e=>setRespForm({...respForm,telefono:e.target.value})}/>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveResp} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"><Save size={14}/>Guardar</button>
                          <button onClick={()=>setEditingArea(null)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">Cancelar</button>
                        </div>
                      </div>
                    ):(
                      <>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`${c.bg} rounded-full p-2`}><User size={14} className={c.text}/></div>
                          <div>
                            <p className={`text-sm font-semibold ${resp.responsable?'text-gray-800':'text-gray-400 italic'}`}>{resp.responsable||'Sin asignar'}</p>
                            <div className="flex gap-3">
                              {resp.email&&<p className="text-xs text-gray-500">{resp.email}</p>}
                              {resp.telefono&&<p className="text-xs text-gray-500">{resp.telefono}</p>}
                            </div>
                          </div>
                        </div>
                        <ProgressBar done={completadas} total={total}/>
                        <div className="flex gap-4 text-xs mt-1.5">
                          <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={11}/>{completadas} completas</span>
                          <span className="text-blue-600 flex items-center gap-1"><Clock size={11}/>{enProceso} en proceso</span>
                          <span className="text-yellow-600 flex items-center gap-1"><AlertCircle size={11}/>{pendientes} pendientes</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {actModal&&(
        <ActividadFormModal
          mode={actModal.mode} initialData={actModal.data}
          onSave={saveActividad} onClose={()=>setActModal(null)}
          onAddGasto={addGastoAct} onDeleteGasto={deleteGastoAct}
          gastosLines={actModal.data?.id?gastosAct.filter(g=>g.actividad_id===actModal.data.id):[]}
        />
      )}
      {deleteActId&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-bold">¿Eliminar esta actividad?</p>
              <p className="text-red-500 text-sm mt-1">Se eliminarán todos sus registros de gastos. Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteActId(null)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200">Cancelar</button>
              <button onClick={()=>deleteActividad(deleteActId)} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {gastoRubroModal&&<GastoRubroModal rubro={gastoRubroModal} onAdd={addGastoRubro} onClose={()=>setGastoRubroModal(null)}/>}
      {fondoModal&&<FondoModal onAdd={addFondo} onClose={()=>setFondoModal(false)}/>}
      {taskModal&&(
        <TareasModal act={taskModal} getRespName={getRespName}
          onSave={async(tf)=>{
            await supabase.from('planificacion_actividades')
              .update({...tf,updated_at:new Date().toISOString()}).eq('id',taskModal.id);
            await fetchAll(); setTaskModal(null);
          }}
          onClose={()=>setTaskModal(null)}
          onNavigateOficios={onNavigateOficios}
        />
      )}

      {/* ── Modal editar presupuesto anual ── */}
      {editPresModal&&(
        <EditPresAnualModal
          presAnual={presAnual}
          anioActual={anioActual}
          presAnualActual={presAnualActual}
          totalFondos={totalFondos}
          totalGast={totalGast}
          onSave={savePresAnual}
          onClose={()=>setEditPresModal(false)}
        />
      )}
    </div>
  );
}

// ── Modal Actividad ──────────────────────────────────────────────────────────

// Calcula el trimestre a partir de una fecha ISO (YYYY-MM-DD)
const getTrimestreFromDate = (dateStr) => {
  if (!dateStr) return TRIMESTRES[0];
  const month = new Date(dateStr + 'T12:00:00').getMonth() + 1; // 1-12
  if (month <= 3)  return 'T1 – Ene/Mar';
  if (month <= 6)  return 'T2 – Abr/Jun';
  if (month <= 9)  return 'T3 – Jul/Sep';
  return 'T4 – Oct/Dic';
};

// Formatea una fecha ISO a texto legible para mostrar en la lista
const formatFechaDisplay = (isoDate) => {
  if (!isoDate) return '';
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const d = new Date(isoDate + 'T12:00:00');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Convierte texto "21 mar 2026" → "2026-03-21" para el input type="date"
const fechaTextoToISO = (textoFecha) => {
  if (!textoFecha) return '';
  // Ya está en ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(textoFecha)) return textoFecha.substring(0,10);
  const MONTHS = {ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',
                  jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12'};
  const m = textoFecha.match(/(\d{1,2})\s+([a-záéíóú]{3})\s+(\d{4})/i);
  if (m) {
    const d = String(m[1]).padStart(2,'0');
    const mo = MONTHS[m[2].toLowerCase()] || '01';
    return `${m[3]}-${mo}-${d}`;
  }
  return '';
};

function ActividadFormModal({mode,initialData,onSave,onClose,onAddGasto,onDeleteGasto,gastosLines}){
  const [fd,setFd]=useState({
    trimestre:initialData?.trimestre||TRIMESTRES[0],
    area:initialData?.area||AREAS[0],actividad:initialData?.actividad||'',
    tipo:initialData?.tipo||TIPOS[0],
    fecha:fechaTextoToISO(initialData?.fecha||''),  // Convierte "21 mar 2026" → "2026-03-21" para el date picker
    monto:initialData?.monto||0,monto_gastado:initialData?.monto_gastado||0,
    estado_general:initialData?.estado_general||'Pendiente',
    sede_modalidad:initialData?.sede_modalidad||'',id:initialData?.id,
  });
  const [saving,setSaving]=useState(false);
  const [gDesc,setGDesc]=useState('');
  const [gMonto,setGMonto]=useState('');
  const [gFecha,setGFecha]=useState(todayStr());
  const [addingG,setAddingG]=useState(false);

  const handleSave=async(e)=>{
    e.preventDefault(); setSaving(true);
    // Guardar fecha como texto legible y trimestre calculado automáticamente
    const dataToSave = {
      ...fd,
      fecha: fd.fecha ? formatFechaDisplay(fd.fecha) : '',
      trimestre: fd.fecha ? getTrimestreFromDate(fd.fecha) : fd.trimestre,
    };
    await onSave(dataToSave);
    setSaving(false);
  };
  const handleAddG=async()=>{
    if(!gDesc.trim()||!gMonto)return;
    if(!fd.id){alert('Guarda la actividad primero para registrar gastos.');return;}
    setAddingG(true);
    await onAddGasto(fd.id,gDesc,gMonto,gFecha);
    setGDesc('');setGMonto('');setGFecha(todayStr());setAddingG(false);
  };
  const disp=Number(fd.monto||0)-Number(fd.monto_gastado||0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-800">{mode==='new'?'Nueva Actividad':'Editar Actividad'}</h3>
          <button onClick={onClose}><X size={22} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Trimestre se asigna automáticamente — solo se muestra */}
            {fd.fecha && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 flex items-center gap-2">
                <Calendar size={13} className="shrink-0"/>
                <span>Trimestre asignado automáticamente: <strong>{getTrimestreFromDate(fd.fecha)}</strong></span>
              </div>
            )}
            <div><label className="text-xs font-bold text-gray-600 mb-1 block">Nombre de la actividad *</label>
              <textarea required rows={2} className="w-full border p-2.5 rounded-lg text-sm resize-none" value={fd.actividad} onChange={e=>setFd({...fd,actividad:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-gray-600 mb-1 block">Área *</label>
                <select required className="w-full border p-2.5 rounded-lg text-sm" value={fd.area} onChange={e=>setFd({...fd,area:e.target.value})}>
                  {AREAS.map(a=><option key={a}>{a}</option>)}</select></div>
              <div><label className="text-xs font-bold text-gray-600 mb-1 block">Tipo</label>
                <select className="w-full border p-2.5 rounded-lg text-sm" value={fd.tipo} onChange={e=>setFd({...fd,tipo:e.target.value})}>
                  {TIPOS.map(t=><option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block flex items-center gap-1">
                  <Calendar size={12}/> Fecha de la actividad *
                </label>
                <input
                  required
                  type="date"
                  className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none cursor-pointer"
                  value={fd.fecha}
                  onChange={e=>{
                    const newDate = e.target.value;
                    setFd({...fd, fecha:newDate, trimestre:getTrimestreFromDate(newDate)});
                  }}
                />
                {fd.fecha && (
                  <p className="text-xs text-gray-400 mt-1">{formatFechaDisplay(fd.fecha)}</p>
                )}
              </div>
              <div><label className="text-xs font-bold text-gray-600 mb-1 block">Estado</label>
                <select className="w-full border p-2.5 rounded-lg text-sm" value={fd.estado_general} onChange={e=>setFd({...fd,estado_general:e.target.value})}>
                  {ESTADOS.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200 space-y-3">
              <h4 className="text-sm font-bold text-green-800 flex items-center gap-2"><DollarSign size={15}/>Presupuesto</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-gray-600 mb-1 block">Monto asignado (Q)</label>
                  <input type="number" min="0" step="0.01" className="w-full border p-2.5 rounded-lg text-sm font-medium" value={fd.monto} onChange={e=>setFd({...fd,monto:e.target.value})}/></div>
                <div><label className="text-xs font-bold text-gray-600 mb-1 block">Monto gastado (Q)</label>
                  <input type="number" min="0" step="0.01" className="w-full border p-2.5 rounded-lg text-sm font-medium" value={fd.monto_gastado} onChange={e=>setFd({...fd,monto_gastado:e.target.value})}/></div>
              </div>
              <div className={`text-sm font-bold text-center p-2 rounded-lg ${disp>=0?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                Disponible: Q{disp.toLocaleString('es-GT',{minimumFractionDigits:2})}
              </div>
            </div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block">Sede / Modalidad</label>
              <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="Ej: Virtual Zoom, Sede Central..." value={fd.sede_modalidad} onChange={e=>setFd({...fd,sede_modalidad:e.target.value})}/></div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={16}/>{saving?'Guardando...':'Guardar actividad'}
              </button>
            </div>
          </form>
          {mode==='edit'&&(
            <div className="mt-4 border-t pt-4 space-y-3">
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Receipt size={15}/>Detalle de gastos</h4>
              {gastosLines.map(g=>(
                <div key={g.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm border">
                  <span className="flex-1 text-gray-700">{g.descripcion}</span>
                  {g.fecha&&<span className="text-xs text-gray-400">{g.fecha}</span>}
                  <span className="font-bold text-red-500">-Q{fmt(g.monto)}</span>
                  <button onClick={()=>onDeleteGasto(g.id,initialData.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                </div>
              ))}
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 space-y-2">
                <p className="text-xs font-bold text-blue-700">Agregar línea de gasto</p>
                <input placeholder="¿En qué se gastó? *" className="w-full border p-2 rounded-lg text-sm" value={gDesc} onChange={e=>setGDesc(e.target.value)}/>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Monto (Q) *" min="0" step="0.01" className="border p-2 rounded-lg text-sm" value={gMonto} onChange={e=>setGMonto(e.target.value)}/>
                  <input type="date" className="border p-2 rounded-lg text-sm" value={gFecha} onChange={e=>setGFecha(e.target.value)}/>
                </div>
                <button onClick={handleAddG} disabled={addingG||!gDesc.trim()||!gMonto}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Plus size={14}/>{addingG?'Registrando...':'Registrar gasto'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal Gasto Rubro ────────────────────────────────────────────────────────
function GastoRubroModal({rubro,onAdd,onClose}){
  const [desc,setDesc]=useState('');
  const [monto,setMonto]=useState('');
  const [fecha,setFecha]=useState(todayStr());
  const [saving,setSaving]=useState(false);
  const handle=async(e)=>{
    e.preventDefault();if(!desc.trim()||!monto)return;
    setSaving(true);await onAdd(rubro.id,desc,monto,fecha);setSaving(false);onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div><h3 className="text-base font-bold text-gray-800">Registrar gasto</h3>
            <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{rubro.nombre}</p></div>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <form onSubmit={handle} className="space-y-3">
          <div><label className="text-xs font-bold text-gray-600 mb-1 block">¿En qué se gastó? *</label>
            <input required placeholder="Descripción del gasto..." className="w-full border p-2.5 rounded-lg text-sm" value={desc} onChange={e=>setDesc(e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs font-bold text-gray-600 mb-1 block">¿Cuánto? (Q) *</label>
              <input required type="number" min="0.01" step="0.01" placeholder="0.00" className="w-full border p-2.5 rounded-lg text-sm font-medium" value={monto} onChange={e=>setMonto(e.target.value)}/></div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block">Fecha</label>
              <input type="date" className="w-full border p-2.5 rounded-lg text-sm" value={fecha} onChange={e=>setFecha(e.target.value)}/></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50">
              {saving?'Guardando...':'Registrar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Fondos Adicionales ─────────────────────────────────────────────────
function FondoModal({onAdd,onClose}){
  const [fd,setFd]=useState({monto:'',origen:'',razon:'',fecha:todayStr()});
  const [saving,setSaving]=useState(false);
  const handle=async(e)=>{e.preventDefault();setSaving(true);await onAdd({...fd,monto:Number(fd.monto)});setSaving(false);};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-800">Registrar fondos adicionales</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
          <Info size={14} className="shrink-0 mt-0.5"/>
          <span>Origen y razón son <strong>obligatorios</strong> para mantener trazabilidad del presupuesto.</span>
        </div>
        <form onSubmit={handle} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs font-bold text-gray-600 mb-1 block">Monto (Q) *</label>
              <input required type="number" min="0.01" step="0.01" placeholder="0.00" className="w-full border p-2.5 rounded-lg text-sm font-medium" value={fd.monto} onChange={e=>setFd({...fd,monto:e.target.value})}/></div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block">Fecha de recepción *</label>
              <input required type="date" className="w-full border p-2.5 rounded-lg text-sm" value={fd.fecha} onChange={e=>setFd({...fd,fecha:e.target.value})}/></div>
          </div>
          <div><label className="text-xs font-bold text-gray-600 mb-1 block">Origen (quién / qué lo otorga) *</label>
            <input required placeholder="Ej: Junta Directiva CPG, remanente 2025..." className="w-full border p-2.5 rounded-lg text-sm" value={fd.origen} onChange={e=>setFd({...fd,origen:e.target.value})}/></div>
          <div><label className="text-xs font-bold text-gray-600 mb-1 block">Razón / justificación *</label>
            <textarea required rows={3} placeholder="¿Por qué se reciben y para qué se destinarán?" className="w-full border p-2.5 rounded-lg text-sm resize-none" value={fd.razon} onChange={e=>setFd({...fd,razon:e.target.value})}/></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
              {saving?'Registrando...':'Registrar fondos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ── Modal Editar Presupuesto Anual ──────────────────────────────────────────
function EditPresAnualModal({presAnual,anioActual,presAnualActual,totalFondos,totalGast,onSave,onClose}){
  const [selectedAnio, setSelectedAnio] = useState(presAnualActual.anio || anioActual);
  const [monto, setMonto]               = useState(String(presAnualActual.monto || ''));
  const [notas, setNotas]               = useState(presAnualActual.notas || '');
  const [saving, setSaving]             = useState(false);

  // Cuando cambia el año, cargar el monto de ese año si existe
  const handleAnioChange = (anio) => {
    setSelectedAnio(Number(anio));
    const found = presAnual.find(p=>p.anio===Number(anio));
    setMonto(found ? String(found.monto) : '');
    setNotas(found ? (found.notas||'') : '');
  };

  const handleSave = async(e) => {
    e.preventDefault();
    if(!monto||Number(monto)<=0){alert('El monto debe ser mayor a 0.');return;}
    setSaving(true);
    await onSave(Number(selectedAnio), Number(monto), notas);
    setSaving(false);
    onClose();
  };

  const totalDisp = Number(monto||0) + totalFondos;
  const saldo     = totalDisp - totalGast;

  // Años disponibles para editar: año actual ± 1 y los que ya existen
  const aniosDisp = [...new Set([
    anioActual - 1, anioActual, anioActual + 1,
    ...presAnual.map(p=>p.anio)
  ])].sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col" style={{maxHeight:'90vh'}}>
        <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-xl shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-800">Presupuesto Aprobado por Año</h3>
            <p className="text-xs text-gray-500 mt-0.5">Monto fijo autorizado. No aumenta al agregar actividades.</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500"/></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Info box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
            <Info size={14} className="shrink-0 mt-0.5"/>
            <span>Este es el presupuesto aprobado para el año. Para aumentarlo, usa <strong>"Fondos Adicionales"</strong> (requiere origen y justificación). Las nuevas actividades se financian con el saldo disponible.</span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Año */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Año *</label>
              <select className="w-full border p-2.5 rounded-lg text-sm font-medium"
                value={selectedAnio} onChange={e=>handleAnioChange(e.target.value)}>
                {aniosDisp.map(a=>(
                  <option key={a} value={a}>
                    {a}{a===anioActual?' (año actual)':''}
                  </option>
                ))}
              </select>
            </div>

            {/* Monto */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Presupuesto aprobado (Q) *</label>
              <input required type="number" min="0" step="0.01" placeholder="0.00"
                className="w-full border p-2.5 rounded-lg text-sm font-bold text-slate-800"
                value={monto} onChange={e=>setMonto(e.target.value)}/>
            </div>

            {/* Notas */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Notas / descripción</label>
              <input type="text" placeholder="Ej: Presupuesto aprobado sesión ordinaria CPG..."
                className="w-full border p-2.5 rounded-lg text-sm"
                value={notas} onChange={e=>setNotas(e.target.value)}/>
            </div>

            {/* Preview de impacto */}
            {monto && Number(monto)>0 && (
              <div className="bg-gray-50 rounded-xl p-3 border space-y-1.5">
                <p className="text-xs font-bold text-gray-600 mb-2">Vista previa con este monto:</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Presupuesto base:</span>
                  <span className="font-bold text-slate-700">Q{Number(monto).toLocaleString('es-GT',{minimumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">+ Fondos adicionales:</span>
                  <span className="font-bold text-blue-600">Q{totalFondos.toLocaleString('es-GT',{minimumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between text-xs border-t pt-1.5">
                  <span className="text-gray-600 font-semibold">= Total disponible:</span>
                  <span className="font-bold text-green-700">Q{totalDisp.toLocaleString('es-GT',{minimumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">- Ejecutado:</span>
                  <span className="font-bold text-red-500">Q{totalGast.toLocaleString('es-GT',{minimumFractionDigits:2})}</span>
                </div>
                <div className={`flex justify-between text-xs border-t pt-1.5 ${saldo>=0?'text-green-700':'text-red-700'}`}>
                  <span className="font-bold">= Saldo {saldo>=0?'disponible':'déficit'}:</span>
                  <span className="font-black">Q{Math.abs(saldo).toLocaleString('es-GT',{minimumFractionDigits:2})}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                <Save size={15}/>{saving?'Guardando...':'Guardar presupuesto'}
              </button>
            </div>
          </form>

          {/* Historial por año */}
          {presAnual.length>0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-bold text-gray-500 mb-2">Historial de presupuestos registrados:</p>
              <div className="space-y-1.5">
                {presAnual.map(p=>(
                  <div key={p.id} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${p.anio===anioActual?'bg-blue-50 border border-blue-200':'bg-gray-50'}`}>
                    <span className={`font-bold ${p.anio===anioActual?'text-blue-700':'text-gray-600'}`}>
                      {p.anio}{p.anio===anioActual?' ← año actual':''}
                    </span>
                    <span className="font-black text-gray-700">Q{Number(p.monto).toLocaleString('es-GT',{minimumFractionDigits:2})}</span>
                    {p.notas&&<span className="text-gray-400 max-w-24 truncate">{p.notas}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal Tareas ─────────────────────────────────────────────────────────────
function TareasModal({act,getRespName,onSave,onClose,onNavigateOficios}){
  const [tf,setTf]=useState({
    estado_general:act.estado_general||'Pendiente',
    sede_modalidad:act.sede_modalidad||'',observaciones:act.observaciones||'',
    t1_estado:act.t1_estado||'Pendiente',t1_fecha:act.t1_fecha||'',t1_obs:act.t1_obs||'',
    t2_estado:act.t2_estado||'Pendiente',t2_fecha:act.t2_fecha||'',t2_ponente:act.t2_ponente||'',
    t3_estado:act.t3_estado||'Pendiente',t3_fecha:act.t3_fecha||'',t3_lugar:act.t3_lugar||'',
    t4_estado:act.t4_estado||'Pendiente',t4_fecha:act.t4_fecha||'',t4_num_oficio:act.t4_num_oficio||'',
  });
  const [saving,setSaving]=useState(false);
  const tBorder={blue:'border-blue-300 bg-blue-50',indigo:'border-indigo-300 bg-indigo-50',amber:'border-amber-300 bg-amber-50',violet:'border-violet-300 bg-violet-50'};
  const tTitle={blue:'text-blue-700',indigo:'text-indigo-700',amber:'text-amber-700',violet:'text-violet-700'};
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex justify-between items-start p-5 border-b bg-gray-50 rounded-t-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AreaTag area={act.area}/>
              <span className="text-xs text-gray-400">{act.trimestre} · #{act.numero}</span>
            </div>
            <h3 className="text-sm font-bold text-gray-800">{act.actividad}</h3>
            <div className="flex gap-3 mt-1">
              <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={10}/>{act.fecha}</span>
              <span className="text-xs text-gray-500 flex items-center gap-1"><User size={10}/>{getRespName(act.area)}</span>
            </div>
          </div>
          <button onClick={onClose}><X size={22} className="text-gray-400 hover:text-red-500"/></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border">
            <span className="text-sm font-bold text-gray-700">Estado General:</span>
            <select className="border p-2 rounded-lg text-sm font-medium flex-1" value={tf.estado_general} onChange={e=>setTf({...tf,estado_general:e.target.value})}>
              {ESTADOS.map(s=><option key={s}>{s}</option>)}
            </select>
            <StatusBadge status={tf.estado_general}/>
          </div>
          {TASKS_META.map(({key,label,color,fields})=>{
            const ek=`${key}_estado`;
            const est=tf[ek]||'Pendiente';
            const bc=est==='Completado'?'border-green-300 bg-green-50':est==='En proceso'?tBorder[color]:'border-gray-200 bg-white';
            return (
              <div key={key} className={`border rounded-xl p-4 ${bc}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`font-bold text-sm ${tTitle[color]}`}>{label}</h4>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={est}/>
                    {est==='Completado'&&<CheckCircle size={16} className="text-green-500"/>}
                  </div>
                </div>
                <select className="w-full border p-2 rounded-lg text-sm mb-2" value={tf[ek]||'Pendiente'} onChange={e=>setTf({...tf,[ek]:e.target.value})}>
                  {ESTADOS.map(s=><option key={s}>{s}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  {fields.map(({k,label:fl,type})=>(
                    <div key={k}>
                      <label className="block text-xs font-bold text-gray-500 mb-1">{fl}</label>
                      <input type={type==='date'?'date':'text'} placeholder={type!=='date'?fl:undefined}
                        className="w-full border p-2 rounded-lg text-sm"
                        value={tf[k]||''} onChange={e=>setTf({...tf,[k]:e.target.value})}/>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><MapPin size={12}/>Sede / Modalidad</label>
              <input type="text" placeholder="Ej: Sede Central, Virtual vía Zoom" className="w-full border p-2 rounded-lg text-sm" value={tf.sede_modalidad} onChange={e=>setTf({...tf,sede_modalidad:e.target.value})}/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><FileText size={12}/>Observaciones</label>
              <textarea rows={2} className="w-full border p-2 rounded-lg text-sm resize-none" value={tf.observaciones} onChange={e=>setTf({...tf,observaciones:e.target.value})}/>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200 text-sm">Cancelar</button>
            {onNavigateOficios&&(
              <button onClick={()=>{onClose();onNavigateOficios(act);}}
                className="bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-100 text-sm flex items-center gap-1 border border-indigo-200">
                <FileText size={14}/>Crear Oficio
              </button>
            )}
            <button onClick={async()=>{setSaving(true);await onSave(tf);setSaving(false);}} disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
              <Save size={16}/>{saving?'Guardando...':'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
