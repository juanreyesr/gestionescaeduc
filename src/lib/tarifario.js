// src/lib/tarifario.js — Tarifario de honorarios compartido
// El tarifario vive en `app_settings.honorarios_tarifario` (JSON) y se usa en
// tres lugares: la carta del tarifario (Directorio), el modelo de factura y los
// oficios de pago de honorarios a ponentes. Aquí queda la única definición para
// que los tres lean exactamente los mismos grados y montos.

export const TARIFAS_DEFAULT = [
  { grado: 'Licenciatura',   monto: 2000 },
  { grado: 'Maestría',       monto: 2500 },
  { grado: 'Doctorado',      monto: 3000 },
  { grado: 'Post Doctorado', monto: 3500 },
];

export const parseTarifas = (value) => {
  if (!value) return TARIFAS_DEFAULT;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed) || !parsed.length) return TARIFAS_DEFAULT;
    return parsed.map(item => ({ grado: String(item.grado || ''), monto: Number(item.monto || 0) }));
  } catch {
    return TARIFAS_DEFAULT;
  }
};

export const gradosDeTarifario = (tarifas = TARIFAS_DEFAULT) =>
  parseTarifas(tarifas).map(item => item.grado).filter(Boolean);

const normalizarGrado = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

// Devuelve el monto del tarifario para un grado académico, o null si el grado
// está vacío o ya no existe en el tarifario vigente.
export const montoPorGrado = (grado, tarifas = TARIFAS_DEFAULT) => {
  const buscado = normalizarGrado(grado);
  if (!buscado) return null;
  const encontrado = parseTarifas(tarifas).find(item => normalizarGrado(item.grado) === buscado);
  if (!encontrado || !Number.isFinite(encontrado.monto) || encontrado.monto <= 0) return null;
  return encontrado.monto;
};

export const formatoQuetzales = (monto) => {
  const valor = Number(monto);
  if (!Number.isFinite(valor)) return '';
  return `Q. ${valor.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
