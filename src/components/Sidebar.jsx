import { useEffect, useMemo, useState } from 'react';
import { getMonMenu } from '../api/menu.js';
import { useAuth } from '../context/AuthContext.jsx';
import { MenuIcon } from './icons/MenuIcons.jsx';
import { showcaseLogo } from './AuthLayout.jsx';
const logo = new URL('./icons/logo.png', import.meta.url).href;
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
  const { token, username, userProfile, logout } = useAuth();
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
          <div className={`sidebar-brand-content ${collapsed ? 'sidebar-brand-content--collapsed' : ''}`}>
            <img
              className={`sidebar-brand-logo ${collapsed ? 'sidebar-brand-logo--collapsed' : ''}`}
              src={collapsed ? showcaseLogo : logo}
              alt="VACTIS"
            />
          </div>

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
                        <MenuIcon name={section.icone || section.icon} fallback={section.nom} />
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
                                  <MenuIcon name={item.icon || item.icone} fallback={item.label} />
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
          <div className="sidebar-profile-wrapper">
            {profileMenuOpen && (
              <div className="sidebar-profile-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onNavigate('/parametres');
                    setProfileMenuOpen(false);
                  }}
                  className="sidebar-profile-menu-item flex items-center gap-2"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 dark:text-teal-400">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>Paramètres</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="sidebar-profile-menu-item flex items-center gap-2 text-rose-600 dark:text-rose-400"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
            <button
              type="button"
              className={`sidebar-profile ${profileMenuOpen ? 'sidebar-profile--open' : ''} ${
                activeRoute === '/parametres' || activeRoute === '/settings' ? 'sidebar-profile--active border-teal-500/50 bg-teal-50/50 dark:bg-teal-950/30' : ''
              }`}
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              {userProfile?.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={userProfile.firstName || username || 'Utilisateur'}
                  className="sidebar-profile-avatar object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <span className="sidebar-profile-avatar">
                  {(userProfile?.firstName
                    ? (userProfile.firstName[0] + (userProfile.lastName?.[0] || ''))
                    : (username ?? 'U').slice(0, 2)
                  ).toUpperCase()}
                </span>
              )}
              <span className="sidebar-profile-meta">
                <span className="sidebar-profile-name truncate">
                  {userProfile?.firstName
                    ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
                    : (username ?? 'Utilisateur')}
                </span>
                <span className="sidebar-profile-role">
                  {userProfile?.role || 'Directeur'}
                </span>
              </span>
              <span className="sidebar-profile-arrow" aria-hidden="true">›</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
