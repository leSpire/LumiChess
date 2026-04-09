import { MoveValidator } from "../moveValidation/MoveValidator.js";
import type { LegalMove, MoveNode, MoveResult, Orientation, PgnVariationState, PieceAtSquare, Square } from "../types.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export interface GameSnapshot {
  fen: string;
  pieces: PieceAtSquare[];
  lastMove: MoveResult | null;
  turn: "w" | "b";
  checkSquare: Square | null;
  timeline: MoveNode[];
  currentIndex: number;
}

export class GameStateEngine {
  private readonly validator = new MoveValidator();
  private readonly listeners = new Set<(snapshot: GameSnapshot) => void>();
  private lastMove: MoveResult | null = null;
  private orientation: Orientation = "white";
  private premovesEnabled = false;
  private rootFen = this.validator.fen();
  private timeline: MoveNode[] = [];
  private currentIndex = 0;

  subscribe(listener: (snapshot: GameSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  setPosition(fen: string): void {
    this.validator.setPosition(fen);
    this.rootFen = fen;
    this.timeline = [];
    this.currentIndex = 0;
    this.lastMove = null;
    this.emit();
  }

  move(from: Square, to: Square, options?: { promotion?: "q" | "r" | "b" | "n" }): MoveResult | null {
    const move = this.validator.validateAndPlay({ from, to, promotion: options?.promotion });
    if (!move) return null;
    if (this.currentIndex < this.timeline.length) {
      this.timeline = this.timeline.slice(0, this.currentIndex);
    }
    this.timeline.push({
      ply: this.timeline.length + 1,
      fen: this.validator.fen(),
      san: move.san,
      lan: `${move.from}${move.to}${move.promotion ?? ""}`,
      turn: move.color,
    });
    this.currentIndex = this.timeline.length;
    this.lastMove = move;
    this.emit();
    return move;
  }

  legalMoves(from?: Square): LegalMove[] {
    return this.validator.legalMoves(from);
  }

  flip(): Orientation {
    this.orientation = this.orientation === "white" ? "black" : "white";
    return this.orientation;
  }

  enablePremoves(enabled: boolean): void {
    this.premovesEnabled = enabled;
  }

  premovesEnabledState(): boolean {
    return this.premovesEnabled;
  }

  loadPgn(pgn: string): void {
    this.validator.loadPgn(pgn);
    this.lastMove = null;
    this.emit();
  }

  snapshot(): GameSnapshot {
    const status = this.validator.status();
    return {
      fen: this.validator.fen(),
      pieces: this.mapPieces(),
      lastMove: this.lastMove,
      turn: status.turn,
      checkSquare: status.inCheck ? this.findCheckedKingSquare(status.turn) : null,
      timeline: [...this.timeline],
      currentIndex: this.currentIndex,
    };
  }

  goTo(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.timeline.length));
    this.validator.setPosition(this.rootFen);
    for (let i = 0; i < clamped; i += 1) {
      const move = this.timeline[i];
      this.validator.validateAndPlay({ from: move.lan.slice(0, 2) as Square, to: move.lan.slice(2, 4) as Square, promotion: (move.lan[4] as "q" | "r" | "b" | "n" | undefined) });
    }
    this.currentIndex = clamped;
    this.lastMove = clamped > 0 ? this.nodeToMove(this.timeline[clamped - 1]) : null;
    this.emit();
  }

  undo(): void {
    this.goTo(this.currentIndex - 1);
  }

  variationState(): PgnVariationState {
    return {
      rootFen: this.rootFen,
      currentIndex: this.currentIndex,
      moves: [...this.timeline],
      source: "manual",
    };
  }

  private mapPieces(): PieceAtSquare[] {
    const board = this.validator.getState().board;
    const pieces: PieceAtSquare[] = [];
    for (let rankIndex = 0; rankIndex < 8; rankIndex += 1) {
      for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
        const piece = board[rankIndex][fileIndex];
        if (!piece) continue;
        pieces.push({
          square: `${FILES[fileIndex]}${8 - rankIndex}` as Square,
          color: piece[0] as "w" | "b",
          type: piece[1] as PieceAtSquare["type"],
        });
      }
    }
    return pieces;
  }

  private findCheckedKingSquare(kingColor: "w" | "b"): Square | null {
    return this.mapPieces().find((piece) => piece.type === "k" && piece.color === kingColor)?.square ?? null;
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private nodeToMove(node: MoveNode): MoveResult {
    return {
      from: node.lan.slice(0, 2) as Square,
      to: node.lan.slice(2, 4) as Square,
      san: node.san,
      flags: "n",
      color: node.turn,
      piece: "p",
      promotion: node.lan[4],
    };
  }
}
