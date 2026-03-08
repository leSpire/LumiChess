import { useAppStore } from '../store/appStore';

export function ProfilePage() {
  const { user, progress } = useAppStore();

  return (
    <div className="page-stack">
      <section className="panel">
        <p className="eyebrow">Profil</p>
        <h2>{user?.name ?? 'Compte'}</h2>
        <p className="muted">{user?.guest ? 'Mode invité actif' : user?.email}</p>
      </section>
      <section className="panel-grid">
        <article className="panel"><h3>Niveau</h3><p>{progress.level}</p></article>
        <article className="panel"><h3>XP</h3><p>{progress.xp}</p></article>
        <article className="panel"><h3>Série</h3><p>{progress.streak} jours</p></article>
        <article className="panel"><h3>Leçons terminées</h3><p>{progress.completedLessons}</p></article>
      </section>
    </div>
  );
}
