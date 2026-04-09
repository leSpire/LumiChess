async function bootAnalysis() {
  const moduleCandidates = [
    "./elitechess/elitechess/pages/analysis/index.js",
    "../dist/src/elitechess/pages/analysis/index.js",
    "/dist/src/elitechess/pages/analysis/index.js",
  ];

  for (const path of moduleCandidates) {
    try {
      await import(path);
      return;
    } catch (_error) {
      // try next candidate
    }
  }

  throw new Error("Impossible de charger le module d'analyse réel (board + moteur).");
}

bootAnalysis();
