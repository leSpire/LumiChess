const { useEffect, useMemo, useRef, useState } = React;
const { AnimatePresence, motion } = Motion;
const { Chess } = chessjs;

function Icon({ children, className = "" }) {
  return <span className={className}>{children}</span>;
}
const ArrowUpDown = (p) => <Icon {...p}>↕</Icon>;
const Copy = (p) => <Icon {...p}>⧉</Icon>;
const Crown = (p) => <Icon {...p}>♛</Icon>;
const RefreshCcw = (p) => <Icon {...p}>↻</Icon>;
const RotateCcw = (p) => <Icon {...p}>↺</Icon>;
const ShieldAlert = (p) => <Icon {...p}>⚠</Icon>;
const Undo2 = (p) => <Icon {...p}>↶</Icon>;
const Card = ({ className = "", children }) => <div className={className}>{children}</div>;
const CardContent = ({ className = "", children }) => <div className={className}>{children}</div>;
const Button = ({ className = "", variant, ...props }) => <button className={className} {...props} />;

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PROMOTION_OPTIONS = ["q", "r", "b", "n"];
const SQ = 12.5;

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function squareTone(fileIndex, rankIndex) {
  return (fileIndex + rankIndex) % 2 === 0 ? "light" : "dark";
}

function fileIndex(file) {
  return FILES.indexOf(file);
}

function squareToVisual(square, orientation) {
  const file = square[0];
  const rank = Number(square[1]);
  const f = fileIndex(file);

  if (orientation === "white") {
    return { x: f, y: 8 - rank };
  }

  return { x: 7 - f, y: rank - 1 };
}

function clientToSquare(clientX, clientY, boardRect, orientation) {
  if (!boardRect) return null;

  const relX = (clientX - boardRect.left) / boardRect.width;
  const relY = (clientY - boardRect.top) / boardRect.height;

  if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;

  const visualX = Math.max(0, Math.min(7, Math.floor(relX * 8)));
  const visualY = Math.max(0, Math.min(7, Math.floor(relY * 8)));

  if (orientation === "white") {
    return `${FILES[visualX]}${8 - visualY}`;
  }

  return `${FILES[7 - visualX]}${visualY + 1}`;
}

function buildSquares(orientation) {
  const squares = [];

  for (let rank = 8; rank >= 1; rank -= 1) {
    for (let f = 0; f < 8; f += 1) {
      const square = `${FILES[f]}${rank}`;
      const visual = squareToVisual(square, orientation);
      squares.push({
        square,
        file: FILES[f],
        rank,
        x: visual.x,
        y: visual.y,
        tone: squareTone(f, rank),
      });
    }
  }

  return squares.sort((a, b) => a.y - b.y || a.x - b.x);
}

function statusText(game) {
  if (game.isCheckmate()) {
    return `Échec et mat · ${game.turn() === "w" ? "Noirs" : "Blancs"} gagnent`;
  }
  if (game.isStalemate()) return "Pat";
  if (game.isThreefoldRepetition()) return "Nulle · triple répétition";
  if (game.isInsufficientMaterial()) return "Nulle · matériel insuffisant";
  if (game.isDraw()) return "Partie nulle";
  if (game.inCheck()) return `Échec · ${game.turn() === "w" ? "aux Blancs" : "aux Noirs"}`;
  return `Au tour des ${game.turn() === "w" ? "Blancs" : "Noirs"}`;
}

function historyRows(game) {
  const moves = game.history({ verbose: true });
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i]?.san || "",
      black: moves[i + 1]?.san || "",
    });
  }
  return rows;
}

function findCheckedKingSquare(game) {
  if (!game.inCheck()) return null;
  const board = game.board();
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const piece = board[y][x];
      if (piece && piece.type === "k" && piece.color === game.turn()) {
        return `${FILES[x]}${8 - y}`;
      }
    }
  }
  return null;
}

