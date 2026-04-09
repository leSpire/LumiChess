import { LeLiteChessBoard } from "../../LeliteChessBoard.js";
import { StockfishEngineService } from "../../engine/stockfish/StockfishEngineService.js";
import { AnalysisPanel } from "../../ui/analysisPanel/AnalysisPanel.js";
import { EvalBar } from "../../ui/evalBar/EvalBar.js";
import { MoveList } from "../../ui/moveList/MoveList.js";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export class AnalysisController {
    root;
    board;
    engine = new StockfishEngineService();
    evalBar;
    panel;
    moveList;
    running = true;
    debounceId = null;
    constructor(root) {
        this.root = root;
        const boardEl = this.required("analysisBoard");
        const statusEl = this.required("analysisStatus");
        this.board = new LeLiteChessBoard(boardEl, statusEl);
        this.evalBar = new EvalBar(this.required("evalBar"));
        this.panel = new AnalysisPanel(this.required("bestMoves"));
        this.moveList = new MoveList(this.required("moveList"));
        this.board.setPosition(START_FEN);
        this.bindUi();
        this.bindEngine();
    }
    bindUi() {
        this.required("flipBtn").addEventListener("click", () => this.board.flip());
        this.required("resetBtn").addEventListener("click", () => this.board.setPosition(START_FEN));
        this.required("backBtn").addEventListener("click", () => this.board.undo());
        this.required("playPauseBtn").addEventListener("click", () => {
            this.running = !this.running;
            if (!this.running)
                this.engine.stop();
            else
                this.restartAnalysis();
            this.required("playPauseBtn").textContent = this.running ? "Pause" : "Play";
        });
        this.required("restartBtn").addEventListener("click", () => this.restartAnalysis());
        this.required("fenImportBtn").addEventListener("click", () => {
            const fenInput = this.root.getElementById("fenInput");
            if (!fenInput)
                return;
            this.board.setPosition(fenInput.value.trim());
            this.engine.newGame();
            this.restartAnalysis();
        });
        this.required("pgnImportBtn").addEventListener("click", () => {
            const pgnInput = this.root.getElementById("pgnInput");
            if (!pgnInput)
                return;
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
                const asInput = this.root.getElementById(id);
                this.engine.configure({
                    depth: Number(this.root.getElementById("depthInput").value),
                    moveTime: Number(this.root.getElementById("moveTimeInput").value),
                    multiPv: Number(this.root.getElementById("multiPvInput").value),
                    hash: Number(this.root.getElementById("hashInput").value),
                    threads: Number(this.root.getElementById("threadsInput").value),
                    wdl: this.root.getElementById("wdlInput").checked,
                });
                this.restartAnalysis();
            });
        });
        this.board.subscribe((snapshot) => {
            this.moveList.render(snapshot.timeline, snapshot.currentIndex);
            this.debounceAnalysis(snapshot.fen);
        });
    }
    bindEngine() {
        this.engine.subscribe((payload) => {
            const stateEl = this.required("engineState");
            if (payload.state)
                stateEl.textContent = payload.state;
            if (payload.lines && payload.lines.length > 0) {
                this.evalBar.update(payload.lines[0].score);
                this.panel.render(payload.lines);
                const top = payload.lines[0];
                this.required("engineInfo").textContent = `d${top.depth} / sd${top.seldepth} · nodes ${top.nodes} · nps ${top.nps} · hash ${top.hashfull}`;
            }
        });
        this.engine.init(new URL("../../engine/engineWorker/stockfish.worker.js", import.meta.url).toString(), "/assets/stockfish/stockfish.js");
    }
    debounceAnalysis(fen) {
        if (!this.running)
            return;
        if (this.debounceId)
            window.clearTimeout(this.debounceId);
        this.debounceId = window.setTimeout(() => this.engine.analysePosition({ fen }), 160);
    }
    restartAnalysis() {
        const snapshot = this.board.snapshot();
        this.engine.restartAnalysis({ fen: snapshot.fen });
    }
    required(id) {
        const el = this.root.getElementById(id);
        if (!el)
            throw new Error(`Missing #${id}`);
        return el;
    }
}
