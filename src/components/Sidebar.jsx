import { useEffect, useMemo, useState } from 'react';
import { getAllMenu } from '../api/menu.js';
import { useAuth } from '../context/AuthContext.jsx';
import { MenuIcon, VactisLogo } from './icons/MenuIcons.jsx';

function sortMenuItems(items) {
  return [...items]
    .filter((item) => item.isVisible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function isRouteActive(activeRoute, itemRoute) {
  if (!itemRoute) return false;
  if (activeRoute === itemRoute) return true;

  const normalizedActive = activeRoute === '' ? '/' : activeRoute;
  const normalizedItem = itemRoute === '' ? '/' : itemRoute;

  if (normalizedActive === normalizedItem) return true;

  if (
    (normalizedActive === '/' || normalizedActive === '/accueil')
    && (normalizedItem === '/' || normalizedItem === '/accueil')
  ) {
    return true;
  }

  return false;
}

export default function Sidebar({ activeRoute, onNavigate, collapsed, onToggleCollapse }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const data = await getAllMenu(token);
        if (!cancelled) {
          setItems(sortMenuItems(data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message ?? 'Erreur de chargement du menu');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const visibleItems = useMemo(() => sortMenuItems(items), [items]);

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="sidebar-logo">
            <VactisLogo />
          </span>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">VACTIS</span>
              <span className="sidebar-brand-tagline">DE LA DONNÉE À L&apos;ACTION TERRAIN</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d={collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="sidebar-body">
        {!collapsed && <p className="sidebar-section-label">PILOTAGE</p>}

        {loading && (
          <div className="sidebar-status">
            {!collapsed && <span className="sidebar-spinner" aria-hidden="true" />}
            {!collapsed && <span>Chargement…</span>}
          </div>
        )}

        {!loading && error && (
          <div className="sidebar-status sidebar-status--error">
            {!collapsed && <span>{error}</span>}
          </div>
        )}

        {!loading && !error && (
          <nav className="sidebar-nav" aria-label="Navigation principale">
            <ul className="sidebar-menu">
              {visibleItems.map((item) => {
                const isActive = isRouteActive(activeRoute, item.route);

                return (
                  <li key={item.idMenu}>
                    <button
                      type="button"
                      className={`sidebar-item${isActive ? ' sidebar-item--active' : ''}`}
                      onClick={() => onNavigate(item.route)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="sidebar-item-indicator" aria-hidden="true" />
                      <span className="sidebar-item-icon">
                        <MenuIcon name={item.icon} />
                      </span>
                      {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </aside>
  );
}
