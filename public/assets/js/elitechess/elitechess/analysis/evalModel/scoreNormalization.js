export function normalizeScore(score) {
    if (score.kind === "mate") {
        const sign = score.value >= 0 ? 1 : -1;
        const ratio = sign > 0 ? 0.98 : 0.02;
        return {
            display: `#${score.value}`,
            whiteAdvantageRatio: score.pov === "w" ? ratio : 1 - ratio,
        };
    }
    const pawns = score.value / 100;
    const clamped = Math.max(-8, Math.min(8, pawns));
    const ratio = 0.5 + clamped / 16;
    const display = `${pawns >= 0 ? "+" : ""}${pawns.toFixed(1)}`;
    return {
        display,
        whiteAdvantageRatio: score.pov === "w" ? ratio : 1 - ratio,
    };
}