function PieceSVG({ type, color }) {
  const pale = color === "w";
  const fill = pale ? "#fff7e4" : "#161616";
  const stroke = pale ? "#3a2a1a" : "#f7d18a";
  const accent = pale ? "#d3a44b" : "#c99737";
  const shadow = pale ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.35)";

  const common = {
    fill,
    stroke,
    strokeWidth: 4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  return (
    <svg viewBox="0 0 100 100" className="h-[84%] w-[84%] drop-shadow-[0_8px_14px_rgba(0,0,0,0.25)]">
      <defs>
        <filter id={`shadow-${type}-${color}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={shadow} />
        </filter>
      </defs>

      <g filter={`url(#shadow-${type}-${color})`}>
        {type === "p" && (
          <>
            <circle cx="50" cy="28" r="12" {...common} />
            <path d="M34 68c2-16 8-26 16-26s14 10 16 26" {...common} />
            <path d="M28 78h44" {...common} />
            <path d="M24 86h52" {...common} />
          </>
        )}
        {type === "r" && (
          <>
            <path d="M28 22h10v10H28zM45 22h10v10H45zM62 22h10v10H62z" {...common} />
            <path d="M30 32h40l-4 36H34z" {...common} />
            <path d="M26 76h48" {...common} />
            <path d="M22 86h56" {...common} />
          </>
        )}
        {type === "n" && (
          <>
            <path d="M64 26c-8 0-14 4-18 10l-8 12 8 4-7 24h31c-1-14-3-27-10-39 7-1 12-5 13-11-2 0-4 0-9 0Z" {...common} />
            <circle cx="60" cy="36" r="2.8" fill={stroke} />
            <path d="M36 78h38" {...common} />
            <path d="M30 86h48" {...common} />
          </>
        )}
        {type === "b" && (
          <>
            <path d="M50 16c6 0 10 5 10 11s-4 11-10 11-10-5-10-11 4-11 10-11Z" {...common} />
            <path d="M50 38l12 14-12 22-12-22 12-14Z" {...common} />
            <path d="M46 22l8 10" stroke={accent} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M32 78h36" {...common} />
            <path d="M26 86h48" {...common} />
          </>
        )}
        {type === "q" && (
          <>
            <circle cx="28" cy="24" r="6" {...common} />
            <circle cx="50" cy="18" r="6" {...common} />
            <circle cx="72" cy="24" r="6" {...common} />
            <path d="M24 30l10 34h32l10-34-16 12-10-14-10 14Z" {...common} />
            <path d="M26 76h48" {...common} />
            <path d="M22 86h56" {...common} />
          </>
        )}
        {type === "k" && (
          <>
            <path d="M50 14v18M42 22h16" stroke={accent} strokeWidth="4" strokeLinecap="round" />
            <path d="M36 32c0-7 6-12 14-12s14 5 14 12c0 4-2 8-5 10l7 22H34l7-22c-3-2-5-6-5-10Z" {...common} />
            <path d="M30 76h40" {...common} />
            <path d="M24 86h52" {...common} />
          </>
        )}
      </g>
    </svg>
  );
}

function PromotionModal({ color, onSelect, onClose }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} className="w-[92%] max-w-sm rounded-[1.8rem] border border-white/10 bg-zinc-950/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-3"><div className="rounded-2xl bg-amber-400/15 p-2 text-amber-300"><Crown className="h-5 w-5" /></div><div><p className="text-sm text-zinc-400">Promotion</p><h3 className="text-lg font-semibold text-white">Choisis la pièce</h3></div></div>
        <div className="grid grid-cols-4 gap-3">{PROMOTION_OPTIONS.map((option) => (<button key={option} onClick={() => onSelect(option)} className="flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 transition hover:scale-[1.03] hover:bg-zinc-800"><PieceSVG type={option} color={color} /></button>))}</div>
        <button onClick={onClose} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/10">Annuler</button>
      </motion.div>
    </div>
  );
}

