export type Orientation = "white" | "black";
export type Square = `${"a"|"b"|"c"|"d"|"e"|"f"|"g"|"h"}${1|2|3|4|5|6|7|8}`;

export interface MoveRequest {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
}

export interface MoveResult {
  from: Square;
  to: Square;
  san: string;
  flags: string;
  color: "w" | "b";
  piece: string;
  captured?: string;
  promotion?: string;
}

export interface PieceAtSquare {
  square: Square;
  color: "w" | "b";
  type: "p" | "r" | "n" | "b" | "q" | "k";
}

export interface LegalMove {
  from: Square;
  to: Square;
  san: string;
  flags: string;
  promotion?: string;
}

export interface GameStatus {
  inCheck: boolean;
  checkmate: boolean;
  stalemate: boolean;
  draw: boolean;
  turn: "w" | "b";
}

export interface MoveNode {
  ply: number;
  fen: string;
  san: string;
  lan: string;
  turn: "w" | "b";
}

export interface PgnVariationState {
  rootFen: string;
  currentIndex: number;
  moves: MoveNode[];
  source: "manual" | "pgn";
}

export type EngineLifecycle = "loading" | "ready" | "analysing" | "stopped" | "error";

export interface ScoreModel {
  kind: "cp" | "mate";
  value: number;
  pov: "w" | "b";
}

export interface AnalysisLine {
  multipv: number;
  depth: number;
  seldepth: number;
  nodes: number;
  nps: number;
  hashfull: number;
  score: ScoreModel;
  pv: string[];
}
