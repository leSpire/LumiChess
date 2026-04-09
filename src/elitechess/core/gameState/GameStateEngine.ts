import { MoveValidator } from "../moveValidation/MoveValidator.js";
import type { LegalMove, MoveResult, Orientation, PieceAtSquare, Square } from "../types.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export interface GameSnapshot {
  fen: string;
  pieces: PieceAtSquare[];
  lastMove: MoveResult | null;
  turn: "w" | "b";
  checkSquare: Square | null;
}

export class GameStateEngine {
  private readonly validator = new MoveValidator();
  private readonly listeners = new Set<(snapshot: GameSnapshot) => void>();
  private lastMove: MoveResult | null = null;
  private orientation: Orientation = "white";
  private premovesEnabled = false;

  subscribe(listener: (snapshot: GameSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  setPosition(fen: string): void {
    this.validator.setPosition(fen);
    this.lastMove = null;
    this.emit();
  }

  move(from: Square, to: Square, options?: { promotion?: "q" | "r" | "b" | "n" }): MoveResult | null {
    const move = this.validator.validateAndPlay({ from, to, promotion: options?.promotion });
    if (!move) return null;
    this.lastMove = move;
    this.emit();
    return move;
  }

  legalMoves(from?: Square): LegalMove[] {
    return this.validator.legalMoves(from);
  }

  highlightSquares(_squares: Square[]): void {}

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
}
