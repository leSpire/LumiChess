async function bootAnalysis() {
  const statusEl = document.getElementById("analysisStatus");
  const moduleCandidates = [
    "./elitechess/elitechess/pages/analysis/index.js",
    "../dist/src/elitechess/pages/analysis/index.js",
    "/dist/src/elitechess/pages/analysis/index.js",
  ];

  for (const path of moduleCandidates) {
    try {
      await import(path);
      if (statusEl && !statusEl.textContent) {
        statusEl.textContent = "Échiquier prêt.";
      }
      return;
    } catch (_error) {
      // try next candidate
    }
  }

  const message = "Impossible de charger l'analyse. Recharge la page ou vérifie le build JS.";
  if (statusEl) {
    statusEl.textContent = message;
  }
  throw new Error(message);
}

bootAnalysis();
