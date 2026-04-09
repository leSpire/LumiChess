import { genLegalMoves, inCheck, isCheckmate, isStalemate, loadFEN, makeMove, startPosition } from "./rulesEngine.js";
export class MoveValidator {
    state = startPosition();
    setPosition(fen) {
        this.state = loadFEN(fen);
    }
    getState() {
        return this.state;
    }
    legalMoves(square) {
        return genLegalMoves(this.state, square).map((move) => ({
            from: move.from,
            to: move.to,
            san: `${move.from}-${move.to}`,
            flags: move.special ?? "n",
            promotion: move.promo,
        }));
    }
    validateAndPlay(request) {
        const legal = genLegalMoves(this.state, request.from).find((move) => move.to === request.to && (!move.promo || move.promo === request.promotion || request.promotion === undefined));
        if (!legal)
            return null;
        const movingPiece = this.state.board[8 - Number(legal.from[1])][["a", "b", "c", "d", "e", "f", "g", "h"].indexOf(legal.from[0])];
        this.state = makeMove(this.state, { ...legal, promo: request.promotion ?? legal.promo });
        return {
            from: legal.from,
            to: legal.to,
            san: `${legal.from}-${legal.to}`,
            flags: legal.special ?? "n",
            color: (movingPiece?.[0] ?? "w"),
            piece: movingPiece?.[1] ?? "p",
            promotion: request.promotion,
        };
    }
    status() {
        return {
            inCheck: inCheck(this.state, this.state.turn),
            checkmate: isCheckmate(this.state),
            stalemate: isStalemate(this.state),
            draw: isStalemate(this.state),
            turn: this.state.turn,
        };
    }
    fen() {
        return "custom-fen-not-serialized";
    }
    loadPgn(_pgn) {
        throw new Error("loadPgn non implémenté dans cette version");
    }
}
