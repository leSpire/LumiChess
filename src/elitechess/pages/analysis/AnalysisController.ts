import { LeLiteChessBoard } from "../../LeliteChessBoard.js";
import { StockfishEngineService } from "../../engine/stockfish/StockfishEngineService.js";
import { AnalysisPanel } from "../../ui/analysisPanel/AnalysisPanel.js";
import { EvalBar } from "../../ui/evalBar/EvalBar.js";
import { MoveList } from "../../ui/moveList/MoveList.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export class AnalysisController {
  private readonly board: LeLiteChessBoard;
  private readonly engine = new StockfishEngineService();
  private readonly evalBar: EvalBar;
  private readonly panel: AnalysisPanel;
  private readonly moveList: MoveList;
  private running = true;
  private debounceId: number | null = null;

  constructor(private readonly root: Document) {
    const boardEl = this.required("analysisBoard");
    const statusEl = this.required("analysisStatus");
    this.board = new LeLiteChessBoard(boardEl, statusEl);
    this.evalBar = new EvalBar(this.required("evalBar"));
    this.panel = new AnalysisPanel(this.required("bestMoves"));
    this.moveList = new MoveList(this.required("moveList"));
    this.board.setPosition(START_FEN);
    this.bindUi();
    this.bindEngine();
    this.restartAnalysis();
  }

  private bindUi(): void {
    this.required("flipBtn").addEventListener("click", () => this.board.flip());
    this.required("resetBtn").addEventListener("click", () => this.board.setPosition(START_FEN));
    this.required("backBtn").addEventListener("click", () => this.board.undo());
    this.required("playPauseBtn").addEventListener("click", () => {
      this.running = !this.running;
      if (!this.running) this.engine.stop();
      else this.restartAnalysis();
      this.required("playPauseBtn").textContent = this.running ? "Pause" : "Play";
    });
    this.required("restartBtn").addEventListener("click", () => this.restartAnalysis());

    this.required("fenImportBtn").addEventListener("click", () => {
      const fenInput = this.root.getElementById("fenInput") as HTMLTextAreaElement | null;
      if (!fenInput) return;
      this.board.setPosition(fenInput.value.trim());
      this.engine.newGame();
      this.restartAnalysis();
    });

    this.required("pgnImportBtn").addEventListener("click", () => {
      const pgnInput = this.root.getElementById("pgnInput") as HTMLTextAreaElement | null;
      if (!pgnInput) return;
      this.board.loadPgn(pgnInput.value);
      this.engine.newGame();
      this.restartAnalysis();
    });

    this.moveList.bindSelect((index) => {
      this.board.goTo(index);
      this.restartAnalysis();
    });

    ["depthInput", "moveTimeInput", "multiPvInput", "hashInput", "threadsInput", "wdlInput"].forEach((id) => {
      this.required(id).addEventListener("change", () => {
        const asInput = this.root.getElementById(id) as HTMLInputElement;
        this.engine.configure({
          depth: Number((this.root.getElementById("depthInput") as HTMLInputElement).value),
          moveTime: Number((this.root.getElementById("moveTimeInput") as HTMLInputElement).value),
          multiPv: Number((this.root.getElementById("multiPvInput") as HTMLInputElement).value) as 1 | 2 | 3 | 5,
          hash: Number((this.root.getElementById("hashInput") as HTMLInputElement).value),
          threads: Number((this.root.getElementById("threadsInput") as HTMLInputElement).value),
          wdl: (this.root.getElementById("wdlInput") as HTMLInputElement).checked,
        });
        this.restartAnalysis();
      });
    });

    this.board.subscribe((snapshot) => {
      this.moveList.render(snapshot.timeline, snapshot.currentIndex);
      this.debounceAnalysis(snapshot.fen);
    });
  }

  private bindEngine(): void {
    this.engine.subscribe((payload) => {
      const stateEl = this.required("engineState");
      if (payload.state) stateEl.textContent = payload.state;
      if (payload.lines && payload.lines.length > 0) {
        this.evalBar.update(payload.lines[0].score);
        this.panel.render(payload.lines);
        const top = payload.lines[0];
        this.required("engineInfo").textContent = `d${top.depth} / sd${top.seldepth} · nodes ${top.nodes} · nps ${top.nps} · hash ${top.hashfull}`;
      }
    });

    this.engine.init(new URL("../../engine/engineWorker/stockfish.worker.js", import.meta.url).toString(), "/assets/stockfish/stockfish.js");
  }

  private debounceAnalysis(fen: string): void {
    if (!this.running) return;
    if (this.debounceId) window.clearTimeout(this.debounceId);
    this.debounceId = window.setTimeout(() => this.engine.analysePosition({ fen }), 160);
  }

  private restartAnalysis(): void {
    const snapshot = this.board.snapshot();
    this.engine.restartAnalysis({ fen: snapshot.fen });
  }

  private required(id: string): HTMLElement {
    const el = this.root.getElementById(id);
    if (!el) throw new Error(`Missing #${id}`);
    return el;
  }
}
