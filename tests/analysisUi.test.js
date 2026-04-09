import test from 'node:test';
import assert from 'node:assert/strict';
import { EvalBar } from '../dist/src/elitechess/ui/evalBar/EvalBar.js';
import { AnalysisPanel } from '../dist/src/elitechess/ui/analysisPanel/AnalysisPanel.js';

function makeElement() {
  return {
    className: '',
    textContent: '',
    style: {},
    children: [],
    classList: { add: () => {}, toggle: () => {} },
    append(...els) { this.children.push(...els); },
    set innerHTML(v) { this._html = v; },
    get innerHTML() { return this._html || ''; },
  };
}

global.document = {
  createElement: () => makeElement(),
};

test('eval bar renders score', () => {
  const root = makeElement();
  const bar = new EvalBar(root);
  bar.update({ kind: 'cp', value: 30, pov: 'w' });
  assert.ok(root.children.length >= 2);
});

test('best moves renders multiple lines', () => {
  const root = makeElement();
  const panel = new AnalysisPanel(root);
  panel.render([
    { multipv: 1, depth: 20, seldepth: 30, nodes: 10, nps: 20, hashfull: 1, score: { kind: 'cp', value: 40, pov: 'w' }, pv: ['e2e4', 'e7e5'] },
    { multipv: 2, depth: 19, seldepth: 24, nodes: 10, nps: 20, hashfull: 1, score: { kind: 'cp', value: 10, pov: 'w' }, pv: ['d2d4'] },
  ]);
  assert.ok(root.innerHTML.includes('#1'));
  assert.ok(root.innerHTML.includes('#2'));
});
