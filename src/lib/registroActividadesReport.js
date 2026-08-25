const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const escapeRegistroHTML = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

// El historial previo admite fechas ISO y texto en español; esta clave permite
// ordenarlo sin modificar ni reinterpretar el dato que ve la persona usuaria.
export const activityDateKey = (value = '') => {
  const raw = String(value).trim().toLowerCase();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`;
  const spanish = raw.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/i);
  if (!spanish) return '';
  const month = MONTHS.indexOf(spanish[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '')) + 1;
  if (!month) return '';
  // Los primeros registros se guardaron sin año (por ejemplo, “25 de agosto”).
  // Para que sigan siendo útiles en el orden y en el filtro anual, se asocian al
  // año en curso sin cambiar el texto original almacenado.
  const year = spanish[3] || String(new Date().getFullYear());
  return `${year}-${String(month).padStart(2, '0')}-${spanish[1].padStart(2, '0')}`;
};

export const sortActivitiesByDate = (activities = []) => [...activities].sort((a, b) => {
  const aDate = activityDateKey(a.actividad_fecha);
  const bDate = activityDateKey(b.actividad_fecha);
  if (aDate && bDate) return aDate.localeCompare(bDate) || String(a.actividad_nombre || '').localeCompare(String(b.actividad_nombre || ''), 'es');
  if (aDate) return -1;
  if (bDate) return 1;
  return String(a.actividad_nombre || '').localeCompare(String(b.actividad_nombre || ''), 'es');
});

export const activitiesInDateRange = (activities = [], from = '', to = '') => sortActivitiesByDate(activities)
  .filter((activity) => {
    const date = activityDateKey(activity.actividad_fecha);
    return date && (!from || date >= from) && (!to || date <= to);
  });

export const formatRegistroDate = (value = '') => {
  const key = activityDateKey(value);
  if (!key) return String(value || 'Fecha pendiente');
  const [year, month, day] = key.split('-');
  return `${Number(day)} de ${MONTHS[Number(month) - 1]} de ${year}`;
};

const rangeLabel = (from, to) => {
  if (from && to) return `${formatRegistroDate(from)} al ${formatRegistroDate(to)}`;
  if (from) return `desde el ${formatRegistroDate(from)}`;
  if (to) return `hasta el ${formatRegistroDate(to)}`;
  return 'todas las fechas registradas';
};

const pageStyle = "position:relative;width:8.5in;min-height:11in;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;color:#26364b;background:#fff;overflow:hidden;";
const reportDate = () => new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

export const generateActivityRegisterHTML = (activities = [], { from = '', to = '' } = {}) => {
  const pages = sortActivitiesByDate(activities).map((activity, index) => {
    const photo = activity.ponente_foto_url
      ? `<img src="${escapeRegistroHTML(activity.ponente_foto_url)}" alt="Fotografía de ${escapeRegistroHTML(activity.ponente_nombre || 'ponente')}" style="width:100%;height:100%;object-fit:cover;">`
      : `<div style="height:100%;display:flex;align-items:center;justify-content:center;background:#eaf1f8;color:#53718e;font-size:15px;font-weight:700;text-align:center;padding:18px;">Sin fotografía disponible</div>`;
    return `<section class="page" style="${pageStyle}padding:.7in .72in;page-break-before:${index ? 'always' : 'auto'};">
      <div style="border-bottom:4px solid #e91e63;padding-bottom:18px;display:flex;justify-content:space-between;gap:18px;align-items:flex-end;">
        <div><p style="margin:0;color:#1a5276;font-size:10px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;">CAEDUC</p><h1 style="margin:6px 0 0;font-size:24px;line-height:1.2;color:#173b63;">Informe de actividades</h1></div>
        <p style="margin:0;font-size:10px;color:#63758a;text-align:right;">Período seleccionado<br><strong style="color:#26364b;">${escapeRegistroHTML(rangeLabel(from, to))}</strong></p>
      </div>
      <div style="display:grid;grid-template-columns:2.35in 1fr;gap:28px;margin-top:38px;align-items:start;">
        <div style="height:3.15in;border-radius:12px;overflow:hidden;background:#eaf1f8;box-shadow:0 5px 18px rgba(23,59,99,.16);">${photo}</div>
        <div><p style="margin:0 0 8px;color:#e91e63;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">Actividad ${index + 1} de ${activities.length}</p>
          <h2 style="margin:0 0 26px;font-size:22px;line-height:1.27;color:#173b63;">${escapeRegistroHTML(activity.actividad_nombre || 'Actividad sin nombre')}</h2>
          <div style="display:grid;gap:15px;">
            <div><p style="margin:0;color:#718096;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;">Ponente</p><p style="margin:3px 0 0;font-size:14px;line-height:1.45;font-weight:700;">${escapeRegistroHTML(activity.ponente_nombre || 'Pendiente')}</p></div>
            <div><p style="margin:0;color:#718096;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;">Fecha</p><p style="margin:3px 0 0;font-size:14px;line-height:1.45;font-weight:700;">${escapeRegistroHTML(formatRegistroDate(activity.actividad_fecha))}</p></div>
            <div><p style="margin:0;color:#718096;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;">Lugar</p><p style="margin:3px 0 0;font-size:14px;line-height:1.45;font-weight:700;">${escapeRegistroHTML(activity.actividad_lugar || 'Pendiente')}</p></div>
            <div><p style="margin:0;color:#718096;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;">Hora</p><p style="margin:3px 0 0;font-size:14px;line-height:1.45;font-weight:700;">${escapeRegistroHTML(activity.actividad_hora || 'Pendiente')}</p></div>
          </div>
        </div>
      </div>
      <p style="position:absolute;right:.72in;bottom:.55in;margin:0;color:#8b9aac;font-size:9px;">CAEDUC · Generado el ${escapeRegistroHTML(reportDate())}</p>
    </section>`;
  }).join('');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe de actividades CAEDUC</title><style>@page{size:letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${pages}</body></html>`;
};

