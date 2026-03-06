const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const $ = (sel, root = document) => root.querySelector(sel);

$$(".glow").forEach((el) => {
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

function toast(el, msg, ms = 1100) {
  el.textContent = msg;
  el.classList.add("is-on");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("is-on"), ms);
}

const U = {
  wp: "♙", wr: "♖", wn: "♘", wb: "♗", wq: "♕", wk: "♔",
  bp: "♟", br: "♜", bn: "♞", bb: "♝", bq: "♛", bk: "♚",
};
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function sqToIJ(sq) {
  const f = FILES.indexOf(sq[0]);
  const r = Number.parseInt(sq[1], 10);
  return [8 - r, f];
}
function ijToSq(i, j) {
  return FILES[j] + String(8 - i);
}
function inBounds(i, j) { return i >= 0 && i < 8 && j >= 0 && j < 8; }
function colorOf(piece) { return piece ? piece[0] : null; }
function typeOf(piece) { return piece ? piece[1] : null; }

function emptyBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}
function cloneState(s) {
  return {
    board: s.board.map((r) => r.slice()),
    turn: s.turn,
    castling: { ...s.castling },
    ep: s.ep,
    halfmove: s.halfmove,
    fullmove: s.fullmove,
  };
}
function startPosition() {
  const b = emptyBoard();
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let j = 0; j < 8; j += 1) {
    b[0][j] = `b${back[j]}`;
    b[1][j] = "bp";
    b[6][j] = "wp";
    b[7][j] = `w${back[j]}`;
  }
  return {
    board: b,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    ep: null,
    halfmove: 0,
    fullmove: 1,
  };
}
function loadFEN(fen) {
  const parts = fen.trim().split(/\s+/);
  const placement = parts[0];
  const turn = parts[1] || "w";
  const castlingStr = parts[2] || "-";
  const ep = parts[3] && parts[3] !== "-" ? parts[3] : null;

  const b = emptyBoard();
  const ranks = placement.split("/");
  for (let i = 0; i < 8; i += 1) {
    let j = 0;
    for (const ch of ranks[i]) {
      if (/[1-8]/.test(ch)) j += Number.parseInt(ch, 10);
      else {
        const c = ch === ch.toUpperCase() ? "w" : "b";
        const t = ch.toLowerCase();
        b[i][j] = c + t;
        j += 1;
      }
    }
  }

  const castling = { wK: false, wQ: false, bK: false, bQ: false };
  if (castlingStr.includes("K")) castling.wK = true;
  if (castlingStr.includes("Q")) castling.wQ = true;
  if (castlingStr.includes("k")) castling.bK = true;
  if (castlingStr.includes("q")) castling.bQ = true;

  return { board: b, turn, castling, ep, halfmove: 0, fullmove: 1 };
}
function findKing(state, color) {
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      if (state.board[i][j] === `${color}k`) return ijToSq(i, j);
    }
  }
  return null;
}
function isSquareAttacked(state, sq, byColor) {
  const [ti, tj] = sqToIJ(sq);
  const b = state.board;

  const dir = byColor === "w" ? -1 : 1;
  for (const dj of [-1, 1]) {
    const i = ti - dir;
    const j = tj - dj;
    if (inBounds(i, j) && b[i][j] === `${byColor}p`) return true;
  }

  const knightDeltas = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (const [di, dj] of knightDeltas) {
    const i = ti + di;
    const j = tj + dj;
    if (inBounds(i, j) && b[i][j] === `${byColor}n`) return true;
  }

  for (let di = -1; di <= 1; di += 1) {
    for (let dj = -1; dj <= 1; dj += 1) {
      if (di === 0 && dj === 0) continue;
      const i = ti + di;
      const j = tj + dj;
      if (inBounds(i, j) && b[i][j] === `${byColor}k`) return true;
    }
  }

  const lines = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [di, dj] of lines) {
    let i = ti + di;
    let j = tj + dj;
    while (inBounds(i, j)) {
      const p = b[i][j];
      if (p) {
        if (colorOf(p) === byColor && (typeOf(p) === "r" || typeOf(p) === "q")) return true;
        break;
      }
      i += di;
      j += dj;
    }
  }

  const diags = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [di, dj] of diags) {
    let i = ti + di;
    let j = tj + dj;
    while (inBounds(i, j)) {
      const p = b[i][j];
      if (p) {
        if (colorOf(p) === byColor && (typeOf(p) === "b" || typeOf(p) === "q")) return true;
        break;
      }
      i += di;
      j += dj;
    }
  }

  return false;
}
function inCheck(state, color) {
  const ksq = findKing(state, color);
  if (!ksq) return false;
  return isSquareAttacked(state, ksq, color === "w" ? "b" : "w");
}

