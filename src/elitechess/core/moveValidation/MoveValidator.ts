import type { GameStatus, LegalMove, MoveRequest, MoveResult, Square } from "../types.js";
import { genLegalMoves, inCheck, isCheckmate, isStalemate, loadFEN, makeMove, startPosition, type RulesState } from "./rulesEngine.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

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
    const movingPiece = this.getPieceAt(legal.from);
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
    const placement = this.state.board
      .map((row) => {
        let empty = 0;
        let out = "";
        row.forEach((piece) => {
          if (!piece) {
            empty += 1;
            return;
          }
          if (empty > 0) {
            out += String(empty);
            empty = 0;
          }
          const symbol = piece[1];
          out += piece[0] === "w" ? symbol.toUpperCase() : symbol;
        });
        if (empty > 0) out += String(empty);
        return out;
      })
      .join("/");
    const castle = `${this.state.castling.wK ? "K" : ""}${this.state.castling.wQ ? "Q" : ""}${this.state.castling.bK ? "k" : ""}${this.state.castling.bQ ? "q" : ""}` || "-";
    return `${placement} ${this.state.turn} ${castle} ${this.state.ep ?? "-"} 0 1`;
  }

  loadPgn(pgn: string): void {
    this.state = startPosition();
    const tokens = pgn
      .replace(/\{[^}]*\}/g, " ")
      .replace(/\d+\./g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => !["1-0", "0-1", "1/2-1/2", "*"].includes(token));

    for (const token of tokens) {
      const move = token.match(/^[a-h][1-8][a-h][1-8][qrbn]?$/i);
      if (!move) continue;
      const from = token.slice(0, 2) as Square;
      const to = token.slice(2, 4) as Square;
      const promotion = token[4] as "q" | "r" | "b" | "n" | undefined;
      const played = this.validateAndPlay({ from, to, promotion });
      if (!played) {
        throw new Error(`PGN move illégal/non supporté: ${token}`);
      }
    }
  }

  private getPieceAt(square: Square): string | null {
    const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
    const rank = 8 - Number(square[1]);
    return this.state.board[rank][file];
  }
}
