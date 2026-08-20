import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVITY_SOURCE_PUBLICACION,
  activitySourceReference,
  publicationToActivity,
} from './activitySources.js';

test('convierte una solicitud de publicación en una actividad reutilizable', () => {
  const activity = publicationToActivity({
    id: 'pub-1',
    actividad_nombre: 'Encuentro clínico',
    ponente_nombre: 'Dra. Ana López',
    actividad_fecha: '2026-08-30',
    actividad_hora: '08:30',
    actividad_lugar: 'Aula virtual',
    zoom_detalles: 'Enlace de Zoom:\nhttps://zoom.example',
  });

  assert.equal(activity.source_type, ACTIVITY_SOURCE_PUBLICACION);
  assert.equal(activity.actividad_nombre, 'Encuentro clínico');
  assert.equal(activity.actividad_modalidad, 'Virtual');
  assert.equal(activitySourceReference(activity), 'Solicitud de publicación');
});

test('no inventa modalidad cuando la solicitud no incluye Zoom', () => {
  assert.equal(publicationToActivity({ actividad_nombre: 'Actividad presencial' }).actividad_modalidad, 'Por confirmar');
});
