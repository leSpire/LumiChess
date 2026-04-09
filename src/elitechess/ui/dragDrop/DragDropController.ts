import type { Square } from "../../core/types.js";
import { BoardRenderer } from "../boardRenderer/BoardRenderer.js";

export class DragDropController {
  private dragState: { from: Square; ghost: HTMLElement } | null = null;

  constructor(private readonly renderer: BoardRenderer) {}

  beginDrag(event: PointerEvent, from: Square): void {
    const origin = (event.target as HTMLElement).closest(".ec-piece") as HTMLElement | null;
    if (!origin) return;

    const ghost = origin.cloneNode(true) as HTMLElement;
    ghost.classList.add("ec-piece-ghost");
    this.renderer.root.appendChild(ghost);
    this.dragState = { from, ghost };
    this.moveGhost(event.clientX, event.clientY);
  }

  moveGhost(clientX: number, clientY: number): void {
    if (!this.dragState) return;
    const rect = this.renderer.root.getBoundingClientRect();
    const size = rect.width / 8;
    this.dragState.ghost.style.transform = `translate(${clientX - rect.left - size / 2}px, ${clientY - rect.top - size / 2}px)`;
  }

  finishDrag(clientX: number, clientY: number): { from: Square; to: Square | null } | null {
    if (!this.dragState) return null;
    const from = this.dragState.from;
    this.dragState.ghost.remove();
    this.dragState = null;
    return { from, to: this.renderer.toSquare(clientX, clientY) };
  }
}
