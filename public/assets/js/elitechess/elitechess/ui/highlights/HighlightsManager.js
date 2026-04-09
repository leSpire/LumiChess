export class HighlightsManager {
    selected = null;
    legalTargets = new Set();
    setSelection(square, legalTargets) {
        this.selected = square;
        this.legalTargets = new Set(legalTargets);
    }
    applySquareState(squareEl, square, lastMove, checkSquare) {
        squareEl.classList.toggle("is-selected", square === this.selected);
        squareEl.classList.toggle("is-legal", this.legalTargets.has(square));
        squareEl.classList.toggle("is-last-move", Boolean(lastMove && (square === lastMove.from || square === lastMove.to)));
        squareEl.classList.toggle("is-check", square === checkSquare);
    }
}
