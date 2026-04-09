import type { Square } from "../types.js";

type Piece = `${"w"|"b"}${"p"|"r"|"n"|"b"|"q"|"k"}`;
type Board = Array<Array<Piece | null>>;

export interface RulesMove { from: Square; to: Square; promo?: "q"|"r"|"b"|"n"; special?: "ep"|"castleK"|"castleQ"|"promo"; }
export interface RulesState {
  board: Board;
  turn: "w"|"b";
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  ep: Square | null;
}

const FILES = ["a","b","c","d","e","f","g","h"] as const;
const inBounds = (i: number, j: number) => i >= 0 && i < 8 && j >= 0 && j < 8;
const colorOf = (p: Piece | null) => p?.[0] as "w"|"b"|undefined;
const typeOf = (p: Piece | null) => p?.[1] as Piece[1]|undefined;

const sqToIJ = (sq: Square): [number, number] => [8 - Number(sq[1]), FILES.indexOf(sq[0] as typeof FILES[number])];
const ijToSq = (i: number, j: number): Square => `${FILES[j]}${8 - i}` as Square;

const emptyBoard = (): Board => Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null));

export function startPosition(): RulesState {
  return loadFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
}

export function loadFEN(fen: string): RulesState {
  const [placement, turn = "w", castlingStr = "-", ep = "-"] = fen.trim().split(/\s+/);
  const board = emptyBoard();
  placement.split("/").forEach((rank, i) => {
    let j = 0;
    [...rank].forEach((ch) => {
      if (/\d/.test(ch)) j += Number(ch);
      else {
        board[i][j] = `${ch === ch.toUpperCase() ? "w" : "b"}${ch.toLowerCase()}` as Piece;
        j += 1;
      }
    });
  });
  return {
    board,
    turn: turn as "w" | "b",
    castling: {
      wK: castlingStr.includes("K"),
      wQ: castlingStr.includes("Q"),
      bK: castlingStr.includes("k"),
      bQ: castlingStr.includes("q"),
    },
    ep: ep === "-" ? null : (ep as Square),
  };
}

function findKing(state: RulesState, color: "w"|"b"): Square | null {
  for (let i = 0; i < 8; i += 1) for (let j = 0; j < 8; j += 1) if (state.board[i][j] === `${color}k`) return ijToSq(i, j);
  return null;
}

function isSquareAttacked(state: RulesState, sq: Square, byColor: "w"|"b"): boolean {
  const [ti, tj] = sqToIJ(sq);
  const b = state.board;
  const dir = byColor === "w" ? -1 : 1;
  for (const dj of [-1, 1]) {
    const i = ti - dir; const j = tj - dj;
    if (inBounds(i, j) && b[i][j] === `${byColor}p`) return true;
  }
  const kDeltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [di, dj] of kDeltas) { const i=ti+di,j=tj+dj; if (inBounds(i,j)&&b[i][j]===`${byColor}n`) return true; }
  const rays = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [di,dj] of rays){ let i=ti+di,j=tj+dj; while(inBounds(i,j)){ const p=b[i][j]; if(p){ if(colorOf(p)===byColor && (["r","q"] as string[]).includes(typeOf(p)!)) return true; break;} i+=di;j+=dj; } }
  const diags = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [di,dj] of diags){ let i=ti+di,j=tj+dj; while(inBounds(i,j)){ const p=b[i][j]; if(p){ if(colorOf(p)===byColor && (["b","q"] as string[]).includes(typeOf(p)!)) return true; break;} i+=di;j+=dj; } }
  for (let di=-1;di<=1;di+=1) for (let dj=-1;dj<=1;dj+=1){ if(!di&&!dj) continue; const i=ti+di,j=tj+dj; if(inBounds(i,j)&&b[i][j]===`${byColor}k`) return true; }
  return false;
}

export function inCheck(state: RulesState, color: "w"|"b"): boolean {
  const king = findKing(state, color); if (!king) return false;
  return isSquareAttacked(state, king, color === "w" ? "b" : "w");
}

function clone(state: RulesState): RulesState { return { board: state.board.map((r) => [...r]), turn: state.turn, castling: { ...state.castling }, ep: state.ep }; }

export function makeMove(state: RulesState, move: RulesMove): RulesState {
  const s = clone(state); const [fi,fj] = sqToIJ(move.from); const [ti,tj] = sqToIJ(move.to);
  const piece = s.board[fi][fj]; if (!piece) return s;
  const c = colorOf(piece)!; const t = typeOf(piece)!; s.ep = null;
  s.board[fi][fj] = null;
  if (move.special === "ep") s.board[c === "w" ? ti + 1 : ti - 1][tj] = null;
  if (move.special === "castleK") { const row = c === "w" ? 7 : 0; s.board[row][5] = `${c}r`; s.board[row][7] = null; }
  if (move.special === "castleQ") { const row = c === "w" ? 7 : 0; s.board[row][3] = `${c}r`; s.board[row][0] = null; }
  const placed = move.promo ? (`${c}${move.promo}` as Piece) : piece;
  s.board[ti][tj] = placed;
  if (t === "p" && Math.abs(ti - fi) === 2) s.ep = ijToSq((ti + fi) / 2, fj);
  if (t === "k") { if (c === "w") { s.castling.wK = false; s.castling.wQ = false; } else { s.castling.bK = false; s.castling.bQ = false; } }
  s.turn = c === "w" ? "b" : "w";
  return s;
}

