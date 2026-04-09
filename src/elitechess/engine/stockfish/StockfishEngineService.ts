import type { AnalysisLine, EngineLifecycle } from "../../core/types.js";
import { parseUciMessage } from "../uciProtocol/parser.js";
import { transitionEngineState } from "./engineStateMachine.js";

export interface EngineOptions {
  depth: number;
  moveTime: number;
  multiPv: 1 | 2 | 3 | 5;
  hash: number;
  threads: number;
  wdl: boolean;
}

export interface EngineEventPayload {
  state?: EngineLifecycle;
  lines?: AnalysisLine[];
  bestMove?: string;
  error?: string;
}

const DEFAULT_OPTIONS: EngineOptions = {
  depth: 18,
  moveTime: 1200,
  multiPv: 3,
  hash: 128,
  threads: Math.min(4, Math.max(1, typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2)),
  wdl: false,
};

export class StockfishEngineService {
  private worker: Worker | null = null;
  private lines = new Map<number, AnalysisLine>();
  private listeners = new Set<(payload: EngineEventPayload) => void>();
  private options: EngineOptions = { ...DEFAULT_OPTIONS };
  private state: EngineLifecycle = "loading";

  subscribe(listener: (payload: EngineEventPayload) => void): () => void {
    this.listeners.add(listener);
    listener({ state: this.state, lines: [...this.lines.values()].sort((a, b) => a.multipv - b.multipv) });
    return () => this.listeners.delete(listener);
  }

  init(workerUrl: string, engineScriptUrl: string): void {
    this.worker = new Worker(workerUrl, { type: "module" });
    this.worker.onmessage = (event: MessageEvent<{ type: string; line?: string; state?: EngineLifecycle; message?: string }>) => {
      if (event.data.type === "engine" && event.data.line) {
        this.onEngineLine(event.data.line);
      } else if (event.data.type === "error") {
        this.setState("error", event.data.message);
      }
    };
    this.worker.postMessage({ type: "init", engineScriptUrl });
    this.send("uci");
    this.send("isready");
  }

  configure(next: Partial<EngineOptions>): void {
    this.options = { ...this.options, ...next };
    this.send(`setoption name MultiPV value ${this.options.multiPv}`);
    this.send(`setoption name Hash value ${this.options.hash}`);
    this.send(`setoption name Threads value ${this.options.threads}`);
    this.send(`setoption name UCI_ShowWDL value ${this.options.wdl}`);
  }

  newGame(): void {
    this.send("ucinewgame");
    this.send("isready");
  }

  analysePosition({ fen, moves }: { fen?: string; moves?: string[] }): void {
    this.stop();
    this.lines.clear();
    if (fen) this.send(`position fen ${fen}`);
    else this.send(`position startpos moves ${(moves ?? []).join(" ")}`);
    this.setState("analysing");
    if (this.options.moveTime > 0) this.send(`go movetime ${this.options.moveTime}`);
    else this.send(`go depth ${this.options.depth}`);
  }

  stop(): void {
    this.send("stop");
    this.setState("stopped");
  }

  restartAnalysis(request: { fen?: string; moves?: string[] }): void {
    this.analysePosition(request);
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private onEngineLine(line: string): void {
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

  private send(command: string): void {
    this.worker?.postMessage({ type: "uci", command });
  }

  private setState(state: EngineLifecycle, message?: string): void {
    this.state = transitionEngineState(this.state, state);
    this.emit({ state: this.state, error: message });
  }

  private emit(payload: EngineEventPayload): void {
    this.listeners.forEach((listener) => listener(payload));
  }
}