function makeMove(state, move) {
  const s = cloneState(state);
  const [fi, fj] = sqToIJ(move.from);
  const [ti, tj] = sqToIJ(move.to);
  const piece = s.board[fi][fj];
  const c = colorOf(piece);
  const t = typeOf(piece);

  s.ep = null;
  const target = s.board[ti][tj];
  const isCapture = Boolean(target) || move.special === "ep";
  s.halfmove = t === "p" || isCapture ? 0 : s.halfmove + 1;

  function disableCastlingFor(color) {
    if (color === "w") {
      s.castling.wK = false;
      s.castling.wQ = false;
    } else {
      s.castling.bK = false;
      s.castling.bQ = false;
    }
  }
  function disableRookSide(color, side) {
    if (color === "w") {
      if (side === "K") s.castling.wK = false;
      else s.castling.wQ = false;
    } else if (side === "K") s.castling.bK = false;
    else s.castling.bQ = false;
  }

  if (target && typeOf(target) === "r") {
    if (move.to === "a1") disableRookSide("w", "Q");
    if (move.to === "h1") disableRookSide("w", "K");
    if (move.to === "a8") disableRookSide("b", "Q");
    if (move.to === "h8") disableRookSide("b", "K");
  }

  s.board[fi][fj] = null;

  if (move.special === "ep") {
    const capRank = c === "w" ? ti + 1 : ti - 1;
    s.board[capRank][tj] = null;
  }

  if (move.special === "castleK") {
    if (c === "w") {
      s.board[7][5] = "wr";
      s.board[7][7] = null;
    } else {
      s.board[0][5] = "br";
      s.board[0][7] = null;
    }
    disableCastlingFor(c);
  }
  if (move.special === "castleQ") {
    if (c === "w") {
      s.board[7][3] = "wr";
      s.board[7][0] = null;
    } else {
      s.board[0][3] = "br";
      s.board[0][0] = null;
    }
    disableCastlingFor(c);
  }

  let placed = piece;
  if (move.promo) {
    placed = c + move.promo;
  } else if (t === "p") {
    const promRow = c === "w" ? 0 : 7;
    if (ti === promRow) {
      placed = `${c}q`;
      move.promo = "q";
      move.special = move.special || "promo";
    }
  }

  s.board[ti][tj] = placed;

  if (t === "p" && Math.abs(ti - fi) === 2) {
    const epI = (fi + ti) / 2;
    s.ep = ijToSq(epI, fj);
  }

  if (t === "k") disableCastlingFor(c);
  if (t === "r") {
    if (move.from === "a1") disableRookSide("w", "Q");
    if (move.from === "h1") disableRookSide("w", "K");
    if (move.from === "a8") disableRookSide("b", "Q");
    if (move.from === "h8") disableRookSide("b", "K");
  }

  s.turn = s.turn === "w" ? "b" : "w";
  if (s.turn === "w") s.fullmove += 1;

  return s;
}

function genPseudoMoves(state, fromSq = null) {
  const moves = [];
  const b = state.board;
  const turn = state.turn;
  const push = (from, to, extra = {}) => moves.push({ from, to, ...extra });

  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      const p = b[i][j];
      if (!p || colorOf(p) !== turn) continue;

      const from = ijToSq(i, j);
      if (fromSq && fromSq !== from) continue;
      const t = typeOf(p);

      if (t === "p") {
        const dir = turn === "w" ? -1 : 1;
        const startRow = turn === "w" ? 6 : 1;
        const promRow = turn === "w" ? 0 : 7;

        const i1 = i + dir;
        if (inBounds(i1, j) && !b[i1][j]) {
          const to = ijToSq(i1, j);
          if (i1 === promRow) push(from, to, { promo: "q" });
          else push(from, to);

          const i2 = i + 2 * dir;
          if (i === startRow && inBounds(i2, j) && !b[i2][j]) push(from, ijToSq(i2, j));
        }

        for (const dj of [-1, 1]) {
          const ic = i + dir;
          const jc = j + dj;
          if (!inBounds(ic, jc)) continue;

          const to = ijToSq(ic, jc);
          const target = b[ic][jc];
          if (target && colorOf(target) !== turn) {
            if (ic === promRow) push(from, to, { promo: "q" });
            else push(from, to);
          }

          if (state.ep && to === state.ep) {
            const capI = turn === "w" ? ic + 1 : ic - 1;
            if (inBounds(capI, jc) && b[capI][jc] === (turn === "w" ? "bp" : "wp")) push(from, to, { special: "ep" });
          }
        }
      }

      if (t === "n") {
        const deltas = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [di, dj] of deltas) {
          const ii = i + di;
          const jj = j + dj;
          if (!inBounds(ii, jj)) continue;
          const target = b[ii][jj];
          if (!target || colorOf(target) !== turn) push(from, ijToSq(ii, jj));
        }
      }

      if (t === "b" || t === "r" || t === "q") {
        const dirs = [];
        if (t === "b" || t === "q") dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        if (t === "r" || t === "q") dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);

        for (const [di, dj] of dirs) {
          let ii = i + di;
          let jj = j + dj;
          while (inBounds(ii, jj)) {
            const target = b[ii][jj];
            if (!target) push(from, ijToSq(ii, jj));
            else {
              if (colorOf(target) !== turn) push(from, ijToSq(ii, jj));
              break;
            }
            ii += di;
            jj += dj;
          }
        }
      }

      if (t === "k") {
        for (let di = -1; di <= 1; di += 1) {
          for (let dj = -1; dj <= 1; dj += 1) {
            if (di === 0 && dj === 0) continue;
            const ii = i + di;
            const jj = j + dj;
            if (!inBounds(ii, jj)) continue;
            const target = b[ii][jj];
            if (!target || colorOf(target) !== turn) push(from, ijToSq(ii, jj));
          }
        }

        const enemy = turn === "w" ? "b" : "w";
        const kingFrom = turn === "w" ? "e1" : "e8";
        const homeRow = turn === "w" ? 7 : 0;

        if (from === kingFrom && !inCheck(state, turn)) {
          const canK = turn === "w" ? state.castling.wK : state.castling.bK;
          if (canK) {
            const fSq = turn === "w" ? "f1" : "f8";
            const gSq = turn === "w" ? "g1" : "g8";
            if (!b[homeRow][5] && !b[homeRow][6] && b[homeRow][7] === `${turn}r`) {
              if (!isSquareAttacked(state, fSq, enemy) && !isSquareAttacked(state, gSq, enemy)) push(from, gSq, { special: "castleK" });
            }
          }

          const canQ = turn === "w" ? state.castling.wQ : state.castling.bQ;
          if (canQ) {
            const dSq = turn === "w" ? "d1" : "d8";
            const cSq = turn === "w" ? "c1" : "c8";
            if (!b[homeRow][3] && !b[homeRow][2] && !b[homeRow][1] && b[homeRow][0] === `${turn}r`) {
              if (!isSquareAttacked(state, dSq, enemy) && !isSquareAttacked(state, cSq, enemy)) push(from, cSq, { special: "castleQ" });
            }
          }
        }
      }
    }
  }
  return moves;
}

