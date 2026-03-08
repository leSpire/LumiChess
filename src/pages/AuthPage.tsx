import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export function AuthPage() {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      setError('Veuillez compléter les champs.');
      return;
    }
    setUser({ name, email, guest: false });
    navigate('/');
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Connexion</p>
        <h1>Bienvenue sur LumiChess</h1>
        <label>Nom<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">Continuer</button>
        <button type="button" className="btn ghost" onClick={() => { setUser({ name: 'Invité', email: '', guest: true }); navigate('/'); }}>
          Continuer en invité
        </button>
      </form>
    </div>
  );
}
