import type { AnalysisLine, EngineLifecycle } from "../../core/types.js";

export interface UciInfoMessage {
  type: "info";
  line: AnalysisLine;
}

export interface UciBestMoveMessage {
  type: "bestmove";
  bestmove: string;
  ponder?: string;
}

export interface UciReadyMessage {
  type: "readyok" | "uciok";
}

export interface UciOptionMessage {
  type: "option";
  name: string;
  defaultValue?: string;
}

export interface UciIdMessage {
  type: "id";
  key: string;
  value: string;
}

export interface UciUnknownMessage {
  type: "unknown";
  raw: string;
}

export type UciParsedMessage = UciInfoMessage | UciBestMoveMessage | UciReadyMessage | UciOptionMessage | UciIdMessage | UciUnknownMessage;

export interface EngineStatusEvent {
  state: EngineLifecycle;
  message?: string;
}
