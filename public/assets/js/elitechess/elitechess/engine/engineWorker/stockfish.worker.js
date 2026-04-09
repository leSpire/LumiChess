"use strict";
/// <reference lib="webworker" />
let engine = null;
self.onmessage = (event) => {
    if (event.data.type === "init") {
        if (engine)
            engine.terminate();
        engine = new Worker(event.data.engineScriptUrl);
        engine.onmessage = (engineEvent) => self.postMessage({ type: "engine", line: String(engineEvent.data) });
        engine.onerror = (err) => self.postMessage({ type: "error", message: err.message });
        self.postMessage({ type: "status", state: "loading" });
        return;
    }
    if (event.data.type === "uci") {
        engine?.postMessage(event.data.command);
    }
};
