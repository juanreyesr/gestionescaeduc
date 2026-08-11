export const NIT_COLEGIO = '55273092';
export const NOMBRE_COLEGIO = 'COLEGIO DE PSICÓLOGOS DE GUATEMALA';

export const formatoMontoFactura = (monto) => {
  const numero = String(monto || '').match(/\d[\d,]*(?:\.\d+)?/);
  const valor = Number((numero?.[0] || '').replace(/,/g, ''));
  return Number.isFinite(valor) && valor > 0
    ? `Q. ${valor.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'No indicado en el oficio';
};

export const fechaFacturaLarga = (iso) => {
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const fecha = iso ? new Date(`${iso}T12:00:00`) : new Date();
  return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
};

export const horaDesdeActividad = (oficio) => {
  if (oficio?.actividad_hora) return `${oficio.actividad_hora}hrs.`;
  const texto = `${oficio?.actividad_descripcion || ''} ${oficio?.actividad_fecha || ''}`;
  const match = texto.match(/a\s+las\s+(\d{1,2})(?::(\d{2}))?\s*(?:horas?|hrs?\.?|h)?/i);
  if (!match) return 'hora indicada en el oficio';
  return `${String(match[1]).padStart(2, '0')}:${match[2] || '00'}hrs.`;
};

export const conceptoFactura = (oficio) => {
  if (!oficio) return '';
  const tipo = (oficio.actividad_tipo || 'actividad').trim().toLowerCase();
  const nombre = (oficio.actividad_nombre || 'sin nombre').trim().replace(/[.]+$/, '');
  const fecha = (oficio.actividad_fecha || 'fecha indicada en el oficio').trim();
  return `Por ${tipo} ${nombre} el ${fecha} a las ${horaDesdeActividad(oficio)}`;
};

export const buildFacturaText = (oficio, fechaFactura) => {
  if (!oficio) return '';
  return `NIT: ${NIT_COLEGIO}
A nombre de: ${NOMBRE_COLEGIO}
Fecha: ${fechaFacturaLarga(fechaFactura)}
Concepto: ${conceptoFactura(oficio)}
Monto: ${formatoMontoFactura(oficio.monto)}`;
};

export const escapeFacturaHtml = (text) => String(text || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');
