import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout({ children }) {
  const { username, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
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
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-900 flex flex-row font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* Sidebar */}
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />

      {/* Right Column Container - Single Continuous Document Flow */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f0f2f5]">
        {/* Topbar Header (Défile naturellement avec la page entière vers le haut) */}
        <header className="h-16 px-6 md:px-8 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs shrink-0" style={{ position: 'relative', top: 'auto' }}>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Session Active — VACTIS</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-800 text-xs font-semibold shadow-2xs">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-extrabold shadow-xs">
                {(username || 'U')[0].toUpperCase()}
              </span>
              <span className="font-bold text-slate-700">{username ?? 'Utilisateur'}</span>
            </div>

            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all active:scale-95 shadow-2xs cursor-pointer"
              onClick={logout}
            >
              Déconnexion
            </button>
          </div>
        </header>

        {/* Main Body Content - Scrolls seamlessly with header */}
        <main className="flex-1 p-6 md:p-8 w-full max-w-none bg-[#f0f2f5]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRoute}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {typeof children === 'function' ? children({ activeRoute, navigate }) : children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
