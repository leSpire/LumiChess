import test from 'node:test';
import assert from 'node:assert/strict';
import { HighlightsManager } from '../dist/src/elitechess/ui/highlights/HighlightsManager.js';

test('highlights selection and legal squares', () => {
  const manager = new HighlightsManager();
  const classes = new Set();
  const el = { classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) } };
  manager.setSelection('e2', ['e4']);
  manager.applySquareState(el, 'e4', { from: 'e2', to: 'e4' }, null);
  assert.equal(classes.has('is-legal'), true);
  assert.equal(classes.has('is-last-move'), true);
});