function genLegalMoves(state, fromSq = null) {
  const pseudos = genPseudoMoves(state, fromSq);
  const legal = [];
  const us = state.turn;
  for (const m of pseudos) {
    const s2 = makeMove(state, { ...m });
    if (!inCheck(s2, us)) legal.push(m);
  }
  return legal;
}
function isCheckmate(state) {
  if (!inCheck(state, state.turn)) return false;
  return genLegalMoves(state).length === 0;
}
function isStalemate(state) {
  if (inCheck(state, state.turn)) return false;
  return genLegalMoves(state).length === 0;
}

const lessons = [
  {
    name: "1) Échiquier & coordonnées",
    text: "Clique des cases. Objectif: comprendre a→h et 1→8.",
    fen: "8/8/8/8/8/8/8/8 w - -",
    rule: "a1 = en bas à gauche (côté blancs). Les blancs commencent.",
    tags: ["Coordonnées", "Orientation"],
    hint: "Clique h1 puis a8 pour te repérer.",
    allowAnyClick: true,
    complete: (ctx) => ctx.clickedOnce,
  },
  {
    name: "2) Pion: avance",
    text: "Fais avancer le pion de e2 vers e4 (ou e3).",
    fen: "8/8/8/8/8/8/4P3/8 w - -",
    rule: "Le pion avance tout droit. Au premier coup: 2 cases si libre.",
    tags: ["Pion", "Avance"],
    hint: "e2 → e4.",
    complete: (ctx, last) => last && last.from === "e2" && (last.to === "e4" || last.to === "e3"),
  },
  {
    name: "3) Pion: capture diagonale",
    text: "Capture le pion noir : e4xd5.",
    fen: "8/8/8/3p4/4P3/8/8/8 w - -",
    rule: "Le pion capture uniquement en diagonale (1 case).",
    tags: ["Pion", "Capture"],
    hint: "e4 → d5 (capture).",
    complete: (ctx, last) => last && last.from === "e4" && last.to === "d5",
  },
  {
    name: "4) Tour",
    text: "Joue la tour de a1 à a5.",
    fen: "8/8/8/8/8/8/8/R7 w - -",
    rule: "La tour bouge en ligne droite, sans sauter.",
    tags: ["Tour"],
    hint: "a1 → a5.",
    complete: (ctx, last) => last && last.from === "a1" && last.to === "a5",
  },
  {
    name: "5) Fou",
    text: "Joue le fou de c1 à g5.",
    fen: "8/8/8/8/8/8/8/2B5 w - -",
    rule: "Le fou bouge en diagonale, sans sauter.",
    tags: ["Fou"],
    hint: "c1 → g5.",
    complete: (ctx, last) => last && last.from === "c1" && last.to === "g5",
  },
  {
    name: "6) Cavalier",
    text: "Joue le cavalier de g1 à f3.",
    fen: "8/8/8/8/8/8/8/6N1 w - -",
    rule: "Le cavalier bouge en L (2+1). Il saute.",
    tags: ["Cavalier"],
    hint: "g1 → f3.",
    complete: (ctx, last) => last && last.from === "g1" && last.to === "f3",
  },
  {
    name: "7) Dame",
    text: "Joue la dame de d1 à h5.",
    fen: "8/8/8/8/8/8/8/3Q4 w - -",
    rule: "La dame = tour + fou.",
    tags: ["Dame"],
    hint: "d1 → h5.",
    complete: (ctx, last) => last && last.from === "d1" && last.to === "h5",
  },
  {
    name: "8) Échec: réponse obligatoire",
    text: "Le roi est en échec. Fais un coup légal pour sortir de l’échec.",
    fen: "4r3/8/8/8/8/8/8/4K3 w - -",
    rule: "En échec: bouger roi, capturer, ou interposer (si possible).",
    tags: ["Roi", "Échec"],
    hint: "Bouge le roi.",
    complete: (ctx, last, st) => !inCheck(st, "w"),
  },
  {
    name: "9) Roque",
    text: "Réalise un roque côté roi (O-O) avec les blancs.",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq -",
    rule: "Le roi se déplace de 2 cases, la tour passe de l’autre côté. Conditions strictes.",
    tags: ["Roque"],
    hint: "e1 → g1.",
    complete: (ctx, last) => last && last.special === "castleK" && last.from === "e1" && last.to === "g1",
  },
  {
    name: "10) En passant",
    text: "Fais une prise en passant : exd6 e.p.",
    fen: "8/8/8/3pP3/8/8/8/8 w - d6",
    rule: "Possible seulement immédiatement après un double pas adverse.",
    tags: ["En passant"],
    hint: "e5 → d6.",
    complete: (ctx, last) => last && last.special === "ep",
  },
  {
    name: "11) Promotion",
    text: "Pousse le pion jusqu’à la 8e rangée pour le promouvoir (auto-Dame).",
    fen: "8/4P3/8/8/8/8/8/8 w - -",
    rule: "Arrivé au bout: promotion (souvent Dame).",
    tags: ["Promotion"],
    hint: "e7 → e8.",
    complete: (ctx, last) => last && last.special === "promo",
  },
  {
    name: "12) Mat / Pat",
    text: "Obtiens mat en 1, ou observe pat/nulle si ça arrive.",
    fen: "6k1/5ppp/8/8/7Q/8/6PP/6K1 w - -",
    rule: "Mat = échec + aucune défense. Pat = pas d’échec + aucun coup légal.",
    tags: ["Mat", "Pat"],
    hint: "Cherche un coup d’échec sans fuite.",
    complete: (ctx, last, st) => isCheckmate(st) || isStalemate(st),
  },
  {
    name: "Mode libre",
    text: "Position initiale. Fais ce que tu veux (coups légaux).",
    fen: "start",
    rule: "Mode libre: pratique tranquille.",
    tags: ["Sandbox"],
    hint: "e2→e4, g1→f3, etc.",
    complete: () => true,
  },
];

