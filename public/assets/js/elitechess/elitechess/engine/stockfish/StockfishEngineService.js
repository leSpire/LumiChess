import { parseUciMessage } from "../uciProtocol/parser.js";
import { transitionEngineState } from "./engineStateMachine.js";
const DEFAULT_OPTIONS = {
    depth: 18,
    moveTime: 1200,
    multiPv: 3,
    hash: 128,
    threads: Math.min(4, Math.max(1, typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2)),
    wdl: false,
};
export class StockfishEngineService {
    worker = null;
    lines = new Map();
    listeners = new Set();
    options = { ...DEFAULT_OPTIONS };
    state = "loading";
    subscribe(listener) {
        this.listeners.add(listener);
        listener({ state: this.state, lines: [...this.lines.values()].sort((a, b) => a.multipv - b.multipv) });
        return () => this.listeners.delete(listener);
    }
    init(workerUrl, engineScriptUrl) {
        this.worker = new Worker(workerUrl, { type: "module" });
        this.worker.onmessage = (event) => {
            if (event.data.type === "engine" && event.data.line) {
                this.onEngineLine(event.data.line);
            }
            else if (event.data.type === "error") {
                this.setState("error", event.data.message);
            }
        };
        this.worker.postMessage({ type: "init", engineScriptUrl });
        this.send("uci");
        this.send("isready");
    }
    configure(next) {
        this.options = { ...this.options, ...next };
        this.send(`setoption name MultiPV value ${this.options.multiPv}`);
        this.send(`setoption name Hash value ${this.options.hash}`);
        this.send(`setoption name Threads value ${this.options.threads}`);
        this.send(`setoption name UCI_ShowWDL value ${this.options.wdl}`);
    }
    newGame() {
        this.send("ucinewgame");
        this.send("isready");
    }
    analysePosition({ fen, moves }) {
        this.stop();
        this.lines.clear();
        if (fen)
            this.send(`position fen ${fen}`);
        else
            this.send(`position startpos moves ${(moves ?? []).join(" ")}`);
        this.setState("analysing");
        if (this.options.moveTime > 0)
            this.send(`go movetime ${this.options.moveTime}`);
        else
            this.send(`go depth ${this.options.depth}`);
    }
    stop() {
        this.send("stop");
        this.setState("stopped");
    }
    restartAnalysis(request) {
        this.analysePosition(request);
    }
    dispose() {
        this.worker?.terminate();
        this.worker = null;
    }
    onEngineLine(line) {
        const parsed = parseUciMessage(line);
        if (parsed.type === "uciok" || parsed.type === "readyok") {
            this.setState("ready");
            this.configure({});
            return;
        }
        if (parsed.type === "info") {
            this.lines.set(parsed.line.multipv, parsed.line);
            this.emit({ lines: [...this.lines.values()].sort((a, b) => a.multipv - b.multipv) });
            return;
        }
        if (parsed.type === "bestmove") {
            this.emit({ bestMove: parsed.bestmove });
            this.setState("ready");
        }
    }
    send(command) {
        this.worker?.postMessage({ type: "uci", command });
    }
    setState(state, message) {
        this.state = transitionEngineState(this.state, state);
        this.emit({ state: this.state, error: message });
    }
    emit(payload) {
        this.listeners.forEach((listener) => listener(payload));
    }
}
