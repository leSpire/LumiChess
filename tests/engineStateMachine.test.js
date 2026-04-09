import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionEngineState } from '../dist/src/elitechess/engine/stockfish/engineStateMachine.js';

test('allows valid transitions', () => {
  assert.equal(transitionEngineState('loading', 'ready'), 'ready');
  assert.equal(transitionEngineState('ready', 'analysing'), 'analysing');
  assert.equal(transitionEngineState('analysing', 'stopped'), 'stopped');
});

test('blocks invalid transitions', () => {
  assert.equal(transitionEngineState('loading', 'analysing'), 'loading');
});