const overlay = $("#overlay");
const stepsList = $("#stepsList");
const stepTitle = $("#stepTitle");
const stepText = $("#stepText");
const statusEl = $("#status");
const ruleText = $("#ruleText");
const tagsEl = $("#tags");
const progressFill = $("#progressFill");
const boardEl = $("#board");
const toastEl = $("#toast");
const globalToast = $("#globalToast");
const tutorialPage = $("#tutorialPage");
const isStandaloneTutorial = Boolean(tutorialPage);

const openTutorialBtn = $("#openTutorialBtn");
const openBasicsCard = $("#openBasicsCard");
const closeOverlayBtn = $("#closeOverlay");

const prevBtn = $("#prevBtn");
const nextBtn = $("#nextBtn");
const resetBtn = $("#resetBtn");
const hintBtn = $("#hintBtn");
const modeBtn = $("#modeBtn");

let stepIndex = 0;
let done = lessons.map(() => false);
let freeMode = false;

let state = null;
let baseState = null;
let ctx = { clickedOnce: false };

let selectedSq = null;
let legalMovesFromSelected = [];

function setStatus(msg, tone = "neutral") {
  statusEl.textContent = msg;
  statusEl.style.borderColor =
    tone === "good" ? "rgba(46,204,113,.25)"
      : tone === "bad" ? "rgba(255,90,115,.25)"
        : tone === "warn" ? "rgba(241,196,15,.25)"
          : "rgba(255,255,255,.10)";
  statusEl.style.background =
    tone === "good" ? "rgba(46,204,113,.10)"
      : tone === "bad" ? "rgba(255,90,115,.10)"
        : tone === "warn" ? "rgba(241,196,15,.10)"
          : "rgba(255,255,255,.04)";
  statusEl.style.color =
    tone === "good" ? "rgba(46,204,113,.95)"
      : tone === "bad" ? "rgba(255,90,115,.92)"
        : tone === "warn" ? "rgba(241,196,15,.92)"
          : "rgba(255,255,255,.62)";
}

function openTutorial() {
  if (isStandaloneTutorial) return;
  if (!overlay) {
    window.location.href = "learn.html";
    return;
  }
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  initTutorial();
  toast(globalToast, "Tutoriel ouvert.");
}
function closeTutorial() {
  if (isStandaloneTutorial) {
    window.location.href = "index.html";
    return;
  }
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  clearSelection();
}

openTutorialBtn?.addEventListener("click", () => {
  window.location.href = "learn.html";
});
openBasicsCard?.addEventListener("click", () => {
  window.location.href = "learn.html";
});
closeOverlayBtn?.addEventListener("click", closeTutorial);

overlay?.addEventListener("click", (e) => {
  if (e.target && e.target.dataset && e.target.dataset.close) closeTutorial();
});

document.addEventListener("keydown", (e) => {
  const tutorialActive = isStandaloneTutorial || overlay?.classList.contains("is-open");
  if (!tutorialActive) return;
  if (e.key === "Escape") closeTutorial();
  if (e.key.toLowerCase() === "n") next();
  if (e.key.toLowerCase() === "r") reset();
});

$("#helpBtn")?.addEventListener("click", () => {
  toast(globalToast, "Raccourcis: N=Next · R=Reset · Esc=Close");
});

function fenToState(fen) {
  if (fen === "start") return startPosition();
  return loadFEN(fen);
}

function initTutorial() {
  done = lessons.map(() => false);
  stepIndex = 0;
  freeMode = false;
  buildSteps();
  buildBoard();
  loadStep(0);
}

