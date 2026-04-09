import type { Square } from "../../core/types.js";

export class HighlightsManager {
  private selected: Square | null = null;
  private legalTargets = new Set<Square>();

  setSelection(square: Square | null, legalTargets: Square[]): void {
    this.selected = square;
    this.legalTargets = new Set(legalTargets);
  }

  applySquareState(squareEl: HTMLElement, square: Square, lastMove: { from: Square; to: Square } | null, checkSquare: Square | null): void {
    squareEl.classList.toggle("is-selected", square === this.selected);
    squareEl.classList.toggle("is-legal", this.legalTargets.has(square));
    squareEl.classList.toggle("is-last-move", Boolean(lastMove && (square === lastMove.from || square === lastMove.to)));
    squareEl.classList.toggle("is-check", square === checkSquare);
  }
}