function LumiChessPrimeBoard() {
  const [game, setGame] = useState(() => new Chess());
  const [orientation, setOrientation] = useState("white");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [promotionRequest, setPromotionRequest] = useState(null);
  const [fenCopied, setFenCopied] = useState(false);
  const [drag, setDrag] = useState(null);
  const boardRef = useRef(null);

  const squares = useMemo(() => buildSquares(orientation), [orientation]);
  const movesTable = useMemo(() => historyRows(game), [game]);
  const checkedKingSquare = useMemo(() => findCheckedKingSquare(game), [game]);
  const status = useMemo(() => statusText(game), [game]);
  const boardPieces = useMemo(() => { const board = game.board(); const counters = {}; const result = []; for (let y = 0; y < 8; y += 1) { for (let x = 0; x < 8; x += 1) { const piece = board[y][x]; if (!piece) continue; const square = `${FILES[x]}${8 - y}`; const idBase = `${piece.color}${piece.type}`; counters[idBase] = (counters[idBase] || 0) + 1; result.push({ key: `${idBase}-${counters[idBase]}`, square, piece, ...squareToVisual(square, orientation) }); } } return result; }, [game, orientation]);

  useEffect(() => { if (!fenCopied) return undefined; const timer = setTimeout(() => setFenCopied(false), 1400); return () => clearTimeout(timer); }, [fenCopied]);
  useEffect(() => {
    if (!drag) return undefined;
    function onPointerMove(event) { const rect = boardRef.current?.getBoundingClientRect(); if (!rect) return; setDrag((current) => current ? { ...current, px: event.clientX - rect.left, py: event.clientY - rect.top, hoverSquare: clientToSquare(event.clientX, event.clientY, rect, orientation) } : current); }
    function onPointerUp(event) {
      const rect = boardRef.current?.getBoundingClientRect(); const targetSquare = rect ? clientToSquare(event.clientX, event.clientY, rect, orientation) : null; const distance = Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY); const wasClick = distance < 6;
      if (wasClick) { chooseSquare(drag.from); setDrag(null); return; }
      if (!targetSquare) { setDrag(null); return; }
      const candidate = legalMoves.find((move) => move.to === targetSquare);
      if (!candidate) { setDrag(null); return; }
      if (candidate.flags.includes("p")) { setPromotionRequest({ from: drag.from, to: targetSquare, color: candidate.color }); setDrag(null); return; }
      applyMove(drag.from, targetSquare); setDrag(null);
    }
    window.addEventListener("pointermove", onPointerMove); window.addEventListener("pointerup", onPointerUp);
    return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); };
  }, [drag, legalMoves, orientation]);

  function clearSelection() { setSelectedSquare(null); setLegalMoves([]); }
  function pieceAt(square) { return game.get(square); }
  function getLegalMoves(square) { return game.moves({ square, verbose: true }) || []; }
  function chooseSquare(square) { const piece = pieceAt(square); if (selectedSquare && legalMoves.some((move) => move.to === square)) { const candidate = legalMoves.find((move) => move.to === square); if (candidate?.flags?.includes("p")) { setPromotionRequest({ from: selectedSquare, to: square, color: candidate.color }); return; } applyMove(selectedSquare, square); return; } if (!piece || piece.color !== game.turn()) { clearSelection(); return; } setSelectedSquare(square); setLegalMoves(getLegalMoves(square)); }
  function applyMove(from, to, promotion) { const next = new Chess(game.fen()); const move = next.move({ from, to, promotion }); if (!move) return false; setGame(next); setLastMove(move); setPromotionRequest(null); clearSelection(); return true; }
  function handlePiecePointerDown(event, square) { const piece = pieceAt(square); if (!piece || piece.color !== game.turn()) return; const rect = boardRef.current?.getBoundingClientRect(); if (!rect) return; setSelectedSquare(square); setLegalMoves(getLegalMoves(square)); setDrag({ from: square, piece, px: event.clientX - rect.left, py: event.clientY - rect.top, startClientX: event.clientX, startClientY: event.clientY, hoverSquare: square }); event.preventDefault(); }
  function resetGame() { const next = new Chess(); setGame(next); setLastMove(null); clearSelection(); setPromotionRequest(null); setDrag(null); }
  function undoMove() { const next = new Chess(game.fen()); const undone = next.undo(); if (!undone) return; const hist = next.history({ verbose: true }); setGame(next); setLastMove(hist[hist.length - 1] || null); clearSelection(); setPromotionRequest(null); setDrag(null); }
  async function copyFen() { try { await navigator.clipboard.writeText(game.fen()); setFenCopied(true);} catch {} }

  const legalDestinations = new Set(legalMoves.map((move) => move.to));
  const hiddenDraggedSquare = drag?.from || null;

  return <div style={{padding:"20px", background:"#0a0a0a", color:"#fff", minHeight:"100vh"}}><div className="relative mx-auto w-full max-w-[860px]"><div className="relative rounded-[2rem] border border-white/10 bg-[#171717] p-3 sm:p-4"><div ref={boardRef} className="relative aspect-square w-full overflow-hidden rounded-[1.6rem] border border-white/10 bg-zinc-900 select-none touch-none"><div className="absolute inset-0">{squares.map((cell) => { const isLast = lastMove && (lastMove.from === cell.square || lastMove.to === cell.square); const isSelected = selectedSquare === cell.square; const isCheck = checkedKingSquare === cell.square; const isLegal = legalDestinations.has(cell.square); const occupant = pieceAt(cell.square); const showRank = orientation === "white" ? cell.file === "a" : cell.file === "h"; const showFile = orientation === "white" ? cell.rank === 1 : cell.rank === 8; return <button key={cell.square} type="button" onClick={() => chooseSquare(cell.square)} className={cn("absolute outline-none", cell.tone === "light" ? "bg-[#eed9b7]" : "bg-[#b88a63]")} style={{left:`${cell.x*SQ}%`, top:`${cell.y*SQ}%`, width:`${SQ}%`, height:`${SQ}%`}}>{isLast&&<div className="pointer-events-none absolute inset-0 bg-amber-300/25"/>}{isSelected&&<div className="pointer-events-none absolute inset-[5%] rounded-[18%] ring-4 ring-amber-300/85"/>}{isCheck&&<div className="pointer-events-none absolute inset-[7%] rounded-[18%] bg-red-500/35 ring-2 ring-red-300/70"/>}{isLegal&&!occupant&&(<div className="pointer-events-none absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950/28" />)}{isLegal&&occupant&&(<div className="pointer-events-none absolute inset-[8%] rounded-full border-[5px] border-zinc-950/30" />)}{showRank&&<span className={cn("pointer-events-none absolute left-[8%] top-[7%] text-[10px] font-bold sm:text-xs", cell.tone === "light" ? "text-[#86552d]" : "text-[#f4e2c2]")}>{cell.rank}</span>}{showFile&&<span className={cn("pointer-events-none absolute bottom-[7%] right-[8%] text-[10px] font-bold sm:text-xs", cell.tone === "light" ? "text-[#86552d]" : "text-[#f4e2c2]")}>{cell.file}</span>}</button>;})}</div><div className="pointer-events-none absolute inset-0 z-20">{boardPieces.map((entry)=>{const isDragged=hiddenDraggedSquare===entry.square;if(isDragged) return null; return <motion.div key={entry.key} layout transition={{type:"spring", stiffness:420, damping:32, mass:0.7}} className="absolute flex items-center justify-center" style={{left:`${entry.x*SQ}%`, top:`${entry.y*SQ}%`, width:`${SQ}%`, height:`${SQ}%`}}><div className={cn("pointer-events-auto flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing", entry.piece.color===game.turn()?"":"cursor-default")} onPointerDown={(event)=>handlePiecePointerDown(event, entry.square)}><PieceSVG type={entry.piece.type} color={entry.piece.color} /></div></motion.div>})}</div>{drag&&<div className="pointer-events-none absolute inset-0 z-40 overflow-visible"><div className="absolute flex items-center justify-center" style={{left:drag.px, top:drag.py, width:`${SQ}%`, height:`${SQ}%`, transform:"translate(-50%, -50%) scale(1.08)", filter:"drop-shadow(0 14px 18px rgba(0,0,0,0.34))"}}><PieceSVG type={drag.piece.type} color={drag.piece.color} /></div></div>}</div></div><div style={{display:"flex", gap:"8px", marginTop:"12px"}}><Button onClick={undoMove}>Undo</Button><Button onClick={()=>setOrientation((value)=>(value==="white"?"black":"white"))}>Flip</Button><Button onClick={resetGame}>Nouvelle partie</Button><Button onClick={copyFen}>FEN</Button><span>{status}</span></div><AnimatePresence>{promotionRequest&&<PromotionModal color={promotionRequest.color} onSelect={(piece)=>applyMove(promotionRequest.from,promotionRequest.to,piece)} onClose={()=>{setPromotionRequest(null);clearSelection();}}/>}</AnimatePresence></div></div>;
}

const root = ReactDOM.createRoot(document.getElementById("prime-root"));
root.render(<LumiChessPrimeBoard />);
