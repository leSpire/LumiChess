export class MoveList {
    root;
    onSelect = null;
    constructor(root) {
        this.root = root;
        this.root.addEventListener("click", (event) => {
            const target = event.target.closest("button[data-index]");
            if (!target || !this.onSelect)
                return;
            this.onSelect(Number(target.dataset.index));
        });
    }
    bindSelect(cb) {
        this.onSelect = cb;
    }
    render(timeline, currentIndex) {
        this.root.innerHTML = timeline
            .map((move, idx) => `<button class="ec-move ${idx + 1 === currentIndex ? "is-current" : ""}" data-index="${idx + 1}" type="button">${Math.ceil((idx + 1) / 2)}. ${move.san}</button>`)
            .join("");
    }
}
