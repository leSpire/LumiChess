export class CoachMarks {
  constructor(private readonly root: HTMLElement) {}

  showEmptyState(message: string): void {
    this.root.textContent = message;
  }
}
