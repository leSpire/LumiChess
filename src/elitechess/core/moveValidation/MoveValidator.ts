import type { GameStatus, LegalMove, MoveRequest, MoveResult, Square } from "../types.js";
import { genLegalMoves, inCheck, isCheckmate, isStalemate, loadFEN, makeMove, startPosition, type RulesMove, type RulesState } from "./rulesEngine.js";

export class MoveValidator {
  private state: RulesState = startPosition();

  setPosition(fen: string): void {
    this.state = loadFEN(fen);
  }

  getState(): RulesState {
    return this.state;
  }

  legalMoves(square?: Square): LegalMove[] {
    return genLegalMoves(this.state, square).map((move) => ({
      from: move.from,
      to: move.to,
      san: `${move.from}-${move.to}`,
      flags: move.special ?? "n",
      promotion: move.promo,
    }));
  }

  validateAndPlay(request: MoveRequest): MoveResult | null {
    const legal = genLegalMoves(this.state, request.from).find((move) => move.to === request.to && (!move.promo || move.promo === request.promotion || request.promotion === undefined));
    if (!legal) return null;
    const movingPiece = this.state.board[8 - Number(legal.from[1])][["a","b","c","d","e","f","g","h"].indexOf(legal.from[0])];
    this.state = makeMove(this.state, { ...legal, promo: request.promotion ?? legal.promo });

    return {
      from: legal.from,
      to: legal.to,
      san: `${legal.from}-${legal.to}`,
      flags: legal.special ?? "n",
      color: (movingPiece?.[0] ?? "w") as "w" | "b",
      piece: movingPiece?.[1] ?? "p",
      promotion: request.promotion,
    };
  }

  status(): GameStatus {
    return {
      inCheck: inCheck(this.state, this.state.turn),
      checkmate: isCheckmate(this.state),
      stalemate: isStalemate(this.state),
      draw: isStalemate(this.state),
      turn: this.state.turn,
    };
  }

  fen(): string {
    return "custom-fen-not-serialized";
  }

  loadPgn(_pgn: string): void {
    throw new Error("loadPgn non implémenté dans cette version");
  }
}
