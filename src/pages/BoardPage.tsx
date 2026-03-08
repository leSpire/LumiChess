import { PremiumBoard } from '../components/board/PremiumBoard';

export function BoardPage() {
  return (
    <div className="page-stack">
      <section className="panel">
        <p className="eyebrow">Mode libre</p>
        <h2>Laboratoire stratégique</h2>
        <p className="muted">Analysez des positions, testez vos variantes, et entraînez votre visualisation.</p>
      </section>
      <PremiumBoard />
    </div>
  );
}
