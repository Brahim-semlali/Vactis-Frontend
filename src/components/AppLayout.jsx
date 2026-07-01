import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout({ children }) {
  const { username, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [activeRoute, setActiveRoute] = useState(() => window.location.pathname || '/');

  useEffect(() => {
    const handlePopState = () => {
      setActiveRoute(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route) => {
    const nextRoute = route || '/';
    window.history.pushState({}, '', nextRoute);
    setActiveRoute(nextRoute);
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-actions">
            <span className="user-badge user-badge--light">{username ?? 'Utilisateur'}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
              Déconnexion
            </button>
          </div>
        </header>

        <div className="app-content">
          {typeof children === 'function' ? children({ activeRoute, navigate }) : children}
        </div>
      </div>
    </div>
  );
}
