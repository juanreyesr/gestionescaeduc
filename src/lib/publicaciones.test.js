import test from 'node:test';
import assert from 'node:assert/strict';
import { getOficioExpositores, setOficioExpositores } from './oficioTemplates.js';
import { buildPublicationMessage, formatActivityTime, getGreeting, whatsappUrl } from './publicaciones.js';

test('guarda y reemplaza expositores sin duplicar la sección', () => {
  const initial = 'Justificación original.\n\n### Cronograma resumido\n15 de agosto';
  const first = setOficioExpositores(initial, 'Guillermo Monzón');
  const replaced = setOficioExpositores(first, 'Ana López\nCarlos Pérez');

  assert.equal(getOficioExpositores(replaced), 'Ana López\nCarlos Pérez');
  assert.equal((replaced.match(/### Expositor\(es\)/g) || []).length, 1);
  assert.match(replaced, /### Cronograma resumido/);
});

test('genera saludos según la hora de Guatemala', () => {
  assert.equal(getGreeting(new Date('2026-08-11T14:00:00Z')), 'Buenos días');
  assert.equal(getGreeting(new Date('2026-08-11T20:00:00Z')), 'Buenas tardes');
  assert.equal(getGreeting(new Date('2026-08-12T02:00:00Z')), 'Buenas noches');
});

test('genera el mensaje plano con responsable, oficio y Zoom', () => {
  const oficio = {
    actividad_nombre: 'Cuando el duelo se detiene',
    actividad_fecha: '15 de agosto',
    actividad_hora: '08:30',
    actividad_sede: 'Auditorio del CCI y aula virtual',
    justificacion: '### Expositor(es)\nM.A. Guillermo Rafael Monzón',
  };
  const message = buildPublicationMessage({
    oficio,
    responsible: { name: 'Eduardo' },
    zoomUrl: 'https://zoom.example/123',
    now: new Date('2026-08-11T20:00:00Z'),
  });

  assert.match(message, /^Buenas tardes estimado Eduardo/);
  assert.match(message, /Nombre del ponente: M\.A\. Guillermo Rafael Monzón/);
  assert.match(message, /Hora: 8:30 a\. m\./);
  assert.match(message, /https:\/\/zoom\.example\/123$/);
});

test('normaliza hora y teléfono para WhatsApp Guatemala', () => {
  assert.equal(formatActivityTime('13:05'), '1:05 p. m.');
  assert.equal(whatsappUrl('3516-0990'), 'https://wa.me/50235160990');
  assert.equal(whatsappUrl('+502 3064 9707'), 'https://wa.me/50230649707');
});
