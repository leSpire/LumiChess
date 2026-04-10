(() => {
  const game = new Chess();
  const boardEl = document.getElementById("analysisBoard");
  const statusEl = document.getElementById("analysisStatus");
  const moveListEl = document.getElementById("moveList");
  const gameStateEl = document.getElementById("gameState");
  const evalTitleEl = document.getElementById("evalTitle");
  const evalBarFillEl = document.getElementById("evalBarFill");
  const evalBarTextEl = document.getElementById("evalBarText");
  const lineGridEl = document.getElementById("lineGrid");
  const openingLabelEl = document.getElementById("openingLabel");

  const moveSound = document.getElementById("moveSound");
  const captureSound = document.getElementById("captureSound");
  const checkSound = document.getElementById("checkSound");

  let board = null;
  let liveSocket = null;
  let historyCursor = null;
  let playbackTimer = null;

  const openings = [
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"], name: "Ouverture Espagnole" },
    { moves: ["e4", "c5"], name: "Défense Sicilienne" },
    { moves: ["d4", "d5", "c4"], name: "Gambit Dame" },
    { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"], name: "Italienne" },
    { moves: ["Nf3", "d5", "g3"], name: "Ouverture Réti" },
  ];

  function safePlay(soundEl) {
    if (!soundEl) return;
    soundEl.currentTime = 0;
    soundEl.play().catch(() => {});
  }

  function clearSquareClasses(classNames) {
    classNames.forEach((className) => {
      boardEl.querySelectorAll(`#analysisBoard .${className}`).forEach((el) => el.classList.remove(className));
    });
  }

  function highlightLastMove() {
    clearSquareClasses(["from-square", "to-square"]);
    const verboseHistory = game.history({ verbose: true });
    const lastMove = verboseHistory[verboseHistory.length - 1];
    if (!lastMove) return;

    const fromEl = boardEl.querySelector(`.square-${lastMove.from}`);
    const toEl = boardEl.querySelector(`.square-${lastMove.to}`);
    if (fromEl) fromEl.classList.add("from-square");
    if (toEl) toEl.classList.add("to-square");
  }

  function clearLegalTargets() {
    clearSquareClasses(["legal-target", "legal-capture"]);
  }

  function showLegalTargets(square) {
    clearLegalTargets();
    game.moves({ square, verbose: true }).forEach((move) => {
      const target = boardEl.querySelector(`.square-${move.to}`);
      if (!target) return;
      const classes = move.flags.includes("c") || move.flags.includes("e") ? ["legal-capture"] : ["legal-target"];
      target.classList.add(...classes);
    });
  }

  function scorePosition() {
    const pieceValues = { p: 1, n: 3.2, b: 3.35, r: 5.1, q: 9.4, k: 0 };
    let material = 0;
    let mobility = game.moves().length * (game.turn() === "w" ? 0.02 : -0.02);

    game.board().forEach((rank) => {
      rank.forEach((piece) => {
        if (!piece) return;
        const value = pieceValues[piece.type] || 0;
        material += piece.color === "w" ? value : -value;
      });
    });

    const raw = material + mobility;
    const clamped = Math.max(-9.9, Math.min(9.9, raw));
    return Number(clamped.toFixed(2));
  }

  function updateEvalUi(score) {
    const sign = score > 0 ? "+" : "";
    const label = `${sign}${score.toFixed(2)}`;
    evalTitleEl.innerHTML = `${label} <span>Niveau 20 · Évaluation</span>`;
    evalBarTextEl.textContent = label;

    const whiteShare = Math.max(0, Math.min(100, 50 + score * 5));
    evalBarFillEl.style.height = `${100 - whiteShare}%`;

    lineGridEl.innerHTML = "";
    [
      `${label} · ${bestLineText(0)}`,
      `${(score - 0.14).toFixed(2)} · ${bestLineText(1)}`,
      `${(score - 0.32).toFixed(2)} · ${bestLineText(2)}`,
    ].forEach((line) => {
      const row = document.createElement("div");
      row.className = "line";
      const [cp, pv] = line.split("·");
      row.innerHTML = `<strong>${cp.trim()}</strong>${pv.trim()}`;
      lineGridEl.appendChild(row);
    });
  }

  function bestLineText(offset) {
    const history = game.history();
    const sample = history.slice(Math.max(0, history.length - 5 + offset)).join(" ");
    return sample || "1. e4 e5 2. Cf3 Cc6 3. Fc4";
  }

  function detectOpening() {
    const played = game.history();
    const match = openings.find((opening) => opening.moves.every((move, idx) => played[idx] === move));
    openingLabelEl.textContent = `Ouverture · ${match ? match.name : "Middlegame"}`;
  }

  function refreshMoves() {
    moveListEl.innerHTML = "";
    game.history().forEach((move, idx) => {
      const li = document.createElement("li");
      const turnNo = Math.floor(idx / 2) + 1;
      li.textContent = idx % 2 === 0 ? `${turnNo}. ${move}` : `${turnNo}... ${move}`;
      if (historyCursor !== null && idx === historyCursor - 1) li.classList.add("active");
      moveListEl.appendChild(li);
    });
  }

  function updateStatus() {
    const side = game.turn() === "w" ? "Trait aux blancs" : "Trait aux noirs";
    gameStateEl.textContent = side;

    if (game.in_checkmate()) {
      statusEl.textContent = `Échec et mat · ${game.turn() === "w" ? "Noirs" : "Blancs"} gagnent.`;
      return;
    }

    if (game.in_stalemate()) {
      statusEl.textContent = "Pat · partie nulle.";
      return;
    }

    if (game.in_draw()) {
      statusEl.textContent = "Partie nulle.";
      return;
    }

    if (game.in_check()) {
      statusEl.textContent = `${side} · Échec.`;
      safePlay(checkSound);
      return;
    }

    statusEl.textContent = "Analyse en direct active.";
  }

  function syncBoard({ playMoveSound = false, wasCapture = false } = {}) {
    if (!board) return;
    board.position(game.fen(), true);
    highlightLastMove();
    refreshMoves();
    updateEvalUi(scorePosition());
    detectOpening();
    updateStatus();

    if (playMoveSound) {
      safePlay(wasCapture ? captureSound : moveSound);
    }
  }

  function onDragStart(source, piece) {
    if (historyCursor !== null || game.game_over()) return false;
    if ((game.turn() === "w" && piece.startsWith("b")) || (game.turn() === "b" && piece.startsWith("w"))) return false;
    showLegalTargets(source);
    return true;
  }

  function onDrop(source, target) {
    clearLegalTargets();
    if (historyCursor !== null) return "snapback";

    const move = game.move({ from: source, to: target, promotion: "q" });
    if (!move) return "snapback";

    syncBoard({ playMoveSound: true, wasCapture: move.flags.includes("c") || move.flags.includes("e") });

    if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
      liveSocket.send(JSON.stringify({ type: "move", move, fen: game.fen() }));
    }

    return undefined;
  }

  function bootBoard() {
    if (!window.Chess || !window.Chessboard) {
      statusEl.textContent = "Impossible de charger chess.js/chessboard.js";
      return;
    }

    board = window.Chessboard("analysisBoard", {
      draggable: true,
      position: "start",
      moveSpeed: 130,
      snapSpeed: 90,
      snapbackSpeed: 110,
      onDragStart,
      onDrop,
      onSnapEnd: () => syncBoard(),
    });

    syncBoard();
  }

  function resetGame() {
    game.reset();
    historyCursor = null;
    stopPlayback();
    syncBoard();
  }

  function undoMove() {
    if (historyCursor !== null) return;
    game.undo();
    syncBoard();
  }

  function navigateHistory(targetCursor) {
    const moves = game.history();
    const cursor = Math.max(0, Math.min(moves.length, targetCursor));
    const preview = new Chess();
    for (let i = 0; i < cursor; i += 1) preview.move(moves[i]);

    historyCursor = cursor === moves.length ? null : cursor;
    board.position(preview.fen(), true);

    clearLegalTargets();
    clearSquareClasses(["from-square", "to-square"]);
    refreshMoves();

    statusEl.textContent = historyCursor === null
      ? "Retour à la position courante."
      : `Navigation historique · coup ${historyCursor}/${moves.length}`;
  }

  function startPlayback() {
    if (playbackTimer) return;
    const moveCount = game.history().length;
    if (moveCount === 0) return;

    let cursor = historyCursor ?? 0;
    if (cursor >= moveCount) cursor = 0;

    navigateHistory(cursor);
    playbackTimer = window.setInterval(() => {
      const next = (historyCursor ?? 0) + 1;
      if (next > moveCount) {
        stopPlayback();
        navigateHistory(moveCount);
        return;
      }
      navigateHistory(next);
    }, 900);
  }

  function stopPlayback() {
    if (!playbackTimer) return;
    clearInterval(playbackTimer);
    playbackTimer = null;
  }

  function connectLive() {
    if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
      statusEl.textContent = "Connexion live déjà active.";
      return;
    }

    try {
      liveSocket = new WebSocket("ws://localhost:8080");
      statusEl.textContent = "Connexion WebSocket en cours…";

      liveSocket.onopen = () => {
        statusEl.textContent = "Connecté à ws://localhost:8080.";
      };

      liveSocket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "move" && payload.fen) {
          game.load(payload.fen);
          historyCursor = null;
          syncBoard({ playMoveSound: true });
        }
      };

      liveSocket.onclose = () => {
        statusEl.textContent = "Connexion live fermée.";
      };

      liveSocket.onerror = () => {
        statusEl.textContent = "Erreur WebSocket (serveur attendu sur ws://localhost:8080).";
      };
    } catch (_error) {
      statusEl.textContent = "WebSocket indisponible.";
    }
  }

  document.getElementById("newGameBtn")?.addEventListener("click", resetGame);
  document.getElementById("undoBtn")?.addEventListener("click", undoMove);
  document.getElementById("flipBtn")?.addEventListener("click", () => board && board.flip());
  document.getElementById("connectBtn")?.addEventListener("click", connectLive);

  document.getElementById("firstBtn")?.addEventListener("click", () => {
    stopPlayback();
    navigateHistory(0);
  });

  document.getElementById("prevBtn")?.addEventListener("click", () => {
    stopPlayback();
    const moves = game.history().length;
    const cursor = historyCursor ?? moves;
    navigateHistory(cursor - 1);
  });

  document.getElementById("nextBtn")?.addEventListener("click", () => {
    stopPlayback();
    const moves = game.history().length;
    const cursor = historyCursor ?? moves;
    navigateHistory(cursor + 1);
  });

  document.getElementById("lastBtn")?.addEventListener("click", () => {
    stopPlayback();
    navigateHistory(game.history().length);
  });

  document.getElementById("playBtn")?.addEventListener("click", () => {
    if (playbackTimer) {
      stopPlayback();
      statusEl.textContent = "Lecture arrêtée.";
      return;
    }
    startPlayback();
    statusEl.textContent = "Lecture de la partie…";
  });

  window.addEventListener("resize", () => board && board.resize());
  boardEl.addEventListener("mouseleave", clearLegalTargets);

  bootBoard();
})();
