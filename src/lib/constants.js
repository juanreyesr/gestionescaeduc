// src/lib/constants.js — Constantes compartidas de la app CAEDUC

export const SUPER_ADMIN = 'lic.juanreyesr@gmail.com';

export const ROLES = [
  'Coordinador(a)', 'Subcoordinador(a)', 'Secretario(a)', 'Prosecretario(a)',
  'Gestor(a) del Conocimiento', 'Vocal I', 'Vocal II', 'Asistente JD', 'Junta Directiva'
];

// Módulos del sistema con sus etiquetas para el panel de permisos
export const MODULES = [
  { id: 'planificacion', label: 'Planificación', icon: '✅' },
  { id: 'avales',        label: 'Avales',        icon: '📋' },
  { id: 'oficios',       label: 'Oficios y Cartas', icon: '✍️' },
  { id: 'publicaciones', label: 'Solicitud de publicación', icon: '📣' },
  { id: 'agendas',       label: 'Agendas',       icon: '📖' },
  { id: 'directorio',    label: 'Directorio',    icon: '👥' },
  { id: 'reportes',      label: 'Reportes',      icon: '🕐' },
];

// Helper: ¿puede el usuario hacer algo en un módulo?
// Si no hay permissions definidos (null/undefined) se asume acceso completo.
export const canDo = (permissions, moduleId, action = 'view') => {
  if (!permissions) return true;
  const mod = permissions[moduleId];
  if (mod === undefined || mod === null) return true;
  return mod[action] !== false;
};

// ── PARTE 1: Tipos de actividad según el Reglamento CAEDUC (arts. 19-23) ──────
// Fuente: Reglamento CAEDUC. Horas mínimas por tipo de actividad para poder
// optar al aval. null = sin mínimo de horas (evaluado caso a caso).
export const ACTIVIDADES_REGLAMENTO = [
  { tipo: 'Diplomado',               horasMin: 20, literal: 'a' },
  { tipo: 'Especialización',         horasMin: 25, literal: 'b' },
  { tipo: 'Congreso',                horasMin: 16, literal: 'c' },
  { tipo: 'Seminario',               horasMin: 2,  literal: 'd' },
  { tipo: 'Simposio',                horasMin: 2,  literal: 'e' },
  { tipo: 'Conferencia',             horasMin: 2,  literal: 'f' },
  { tipo: 'Taller',                  horasMin: 2,  literal: 'g' },
  { tipo: 'Voluntariado Profesional',horasMin: null, literal: 'h' },
  { tipo: 'Otras actividades',       horasMin: null, literal: 'i' },
];

export const ACTIVITY_TYPES = ACTIVIDADES_REGLAMENTO.map(a => a.tipo);

// Texto de la opción del <select> con la información de horas mínimas
export const labelActividadReglamento = (a) => {
  if (a.horasMin == null) {
    return a.tipo === 'Otras actividades'
      ? `${a.tipo} — horas evaluadas por la Comisión`
      : `${a.tipo} — sin mínimo de horas`;
  }
  return `${a.tipo} — mínimo ${a.horasMin} horas`;
};

// Conector gramatical español ("o" / "u" antes de palabras que empiezan con o/ho)
const joinEs = (arr) => {
  if (!arr.length) return '';
  if (arr.length === 1) return arr[0];
  const last = arr[arr.length - 1];
  const conn = /^[oOhH]/.test(last) ? 'u' : 'o';
  return `${arr.slice(0, -1).join(', ')} ${conn} ${last}`;
};

// Tipos de actividad que SÍ admiten la cantidad de horas indicada
export const sugerirTiposPorHoras = (horas) => {
  const n = Number(horas) || 0;
  const list = ACTIVIDADES_REGLAMENTO
    .filter(a => a.horasMin != null && a.horasMin <= n)
    .map(a => a.tipo);
  if (n > 0) list.push('Otras actividades');
  return list;
};

// Valida horas mínimas de un tipo de actividad. Devuelve { valid, message, alternativas }
export const validarHorasActividad = (tipo, horas) => {
  const info = ACTIVIDADES_REGLAMENTO.find(a => a.tipo === tipo);
  if (!info || info.horasMin == null) return { valid: true };
  const n = Number(horas) || 0;
  if (n < info.horasMin) {
    const alternativas = sugerirTiposPorHoras(n).filter(t => t !== tipo);
    return {
      valid: false,
      message: `Un(a) ${tipo} requiere mínimo ${info.horasMin} horas según el Reglamento CAEDUC (art. 19). Tu actividad indica ${n} horas, por lo que no puede optar al aval como ${tipo}. Ajusta la duración o selecciona el tipo de actividad que corresponda.`,
      alternativas,
      alternativasTexto: alternativas.length ? joinEs(alternativas) : '',
    };
  }
  return { valid: true };
};

export const MODALITIES = ['Virtual', 'Presencial', 'Híbrida'];

export const MOTIVOS_OFICIO = [
  'Aprobación y asignación de recursos para realizar actividad',
  'Solicitud de salón y equipo audiovisual',
  'Solicitud de materiales e insumos',
  'Informe de actividad realizada',
  'Solicitud de difusión institucional',
  'Otro (personalizado)'
];

// ── PARTE 2: correlativo automático de oficios ─────────────────────────────
// Formato oficial: Of. NNN.YYYY.CPSG.CAEDUC — reinicia cada año.
export const computeSuggestedOficioNumero = (oficios, anio = new Date().getFullYear()) => {
  const re = /^Of\.\s*(\d+)\.(\d{4})/;
  let max = 0;
  (oficios || []).forEach(o => {
    const m = re.exec(o.numero_oficio || '');
    if (m && Number(m[2]) === anio) max = Math.max(max, Number(m[1]));
  });
  return `Of. ${String(max + 1).padStart(3, '0')}.${anio}.CPSG.CAEDUC`;
};
