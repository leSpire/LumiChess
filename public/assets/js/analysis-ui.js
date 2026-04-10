(() => {
  const game = new Chess();
  const boardEl = document.getElementById("analysisBoard");
  const statusEl = document.getElementById("analysisStatus");
  const moveListEl = document.getElementById("moveList");
  const gameStateEl = document.getElementById("gameState");
  const evalTitleEl = document.getElementById("evalTitle");
  const moveSound = document.getElementById("moveSound");
  const captureSound = document.getElementById("captureSound");
  const checkSound = document.getElementById("checkSound");

  let board = null;
  let liveSocket = null;

  function safePlay(soundEl) {
    if (!soundEl) return;
    soundEl.currentTime = 0;
    soundEl.play().catch(() => {});
  }

  function squareToSelector(square) {
    return `.square-${square}`;
  }

  function clearHighlights() {
    document.querySelectorAll("#analysisBoard .highlight").forEach((el) => el.classList.remove("highlight"));
  }

  function showLegalTargets(square) {
    clearHighlights();
    const moves = game.moves({ square, verbose: true });
    moves.forEach((m) => {
      const el = boardEl.querySelector(squareToSelector(m.to));
      if (el) el.classList.add("highlight");
    });
  }

  function refreshMoves() {
    const history = game.history();
    moveListEl.innerHTML = "";
    history.forEach((move, idx) => {
      const li = document.createElement("li");
      const turnNo = Math.floor(idx / 2) + 1;
      li.textContent = idx % 2 === 0 ? `${turnNo}. ${move}` : `${turnNo}... ${move}`;
      moveListEl.appendChild(li);
    });
  }

  function simpleEval() {
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let score = 0;
    const grid = game.board();
    grid.forEach((rank) => {
      rank.forEach((piece) => {
        if (!piece) return;
        const v = pieceValues[piece.type] || 0;
        score += piece.color === "w" ? v : -v;
      });
    });
    const prefix = score > 0 ? "+" : "";
    evalTitleEl.textContent = `Évaluation: ${prefix}${score.toFixed(1)}`;
  }

  function updateStatus() {
    const side = game.turn() === "w" ? "Trait aux blancs" : "Trait aux noirs";
    gameStateEl.textContent = side;

    if (game.in_checkmate()) {
      const winner = game.turn() === "w" ? "Noirs" : "Blancs";
      statusEl.textContent = `Échec et mat ! Victoire ${winner}.`;
      return;
    }
    if (game.in_draw()) {
      statusEl.textContent = "Partie nulle.";
      return;
    }
    if (game.in_check()) {
      statusEl.textContent = `${side} — Échec !`;
      safePlay(checkSound);
      return;
    }

    statusEl.textContent = "Échiquier interactif prêt.";
  }

  function syncBoard(playMoveSound = false, wasCapture = false) {
    board.position(game.fen(), true);
    refreshMoves();
    simpleEval();
    updateStatus();
    if (playMoveSound) {
      safePlay(wasCapture ? captureSound : moveSound);
    }
  }

  function onDragStart(source, piece) {
    if (game.game_over()) return false;
    if ((game.turn() === "w" && piece.startsWith("b")) || (game.turn() === "b" && piece.startsWith("w"))) {
      return false;
    }
    showLegalTargets(source);
    return true;
  }

  function onDrop(source, target) {
    clearHighlights();
    const move = game.move({
      from: source,
      to: target,
      promotion: "q",
    });

    if (move === null) return "snapback";

    syncBoard(true, move.flags.includes("c") || move.flags.includes("e"));

    if (liveSocket && liveSocket.readyState === WebSocket.OPEN) {
      liveSocket.send(JSON.stringify({ type: "move", move, fen: game.fen() }));
    }

    return undefined;
  }

  function bootBoard() {
    if (!window.Chess || !window.Chessboard) {
      statusEl.textContent = "Impossible de charger chess.js/chessboard.js.";
      return;
    }

    board = window.Chessboard("analysisBoard", {
      draggable: true,
      position: "start",
      moveSpeed: 130,
      snapSpeed: 80,
      snapbackSpeed: 100,
      onDragStart,
      onDrop,
      onSnapEnd: () => syncBoard(false, false),
    });

    syncBoard(false, false);
  }

  function resetGame() {
    game.reset();
    syncBoard(false, false);
  }

  function undoMove() {
    game.undo();
    syncBoard(false, false);
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
        statusEl.textContent = "Connecté au serveur live (ws://localhost:8080).";
      };

      liveSocket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "move" && payload.fen) {
          game.load(payload.fen);
          syncBoard(true, false);
        }
      };

      liveSocket.onclose = () => {
        statusEl.textContent = "Connexion live fermée.";
      };

      liveSocket.onerror = () => {
        statusEl.textContent = "Erreur WebSocket. Vérifie qu'un serveur tourne sur ws://localhost:8080.";
      };
    } catch (_err) {
      statusEl.textContent = "WebSocket indisponible dans cet environnement.";
    }
  }

  document.getElementById("newGameBtn")?.addEventListener("click", resetGame);
  document.getElementById("undoBtn")?.addEventListener("click", undoMove);
  document.getElementById("flipBtn")?.addEventListener("click", () => board && board.flip());
  document.getElementById("connectBtn")?.addEventListener("click", connectLive);

  window.addEventListener("resize", () => board && board.resize());
  bootBoard();
})();
