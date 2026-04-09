import { MoveValidator } from "../moveValidation/MoveValidator.js";
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export class GameStateEngine {
    validator = new MoveValidator();
    listeners = new Set();
    lastMove = null;
    orientation = "white";
    premovesEnabled = false;
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.snapshot());
        return () => this.listeners.delete(listener);
    }
    setPosition(fen) {
        this.validator.setPosition(fen);
        this.lastMove = null;
        this.emit();
    }
    move(from, to, options) {
        const move = this.validator.validateAndPlay({ from, to, promotion: options?.promotion });
        if (!move)
            return null;
        this.lastMove = move;
        this.emit();
        return move;
    }
    legalMoves(from) {
        return this.validator.legalMoves(from);
    }
    highlightSquares(_squares) { }
    flip() {
        this.orientation = this.orientation === "white" ? "black" : "white";
        return this.orientation;
    }
    enablePremoves(enabled) {
        this.premovesEnabled = enabled;
    }
    premovesEnabledState() {
        return this.premovesEnabled;
    }
    loadPgn(pgn) {
        this.validator.loadPgn(pgn);
        this.lastMove = null;
        this.emit();
    }
    snapshot() {
        const status = this.validator.status();
        return {
            fen: this.validator.fen(),
            pieces: this.mapPieces(),
            lastMove: this.lastMove,
            turn: status.turn,
            checkSquare: status.inCheck ? this.findCheckedKingSquare(status.turn) : null,
        };
    }
    mapPieces() {
        const board = this.validator.getState().board;
        const pieces = [];
        for (let rankIndex = 0; rankIndex < 8; rankIndex += 1) {
            for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
                const piece = board[rankIndex][fileIndex];
                if (!piece)
                    continue;
                pieces.push({
                    square: `${FILES[fileIndex]}${8 - rankIndex}`,
                    color: piece[0],
                    type: piece[1],
                });
            }
        }
        return pieces;
    }
    findCheckedKingSquare(kingColor) {
        return this.mapPieces().find((piece) => piece.type === "k" && piece.color === kingColor)?.square ?? null;
    }
    emit() {
        const snapshot = this.snapshot();
        this.listeners.forEach((listener) => listener(snapshot));
    }
}