function buildSteps() {
  stepsList.innerHTML = "";
  lessons.forEach((l, i) => {
    const el = document.createElement("div");
    el.className = "step";
    el.innerHTML = `
      <div class="step__top">
        <div class="step__name">${l.name}</div>
        <div class="step__badge">—</div>
      </div>
      <div class="step__sub">${l.text}</div>
    `;
    el.addEventListener("click", () => loadStep(i));
    stepsList.appendChild(el);
  });
  syncStepsUI();
}

function syncStepsUI() {
  const els = $$(".step", stepsList);
  els.forEach((el, i) => {
    el.classList.toggle("is-active", i === stepIndex);
    el.classList.toggle("is-done", Boolean(done[i]));
    $(".step__badge", el).textContent = done[i] ? "✓" : (i === stepIndex ? "•" : "—");
  });

  const completed = done.filter(Boolean).length;
  progressFill.style.width = `${Math.round((completed / lessons.length) * 100)}%`;

  prevBtn.disabled = stepIndex === 0;
  const allowNext = freeMode ? true : Boolean(done[stepIndex]);
  nextBtn.disabled = !allowNext && stepIndex !== lessons.length - 1;
  nextBtn.textContent = stepIndex === lessons.length - 1 ? "Terminer" : "Suivant";

  modeBtn.textContent = freeMode ? "Mode guidé" : "Mode libre";
}

function loadStep(i) {
  stepIndex = i;
  ctx = { clickedOnce: false };

  const lesson = lessons[i];
  if (lesson.name === "Mode libre") freeMode = true;

  stepTitle.textContent = lesson.name;
  stepText.textContent = lesson.text;
  ruleText.textContent = lesson.rule;

  tagsEl.innerHTML = "";
  (lesson.tags || []).forEach((t) => {
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = t;
    tagsEl.appendChild(s);
  });

  state = fenToState(lesson.fen);
  baseState = cloneState(state);

  clearSelection();
  renderBoard();
  setStatus("À toi.", "neutral");
  toast(toastEl, "Step chargé.");
  syncStepsUI();
}

function prev() { if (stepIndex > 0) loadStep(stepIndex - 1); }
function next() {
  if (stepIndex === lessons.length - 1) {
    toast(toastEl, "Terminé.");
    closeTutorial();
    return;
  }
  if (!freeMode && !done[stepIndex]) {
    toast(toastEl, "Valide le chapitre avant.");
    setStatus("Chapitre non validé.", "bad");
    return;
  }
  loadStep(stepIndex + 1);
}

function reset() {
  state = cloneState(baseState);
  clearSelection();
  renderBoard();
  setStatus("Reset.", "neutral");
  toast(toastEl, "Position remise à zéro.");
}

function hint() {
  toast(toastEl, lessons[stepIndex].hint || "Pas d’indice.");
}

function toggleMode() {
  freeMode = !freeMode;
  toast(toastEl, freeMode ? "Mode libre" : "Mode guidé");
  setStatus(freeMode ? "Mode libre: joue." : "Mode guidé: valide.", "warn");
  syncStepsUI();
}

prevBtn?.addEventListener("click", prev);
nextBtn?.addEventListener("click", next);
resetBtn?.addEventListener("click", reset);
hintBtn?.addEventListener("click", hint);
modeBtn?.addEventListener("click", toggleMode);

function buildBoard() {
  boardEl.innerHTML = "";
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      const sq = ijToSq(i, j);
      const dark = (i + j) % 2 === 1;
      const cell = document.createElement("div");
      cell.className = `sq ${dark ? "dark" : "light"}`;
      cell.dataset.sq = sq;
      cell.addEventListener("click", () => onSquareClick(sq));
      boardEl.appendChild(cell);
    }
  }
}

function getSqEl(sq) { return boardEl.querySelector(`.sq[data-sq="${sq}"]`); }
function pieceAt(st, sq) {
  const [i, j] = sqToIJ(sq);
  return st.board[i][j];
}

function clearSelection() {
  selectedSq = null;
  legalMovesFromSelected = [];
  $$(".sq", boardEl).forEach((el) => el.classList.remove("is-selected", "is-move", "is-capture", "is-check"));
}

function renderBoard() {
  $$(".sq", boardEl).forEach((el) => {
    el.innerHTML = "";
    el.classList.remove("is-check");
  });

  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      const sq = ijToSq(i, j);
      const p = state.board[i][j];
      if (!p) continue;
      const el = getSqEl(sq);
      const pe = document.createElement("div");
      pe.className = `piece ${colorOf(p) === "w" ? "w" : "b"}`;
      pe.textContent = U[p] || "?";
      pe.dataset.piece = p;
      pe.dataset.sq = sq;
      pe.addEventListener("pointerdown", onPiecePointerDown);
      el.appendChild(pe);
    }
  }

  if (inCheck(state, state.turn)) {
    const ksq = findKing(state, state.turn);
    if (ksq) getSqEl(ksq)?.classList.add("is-check");
  }

  if (selectedSq) highlightSelection(selectedSq, legalMovesFromSelected);
}

function highlightSelection(fromSq, moves) {
  clearSelection();
  selectedSq = fromSq;
  legalMovesFromSelected = moves;

  getSqEl(fromSq)?.classList.add("is-selected");
  for (const m of moves) {
    const toEl = getSqEl(m.to);
    if (!toEl) continue;
    const target = pieceAt(state, m.to);
    toEl.classList.add(target ? "is-capture" : "is-move");
  }
}

