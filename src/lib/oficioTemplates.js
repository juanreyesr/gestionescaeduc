// src/lib/oficioTemplates.js — Plantillas de texto pre-redactado para oficios e informes técnicos
// (Parte 3.4 y Parte 4 del rediseño CAEDUC)

export const buildJustificacionTemplate = ({ actividad, tipo, modalidad, fecha, sede, monto }) => {
  return `La Comisión de Acreditación y Educación Continua (CAEDUC) tiene como propósito fortalecer la formación continua de los agremiados del Colegio de Psicólogos de Guatemala. En este marco, se solicita la aprobación y asignación de recursos para realizar la actividad "${actividad || '—'}"${tipo ? `, de tipo ${tipo.toLowerCase()}` : ''}${modalidad ? `, en modalidad ${modalidad.toLowerCase()}` : ''}${fecha ? `, programada para el ${fecha}` : ''}${sede ? `, en ${sede}` : ''}.

La actividad beneficiará directamente a los agremiados y profesionales de la psicología que participen, contribuyendo a su actualización académica y al cumplimiento del plan de trabajo anual de CAEDUC.${monto ? `

Se solicita un monto total de ${monto} para cubrir los recursos necesarios para la correcta ejecución de la actividad.` : ''}`;
};

export const buildPoblacionObjetivoTemplate = ({ actividad }) =>
  `Profesionales de la psicología agremiados al Colegio de Psicólogos de Guatemala y público interesado en "${actividad || 'la actividad'}", con expectativa de participación activa y aprovechamiento académico.`;

export const buildResultadosEsperadosTemplate = () =>
  `Se espera fortalecer las competencias profesionales de los participantes, incrementar la oferta de educación continua avalada por CAEDUC y contribuir al cumplimiento del plan anual de trabajo de la Comisión.`;

export const buildCronogramaTemplate = ({ fecha, modalidad }) =>
  `Actividad a realizarse ${fecha ? `el ${fecha}` : 'en la fecha programada'}${modalidad ? ` en modalidad ${modalidad.toLowerCase()}` : ''}. El cronograma detallado de logística, confirmación de ponente y difusión se coordina previamente por la comisión.`;

// Convierte los campos del informe técnico en un bloque estructurado que se
// concatena dentro de `justificacion` (no se toca el esquema de oficios).
export const mergeInformeTecnico = (justificacion, { poblacion_objetivo, resultados_esperados, cronograma_resumen }) => {
  let just = justificacion || '';
  const extra = [];
  if (poblacion_objetivo) extra.push(`### Población objetivo y alcance esperado\n${poblacion_objetivo}`);
  if (cronograma_resumen) extra.push(`### Cronograma resumido\n${cronograma_resumen}`);
  if (resultados_esperados) extra.push(`### Resultados esperados\n${resultados_esperados}`);
  if (extra.length) just = (just ? just.trim() + '\n\n' : '') + extra.join('\n\n');
  return just;
};

// Parsea `justificacion` en intro (texto libre antes de cualquier "### ") + secciones con encabezado.
export const parseJustificacionSections = (txt) => {
  if (!txt) return { intro: '', sections: {} };
  const parts = txt.split(/\n(?=### )/);
  let intro = '';
  const sections = {};
  parts.forEach(p => {
    const m = p.match(/^###\s*(.+?)\n([\s\S]*)$/);
    if (m) sections[m[1].trim()] = m[2].trim();
    else if (p.trim() && !intro) intro = p.trim();
  });
  return { intro, sections };
};

const EXPOSITORES_SECTION = 'Expositor(es)';

// Mantiene los expositores dentro del bloque estructurado de `justificacion`.
// Esto conserva compatibilidad con la tabla actual de oficios sin requerir una
// migración y permite que otros módulos reutilicen el dato de forma segura.
export const getOficioExpositores = (oficioOrText) => {
  const text = typeof oficioOrText === 'string'
    ? oficioOrText
    : oficioOrText?.justificacion || '';
  return parseJustificacionSections(text).sections[EXPOSITORES_SECTION] || '';
};

export const setOficioExpositores = (text, expositores) => {
  const source = text || '';
  const sectionPattern = /(?:^|\n)###\s*Expositor\(es\)\s*\n[\s\S]*?(?=\n###\s|$)/i;
  const cleaned = source.replace(sectionPattern, '').trim();
  const value = String(expositores || '').trim();
  if (!value) return cleaned;
  return `${cleaned ? `${cleaned}\n\n` : ''}### ${EXPOSITORES_SECTION}\n${value}`;
};
