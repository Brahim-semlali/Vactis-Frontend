import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { getAllMenu } from '../api/menu.js';
import { useAuth } from '../context/AuthContext.jsx';
import { MenuIcon, VactisLogo } from './icons/MenuIcons.jsx';
import { Skeleton } from './ui/skeleton.jsx';

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
    (normalizedActive === '/' || normalizedActive === '/accueil') &&
    (normalizedItem === '/' || normalizedItem === '/accueil')
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
    <aside
      className={`sidebar flex flex-col h-screen bg-white border-r border-slate-200/80 sticky top-0 z-40 transition-all duration-300 shadow-xs ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Header / Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 bg-white">
        {!collapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="text-teal-700 p-1.5 bg-teal-50 rounded-xl shrink-0 shadow-2xs">
              <VactisLogo size={22} />
            </div>
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-slate-900 text-sm tracking-tight leading-none">VACTIS</span>
              <span className="text-[9px] font-bold text-teal-700 tracking-wider truncate pt-1">
                DE LA DONNÉE À L&apos;ACTION
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center text-teal-700">
            <VactisLogo size={24} />
          </div>
        )}

        <button
          type="button"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none shrink-0"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} />
          </svg>
        </button>
      </div>

      {/* Body / Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            PILOTAGE TERRAIN
          </p>
        )}

        {loading && (
          <div className="space-y-2 px-1">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 rounded-xl">
            {!collapsed && <span>{error}</span>}
          </div>
        )}

        {!loading && !error && (
          <nav className="space-y-1" aria-label="Navigation principale">
            {visibleItems.map((item) => {
              const isActive = isRouteActive(activeRoute, item.route);

              return (
                <button
                  key={item.idMenu}
                  type="button"
                  onClick={() => onNavigate(item.route)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative group ${
                    collapsed ? 'justify-center px-0' : 'justify-start'
                  } ${
                    isActive
                      ? 'bg-emerald-100/90 text-emerald-900 font-extrabold border-l-4 border-emerald-500 shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/80 font-medium'
                  }`}
                >
                  {/* Indicator border in expanded mode */}
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full" />
                  )}

                  <span
                    className={`p-1 rounded-lg transition-colors shrink-0 ${
                      isActive
                        ? 'text-emerald-700 bg-emerald-200/60'
                        : 'text-slate-400 group-hover:text-emerald-600'
                    }`}
                  >
                    <MenuIcon name={item.icon} />
                  </span>

                  {!collapsed && (
                    <span className="text-[13px] tracking-tight truncate leading-none">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </aside>
  );
}
