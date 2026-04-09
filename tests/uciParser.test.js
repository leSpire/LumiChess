import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUciMessage } from '../dist/src/elitechess/engine/uciProtocol/parser.js';

test('parses info lines with cp/mate and pv payload', () => {
  const cp = parseUciMessage('info depth 20 seldepth 28 multipv 2 score cp 34 nodes 1000 nps 20000 hashfull 123 pv e2e4 e7e5');
  assert.equal(cp.type, 'info');
  assert.equal(cp.line.multipv, 2);
  assert.equal(cp.line.score.kind, 'cp');
  assert.equal(cp.line.score.value, 34);

  const mate = parseUciMessage('info depth 25 score mate -2 pv g7g8q');
  assert.equal(mate.type, 'info');
  assert.equal(mate.line.score.kind, 'mate');
  assert.equal(mate.line.score.value, -2);
});

test('parses bestmove payload', () => {
  const best = parseUciMessage('bestmove e2e4 ponder e7e5');
  assert.equal(best.type, 'bestmove');
  assert.equal(best.bestmove, 'e2e4');
  assert.equal(best.ponder, 'e7e5');
});
