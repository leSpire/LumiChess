import { Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export function DashboardPage() {
  const { progress } = useAppStore();
  return (
    <div className="page-stack">
      <section className="hero">
        <div>
          <p className="eyebrow">Objectif du jour</p>
          <h2>Continuez votre parcours “Finales essentielles”</h2>
          <p className="muted">Un seul focus: convertir les avantages simples avec précision et calme.</p>
          <div className="row">
            <Link to="/learn" className="btn">Reprendre maintenant</Link>
            <Link to="/board" className="btn ghost">Ouvrir l'échiquier</Link>
          </div>
        </div>
        <div className="hero-card">
          <h3>Progression rapide</h3>
          <p>Niveau {progress.level}</p>
          <p>{progress.xp} XP</p>
          <p>{progress.streak} jours de série</p>
        </div>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h3>Focus d'aujourd'hui</h3>
          <p>Technique de l'opposition, triangulation et simplification active.</p>
        </article>
        <article className="panel">
          <h3>À venir</h3>
          <p>Tactiques de contre-jeu • Leçon recommandée: Défense active du roi.</p>
        </article>
      </section>

      <section className="panel">
        <h3>Modules récents</h3>
        <div className="lesson-list">
          {['Forcer les échanges', 'Structure de pions en finale', 'Planifier 3 coups'].map((lesson) => (
            <div key={lesson} className="lesson-card">
              <strong>{lesson}</strong>
              <Link to="/learn">Continuer</Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
