import type { AnalysisLine } from "../../core/types.js";

export interface BestMoveViewModel {
  rank: number;
  move: string;
  score: string;
  pvText: string;
}

export function buildBestMoveView(lines: AnalysisLine[]): BestMoveViewModel[] {
  return [...lines]
    .sort((a, b) => a.multipv - b.multipv)
    .slice(0, 5)
    .map((line) => ({
      rank: line.multipv,
      move: line.pv[0] ?? "—",
      score: line.score.kind === "cp" ? `${line.score.value >= 0 ? "+" : ""}${(line.score.value / 100).toFixed(2)}` : `#${line.score.value}`,
      pvText: line.pv.slice(0, 8).join(" "),
    }));
}
