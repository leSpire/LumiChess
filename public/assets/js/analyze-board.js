import { ChessLogic } from "./chess-logic.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PIECES = {
  wp: "♙", wr: "♖", wn: "♘", wb: "♗", wq: "♕", wk: "♔",
  bp: "♟", br: "♜", bn: "♞", bb: "♝", bq: "♛", bk: "♚",
};

class AnalysisBoard {
  constructor(root, statusEl) {
    this.root = root;
    this.statusEl = statusEl;
    this.logic = new ChessLogic();
    this.orientation = "white";
    this.selected = null;
    this.drag = null;
    this.lastMove = null;
    this.buildDOM();
    this.render();
  }

  buildDOM() {
    this.root.innerHTML = "";
    this.squaresLayer = document.createElement("div");
    this.squaresLayer.className = "board-layer squares";
    this.piecesLayer = document.createElement("div");
    this.piecesLayer.className = "board-layer pieces";
    this.root.append(this.squaresLayer, this.piecesLayer);

    for (let r = 8; r >= 1; r -= 1) {
      for (let f = 0; f < 8; f += 1) {
        const sq = `${FILES[f]}${r}`;
        const cell = document.createElement("button");
        cell.className = `sq ${(f + r) % 2 === 0 ? "light" : "dark"}`;
        cell.dataset.square = sq;
        cell.type = "button";
        cell.addEventListener("click", () => this.onSquareClick(sq));
        this.squaresLayer.appendChild(cell);
      }
    }

    window.addEventListener("pointermove", (e) => this.onPointerMove(e));
    window.addEventListener("pointerup", (e) => this.onPointerUp(e));
  }

  squareToVisual(square) {
    const file = FILES.indexOf(square[0]);
    const rank = Number(square[1]);
    if (this.orientation === "white") return { x: file, y: 8 - rank };
    return { x: 7 - file, y: rank - 1 };
  }

  xyToSquare(clientX, clientY) {
    const r = this.root.getBoundingClientRect();
    const x = Math.floor(((clientX - r.left) / r.width) * 8);
    const y = Math.floor(((clientY - r.top) / r.height) * 8);
    if (x < 0 || y < 0 || x > 7 || y > 7) return null;
    return this.orientation === "white" ? `${FILES[x]}${8 - y}` : `${FILES[7 - x]}${y + 1}`;
  }

  setSquarePos(el, square, animated = false) {
    const { x, y } = this.squareToVisual(square);
    el.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
    if (animated) el.classList.add("animated");
  }

  onSquareClick(square) {
    const legal = this.logic.legalMoves(this.selected).find((m) => m.to === square);
    if (this.selected && legal) {
      this.play(this.selected, square);
      return;
    }
    const piece = this.logic.game.get(square);
    if (!piece || piece.color !== this.logic.turn()) {
      this.selected = null;
      this.render();
      return;
    }
    this.selected = square;
    this.render();
  }

  onPieceDown(ev, square) {
    const piece = this.logic.game.get(square);
    if (!piece || piece.color !== this.logic.turn()) return;
    this.selected = square;
    this.drag = { from: square, ghost: ev.currentTarget.cloneNode(true) };
    this.drag.ghost.classList.add("piece", "dragging");
    this.piecesLayer.appendChild(this.drag.ghost);
    ev.preventDefault();
    this.render();
  }

  onPointerMove(ev) {
    if (!this.drag) return;
    const rect = this.root.getBoundingClientRect();
    const size = rect.width / 8;
    const x = ev.clientX - rect.left - size / 2;
    const y = ev.clientY - rect.top - size / 2;
    this.drag.ghost.style.transform = `translate(${x}px, ${y}px)`;
  }

  onPointerUp(ev) {
    if (!this.drag) return;
    const to = this.xyToSquare(ev.clientX, ev.clientY);
    const from = this.drag.from;
    this.drag.ghost.remove();
    this.drag = null;
    if (to) this.play(from, to);
    else this.render();
  }

  play(from, to) {
    const move = this.logic.move(from, to);
    if (!move) return;
    this.lastMove = move;
    this.selected = null;
    this.render(true);
  }

  render(animate = false) {
    const map = new Map(this.logic.legalMoves(this.selected).map((m) => [m.to, true]));
    this.squaresLayer.querySelectorAll(".sq").forEach((sqEl) => {
      const sq = sqEl.dataset.square;
      sqEl.classList.toggle("is-selected", sq === this.selected);
      sqEl.classList.toggle("is-legal", map.has(sq));
      sqEl.classList.toggle("is-last", this.lastMove && (this.lastMove.from === sq || this.lastMove.to === sq));
      this.setSquarePos(sqEl, sq);
    });

    this.piecesLayer.querySelectorAll(".piece").forEach((el) => el.remove());
    const board = this.logic.board();
    board.forEach((row, i) => {
      row.forEach((piece, j) => {
        if (!piece) return;
        const sq = `${FILES[j]}${8 - i}`;
        if (this.drag?.from === sq) return;
        const el = document.createElement("button");
        el.type = "button";
        el.className = "piece";
        el.dataset.square = sq;
        el.textContent = PIECES[`${piece.color}${piece.type}`];
        el.addEventListener("pointerdown", (e) => this.onPieceDown(e, sq));
        this.setSquarePos(el, sq, animate);
        this.piecesLayer.appendChild(el);
      });
    });

    this.statusEl.textContent = this.logic.status();
  }

  flip() {
    this.orientation = this.orientation === "white" ? "black" : "white";
    this.render();
  }
}

const board = new AnalysisBoard(document.getElementById("analysisBoard"), document.getElementById("analysisStatus"));
document.getElementById("undoBtn").addEventListener("click", () => { board.logic.undo(); board.render(); });
document.getElementById("flipBtn").addEventListener("click", () => board.flip());
document.getElementById("resetBtn").addEventListener("click", () => { board.logic.reset(); board.lastMove = null; board.selected = null; board.render(); });