function animateMoveDOM(fromSq, toSq) {
  const fromEl = getSqEl(fromSq);
  const toEl = getSqEl(toSq);
  if (!fromEl || !toEl) return;

  const pieceEl = fromEl.querySelector(".piece");
  if (!pieceEl) return;

  const captured = toEl.querySelector(".piece");
  if (captured) {
    captured.animate(
      [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.85)" }],
      { duration: 120, easing: "ease-out" },
    );
    setTimeout(() => captured.remove(), 120);
  }

  const first = pieceEl.getBoundingClientRect();
  toEl.appendChild(pieceEl);
  const last = pieceEl.getBoundingClientRect();

  const dx = first.left - last.left;
  const dy = first.top - last.top;

  pieceEl.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }],
    { duration: 160, easing: "cubic-bezier(.2,.8,.2,1)" },
  );
}

function maybeComplete(lastMove) {
  if (freeMode) {
    done[stepIndex] = true;
    syncStepsUI();
    return;
  }
  const lesson = lessons[stepIndex];
  let ok = false;
  try {
    ok = Boolean(lesson.complete(ctx, lastMove, state));
  } catch {
    ok = false;
  }

  if (ok && !done[stepIndex]) {
    done[stepIndex] = true;
    if (isCheckmate(state)) setStatus("Mat. Validé.", "good");
    else if (isStalemate(state)) setStatus("Pat (nulle). Validé.", "good");
    else setStatus("Validé.", "good");
    toast(toastEl, "✓ Chapitre validé");
  } else {
    if (inCheck(state, state.turn)) setStatus("Échec.", "bad");
    else setStatus("Continue.", "neutral");
  }
  syncStepsUI();
}

function onSquareClick(sq) {
  const lesson = lessons[stepIndex];

  if (lesson.allowAnyClick) {
    ctx.clickedOnce = true;
    setStatus(`Coordonnée: ${sq}`, "good");
    maybeComplete(null);
    return;
  }

  const p = pieceAt(state, sq);

  if (selectedSq && sq !== selectedSq) {
    const mv = legalMovesFromSelected.find((m) => m.to === sq);
    if (!mv) {
      toast(toastEl, "Coup illégal.");
      setStatus("Coup illégal.", "bad");
      return;
    }

    animateMoveDOM(mv.from, mv.to);
    state = makeMove(state, { ...mv });

    setTimeout(() => {
      clearSelection();
      renderBoard();
      toast(toastEl, `${mv.from}→${mv.to}`);
      maybeComplete(mv);
    }, 0);
    return;
  }

  if (p && colorOf(p) === state.turn) {
    const moves = genLegalMoves(state, sq);
    highlightSelection(sq, moves);
    setStatus(`Sélection: ${sq}`, "neutral");
    return;
  }

  toast(toastEl, "Sélectionne une pièce.");
}

let dragging = null;
function onPiecePointerDown(e) {
  const pieceEl = e.currentTarget;
  const fromSq = pieceEl.dataset.sq;
  const p = pieceAt(state, fromSq);
  if (!p || colorOf(p) !== state.turn) return;

  e.preventDefault();
  pieceEl.setPointerCapture(e.pointerId);

  const moves = genLegalMoves(state, fromSq);
  highlightSelection(fromSq, moves);

  const ghost = document.createElement("div");
  ghost.className = "dragGhost";
  ghost.textContent = pieceEl.textContent;
  ghost.style.color = getComputedStyle(pieceEl).color;
  document.body.appendChild(ghost);

  pieceEl.style.opacity = "0";

  dragging = {
    fromSq,
    ghostEl: ghost,
    originPieceEl: pieceEl,
    moves,
  };

  moveGhost(e.clientX, e.clientY);
}

document.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  moveGhost(e.clientX, e.clientY);
});

document.addEventListener("pointerup", (e) => {
  if (!dragging) return;

  const {
    originPieceEl,
    ghostEl,
    moves,
  } = dragging;

  const under = document.elementFromPoint(e.clientX, e.clientY);
  const sqEl = under?.closest?.(".sq");
  const toSq = sqEl?.dataset?.sq || null;

  originPieceEl.style.opacity = "1";
  ghostEl.remove();

  if (!toSq) {
    clearSelection();
    renderBoard();
    dragging = null;
    return;
  }

  const mv = moves.find((m) => m.to === toSq);
  if (!mv) {
    toast(toastEl, "Drop illégal.");
    setStatus("Coup illégal.", "bad");
    clearSelection();
    renderBoard();
    dragging = null;
    return;
  }

  animateMoveDOM(mv.from, mv.to);
  state = makeMove(state, { ...mv });

  setTimeout(() => {
    clearSelection();
    renderBoard();
    toast(toastEl, `${mv.from}→${mv.to}`);
    maybeComplete(mv);
  }, 0);

  dragging = null;
});

function moveGhost(x, y) {
  dragging.ghostEl.style.left = `${x}px`;
  dragging.ghostEl.style.top = `${y}px`;
}

let miniState = startPosition();
let miniSelectedSq = null;
let miniDragging = null;

function setMiniStatus(message) {
  const statusElMini = $("#miniBoardStatus");
  if (statusElMini) statusElMini.textContent = message;
}

function clearMiniSelection() {
  miniSelectedSq = null;
}

