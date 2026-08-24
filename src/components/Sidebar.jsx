import { useEffect, useMemo, useState } from 'react';
import { getMonMenu } from '../api/menu.js';
import { useAuth } from '../context/AuthContext.jsx';
import { MenuIcon, VactisLogo } from './icons/MenuIcons.jsx';
import { Skeleton } from './ui/skeleton.jsx';

function isRouteActive(activeRoute, itemRoute) {
  if (!itemRoute) return false;
  if (activeRoute === itemRoute) return true;

  const normalizedActive = activeRoute === '' ? '/' : activeRoute;
  const normalizedItem = itemRoute === '' ? '/' : itemRoute;

  if (normalizedActive === normalizedItem) return true;

  if (
    (normalizedActive === '/' || normalizedActive === '/accueil') &&
    (normalizedItem === '/' || normalizedItem === '/accueil')
  ) {
    return true;
  }

  return false;
}

export default function Sidebar({ activeRoute, onNavigate, collapsed, onToggleCollapse, mobileOpen = false, onMobileClose }) {
  const { token, username } = useAuth();
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const data = await getMonMenu(token);
        if (!cancelled) {
          setMenu(data);
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

  const activeSection = useMemo(
    () => menu.find((section) => section.sousMenus?.some((item) => isRouteActive(activeRoute, item.route)))?.idMenuPrinc,
    [activeRoute, menu],
  );
  const [openSections, setOpenSections] = useState(new Set());

  const getSectionTone = (name) => {
    const key = String(name ?? '').toLowerCase();
    if (key.includes('pilotage')) return 'pilotage';
    if (key.includes('portefeuille')) return 'medecins';
    if (key.includes('terrain')) return 'actions';
    if (key.includes('qualite')) return 'qualite';
    return 'administration';
  };

  useEffect(() => {
    if (activeSection == null) return;
    setOpenSections((current) => new Set(current).add(activeSection));
  }, [activeSection]);

  const toggleSection = (sectionId) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'is-visible' : ''}`}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      <aside
        className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}
        aria-label="Sidebar principale"
      >
        <div className="sidebar-brand">
          {!collapsed ? (
            <div className="sidebar-brand-content">
              <div className="sidebar-brand-mark">
                <VactisLogo size={22} />
              </div>
              <div className="sidebar-brand-copy">
                <span className="sidebar-brand-name">VACTIS</span>
                <span className="sidebar-brand-subtitle">DE LA DONNÉE À L&apos;ACTION</span>
              </div>
            </div>
          ) : (
            <div className="sidebar-brand-collapsed">
              <VactisLogo size={24} />
            </div>
          )}

          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} />
            </svg>
          </button>
        </div>

        <div className="sidebar-body">
          {!collapsed && <p className="sidebar-label">NAVIGATION</p>}

          {loading && (
            <div className="sidebar-skeletons">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="sidebar-error">
              {!collapsed && <span>{error}</span>}
            </div>
          )}

          {!loading && !error && (
            <nav className="sidebar-nav" aria-label="Navigation principale">
              {menu.map((section) => {
                const isOpen = openSections.has(section.idMenuPrinc);
                const isSectionActive = section.idMenuPrinc === activeSection;
                const sectionItems = section.sousMenus ?? [];

                return (
                  <div key={section.idMenuPrinc} className={`menu-section menu-section--${getSectionTone(section.nom)}`}>
                    <button
                      type="button"
                      onClick={() => toggleSection(section.idMenuPrinc)}
                      title={collapsed ? section.nom : undefined}
                      className={`menu-section-header ${collapsed ? 'menu-section-header-collapsed' : ''} ${isSectionActive ? 'menu-section-active' : ''}`}
                      aria-expanded={isOpen}
                    >
                      <span className="menu-section-icon">
                        <MenuIcon name={section.icone || section.icon || section.nom} />
                      </span>
                      {!collapsed && <span className="menu-section-title">{section.nom}</span>}
                      {!collapsed && (
                        <span className={`menu-chevron ${isOpen ? 'menu-chevron-open' : ''}`} aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </span>
                      )}
                    </button>

                    {!collapsed && (
                      <div className={`menu-section-content ${isOpen ? 'menu-section-content-open' : ''}`}>
                        <div className="menu-section-items">
                          {sectionItems.map((item) => {
                            const isActive = isRouteActive(activeRoute, item.route);
                            return (
                              <button
                                key={item.idMenu}
                                type="button"
                                onClick={() => onNavigate(item.route)}
                                className={`menu-subitem ${isActive ? 'menu-subitem-active' : ''}`}
                              >
                                <span className="menu-subitem-icon">
                                  <MenuIcon name={item.icon || item.icone || item.label} />
                                </span>
                                <span className="menu-subitem-label">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {!collapsed && (
          <div className="sidebar-profile" role="button" tabIndex={0}>
            <div className="sidebar-profile-avatar">{String(username ?? 'U').slice(0, 2).toUpperCase()}</div>
            <div className="sidebar-profile-meta">
              <p className="sidebar-profile-name">{username ?? 'Utilisateur'}</p>
              <p className="sidebar-profile-role">Directeur</p>
            </div>
            <span className="sidebar-profile-arrow" aria-hidden="true">›</span>
          </div>
        )}
      </aside>
    </>
  );
}
