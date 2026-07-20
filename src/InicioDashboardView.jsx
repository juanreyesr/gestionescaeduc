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

export default function InicioDashboardView({ onNavigate, userName }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    avalesPendientes: 0,
    proximoEvento: null,
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
      const futuras = activas
        .filter(a => (a.fecha_iso || '') >= hoy)
        .sort((a, b) => (a.fecha_iso || '9999').localeCompare(b.fecha_iso || '9999'));
      const proximoEvento = futuras[0] || null;

      const presAnualActual = (presAnual || []).find(p => p.anio === anioActual) || (presAnual || [])[(presAnual || []).length - 1] || { monto: 0 };
      const presBase = Number(presAnualActual.monto || 0);
      const totalFondos = (fondos || []).reduce((s, f) => s + Number(f.monto || 0), 0);
      const totalGastado = (actividades || []).reduce((s, a) => s + Number(a.monto_gastado || 0), 0)
        + (gastosRubro || []).reduce((s, g) => s + Number(g.monto || 0), 0);
      const saldo = (presBase + totalFondos) - totalGastado;

      setData({
        avalesPendientes,
        proximoEvento,
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
          title="Próximo evento planificado"
          icon={<Calendar size={16} />}
          right={
            <button onClick={() => onNavigate('planificacion')} className="text-xs font-bold text-caeduc-pink flex items-center gap-1 hover:underline">
              Ver planificación <ArrowRight size={12} />
            </button>
          }
        >
          {data.proximoEvento ? (
            <button onClick={() => onNavigate('planificacion')} className="w-full text-left group">
              <p className="font-semibold text-slate-800 group-hover:text-caeduc-pink transition-colors">{data.proximoEvento.actividad}</p>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><Clock size={13} />{data.proximoEvento.fecha}</span>
                {data.proximoEvento.sede_modalidad && (
                  <span className="flex items-center gap-1"><MapPin size={13} />{data.proximoEvento.sede_modalidad}</span>
                )}
              </div>
            </button>
          ) : (
            <EmptyState icon={<Calendar size={32} />} title="Sin eventos próximos" subtitle="No hay actividades futuras planificadas" />
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
