// src/lib/expedientePonentes.js — Expediente de documentos del ponente
//
// Cada expediente corresponde a una actividad del "Historial de actividades" de
// Solicitud de publicación y reúne los papeles que Tesorería pide para pagarle al
// profesional. Los documentos se cargan de a poco: el expediente existe desde que
// se crea, aunque todavía no tenga ningún archivo.

// Orden en que Tesorería espera los documentos. Es también el orden del ZIP.
export const DOCUMENTOS_PONENTE = [
  { tipo: 'cv',      label: 'Curriculum Vitae',            corto: 'CV' },
  { tipo: 'rtu',     label: 'RTU',                         corto: 'RTU' },
  { tipo: 'dpi',     label: 'DPI',                         corto: 'DPI' },
  { tipo: 'titulo',  label: 'Último título profesional',   corto: 'Titulo' },
  { tipo: 'colegiado', label: 'Constancia de colegiado activo', corto: 'Colegiado' },
  { tipo: 'factura', label: 'Factura',                     corto: 'Factura' },
  { tipo: 'informe', label: 'Informe de actividad firmado por el ponente', corto: 'Informe' },
];

export const TIPOS_PONENTE = DOCUMENTOS_PONENTE.map(item => item.tipo);

// Material que NO forma parte de lo que exige Tesorería y por eso no cuenta en
// el avance, pero que sí conviene guardar y mandar junto con el paquete: la
// pieza que se publicó en redes para anunciar la actividad.
export const DOCUMENTOS_EXTRA = [
  { tipo: 'redes', label: 'Publicación para redes', corto: 'Redes' },
];

export const TIPOS_EXTRA = DOCUMENTOS_EXTRA.map(item => item.tipo);

export const esTipoExtra = (tipo) => TIPOS_EXTRA.includes(tipo);

// El checklist más el material extra: lo que se numera y viaja en el ZIP.
export const TODOS_LOS_DOCUMENTOS = [...DOCUMENTOS_PONENTE, ...DOCUMENTOS_EXTRA];

export const documentoLabel = (tipo) => TODOS_LOS_DOCUMENTOS.find(item => item.tipo === tipo)?.label || tipo;

// Documentos que un CV completo suele traer adentro: del RTU a la constancia de
// colegiado activo. Cuando el ponente entrega todo dentro del CV, estos se
// marcan como incluidos y cuentan como entregados sin subir un archivo aparte.
// El CV no puede estar dentro de sí mismo, y la factura y el informe son
// documentos independientes, así que ninguno de los tres admite la marca.
export const TIPOS_EN_CV = ['rtu', 'dpi', 'titulo', 'colegiado'];

export const puedeIrEnCv = (tipo) => TIPOS_EN_CV.includes(tipo);

// Descarta cualquier valor que no corresponda, para que un dato viejo o
// manipulado no infle el conteo.
export const normalizarIncluidosEnCv = (valor) => (Array.isArray(valor) ? valor : [])
  .filter(puedeIrEnCv);

const ordenTipo = (tipo) => {
  const index = TODOS_LOS_DOCUMENTOS.findIndex(item => item.tipo === tipo);
  return index === -1 ? TODOS_LOS_DOCUMENTOS.length : index;
};

// Nombre seguro para archivos y carpetas: sin tildes ni caracteres que rompan
// una descarga en Windows, macOS o Android.
export const nombreSeguro = (value, fallback = 'documento') => {
  const limpio = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return limpio || fallback;
};

export const extensionArchivo = (nombre = '', porDefecto = 'pdf') => {
  const match = String(nombre).match(/\.([a-z0-9]{1,8})$/i);
  return match ? match[1].toLowerCase() : porDefecto;
};

// Copia los datos de la actividad al crear el expediente, para que conserve lo
// que se solicitó aunque después se edite la solicitud de publicación.
export const expedienteDesdePublicacion = (publicacion = {}) => ({
  publicacion_id: publicacion.id || null,
  ponente_nombre: String(publicacion.ponente_nombre || '').trim(),
  ponente_grado: String(publicacion.ponente_grado || '').trim(),
  actividad_nombre: String(publicacion.actividad_nombre || '').trim(),
  actividad_fecha: String(publicacion.actividad_fecha || '').trim(),
  actividad_hora: String(publicacion.actividad_hora || '').trim(),
  actividad_lugar: String(publicacion.actividad_lugar || '').trim(),
});

