export function classifyDelta(previous, next) {
    if (!previous || !next)
        return "good";
    if (previous.score.kind === "mate" || next.score.kind === "mate")
        return "excellent";
    const swing = Math.abs((next.score.value - previous.score.value) / 100);
    if (swing < 0.2)
        return "best";
    if (swing < 0.5)
        return "excellent";
    if (swing < 1.0)
        return "good";
    if (swing < 2.0)
        return "inaccuracy";
    if (swing < 3.5)
        return "mistake";
    return "blunder";
}