export const generateBoardActivitiesHTML = (activities = [], { from = '', to = '', membreteUrl = '/fondo-oficios.jpg', signerName = 'M. A. Juan J. Reyes', signerRole = 'Coordinador', signerInstitution = 'Comisión de Acreditación Educación Continua, Colegio de Psicólogos de Guatemala', signerUrl = '', stampUrl = '' } = {}) => {
  const rows = sortActivitiesByDate(activities).map((activity, index) => `<tr style="background:${index % 2 ? '#f8fbfd' : '#fff'};">
    <td style="padding:8px 7px;border:1px solid #cbd5df;font-weight:700;line-height:1.3;">${escapeRegistroHTML(activity.actividad_nombre || 'Actividad sin nombre')}</td>
    <td style="padding:8px 7px;border:1px solid #cbd5df;line-height:1.3;">${escapeRegistroHTML(formatRegistroDate(activity.actividad_fecha))}</td>
    <td style="padding:8px 7px;border:1px solid #cbd5df;line-height:1.3;">${escapeRegistroHTML(activity.ponente_nombre || 'Pendiente')}</td>
    <td style="padding:8px 7px;border:1px solid #cbd5df;line-height:1.3;">${escapeRegistroHTML(activity.actividad_lugar || 'Pendiente')}</td>
    <td style="padding:8px 7px;border:1px solid #cbd5df;line-height:1.3;white-space:nowrap;">${escapeRegistroHTML(activity.actividad_hora || 'Pendiente')}</td>
  </tr>`).join('');
  const institution = String(signerInstitution).split(',').map(item => `<div style="font-size:9px;color:#556579;">${escapeRegistroHTML(item.trim())}</div>`).join('');
  const signature = `<div style="margin-top:28px;"><p style="font-size:11.5px;margin:0 0 18px;">Atentamente,</p><div style="display:flex;justify-content:center;align-items:flex-end;gap:20px;text-align:center;">${signerUrl ? `<div><img src="${escapeRegistroHTML(signerUrl)}" alt="Firma" style="height:55px;width:auto;display:block;margin:0 auto -4px;">` : '<div>'}<div style="width:215px;border-top:1.5px solid #26364b;padding-top:4px;"><div style="font-size:11px;font-weight:800;">${escapeRegistroHTML(signerName)}</div><div style="font-size:10px;color:#45576c;">${escapeRegistroHTML(signerRole)}</div>${institution}</div></div>${stampUrl ? `<img src="${escapeRegistroHTML(stampUrl)}" alt="Sello CAEDUC" style="height:72px;width:auto;opacity:.88;">` : ''}</div></div>`;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe a Junta Directiva - Actividades CAEDUC</title><style>@page{size:letter;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><section class="page" style="${pageStyle}"><img src="${escapeRegistroHTML(membreteUrl)}" alt="" style="position:absolute;inset:0;width:100%;height:1056px;object-fit:cover;z-index:0;pointer-events:none;"><div style="position:relative;z-index:1;padding:1.35in .72in 1.45in .9in;min-height:11in;"><p style="margin:0;text-align:right;font-size:11px;color:#4b5563;">Guatemala, ${escapeRegistroHTML(reportDate())}</p><div style="margin-top:22px;font-size:11.5px;line-height:1.6;"><strong>Señores</strong><br><strong>Junta Directiva</strong><br>Colegio de Psicólogos de Guatemala<br>Presente</div><p style="margin:20px 0 12px;font-size:11.5px;font-weight:700;">Honorables miembros de la Junta Directiva:</p><p style="margin:0 0 16px;font-size:11.5px;line-height:1.7;text-align:justify;">Por este medio, la Comisión de Acreditación y Educación Continua (CAEDUC) informa las actividades programadas para el período ${escapeRegistroHTML(rangeLabel(from, to))}.</p><h1 style="margin:0 0 5px;font-size:15px;color:#1a5276;text-align:center;">Informe de actividades programadas</h1><p style="margin:0 0 14px;text-align:center;color:#63758a;font-size:10px;">Total de actividades: ${activities.length}</p><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><colgroup><col style="width:28%"><col style="width:16%"><col style="width:21%"><col style="width:23%"><col style="width:12%"></colgroup><thead><tr style="background:#1a5276;color:#fff;"><th style="padding:8px 7px;border:1px solid #174567;text-align:left;font-size:9px;">ACTIVIDAD</th><th style="padding:8px 7px;border:1px solid #174567;text-align:left;font-size:9px;">FECHA</th><th style="padding:8px 7px;border:1px solid #174567;text-align:left;font-size:9px;">PONENTE</th><th style="padding:8px 7px;border:1px solid #174567;text-align:left;font-size:9px;">LUGAR</th><th style="padding:8px 7px;border:1px solid #174567;text-align:left;font-size:9px;">HORA</th></tr></thead><tbody>${rows}</tbody></table>${signature}</div></section></body></html>`;
};
