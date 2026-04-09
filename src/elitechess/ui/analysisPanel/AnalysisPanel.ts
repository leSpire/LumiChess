import type { AnalysisLine } from "../../core/types.js";
import { buildBestMoveView } from "../../analysis/bestMoves/bestMovesModel.js";

export class AnalysisPanel {
  constructor(private readonly root: HTMLElement) {}

  render(lines: AnalysisLine[]): void {
    const view = buildBestMoveView(lines);
    this.root.innerHTML = view
      .map(
        (line) => `<button class="ec-best-line" data-rank="${line.rank}" type="button"><strong>#${line.rank}</strong> <span>${line.move}</span> <em>${line.score}</em><small>${line.pvText}</small></button>`,
      )
      .join("");
  }
}
