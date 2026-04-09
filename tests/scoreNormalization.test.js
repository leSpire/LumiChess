import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScore } from '../dist/src/elitechess/analysis/evalModel/scoreNormalization.js';

test('normalizes centipawn score for display and bar', () => {
  const normalized = normalizeScore({ kind: 'cp', value: 70, pov: 'w' });
  assert.equal(normalized.display, '+0.7');
  assert.ok(normalized.whiteAdvantageRatio > 0.5);
});

test('normalizes mate score for display and bar', () => {
  const normalized = normalizeScore({ kind: 'mate', value: -2, pov: 'w' });
  assert.equal(normalized.display, '#-2');
  assert.ok(normalized.whiteAdvantageRatio < 0.1);
});
