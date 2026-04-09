import { buildBestMoveView } from "../../analysis/bestMoves/bestMovesModel.js";
export class AnalysisPanel {
    root;
    constructor(root) {
        this.root = root;
    }
    render(lines) {
        const view = buildBestMoveView(lines);
        this.root.innerHTML = view
            .map((line) => `<button class="ec-best-line" data-rank="${line.rank}" type="button"><strong>#${line.rank}</strong> <span>${line.move}</span> <em>${line.score}</em><small>${line.pvText}</small></button>`)
            .join("");
    }
}
