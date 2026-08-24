import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout({ children }) {
  const { username, logout } = useAuth();
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

  return (
    <div className="app-shell min-h-screen bg-[#f0f2f5] text-slate-900 flex flex-row font-sans antialiased">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-[#f0f2f5]">
        <header className="h-16 px-4 sm:px-6 md:px-8 bg-white border-b border-slate-200 flex items-center justify-between shadow-[0_1px_0_rgba(15,23,42,0.03)] shrink-0">
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
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-[0.18em]">Session Active — VACTIS</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-800 text-xs font-semibold shadow-sm">
              <span className="w-6 h-6 rounded-full bg-[#009B83] text-white flex items-center justify-center text-[10px] font-extrabold shadow-xs">
                {(username || 'U')[0].toUpperCase()}
              </span>
              <span className="font-bold text-slate-700">{username ?? 'Utilisateur'}</span>
            </div>

            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all active:scale-95 shadow-sm cursor-pointer"
              onClick={logout}
            >
              Déconnexion
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 w-full max-w-none bg-[#f0f2f5]">
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