function renderMiniBoard() {
  const mini = $("#miniBoard");
  if (!mini) return;

  mini.innerHTML = "";

  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      const sq = ijToSq(i, j);
      const p = miniState.board[i][j];
      const dark = (i + j) % 2 === 1;

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `miniSq ${dark ? "dark" : "light"}`;
      cell.dataset.sq = sq;
      cell.setAttribute("aria-label", `Case ${sq}`);

      if (miniSelectedSq === sq) {
        cell.classList.add("is-selected");
      }

      if (miniSelectedSq) {
        const legalTargets = genLegalMoves(miniState, miniSelectedSq);
        const m = legalTargets.find((mv) => mv.to === sq);
        if (m) {
          const targetPiece = pieceAt(miniState, sq);
          cell.classList.add(targetPiece ? "is-capture" : "is-target");
        }
      }

      if (p) {
        const pe = document.createElement("span");
        pe.className = `miniPiece ${colorOf(p) === "w" ? "w" : "b"}`;
        pe.textContent = U[p] || "";
        pe.dataset.sq = sq;
        pe.addEventListener("pointerdown", onMiniPiecePointerDown);
        cell.appendChild(pe);
      }

      cell.addEventListener("click", () => onMiniSquareClick(sq));
      mini.appendChild(cell);
    }
  }

  const turnLabel = miniState.turn === "w" ? "Trait aux blancs" : "Trait aux noirs";
  setMiniStatus(miniSelectedSq ? `${turnLabel} · ${miniSelectedSq} sélectionnée` : turnLabel);
}

function onMiniSquareClick(sq) {
  const p = pieceAt(miniState, sq);

  if (miniSelectedSq && miniSelectedSq !== sq) {
    const move = genLegalMoves(miniState, miniSelectedSq).find((m) => m.to === sq);
    if (move) {
      miniState = makeMove(miniState, { ...move });
      clearMiniSelection();
      renderMiniBoard();
      return;
    }
  }

  if (p && colorOf(p) === miniState.turn) {
    miniSelectedSq = sq;
  } else {
    clearMiniSelection();
  }

  renderMiniBoard();
}

function resetMiniBoard() {
  miniState = startPosition();
  clearMiniSelection();
  renderMiniBoard();
}

function onMiniPiecePointerDown(e) {
  const fromSq = e.currentTarget.dataset.sq;
  const p = pieceAt(miniState, fromSq);
  if (!p || colorOf(p) !== miniState.turn) return;

  e.preventDefault();

  miniSelectedSq = fromSq;
  const moves = genLegalMoves(miniState, fromSq);
  renderMiniBoard();

  const ghost = document.createElement("div");
  ghost.className = "miniDragGhost";
  ghost.textContent = e.currentTarget.textContent;
  ghost.style.color = getComputedStyle(e.currentTarget).color;
  document.body.appendChild(ghost);

  miniDragging = { fromSq, ghost, moves };
  moveMiniGhost(e.clientX, e.clientY);
}

document.addEventListener("pointermove", (e) => {
  if (!miniDragging) return;
  moveMiniGhost(e.clientX, e.clientY);
});

document.addEventListener("pointerup", (e) => {
  if (!miniDragging) return;

  const { moves, ghost } = miniDragging;
  ghost.remove();

  const under = document.elementFromPoint(e.clientX, e.clientY);
  const sqEl = under?.closest?.(".miniSq");
  const toSq = sqEl?.dataset?.sq || null;

  if (!toSq) {
    miniDragging = null;
    clearMiniSelection();
    renderMiniBoard();
    return;
  }

  const mv = moves.find((m) => m.to === toSq);
  if (!mv) {
    miniDragging = null;
    clearMiniSelection();
    renderMiniBoard();
    return;
  }

  miniState = makeMove(miniState, { ...mv });
  miniDragging = null;
  clearMiniSelection();
  renderMiniBoard();
});

function moveMiniGhost(x, y) {
  miniDragging.ghost.style.left = `${x}px`;
  miniDragging.ghost.style.top = `${y}px`;
}

$("#miniBoardReset")?.addEventListener("click", resetMiniBoard);
renderMiniBoard();

(() => {
  const hv = $("#heroVisual");
  if (!hv) return;
  hv.addEventListener("mousemove", (e) => {
    const r = hv.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    hv.style.transform = `translate(${dx * 2}px, ${dy * 2}px)`;
  });
  hv.addEventListener("mouseleave", () => {
    hv.style.transform = "translate(0px,0px)";
  });
})();

if (!isStandaloneTutorial) {
  closeTutorial();
} else {
  initTutorial();
}

const STORE_KEY = "lumichess-users-v1";
const SESSION_KEY = "lumichess-session-v1";

function readUsers() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
  catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem(STORE_KEY, JSON.stringify(users));
}
function getCurrentUser() {
  const email = localStorage.getItem(SESSION_KEY);
  if (!email) return null;
  return readUsers().find((u) => u.email === email) || null;
}
function setCurrentUser(email) {
  if (!email) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, email);
}
function redirectToAuth() {
  window.location.href = "auth.html";
}
function seedHistory() {
  return [
    { date: "Semaine 1", elo: 1180, accuracy: 67, focus: "ouvertures" },
    { date: "Semaine 2", elo: 1215, accuracy: 71, focus: "tactiques" },
    { date: "Semaine 3", elo: 1242, accuracy: 74, focus: "finales" },
    { date: "Semaine 4", elo: 1270, accuracy: 78, focus: "stratégie" },
  ];
}
function ensureProfile(user) {
  user.profile ??= { theme: "", weakness: "", bio: "" };
  user.history ??= seedHistory();
  user.goals ??= [{ text: "+100 Elo en 3 mois", deadline: "", done: false }];
  return user;
}

