import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout({ children }) {
  const { username, userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState(() => window.location.pathname || '/');

  // Reset scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeRoute]);

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
    setMobileOpen(false);
  };

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim()
    : (username ?? 'Utilisateur');

  const initials = (
    userProfile?.firstName
      ? (userProfile.firstName[0] + (userProfile.lastName?.[0] || ''))
      : (username ?? 'U').slice(0, 2)
  ).toUpperCase();

  return (
    <div className="app-shell min-h-screen bg-[#f0f2f5] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-row font-sans antialiased">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-[#f0f2f5] dark:bg-slate-950">
        <header className="h-16 px-4 sm:px-6 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-[0_1px_0_rgba(15,23,42,0.03)] shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="mobile-sidebar-toggle"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Ouvrir le menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-[0.18em]">
              Session Active — VACTIS
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dark / Light Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shadow-xs"
              aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>

            {/* Profile Button in Header */}
            <button
              type="button"
              onClick={() => navigate('/parametres')}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Accéder à mes paramètres"
            >
              {userProfile?.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={displayName}
                  className="w-6 h-6 rounded-full object-cover shadow-xs border border-slate-300 dark:border-slate-600"
                />
              ) : (
                <span className="w-6 h-6 rounded-full bg-[#009B83] text-white flex items-center justify-center text-[10px] font-extrabold shadow-xs">
                  {initials}
                </span>
              )}
              <span className="font-bold text-slate-700 dark:text-slate-200 max-w-[120px] truncate">{displayName}</span>
            </button>

            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all active:scale-95 shadow-xs cursor-pointer"
              onClick={logout}
            >
              Déconnexion
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 w-full max-w-none bg-[#f0f2f5] dark:bg-slate-950 transition-colors">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRoute}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {typeof children === 'function' ? children({ activeRoute, navigate }) : children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
