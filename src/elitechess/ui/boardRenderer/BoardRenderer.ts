import type { Orientation, PieceAtSquare, Square } from "../../core/types.js";
import { BoardAnimations } from "../animations/BoardAnimations.js";
import { HighlightsManager } from "../highlights/HighlightsManager.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

function pieceSvg(piece: PieceAtSquare): string {
  const icon = ({ p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" } as const)[piece.type];
  return `<svg viewBox="0 0 100 100" class="ec-piece-svg" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="${piece.color === "w" ? "#fff4db" : "#202028"}"/><text x="50" y="67" text-anchor="middle" font-size="58" fill="${piece.color === "w" ? "#5c4120" : "#f6d39f"}">${icon}</text></svg>`;
}

export class BoardRenderer {
  readonly root: HTMLElement;
  private readonly squaresLayer: HTMLElement;
  private readonly piecesLayer: HTMLElement;
  private readonly coordinatesLayer: HTMLElement;
  private readonly squares = new Map<Square, HTMLElement>();
  private readonly pieces = new Map<Square, HTMLElement>();
  private orientation: Orientation = "white";

  constructor(root: HTMLElement, private readonly highlights: HighlightsManager, private readonly animations: BoardAnimations) {
    this.root = root;
    this.root.classList.add("ec-board");
    this.squaresLayer = document.createElement("div");
    this.squaresLayer.className = "ec-layer ec-layer-squares";
    this.piecesLayer = document.createElement("div");
    this.piecesLayer.className = "ec-layer ec-layer-pieces";
    this.coordinatesLayer = document.createElement("div");
    this.coordinatesLayer.className = "ec-layer ec-layer-coordinates";
    this.root.append(this.squaresLayer, this.piecesLayer, this.coordinatesLayer);
    this.mountStaticSquares();
    this.root.dataset.squareCount = `${this.squares.size}`;
    this.root.classList.add("ec-board-ready");
    this.renderCoordinates();
  }

  setOrientation(orientation: Orientation): void {
    this.orientation = orientation;
    this.squares.forEach((el, square) => this.place(el, square));
    this.pieces.forEach((el, square) => this.place(el, square));
    this.renderCoordinates();
  }

  renderSquares(lastMove: { from: Square; to: Square } | null, checkSquare: Square | null): void {
    this.squares.forEach((squareEl, square) => this.highlights.applySquareState(squareEl, square, lastMove, checkSquare));
  }

  renderPieces(nextPieces: PieceAtSquare[], animate = false): void {
    const nextMap = new Map(nextPieces.map((piece) => [piece.square, piece]));

    this.pieces.forEach((el, square) => {
      if (!nextMap.has(square)) {
        el.remove();
        this.pieces.delete(square);
      }
    });

    nextMap.forEach((piece, square) => {
      let el = this.pieces.get(square) as HTMLButtonElement | undefined;
      if (!el) {
        el = document.createElement("button") as HTMLButtonElement;
        el.className = "ec-piece";
        el.type = "button";
        el.dataset.square = square;
        el.innerHTML = pieceSvg(piece);
        this.piecesLayer.appendChild(el);
        this.pieces.set(square, el);
      }
      this.place(el, square);
      if (animate) this.animations.animateTransform(el);
    });
  }

  attachPiecePointerDown(callback: (event: PointerEvent, square: Square) => void): void {
    this.piecesLayer.addEventListener("pointerdown", (event) => {
      const target = (event.target as HTMLElement).closest(".ec-piece") as HTMLElement | null;
      if (!target?.dataset.square) return;
      callback(event, target.dataset.square as Square);
    });
  }

  attachSquareClick(callback: (square: Square) => void): void {
    this.squaresLayer.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest(".ec-square") as HTMLElement | null;
      if (!target?.dataset.square) return;
      callback(target.dataset.square as Square);
    });
  }

  toSquare(clientX: number, clientY: number): Square | null {
    const rect = this.root.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;
    const x = Math.min(7, Math.max(0, Math.floor(relX * 8)));
    const y = Math.min(7, Math.max(0, Math.floor(relY * 8)));
    return this.orientation === "white" ? (`${FILES[x]}${8 - y}` as Square) : (`${FILES[7 - x]}${y + 1}` as Square);
  }

  private mountStaticSquares(): void {
    for (const rank of RANKS) {
      for (const file of FILES) {
        const square = `${file}${rank}` as Square;
        const squareEl = document.createElement("button");
        squareEl.className = "ec-square";
        squareEl.type = "button";
        squareEl.dataset.square = square;
        squareEl.dataset.tone = (FILES.indexOf(file) + rank) % 2 === 0 ? "light" : "dark";
        this.place(squareEl, square);
        this.squaresLayer.appendChild(squareEl);
        this.squares.set(square, squareEl);
      }
    }
  }

  private renderCoordinates(): void {
    this.coordinatesLayer.innerHTML = "";
    const files = this.orientation === "white" ? [...FILES] : [...FILES].reverse();
    const ranks = this.orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    files.forEach((file, index) => {
      const el = document.createElement("span");
      el.className = "ec-file-label";
      el.textContent = file;
      el.style.transform = `translateX(${index * 100}%)`;
      this.coordinatesLayer.appendChild(el);
    });
    ranks.forEach((rank, index) => {
      const el = document.createElement("span");
      el.className = "ec-rank-label";
      el.textContent = `${rank}`;
      el.style.transform = `translateY(${index * 100}%)`;
      this.coordinatesLayer.appendChild(el);
    });
  }

  private place(el: HTMLElement, square: Square): void {
    const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
    const rank = Number(square[1]);
    const x = this.orientation === "white" ? file : 7 - file;
    const y = this.orientation === "white" ? 8 - rank : rank - 1;
    el.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
  }
}
