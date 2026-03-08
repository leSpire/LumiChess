import { PremiumBoard } from '../components/board/PremiumBoard';
import { useAppStore } from '../store/appStore';

export function LearnPage() {
  const { completeLesson } = useAppStore();
  return (
    <div className="page-stack">
      <section className="learn-header panel">
        <div>
          <p className="eyebrow">Leçon active · Chapitre 4</p>
          <h2>Créer un zugzwang en finale de roi et pion</h2>
          <p className="muted">Suivez les indications, validez la séquence puis passez au chapitre suivant.</p>
        </div>
        <button className="btn" onClick={completeLesson}>Marquer comme terminé</button>
      </section>
      <PremiumBoard />
    </div>
  );
}
