import test from 'node:test';
import assert from 'node:assert/strict';
import { GameStateEngine } from '../dist/src/elitechess/core/gameState/GameStateEngine.js';

test('supports castling, en passant and promotion', () => {
  const engine = new GameStateEngine();
  engine.setPosition('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.ok(engine.move('e1', 'g1'));
  engine.setPosition('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  assert.ok(engine.move('e5', 'd6'));
  engine.setPosition('k7/4P3/8/8/8/8/8/4K3 w - - 0 1');
  const promo = engine.move('e7', 'e8', { promotion: 'q' });
  assert.equal(promo?.promotion, 'q');
});

test('detects no-legal-move states', () => {
  const engine = new GameStateEngine();
  engine.setPosition('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(engine.legalMoves().length, 0);
});
