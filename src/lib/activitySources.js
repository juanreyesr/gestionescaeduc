export const ACTIVITY_SOURCE_OFICIO = 'oficio';
export const ACTIVITY_SOURCE_PUBLICACION = 'publicacion';

export const publicationToActivity = (publicacion = {}) => ({
  ...publicacion,
  id: publicacion.id || '',
  source_type: ACTIVITY_SOURCE_PUBLICACION,
  source_label: 'Solicitud de publicación',
  numero_oficio: '',
  actividad_nombre: publicacion.actividad_nombre || '',
  actividad_tipo: publicacion.actividad_tipo || 'actividad científico-académica',
  actividad_fecha: publicacion.actividad_fecha || '',
  actividad_hora: publicacion.actividad_hora || '',
  actividad_sede: publicacion.actividad_lugar || '',
  actividad_modalidad: publicacion.actividad_modalidad || (publicacion.zoom_detalles ? 'Virtual' : 'Por confirmar'),
  actividad_duracion: publicacion.actividad_duracion || '',
  actividad_descripcion: publicacion.actividad_descripcion || '',
  monto: publicacion.monto || '',
});

export const oficioToActivity = (oficio = {}) => ({
  ...oficio,
  source_type: ACTIVITY_SOURCE_OFICIO,
  source_label: 'Oficio',
});

export const activitySourceReference = (activity = {}) => (
  activity.source_type === ACTIVITY_SOURCE_PUBLICACION
    ? 'Solicitud de publicación'
    : activity.numero_oficio || 'Oficio CAEDUC'
);

export const activitySourceDescription = (activity = {}) => (
  activity.source_type === ACTIVITY_SOURCE_PUBLICACION
    ? 'Actividad registrada mediante solicitud de publicación'
    : `Actividad registrada mediante ${activity.numero_oficio || 'oficio CAEDUC'}`
);
