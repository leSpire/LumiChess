/*
  Worker proxy for Stockfish WASM.
  This file stays isolated from UI thread and can be replaced by self-hosted binary.
*/
let engine = null;

async function ensureEngine() {
  if (engine) return engine;
  const moduleUrl = "https://cdn.jsdelivr.net/npm/stockfish@17/src/stockfish-nnue-17-single.js";
  importScripts(moduleUrl);
  if (typeof self.STOCKFISH !== "function") {
    throw new Error("STOCKFISH factory unavailable");
  }
  engine = self.STOCKFISH();
  engine.onmessage = (line) => self.postMessage(String(line));
  return engine;
}

self.onmessage = async (event) => {
  try {
    const sf = await ensureEngine();
    sf.postMessage(String(event.data));
  } catch (error) {
    self.postMessage(`info string stockfish_error ${(error && error.message) || "unknown"}`);
  }
};
