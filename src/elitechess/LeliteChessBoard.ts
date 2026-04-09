import { GameStateEngine } from "./core/gameState/GameStateEngine.js";
import type { MoveResult, Square } from "./core/types.js";
import { NoopRealtimeSync, type RealtimeSync } from "./network/realtimeSync/RealtimeSync.js";
import { BoardAnimations } from "./ui/animations/BoardAnimations.js";
import { BoardRenderer } from "./ui/boardRenderer/BoardRenderer.js";
import { DragDropController } from "./ui/dragDrop/DragDropController.js";
import { HighlightsManager } from "./ui/highlights/HighlightsManager.js";

export interface LeLiteChessBoardApi {
  setPosition(fen: string): void;
  move(from: Square, to: Square, options?: { promotion?: "q" | "r" | "b" | "n" }): MoveResult | null;
  highlightSquares(squares: Square[]): void;
  flip(): void;
  enablePremoves(enabled: boolean): void;
  loadPgn(pgn: string): void;
}

export class LeLiteChessBoard implements LeLiteChessBoardApi {
  private readonly state = new GameStateEngine();
  private readonly highlights = new HighlightsManager();
  private readonly renderer: BoardRenderer;
  private readonly dragDrop: DragDropController;
  private selected: Square | null = null;

  constructor(private readonly root: HTMLElement, private readonly statusEl: HTMLElement, private readonly sync: RealtimeSync = new NoopRealtimeSync()) {
    this.renderer = new BoardRenderer(root, this.highlights, new BoardAnimations());
    this.dragDrop = new DragDropController(this.renderer);
    this.bindEvents();
    this.state.subscribe((snapshot) => {
      this.renderer.renderPieces(snapshot.pieces, true);
      this.renderer.renderSquares(snapshot.lastMove, snapshot.checkSquare);
      this.statusEl.textContent = this.statusLabel(snapshot);
    });
  }

  setPosition(fen: string): void {
    this.state.setPosition(fen);
  }

  snapshot(): ReturnType<GameStateEngine["snapshot"]> {
    return this.state.snapshot();
  }

  subscribe(listener: (snapshot: ReturnType<GameStateEngine["snapshot"]>) => void): () => void {
    return this.state.subscribe(listener);
  }

  goTo(index: number): void {
    this.state.goTo(index);
  }

  undo(): void {
    this.state.undo();
  }

  move(from: Square, to: Square, options?: { promotion?: "q" | "r" | "b" | "n" }): MoveResult | null {
    const result = this.state.move(from, to, options);
    if (result) this.sync.publishMove(result);
    this.selected = null;
    this.highlights.setSelection(null, []);
    return result;
  }

  highlightSquares(squares: Square[]): void {
    this.highlights.setSelection(null, squares);
    const snapshot = this.state.snapshot();
    this.renderer.renderSquares(snapshot.lastMove, snapshot.checkSquare);
  }

  flip(): void {
    const next = this.state.flip();
    this.renderer.setOrientation(next);
  }

  enablePremoves(enabled: boolean): void {
    this.state.enablePremoves(enabled);
  }

  loadPgn(pgn: string): void {
    this.state.loadPgn(pgn);
  }

  private bindEvents(): void {
    this.renderer.attachSquareClick((square) => this.onSquareSelect(square));
    this.renderer.attachPiecePointerDown((event, square) => {
      if (event.pointerType === "mouse" || event.pointerType === "touch") {
        this.dragDrop.beginDrag(event, square);
      }
      this.onSquareSelect(square);
    });

    window.addEventListener("pointermove", (event) => this.dragDrop.moveGhost(event.clientX, event.clientY));
    window.addEventListener("pointerup", (event) => {
      const drop = this.dragDrop.finishDrag(event.clientX, event.clientY);
      if (!drop?.to) return;
      this.move(drop.from, drop.to);
    });
  }

  private onSquareSelect(square: Square): void {
    if (this.selected) {
      const played = this.move(this.selected, square, { promotion: "q" });
      if (played) return;
    }

    this.selected = square;
    const legalTargets = this.state.legalMoves(square).map((move) => move.to);
    this.highlights.setSelection(square, legalTargets);
    const snapshot = this.state.snapshot();
    this.renderer.renderSquares(snapshot.lastMove, snapshot.checkSquare);
  }

  private statusLabel(snapshot: ReturnType<GameStateEngine["snapshot"]>): string {
    const turn = snapshot.turn === "w" ? "Blancs" : "Noirs";
    if (snapshot.checkSquare && this.state.legalMoves().length === 0) return `Échec et mat · ${turn}`;
    if (this.state.legalMoves().length === 0) return "Pat";
    if (snapshot.checkSquare) return `Échec · ${turn}`;
    return `Au tour des ${turn}`;
  }
}
