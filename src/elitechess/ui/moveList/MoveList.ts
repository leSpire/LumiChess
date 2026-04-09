import type { MoveNode } from "../../core/types.js";

export class MoveList {
  private onSelect: ((index: number) => void) | null = null;

  constructor(private readonly root: HTMLElement) {
    this.root.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest("button[data-index]") as HTMLButtonElement | null;
      if (!target || !this.onSelect) return;
      this.onSelect(Number(target.dataset.index));
    });
  }

  bindSelect(cb: (index: number) => void): void {
    this.onSelect = cb;
  }

  render(timeline: MoveNode[], currentIndex: number): void {
    this.root.innerHTML = timeline
      .map((move, idx) => `<button class="ec-move ${idx + 1 === currentIndex ? "is-current" : ""}" data-index="${idx + 1}" type="button">${Math.ceil((idx + 1) / 2)}. ${move.san}</button>`)
      .join("");
  }
}
