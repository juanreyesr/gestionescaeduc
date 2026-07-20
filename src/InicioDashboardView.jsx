// src/InicioDashboardView.jsx — Parte 7: Dashboard real de inicio del panel admin
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Users, Calendar, DollarSign, ListChecks, FileSignature,
  ArrowRight, RefreshCw, Clock, MapPin
} from 'lucide-react';
import { PageHeader, SectionCard, StatTile, EmptyState, Pill } from './components/ui.jsx';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
);

const fmtQ = (n) => 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtMes = (iso) => MESES[Number(iso.slice(5, 7)) - 1] || '';

export default function InicioDashboardView({ onNavigate, userName, onOpenActividad }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    avalesPendientes: 0,
    proximosEventos: [],
    saldo: 0,
    presBase: 0,
    totalFondos: 0,
    totalGastado: 0,
    pendientesAgenda: 0,
    ultimosOficios: [],
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const anioActual = new Date().getFullYear();
      const hoy = new Date().toISOString().split('T')[0];
      const [
        { data: avales },
        { data: actividades },
        { data: presAnual },
        { data: fondos },
        { data: gastosRubro },
        { data: pendientes },
        { data: oficios },
      ] = await Promise.all([
        supabase.from('avales').select('id,status,is_deleted'),
        supabase.from('planificacion_actividades').select('id,actividad,fecha,fecha_iso,sede_modalidad,estado_general,monto,monto_gastado'),
        supabase.from('planificacion_presupuesto_anual').select('*').order('anio'),
        supabase.from('planificacion_fondos_adicionales').select('monto'),
        supabase.from('planificacion_gastos_rubro').select('monto'),
        supabase.from('caeduc_agenda_pendientes').select('id').eq('completado', false),
        supabase.from('oficios').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
      if (!active) return;

      const avalesPendientes = (avales || []).filter(a => !a.is_deleted && a.status === 'En Proceso').length;

      const activas = (actividades || []).filter(a => a.estado_general !== 'Completado' && a.estado_general !== 'Cancelado');
      // Eventos de las próximas 3 semanas (hoy incluido)
      const en3Semanas = new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0];
      const proximosEventos = activas
        .filter(a => a.fecha_iso && a.fecha_iso >= hoy && a.fecha_iso <= en3Semanas)
        .sort((a, b) => a.fecha_iso.localeCompare(b.fecha_iso));

      const presAnualActual = (presAnual || []).find(p => p.anio === anioActual) || (presAnual || [])[(presAnual || []).length - 1] || { monto: 0 };
      const presBase = Number(presAnualActual.monto || 0);
      const totalFondos = (fondos || []).reduce((s, f) => s + Number(f.monto || 0), 0);
      const totalGastado = (actividades || []).reduce((s, a) => s + Number(a.monto_gastado || 0), 0)
        + (gastosRubro || []).reduce((s, g) => s + Number(g.monto || 0), 0);
      const saldo = (presBase + totalFondos) - totalGastado;

      setData({
        avalesPendientes,
        proximosEventos,
        saldo, presBase, totalFondos, totalGastado,
        pendientesAgenda: (pendientes || []).length,
        ultimosOficios: oficios || [],
      });
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={28} className="text-caeduc-pink animate-spin" />
        <span className="ml-3 text-slate-400">Cargando panel de inicio...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola${userName ? ', ' + userName : ''} 👋`}
        subtitle="Resumen general de la Comisión de Acreditación y Educación Continua"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Avales pendientes"
          value={data.avalesPendientes}
          hint="por revisar"
          icon={<Users size={18} />}
          tone="pink"
          onClick={() => onNavigate('avales')}
        />
        <StatTile
          label="Saldo presupuestario"
          value={fmtQ(data.saldo)}
          hint={`de ${fmtQ(data.presBase + data.totalFondos)} disponibles`}
          icon={<DollarSign size={18} />}
          tone={data.saldo >= 0 ? 'green' : 'red'}
          onClick={() => onNavigate('planificacion')}
        />
        <StatTile
          label="Pendientes de agenda"
          value={data.pendientesAgenda}
          hint="sin completar"
          icon={<ListChecks size={18} />}
          tone="amber"
          onClick={() => onNavigate('agendas')}
        />
        <StatTile
          label="Oficios recientes"
          value={data.ultimosOficios.length}
          hint="últimos generados"
          icon={<FileSignature size={18} />}
          tone="blue"
          onClick={() => onNavigate('oficios')}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard
          title="Próximos eventos (3 semanas)"
          icon={<Calendar size={16} />}
          right={
            <button onClick={() => onNavigate('planificacion')} className="text-xs font-bold text-caeduc-pink flex items-center gap-1 hover:underline">
              Ver planificación <ArrowRight size={12} />
            </button>
          }
        >
          {data.proximosEventos.length > 0 ? (
            <div className="space-y-1">
              {data.proximosEventos.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => (onOpenActividad ? onOpenActividad(ev.id) : onNavigate('planificacion'))}
                  className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="shrink-0 w-12 text-center rounded-lg bg-caeduc-pink/10 py-1">
                    <p className="text-base font-black text-caeduc-pink leading-tight">{ev.fecha_iso.slice(8, 10)}</p>
                    <p className="text-[10px] font-bold uppercase text-caeduc-pink/70 leading-tight">{fmtMes(ev.fecha_iso)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-caeduc-pink transition-colors">{ev.actividad}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={11} />{ev.fecha}</span>
                      {ev.sede_modalidad && <span className="flex items-center gap-1 truncate"><MapPin size={11} />{ev.sede_modalidad}</span>}
                    </div>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-slate-300 group-hover:text-caeduc-pink transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Calendar size={32} />} title="Sin eventos próximos" subtitle="No hay actividades planificadas en las próximas 3 semanas" />
          )}
        </SectionCard>

        <SectionCard
          title="Últimos oficios"
          icon={<FileSignature size={16} />}
          right={
            <button onClick={() => onNavigate('oficios')} className="text-xs font-bold text-caeduc-pink flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight size={12} />
            </button>
          }
        >
          {data.ultimosOficios.length > 0 ? (
            <div className="space-y-2">
              {data.ultimosOficios.map(o => (
                <button key={o.id} onClick={() => onNavigate('oficios')} className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{o.numero_oficio}</p>
                    <p className="text-xs text-slate-400 truncate">{o.titulo || o.motivo}</p>
                  </div>
                  <Pill status={o.estado} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={<FileSignature size={32} />} title="Sin oficios generados" />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