// Agrupa los documentos por tipo, en el orden del catálogo que se le pase.
// Por defecto agrupa el checklist; para el material extra se pasa DOCUMENTOS_EXTRA.
export const agruparDocumentos = (documentos = [], catalogo = DOCUMENTOS_PONENTE) => catalogo.map(item => ({
  ...item,
  documentos: documentos
    .filter(doc => doc.tipo === item.tipo)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))),
}));

// Cuántos documentos del checklist ya están resueltos: los que tienen archivo
// propio más los que se marcaron como incluidos dentro del CV.
export const progresoExpediente = (documentos = [], incluidosEnCv = []) => {
  const enCv = new Set(normalizarIncluidosEnCv(incluidosEnCv));
  const resueltos = TIPOS_PONENTE.filter(
    tipo => documentos.some(doc => doc.tipo === tipo) || enCv.has(tipo),
  );
  const faltantes = TIPOS_PONENTE.filter(tipo => !resueltos.includes(tipo));
  return {
    cargados: resueltos.length,
    total: TIPOS_PONENTE.length,
    faltantes,
    faltantesTexto: faltantes.map(documentoLabel).join(', '),
    completo: faltantes.length === 0,
    enCv: TIPOS_EN_CV.filter(tipo => enCv.has(tipo)),
    // Marcar documentos como incluidos en el CV sin haber cargado el CV dejaría
    // el conteo diciendo algo que no se puede respaldar con ningún archivo.
    faltaElCv: enCv.size > 0 && !documentos.some(doc => doc.tipo === 'cv'),
  };
};

// Carpeta que agrupa todo dentro del ZIP.
export const carpetaExpediente = (expediente = {}) => nombreSeguro(
  [
    'Expediente',
    expediente.ponente_nombre,
    expediente.actividad_nombre && `- ${expediente.actividad_nombre}`,
  ].filter(Boolean).join(' '),
  'Expediente ponente',
);

// Nombre de cada archivo dentro del ZIP: numerado en el orden del checklist para
// que Tesorería los reciba siempre en la misma secuencia. Cuando un tipo trae
// varios archivos (por ejemplo los dos lados del DPI) se numeran entre sí.
export const nombreArchivoEnZip = (documento = {}, { expediente = {}, indiceEnTipo = 0, totalDelTipo = 1 } = {}) => {
  const posicion = String(ordenTipo(documento.tipo) + 1).padStart(2, '0');
  const etiqueta = TODOS_LOS_DOCUMENTOS.find(item => item.tipo === documento.tipo)?.corto || documento.tipo;
  const sufijo = totalDelTipo > 1 ? ` (${indiceEnTipo + 1})` : '';
  const persona = nombreSeguro(expediente.ponente_nombre, 'Ponente');
  const extension = extensionArchivo(documento.archivo_nombre);
  return `${posicion} ${etiqueta}${sufijo} - ${persona}.${extension}`;
};

// Plan de descarga: qué archivo del bucket va a qué ruta dentro del ZIP.
// Se calcula aparte de la descarga para poder probarlo sin tocar la red.
export const planDescargaExpediente = (expediente = {}, documentos = []) => {
  const carpeta = carpetaExpediente(expediente);
  // Incluye el material extra: el paquete que se manda para facturar lleva
  // también la publicación que salió en redes.
  return agruparDocumentos(documentos, TODOS_LOS_DOCUMENTOS).flatMap(grupo => grupo.documentos.map((documento, indice) => ({
    archivo_path: documento.archivo_path,
    ruta: `${carpeta}/${nombreArchivoEnZip(documento, {
      expediente,
      indiceEnTipo: indice,
      totalDelTipo: grupo.documentos.length,
    })}`,
  })));
};

export const nombreZipExpediente = (expediente = {}) => `${carpetaExpediente(expediente)}.zip`;
