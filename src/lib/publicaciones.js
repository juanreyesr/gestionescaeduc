import { getOficioExpositores } from './oficioTemplates.js';

export const DEFAULT_PUBLICATION_RESPONSIBLES = [
  { id: 'charly', name: 'Lic. Charly', role: 'Responsable de publicaciones', phone: '35160990' },
  { id: 'eduardo', name: 'Eduardo', role: 'Asistente de Comunicación Social', phone: '30649707' },
];

export const parseSettingJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export const getGuatemalaHour = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find(part => part.type === 'hour')?.value || 0);
  return hour === 24 ? 0 : hour;
};

export const getGreeting = (date = new Date()) => {
  const hour = getGuatemalaHour(date);
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

export const whatsappUrl = (phone, message = '') => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const base = `https://wa.me/${digits.startsWith('502') ? digits : `502${digits}`}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

export const formatActivityTime = (time) => {
  if (!time) return 'Por confirmar';
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const hours = Number(match[1]);
  const suffix = hours < 12 ? 'a. m.' : 'p. m.';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${match[2]} ${suffix}`;
};

export const formatZoomDetails = (details = '') => {
  const clean = String(details || '').trim().replace(/^Enlace de Zoom:\s*/i, '');
  return `Enlace de Zoom:\n${clean}`;
};

export const activityFromOficio = (oficio) => ({
  actividad_nombre: oficio?.actividad_nombre || '',
  ponente_nombre: getOficioExpositores(oficio) || '',
  actividad_fecha: oficio?.actividad_fecha || '',
  actividad_hora: oficio?.actividad_hora || '',
  actividad_lugar: oficio?.actividad_sede || oficio?.actividad_modalidad || '',
});

export const buildPublicationMessage = ({
  oficio,
  activity,
  responsible,
  zoomDetails = '',
  zoomUrl = '',
  now = new Date(),
}) => {
  if ((!oficio && !activity) || !responsible) return '';
  const data = activity || activityFromOficio(oficio);
  const date = data.actividad_fecha || '';
  const datePhrase = date ? `el ${date}` : 'en una fecha por confirmar';
  return `${getGreeting(now)} estimado ${responsible.name}, quiero solicitar su ayuda para anunciar en las redes una actividad que tendremos ${datePhrase}.

Nombre de la Actividad: ${data.actividad_nombre || ''}
Nombre del ponente: ${data.ponente_nombre || ''}
Fecha: ${date}
Hora: ${data.actividad_hora ? formatActivityTime(data.actividad_hora) : ''}
Lugar: ${data.actividad_lugar || ''}
${formatZoomDetails(zoomDetails || zoomUrl)}`;
};
