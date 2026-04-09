const INFO_RE = /\b([a-z]+)\b/g;
function parseScore(tokens) {
    const scoreIndex = tokens.indexOf("score");
    const turn = "w";
    if (scoreIndex < 0)
        return { kind: "cp", value: 0, pov: turn };
    const kind = tokens[scoreIndex + 1];
    const rawValue = Number(tokens[scoreIndex + 2]);
    if (kind === "mate")
        return { kind: "mate", value: rawValue, pov: turn };
    return { kind: "cp", value: rawValue, pov: turn };
}
export function parseUciMessage(raw) {
    const line = raw.trim();
    if (line === "uciok")
        return { type: "uciok" };
    if (line === "readyok")
        return { type: "readyok" };
    if (line.startsWith("id ")) {
        const [, key, ...rest] = line.split(/\s+/);
        return { type: "id", key, value: rest.join(" ") };
    }
    if (line.startsWith("option name")) {
        const [, , ...rest] = line.split(/\s+/);
        const typeIndex = rest.indexOf("type");
        return {
            type: "option",
            name: rest.slice(0, typeIndex > -1 ? typeIndex : rest.length).join(" "),
        };
    }
    if (line.startsWith("bestmove")) {
        const [, bestmove, ponderKey, ponder] = line.split(/\s+/);
        return { type: "bestmove", bestmove, ponder: ponderKey === "ponder" ? ponder : undefined };
    }
    if (line.startsWith("info ")) {
        const tokens = line.split(/\s+/);
        const multipv = Number(tokens[tokens.indexOf("multipv") + 1] ?? 1);
        const depth = Number(tokens[tokens.indexOf("depth") + 1] ?? 0);
        const seldepth = Number(tokens[tokens.indexOf("seldepth") + 1] ?? 0);
        const nodes = Number(tokens[tokens.indexOf("nodes") + 1] ?? 0);
        const nps = Number(tokens[tokens.indexOf("nps") + 1] ?? 0);
        const hashfull = Number(tokens[tokens.indexOf("hashfull") + 1] ?? 0);
        const pvIndex = tokens.indexOf("pv");
        const pv = pvIndex > -1 ? tokens.slice(pvIndex + 1) : [];
        return {
            type: "info",
            line: {
                multipv,
                depth,
                seldepth,
                nodes,
                nps,
                hashfull,
                score: parseScore(tokens),
                pv,
            },
        };
    }
    INFO_RE.lastIndex = 0;
    return { type: "unknown", raw: line };
}
