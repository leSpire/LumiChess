import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';

const navItems = [
  { to: '/', label: 'Tableau de bord' },
  { to: '/learn', label: 'Parcours' },
  { to: '/board', label: 'Échiquier' },
  { to: '/profile', label: 'Profil' }
];

export function AppShell() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <div className="logo">LumiChess</div>
          <p className="muted">Plateforme premium d'entraînement stratégique.</p>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="content-wrap">
        <header className="topbar">
          <div>
            <span className="eyebrow">Session active</span>
            <h1>{user?.name ? `Bonjour, ${user.name}` : 'Bienvenue'}</h1>
          </div>
          <div className="topbar-actions">
            <button className="btn ghost" onClick={() => navigate('/learn')}>Reprendre la leçon</button>
            <button className="btn" onClick={() => { setUser(null); navigate('/auth'); }}>Se déconnecter</button>
          </div>
        </header>
        <main className="main"><Outlet /></main>
      </div>
    </div>
  );
}
