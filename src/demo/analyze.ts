import { LeLiteChessBoard } from "../elitechess/LeliteChessBoard.js";

const boardRoot = document.getElementById("analysisBoard");
const status = document.getElementById("analysisStatus");

if (!boardRoot || !status) {
  throw new Error("Les noeuds #analysisBoard et #analysisStatus sont requis");
}

const board = new LeLiteChessBoard(boardRoot, status);
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

(document.getElementById("flipBtn") as HTMLButtonElement | null)?.addEventListener("click", () => board.flip());
(document.getElementById("resetBtn") as HTMLButtonElement | null)?.addEventListener("click", () => board.setPosition(START));
(document.getElementById("undoBtn") as HTMLButtonElement | null)?.addEventListener("click", () => board.setPosition("r3k2r/8/8/3pP3/8/8/4P3/R3K2R w KQkq d6 0 1"));

(window as Window & { eliteBoard?: LeLiteChessBoard }).eliteBoard = board;
