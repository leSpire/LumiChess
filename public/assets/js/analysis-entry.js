const START_FEN = "rn1qkbnr/ppp2ppp/3pp3/8/2BPP3/5N2/PPP2PPP/RNBQK2R b KQkq - 0 4";

async function bootBuiltAnalysis() {
  const builtCandidates = [
    "../dist/src/elitechess/pages/analysis/index.js",
    "/dist/src/elitechess/pages/analysis/index.js",
  ];

  for (const path of builtCandidates) {
    try {
      await import(path);
      return true;
    } catch (_error) {
      // continue with fallback
    }
  }

  return false;
}

async function bootFallbackBoard() {
  const [{ LeLiteChessBoard }] = await Promise.all([
    import("./elitechess/elitechess/LeliteChessBoard.js"),
  ]);

  const boardRoot = document.getElementById("analysisBoard");
  const statusEl = document.getElementById("analysisStatus");
  if (!boardRoot || !statusEl) {
    throw new Error("#analysisBoard et #analysisStatus sont requis");
  }

  const board = new LeLiteChessBoard(boardRoot, statusEl);
  board.setPosition(START_FEN);

  const wire = (id, handler) => document.getElementById(id)?.addEventListener("click", handler);
  wire("flipBtn", () => board.flip());
  wire("resetBtn", () => board.setPosition(START_FEN));
  wire("backBtn", () => board.undo());
  wire("restartBtn", () => board.setPosition(START_FEN));
  wire("playPauseBtn", (event) => {
    const btn = event.currentTarget;
    const paused = btn.dataset.paused === "1";
    btn.dataset.paused = paused ? "0" : "1";
    btn.textContent = paused ? "Pause" : "Play";
  });

  const engineState = document.getElementById("engineState");
  if (engineState) engineState.textContent = "local board ready";

  const engineInfo = document.getElementById("engineInfo");
  if (engineInfo) engineInfo.textContent = "Fallback local mode — moteur indisponible";

  const bestMoves = document.getElementById("bestMoves");
  if (bestMoves) {
    bestMoves.innerHTML = '<div class="ec-best-line">Board interactif actif · Analyse moteur non chargée</div>';
  }

  const moveList = document.getElementById("moveList");
  if (moveList) {
    moveList.innerHTML = '<span class="ec-move">Suivez les coups sur le plateau</span>';
  }
}

(async () => {
  const didBootBuilt = await bootBuiltAnalysis();
  if (!didBootBuilt) await bootFallbackBoard();
})();
