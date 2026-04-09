export class CoachMarks {
    root;
    constructor(root) {
        this.root = root;
    }
    showEmptyState(message) {
        this.root.textContent = message;
    }
}
