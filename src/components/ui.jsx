// src/components/ui.jsx — Kit de componentes visuales CAEDUC (Parte 7: rediseño)
// Paleta: rosa institucional #E91E63 (acento primario), azul #1a5276 (secundario), slate neutro.
import React from 'react';
import { X, ArrowLeft } from 'lucide-react';

// ── Botones ──────────────────────────────────────────────────────────────────
export const PrimaryButton = ({ className = '', children, ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-caeduc-pink text-white font-semibold px-4 py-2.5 text-sm shadow-sm hover:bg-caeduc-pinkDark active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-caeduc-pink/40 ${className}`}
  >
    {children}
  </button>
);

export const SecondaryButton = ({ className = '', children, ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white text-slate-700 font-semibold px-4 py-2.5 text-sm border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-300/50 ${className}`}
  >
    {children}
  </button>
);

export const BlueButton = ({ className = '', children, ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-caeduc-blue text-white font-semibold px-4 py-2.5 text-sm shadow-sm hover:bg-caeduc-blueDark active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-caeduc-blue/40 ${className}`}
  >
    {children}
  </button>
);

export const DangerButton = ({ className = '', children, ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 text-red-600 font-semibold px-4 py-2.5 text-sm border border-red-100 hover:bg-red-100 active:scale-[0.98] transition-all disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

// ── Tarjetas / contenedores ─────────────────────────────────────────────────
export const SectionCard = ({ children, className = '', title, subtitle, icon, right }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-soft ${className}`}>
    {(title || right) && (
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-caeduc-pink shrink-0">{icon}</span>}
          <div className="min-w-0">
            {title && <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide truncate">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

// ── Pills / badges de estado ────────────────────────────────────────────────
const PILL_STYLES = {
  'Pendiente':   'bg-amber-50 text-amber-700 border-amber-200',
  'En Proceso':  'bg-blue-50 text-blue-700 border-blue-200',
  'En proceso':  'bg-blue-50 text-blue-700 border-blue-200',
  'Aprobado':    'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Aprobada':    'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Completado':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Rechazado':   'bg-red-50 text-red-600 border-red-200',
  'Cancelado':   'bg-slate-100 text-slate-500 border-slate-200',
  'Eliminado':   'bg-slate-100 text-slate-500 border-slate-200',
  'Finalizado':  'bg-slate-100 text-slate-600 border-slate-200',
  'Borrador':    'bg-amber-50 text-amber-700 border-amber-200',
  'Enviado':     'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Archivado':   'bg-slate-100 text-slate-500 border-slate-200',
};

export const Pill = ({ status, children, tone }) => {
  const style = tone
    ? tone
    : (PILL_STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200');
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${style}`}>
      {children || status}
    </span>
  );
};

// Alias retrocompatible: algunos archivos usan <Badge status="..."/>
export const Badge = Pill;

// ── Tarjeta simple de contenido (retrocompat con <Card/> del código anterior) ─
export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden ${className}`}>
    <div className="p-4 sm:p-6">{children}</div>
  </div>
);

// ── Encabezado de página ────────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, icon, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-caeduc-pinkLight text-caeduc-pink flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight truncate">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 truncate">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

// ── Tarjeta de estadística (dashboard) ──────────────────────────────────────
export const StatTile = ({ label, value, hint, icon, tone = 'pink', onClick }) => {
  const tones = {
    pink:   { bg: 'bg-caeduc-pinkLight', text: 'text-caeduc-pink' },
    blue:   { bg: 'bg-caeduc-blueLight', text: 'text-caeduc-blue' },
    green:  { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    amber:  { bg: 'bg-amber-50', text: 'text-amber-600' },
    red:    { bg: 'bg-red-50', text: 'text-red-600' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
    slate:  { bg: 'bg-slate-100', text: 'text-slate-600' },
  };
  const t = tones[tone] || tones.pink;
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`text-left bg-white rounded-2xl border border-slate-200 shadow-soft p-4 flex flex-col gap-2 transition-all ${onClick ? 'hover:shadow-card hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-caeduc-pink/30' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className={`w-9 h-9 rounded-lg ${t.bg} ${t.text} flex items-center justify-center`}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-black text-slate-800 leading-none">{value}</div>
        <div className="text-xs font-semibold text-slate-500 mt-1">{label}</div>
        {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
      </div>
    </Comp>
  );
};

// ── Estado vacío ─────────────────────────────────────────────────────────────
export const EmptyState = ({ icon, title, subtitle }) => (
  <div className="text-center py-14 text-slate-400">
    {icon && <div className="mx-auto mb-3 opacity-40 flex justify-center">{icon}</div>}
    <p className="font-semibold text-slate-500">{title}</p>
    {subtitle && <p className="text-sm mt-0.5">{subtitle}</p>}
  </div>
);

// ── Botón de volver ──────────────────────────────────────────────────────────
export const BackButton = ({ onClick, label = 'Volver al menú principal' }) => (
  <button onClick={onClick} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 mb-4 text-sm font-medium transition-colors">
    <ArrowLeft size={16} /> {label}
  </button>
);

// ── Modal genérico ───────────────────────────────────────────────────────────
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto backdrop-blur-[2px]">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizes[size]} m-auto`}>
      <div className="flex justify-between items-center gap-3 p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 min-w-0">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar ventana" className="text-slate-400 hover:text-caeduc-pink transition-colors shrink-0 p-2 -m-2">
            <X size={22} />
          </button>
        </div>
        <div className="p-4 sm:p-5 max-h-screen-80 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// ── Campo de formulario con etiqueta arriba (uso opcional en formularios nuevos) ─
export const Field = ({ label, hint, required, children }) => (
  <div>
    {label && (
      <label className="block text-xs font-bold text-slate-600 mb-1">
        {label} {required && <span className="text-caeduc-pink">*</span>}
      </label>
    )}
    {children}
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

export const inputCls = "w-full border border-slate-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-caeduc-pink/30 focus:border-caeduc-pink outline-none transition-all";
export const selectCls = inputCls;
export const textareaCls = inputCls + " resize-none";
