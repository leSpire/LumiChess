import { MoveValidator } from "../moveValidation/MoveValidator.js";
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export class GameStateEngine {
    validator = new MoveValidator();
    listeners = new Set();
    lastMove = null;
    orientation = "white";
    premovesEnabled = false;
    rootFen = this.validator.fen();
    timeline = [];
    currentIndex = 0;
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.snapshot());
        return () => this.listeners.delete(listener);
    }
    setPosition(fen) {
        this.validator.setPosition(fen);
        this.rootFen = fen;
        this.timeline = [];
        this.currentIndex = 0;
        this.lastMove = null;
        this.emit();
    }
    move(from, to, options) {
        const move = this.validator.validateAndPlay({ from, to, promotion: options?.promotion });
        if (!move)
            return null;
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
    legalMoves(from) {
        return this.validator.legalMoves(from);
    }
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
            timeline: [...this.timeline],
            currentIndex: this.currentIndex,
        };
    }
    goTo(index) {
        const clamped = Math.max(0, Math.min(index, this.timeline.length));
        this.validator.setPosition(this.rootFen);
        for (let i = 0; i < clamped; i += 1) {
            const move = this.timeline[i];
            this.validator.validateAndPlay({ from: move.lan.slice(0, 2), to: move.lan.slice(2, 4), promotion: move.lan[4] });
        }
        this.currentIndex = clamped;
        this.lastMove = clamped > 0 ? this.nodeToMove(this.timeline[clamped - 1]) : null;
        this.emit();
    }
    undo() {
        this.goTo(this.currentIndex - 1);
    }
    variationState() {
        return {
            rootFen: this.rootFen,
            currentIndex: this.currentIndex,
            moves: [...this.timeline],
            source: "manual",
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
    nodeToMove(node) {
        return {
            from: node.lan.slice(0, 2),
            to: node.lan.slice(2, 4),
            san: node.san,
            flags: "n",
            color: node.turn,
            piece: "p",
            promotion: node.lan[4],
        };
    }
}
