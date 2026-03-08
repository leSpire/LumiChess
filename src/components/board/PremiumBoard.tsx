import { Chess, type Square } from 'chess.js';
import { useMemo, useState } from 'react';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const glyph: Record<string, string> = {
  p: '♟',
  r: '♜',
  n: '♞',
  b: '♝',
  q: '♛',
  k: '♚',
  P: '♙',
  R: '♖',
  N: '♘',
  B: '♗',
  Q: '♕',
  K: '♔'
};

function toSquare(col: number, row: number, flipped: boolean): Square {
  const file = flipped ? files[7 - col] : files[col];
  const rank = flipped ? row + 1 : 8 - row;
  return `${file}${rank}` as Square;
}

export function PremiumBoard() {
  const [chess, setChess] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [dragged, setDragged] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square; color: 'w' | 'b' } | null>(null);

  const board = chess.board();
  const history = chess.history({ verbose: true });
  const lastMove = history[history.length - 1];

  const pieces = useMemo(() => {
    const items: Array<{ square: Square; type: string }> = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = toSquare(c, r, flipped);
        const piece = chess.get(square);
        if (piece) items.push({ square, type: piece.color === 'w' ? piece.type.toUpperCase() : piece.type });
      }
    }
    return items;
  }, [board, flipped]);

  const applyMove = (from: Square, to: Square, promo?: string) => {
    const next = new Chess(chess.fen());
    const result = next.move({ from, to, promotion: promo as 'q' | 'r' | 'b' | 'n' | undefined });
    if (!result) return false;
    setChess(next);
    setSelected(null);
    setLegalTargets([]);
    return true;
  };

  const chooseSquare = (target: Square) => {
    if (promotion) return;
    if (selected && legalTargets.includes(target)) {
      const candidate = chess.moves({ square: selected, verbose: true }).find((m) => m.to === target);
      if (candidate?.flags.includes('p')) {
        setPromotion({ from: selected, to: target, color: candidate.color });
      } else {
        applyMove(selected, target);
      }
      return;
    }

    const piece = chess.get(target);
    if (piece && piece.color === chess.turn()) {
      setSelected(target);
      setLegalTargets(chess.moves({ square: target, verbose: true }).map((m) => m.to));
    } else {
      setSelected(null);
      setLegalTargets([]);
    }
  };

  const status = chess.isCheckmate()
    ? 'Échec et mat'
    : chess.isDraw()
    ? 'Partie nulle'
    : chess.isCheck()
    ? 'Échec'
    : `Trait aux ${chess.turn() === 'w' ? 'blancs' : 'noirs'}`;

  return (
    <section className="board-shell">
      <div className="board-header">
        <h2>Échiquier d'entraînement</h2>
        <div className="board-actions">
          <button className="btn ghost" onClick={() => setFlipped((f) => !f)}>Retourner</button>
          <button className="btn ghost" onClick={() => { const next = new Chess(chess.fen()); next.undo(); setChess(next); setSelected(null); setLegalTargets([]); }}>Annuler</button>
          <button className="btn ghost" onClick={() => { setChess(new Chess()); setSelected(null); setLegalTargets([]); }}>Réinitialiser</button>
        </div>
      </div>
      <div className="board-layout">
        <div className="board" onDragOver={(e) => e.preventDefault()}>
          <div className="grid">
            {Array.from({ length: 64 }).map((_, idx) => {
              const row = Math.floor(idx / 8);
              const col = idx % 8;
              const square = toSquare(col, row, flipped);
              const isDark = (row + col) % 2 === 1;
              const isSelected = selected === square;
              const isTarget = legalTargets.includes(square);
              const isLast = square === lastMove?.from || square === lastMove?.to;
              const inCheck = chess.isCheck() && chess.get(square)?.type === 'k' && chess.get(square)?.color === chess.turn();
              return (
                <button
                  key={square}
                  className={`sq ${isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''} ${isTarget ? 'target' : ''} ${isLast ? 'last' : ''} ${inCheck ? 'check' : ''}`}
                  onClick={() => chooseSquare(square)}
                  onDrop={() => dragged && chooseSquare(square)}
                />
              );
            })}
          </div>
          <div className="piece-layer">
            {pieces.map((piece) => {
              const file = piece.square.charCodeAt(0) - 97;
              const rank = Number(piece.square[1]);
              const col = flipped ? 7 - file : file;
              const row = flipped ? rank - 1 : 8 - rank;
              return (
                <div
                  key={piece.square}
                  draggable
                  onDragStart={() => { setDragged(piece.square); chooseSquare(piece.square); }}
                  onDragEnd={() => setDragged(null)}
                  className="piece"
                  style={{ transform: `translate(${col * 100}%, ${row * 100}%)` }}
                >
                  {glyph[piece.type]}
                </div>
              );
            })}
          </div>
        </div>
        <aside className="moves-panel">
          <p className="status">{status}</p>
          <p className="fen">FEN: {chess.fen()}</p>
          <ol>
            {history.map((m, i) => (
              <li key={`${m.san}-${i}`}>{m.san}</li>
            ))}
          </ol>
        </aside>
      </div>

      {promotion && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Promotion</h3>
            <div className="promo-row">
              {['q', 'r', 'b', 'n'].map((p) => (
                <button key={p} className="btn" onClick={() => { applyMove(promotion.from, promotion.to, p); setPromotion(null); }}>
                  {glyph[promotion.color === 'w' ? p.toUpperCase() : p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