const authStatus = $("#authStatus");
const logoutBtn = $("#logoutBtn");
const profileForm = $("#profileForm");
const goalForm = $("#goalForm");
const sessionBadge = $("#sessionBadge");

function updateDashboard() {
  const user = getCurrentUser();
  const profileName = $("#profileName");
  const profileSub = $("#profileSub");

  if (!user) {
    profileName.textContent = "Profil joueur";
    profileSub.textContent = "Connectez-vous pour activer votre espace.";
    $("#eloNow").textContent = "—";
    $("#accuracyNow").textContent = "—";
    $("#weakThemes").textContent = "—";
    $("#eloTrend").textContent = "Connectez-vous";
    $("#historyList").innerHTML = '<div class="history-item">Aucun historique disponible.</div>';
    $("#goalsList").innerHTML = '<div class="goal-item">Aucun objectif pour le moment.</div>';
    if (authStatus) authStatus.textContent = "Veuillez choisir un mode d'accès.";
    if (sessionBadge) sessionBadge.textContent = "Session inactive";
    redirectToAuth();
    return;
  }

  const safeUser = ensureProfile(user);
  const users = readUsers().map((u) => (u.email === safeUser.email ? safeUser : u));
  saveUsers(users);

  profileName.textContent = `Profil de ${safeUser.pseudo}`;
  profileSub.textContent = safeUser.profile.bio || "Prêt pour grind votre prochain palier Elo.";
  $("#profileTheme").value = safeUser.profile.theme;
  $("#profileWeakness").value = safeUser.profile.weakness;
  $("#profileBio").value = safeUser.profile.bio;

  const last = safeUser.history[safeUser.history.length - 1];
  const first = safeUser.history[0];
  $("#eloNow").textContent = last ? last.elo : "—";
  $("#accuracyNow").textContent = last ? `${last.accuracy}%` : "—";
  $("#weakThemes").textContent = safeUser.profile.weakness || (last ? last.focus : "—");
  $("#eloTrend").textContent = last && first ? `${last.elo - first.elo >= 0 ? "+" : ""}${last.elo - first.elo} Elo` : "Tendance indisponible";

  $("#historyList").innerHTML = safeUser.history
    .map((h) => `<div class="history-item"><b>${h.date}</b> · Elo ${h.elo} · Précision ${h.accuracy}% · Focus ${h.focus}</div>`)
    .join("");

  $("#goalsList").innerHTML = safeUser.goals.map((g, idx) => `
    <label class="goal-item ${g.done ? "done" : ""}">
      <div>
        <strong>${g.text}</strong>
        <small>Échéance: ${g.deadline || "à définir"}</small>
      </div>
      <input type="checkbox" data-goal-idx="${idx}" ${g.done ? "checked" : ""} />
    </label>
  `).join("") || '<div class="goal-item">Aucun objectif pour le moment.</div>';

  if (authStatus) authStatus.textContent = safeUser.isGuest
    ? `Connecté en mode invité (${safeUser.pseudo})`
    : `Connecté en tant que ${safeUser.pseudo} (${safeUser.email})`;
  if (sessionBadge) sessionBadge.textContent = safeUser.isGuest ? `Invité: ${safeUser.pseudo}` : safeUser.pseudo;
}


logoutBtn?.addEventListener("click", () => {
  setCurrentUser(null);
  redirectToAuth();
});

profileForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) {
    authStatus.textContent = "Connectez-vous pour modifier le profil.";
    return;
  }

  const users = readUsers();
  const idx = users.findIndex((u) => u.email === user.email);
  if (idx === -1) return;

  users[idx] = ensureProfile(users[idx]);
  users[idx].profile.theme = $("#profileTheme").value.trim();
  users[idx].profile.weakness = $("#profileWeakness").value.trim();
  users[idx].profile.bio = $("#profileBio").value.trim();
  saveUsers(users);
  updateDashboard();
  authStatus.textContent = "Profil sauvegardé.";
});

goalForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const text = $("#goalText").value.trim();
  const deadline = $("#goalDeadline").value;
  if (!text || !deadline) return;

  const users = readUsers();
  const idx = users.findIndex((u) => u.email === user.email);
  users[idx] = ensureProfile(users[idx]);
  users[idx].goals.unshift({ text, deadline, done: false });
  saveUsers(users);
  goalForm.reset();
  updateDashboard();
});

$("#goalsList")?.addEventListener("change", (e) => {
  const input = e.target.closest("input[data-goal-idx]");
  if (!input) return;

  const user = getCurrentUser();
  if (!user) return;

  const users = readUsers();
  const idx = users.findIndex((u) => u.email === user.email);
  users[idx] = ensureProfile(users[idx]);
  const goalIdx = Number.parseInt(input.dataset.goalIdx, 10);
  if (users[idx].goals[goalIdx]) users[idx].goals[goalIdx].done = input.checked;
  saveUsers(users);
  updateDashboard();
});

if ($("#profileName")) updateDashboard();
