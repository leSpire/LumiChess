import type { MoveResult } from "../../core/types.js";

export interface RealtimeSync {
  publishMove(move: MoveResult): void;
  onRemoteMove(listener: (move: MoveResult) => void): () => void;
}

export class NoopRealtimeSync implements RealtimeSync {
  publishMove(_move: MoveResult): void {
    // extension point for websocket sync / spectator mode
  }

  onRemoteMove(_listener: (move: MoveResult) => void): () => void {
    return () => undefined;
  }
}
