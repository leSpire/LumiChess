const ALLOWED = {
    loading: ["ready", "error"],
    ready: ["analysing", "stopped", "error"],
    analysing: ["ready", "stopped", "error"],
    stopped: ["analysing", "ready", "error"],
    error: ["loading", "ready"],
};
export function transitionEngineState(current, next) {
    return ALLOWED[current].includes(next) ? next : current;
}
