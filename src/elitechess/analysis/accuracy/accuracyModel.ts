import type { AnalysisLine } from "../../core/types.js";

export type MoveQuality = "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder";

export function classifyDelta(previous: AnalysisLine | null, next: AnalysisLine | null): MoveQuality {
  if (!previous || !next) return "good";
  if (previous.score.kind === "mate" || next.score.kind === "mate") return "excellent";
  const swing = Math.abs((next.score.value - previous.score.value) / 100);
  if (swing < 0.2) return "best";
  if (swing < 0.5) return "excellent";
  if (swing < 1.0) return "good";
  if (swing < 2.0) return "inaccuracy";
  if (swing < 3.5) return "mistake";
  return "blunder";
}