function genPseudo(state: RulesState, fromSq?: Square): RulesMove[] {
  const m: RulesMove[] = []; const turn = state.turn;
  const push = (from: Square, to: Square, extra: Partial<RulesMove> = {}) => m.push({ from, to, ...extra });
  for (let i=0;i<8;i+=1) for (let j=0;j<8;j+=1) {
    const p = state.board[i][j]; if (!p || colorOf(p) !== turn) continue;
    const from = ijToSq(i,j); if (fromSq && fromSq !== from) continue; const t = typeOf(p);
    if (t === "p") {
      const dir = turn === "w" ? -1 : 1; const start = turn === "w" ? 6 : 1; const prom = turn === "w" ? 0 : 7;
      const i1=i+dir; if (inBounds(i1,j)&&!state.board[i1][j]) { if (i1===prom) ["q","r","b","n"].forEach((pr)=>push(from,ijToSq(i1,j),{promo: pr as RulesMove["promo"], special:"promo"})); else push(from,ijToSq(i1,j)); const i2=i+(2*dir); if(i===start && !state.board[i2][j]) push(from,ijToSq(i2,j)); }
      for (const dj of [-1,1]) { const ic=i+dir,jc=j+dj; if(!inBounds(ic,jc)) continue; const to=ijToSq(ic,jc); const target=state.board[ic][jc]; if(target && colorOf(target)!==turn){ if(ic===prom) ["q","r","b","n"].forEach((pr)=>push(from,to,{promo: pr as RulesMove["promo"], special:"promo"})); else push(from,to);} if(state.ep===to) push(from,to,{special:"ep"}); }
    }
    if (t === "n") [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([di,dj])=>{ const ii=i+di,jj=j+dj; if(!inBounds(ii,jj)) return; const q=state.board[ii][jj]; if(!q||colorOf(q)!==turn) push(from,ijToSq(ii,jj)); });
    if (t === "b" || t === "r" || t === "q") {
      const dirs:number[][]=[]; if (t!=="r") dirs.push([-1,-1],[-1,1],[1,-1],[1,1]); if (t!=="b") dirs.push([-1,0],[1,0],[0,-1],[0,1]);
      dirs.forEach(([di,dj])=>{ let ii=i+di,jj=j+dj; while(inBounds(ii,jj)){ const q=state.board[ii][jj]; if(!q) push(from,ijToSq(ii,jj)); else { if(colorOf(q)!==turn) push(from,ijToSq(ii,jj)); break; } ii+=di; jj+=dj; } });
    }
    if (t === "k") {
      for (let di=-1;di<=1;di+=1) for (let dj=-1;dj<=1;dj+=1){ if(!di&&!dj) continue; const ii=i+di,jj=j+dj; if(!inBounds(ii,jj)) continue; const q=state.board[ii][jj]; if(!q||colorOf(q)!==turn) push(from,ijToSq(ii,jj)); }
      const row = turn === "w" ? 7 : 0; const enemy = turn === "w" ? "b" : "w";
      if (!inCheck(state, turn)) {
        const g = turn === "w" ? "g1" : "g8"; const f = turn === "w" ? "f1" : "f8";
        if ((turn === "w" ? state.castling.wK : state.castling.bK) && !state.board[row][5] && !state.board[row][6] && !isSquareAttacked(state, f as Square, enemy) && !isSquareAttacked(state, g as Square, enemy)) push(from, g as Square, { special: "castleK" });
        const c = turn === "w" ? "c1" : "c8"; const d = turn === "w" ? "d1" : "d8";
        if ((turn === "w" ? state.castling.wQ : state.castling.bQ) && !state.board[row][3] && !state.board[row][2] && !state.board[row][1] && !isSquareAttacked(state, d as Square, enemy) && !isSquareAttacked(state, c as Square, enemy)) push(from, c as Square, { special: "castleQ" });
      }
    }
  }
  return m;
}

export function genLegalMoves(state: RulesState, fromSq?: Square): RulesMove[] {
  return genPseudo(state, fromSq).filter((move) => !inCheck(makeMove(state, move), state.turn));
}

export function isCheckmate(state: RulesState): boolean { return inCheck(state, state.turn) && genLegalMoves(state).length === 0; }
export function isStalemate(state: RulesState): boolean { return !inCheck(state, state.turn) && genLegalMoves(state).length === 0; }
