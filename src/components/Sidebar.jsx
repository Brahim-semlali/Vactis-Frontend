import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getMonMenu } from '../api/menu.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { MenuIcon } from './icons/MenuIcons.jsx';
import { showcaseLogo } from './AuthLayout.jsx';
const logo = new URL('./icons/logo.png', import.meta.url).href;
const logoSombre = new URL('../../public/logoSombre.png', import.meta.url).href;
import { Skeleton } from './ui/skeleton.jsx';

// Courbe « naturelle » : départ rapide, arrivée très douce
const EASE_MENU = [0.32, 0.72, 0, 1];

const LISTE_VARIANTS = {
  ouvert: { transition: { staggerChildren: 0.035, delayChildren: 0.06 } },
  ferme: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};

const ITEM_VARIANTS = {
  ouvert: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  ferme: { opacity: 0, x: -10, transition: { duration: 0.16, ease: 'easeIn' } },
};

const LARGEUR_OUVERTE = 272;
const LARGEUR_REDUITE = 82;
const TRANSITION_BARRE = { duration: 0.42, ease: EASE_MENU };
// Libellés : ils s'effacent vite à la fermeture et réapparaissent une fois la barre élargie
const libelle = (visible) => ({
  animate: { opacity: visible ? 1 : 0, width: visible ? 'auto' : 0 },
  transition: {
    width: TRANSITION_BARRE,
    opacity: visible ? { duration: 0.25, delay: 0.12 } : { duration: 0.12 },
  },
  initial: false,
});

function useEcranBureau() {
  const requete = '(min-width: 768px)';
  const [bureau, setBureau] = useState(
    () => typeof window.matchMedia !== 'function' || window.matchMedia(requete).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(requete);
    const surChangement = () => setBureau(media.matches);
    media.addEventListener('change', surChangement);
    return () => media.removeEventListener('change', surChangement);
  }, []);
  return bureau;
}

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
  const { isDark } = useTheme();
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const bureau = useEcranBureau();

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

  // Le menu du profil se referme quand la barre est réduite
  useEffect(() => {
    if (collapsed) setProfileMenuOpen(false);
  }, [collapsed]);

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

      <motion.aside
        className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}
        aria-label="Sidebar principale"
        initial={false}
        animate={bureau
          ? { width: collapsed ? LARGEUR_REDUITE : LARGEUR_OUVERTE, x: 0 }
          : { width: Math.min(280, window.innerWidth * 0.82), x: mobileOpen ? '0%' : '-108%' }}
        transition={TRANSITION_BARRE}
      >
        <div className="sidebar-brand">
          <div className={`sidebar-brand-content ${collapsed ? 'sidebar-brand-content--collapsed' : ''}`}>
            <motion.img
              key={collapsed ? 'logo-reduit' : `logo-complet-${isDark ? 'sombre' : 'clair'}`}
              className={`sidebar-brand-logo ${collapsed ? 'sidebar-brand-logo--collapsed' : ''}`}
              src={collapsed ? showcaseLogo : (isDark ? logoSombre : logo)}
              alt="VACTIS"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: EASE_MENU }}
            />
          </div>

          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
          >
            <motion.svg
              className="sidebar-collapse-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <path d="M15 6l-6 6 6 6" />
            </motion.svg>
          </button>
        </div>

        <div className="sidebar-body">
          <motion.p
            className="sidebar-label"
            aria-hidden={collapsed}
            initial={false}
            animate={{ opacity: collapsed ? 0 : 1, height: collapsed ? 0 : 'auto' }}
            transition={{ height: TRANSITION_BARRE, opacity: { duration: collapsed ? 0.12 : 0.25, delay: collapsed ? 0 : 0.12 } }}
          >
            NAVIGATION
          </motion.p>

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
                      onClick={() => {
                        if (collapsed) {
                          // En mode réduit les sous-menus sont masqués : on rouvre le menu sur cette section.
                          setOpenSections((current) => new Set(current).add(section.idMenuPrinc));
                          onToggleCollapse?.();
                          return;
                        }
                        toggleSection(section.idMenuPrinc);
                      }}
                      title={collapsed ? section.nom : undefined}
                      className={`menu-section-header ${collapsed ? 'menu-section-header-collapsed' : ''} ${isSectionActive ? 'menu-section-active' : ''}`}
                      aria-expanded={isOpen && !collapsed}
                    >
                      <span className="menu-section-icon">
                        <MenuIcon name={section.icone || section.icon} fallback={section.nom} />
                      </span>
                      <motion.span className="menu-section-title" {...libelle(!collapsed)}>{section.nom}</motion.span>
                      <motion.span
                        className="menu-chevron"
                        aria-hidden="true"
                        initial={false}
                        animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 22, rotate: isOpen ? 180 : 0 }}
                        transition={{ rotate: { duration: 0.32, ease: EASE_MENU }, width: TRANSITION_BARRE, opacity: { duration: 0.2 } }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && !collapsed && (
                        <motion.div
                          key="panneau"
                          className="menu-section-panel"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            height: { duration: 0.36, ease: EASE_MENU },
                            opacity: { duration: 0.24, ease: 'easeOut' },
                          }}
                        >
                          <motion.div
                            className="menu-section-items"
                            variants={LISTE_VARIANTS}
                            initial="ferme"
                            animate="ouvert"
                            exit="ferme"
                          >
                            {sectionItems.map((item) => {
                              const isActive = isRouteActive(activeRoute, item.route);
                              return (
                                <motion.button
                                  key={item.idMenu}
                                  type="button"
                                  variants={ITEM_VARIANTS}
                                  onClick={() => onNavigate(item.route)}
                                  className={`menu-subitem ${isActive ? 'menu-subitem-active' : ''}`}
                                >
                                  <span className="menu-subitem-icon">
                                    <MenuIcon name={item.icon || item.icone} fallback={item.label} />
                                  </span>
                                  <span className="menu-subitem-label">{item.label}</span>
                                </motion.button>
                              );
                            })}
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        <div className="sidebar-profile-wrapper">
            <AnimatePresence>
            {profileMenuOpen && !collapsed && (
              <motion.div
                className="sidebar-profile-menu"
                role="menu"
                style={{ transformOrigin: 'bottom right' }}
                initial={{ opacity: 0, y: 8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
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
              </motion.div>
            )}
            </AnimatePresence>
            <button
              type="button"
              className={`sidebar-profile ${profileMenuOpen ? 'sidebar-profile--open' : ''} ${
                activeRoute === '/parametres' || activeRoute === '/settings' ? 'sidebar-profile--active border-teal-500/50 bg-teal-50/50 dark:bg-teal-950/30' : ''
              }`}
              onClick={() => {
                if (collapsed) {
                  onToggleCollapse?.();
                  return;
                }
                setProfileMenuOpen((open) => !open);
              }}
              title={collapsed ? 'Ouvrir le menu' : undefined}
              aria-expanded={profileMenuOpen && !collapsed}
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
              <motion.span className="sidebar-profile-meta" {...libelle(!collapsed)}>
                <span className="sidebar-profile-name truncate">
                  {userProfile?.firstName
                    ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
                    : (username ?? 'Utilisateur')}
                </span>
                <span className="sidebar-profile-role">
                  {userProfile?.role || 'Directeur'}
                </span>
              </motion.span>
              <motion.span className="sidebar-profile-arrow" aria-hidden="true" {...libelle(!collapsed)}>›</motion.span>
            </button>
          </div>
      </motion.aside>
    </>
  );
}
