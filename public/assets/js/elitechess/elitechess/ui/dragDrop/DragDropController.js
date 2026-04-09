export class DragDropController {
    renderer;
    dragState = null;
    constructor(renderer) {
        this.renderer = renderer;
    }
    beginDrag(event, from) {
        const origin = event.target.closest(".ec-piece");
        if (!origin)
            return;
        const ghost = origin.cloneNode(true);
        ghost.classList.add("ec-piece-ghost");
        this.renderer.root.appendChild(ghost);
        this.dragState = { from, ghost };
        this.moveGhost(event.clientX, event.clientY);
    }
    moveGhost(clientX, clientY) {
        if (!this.dragState)
            return;
        const rect = this.renderer.root.getBoundingClientRect();
        const size = rect.width / 8;
        this.dragState.ghost.style.transform = `translate(${clientX - rect.left - size / 2}px, ${clientY - rect.top - size / 2}px)`;
    }
    finishDrag(clientX, clientY) {
        if (!this.dragState)
            return null;
        const from = this.dragState.from;
        this.dragState.ghost.remove();
        this.dragState = null;
        return { from, to: this.renderer.toSquare(clientX, clientY) };
    }
}
