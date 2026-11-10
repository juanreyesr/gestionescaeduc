import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSuggestedAvalCorrelativo, avalesConCorrelativo } from './constants.js';

const avales = [
  { id: 1, correlativo: 'CAEDUC-2026-01' },
  { id: 2, correlativo: 'CAEDUC-0002-2026', is_deleted: true },
  { id: 3, correlativo: 'CAEDU-37-2026' },
  { id: 4, correlativo: 'CAEDUC-56-2026' },
  { id: 5, correlativo: 'CAEDUC-90-2025' },
  { id: 6, correlativo: '' },
];

test('sugiere el siguiente correlativo del año con dos dígitos', () => {
  assert.equal(computeSuggestedAvalCorrelativo(avales, 2026), 'CAEDUC-57-2026');
  assert.equal(computeSuggestedAvalCorrelativo(avales, 2027), 'CAEDUC-01-2027');
  assert.equal(computeSuggestedAvalCorrelativo([], 2026), 'CAEDUC-01-2026');
});

test('detecta correlativos repetidos aunque cambie el formato', () => {
  assert.deepEqual(avalesConCorrelativo(avales, 'CAEDUC-37-2026').map(a => a.id), [3]);
  assert.deepEqual(avalesConCorrelativo(avales, 'CAEDUC-37-2026', 3), []);
  assert.deepEqual(avalesConCorrelativo(avales, 'CAEDUC-02-2026'), []); // el 2 está eliminado
});
