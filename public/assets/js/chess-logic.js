export class ChessLogic {
  constructor() {
    const ChessCtor = window.chessjs?.Chess;
    if (!ChessCtor) throw new Error("chess.js indisponible");
    this.game = new ChessCtor();
  }

  reset() { this.game.reset(); }
  undo() { return this.game.undo(); }
  fen() { return this.game.fen(); }
  turn() { return this.game.turn(); }
  board() { return this.game.board(); }

  legalMoves(square) {
    return this.game.moves(square ? { square, verbose: true } : { verbose: true });
  }

  move(from, to, promotion = "q") {
    return this.game.move({ from, to, promotion });
  }

  status() {
    if (this.game.isCheckmate()) return "Échec et mat";
    if (this.game.isStalemate()) return "Pat";
    if (this.game.inCheck()) return `Échec · ${this.turn() === "w" ? "Blancs" : "Noirs"}`;
    return `Au tour des ${this.turn() === "w" ? "Blancs" : "Noirs"}`;
  }
}
