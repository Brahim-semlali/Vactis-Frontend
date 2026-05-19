import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { username, logout } = useAuth();

  return (
    <div className="home-page">
      <nav className="top-nav top-nav-end">
        <div className="nav-actions">
          <span className="user-badge">{username ?? 'Utilisateur'}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </nav>

      <main className="hero">
        <h1 className="welcome-title">Bienvenue {username}</h1>
      </main>
    </div>
  );
}
