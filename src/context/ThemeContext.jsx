import { createContext, useContext, useEffect, useRef, useState } from 'react';

const THEME_KEY = 'stagelabo_theme';
const DUREE_REVELATION = 600;
const EASE_REVELATION = 'cubic-bezier(0.32, 0.72, 0, 1)';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

function appliquerTheme(theme) {
  const root = document.documentElement;
  const sombre = theme === 'dark';
  root.classList.toggle('dark', sombre);
  document.body.classList.toggle('dark', sombre);
  root.setAttribute('data-theme', sombre ? 'dark' : 'light');
}

function animationsReduites() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Point de départ de l'effet : le clic (bouton soleil/lune) ou, à défaut, le coin haut droit. */
function origine(evenement) {
  const x = typeof evenement?.clientX === 'number' && evenement.clientX > 0 ? evenement.clientX : window.innerWidth - 48;
  const y = typeof evenement?.clientY === 'number' && evenement.clientY > 0 ? evenement.clientY : 32;
  return { x, y };
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const premierRendu = useRef(true);
  // Vrai pendant un changement animé par la View Transitions API : pas de fondu CSS en double
  const revelationEnCours = useRef(false);
  // Résout la capture du nouveau thème une fois que React a affiché le changement
  const finRendu = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    let fin;
    // Fondu des couleurs quand la View Transitions API n'est pas disponible (pas au premier affichage)
    if (!premierRendu.current && !revelationEnCours.current) {
      root.classList.add('theme-switching');
      fin = window.setTimeout(() => root.classList.remove('theme-switching'), 450);
    }
    premierRendu.current = false;

    appliquerTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
    finRendu.current?.();
    finRendu.current = null;
    return () => window.clearTimeout(fin);
  }, [theme]);

  const changerTheme = (suivant, evenement) => {
    if (suivant !== 'dark' && suivant !== 'light') return;
    if (suivant === theme) return;

    // Navigateurs sans View Transitions (Firefox, Safari ancien) : fondu des couleurs
    if (typeof document.startViewTransition !== 'function') {
      setThemeState(suivant);
      return;
    }

    const { x, y } = origine(evenement);
    const rayon = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const reduit = animationsReduites();

    revelationEnCours.current = true;
    const transition = document.startViewTransition(() => new Promise((resolve) => {
      finRendu.current = resolve;
      appliquerTheme(suivant);
      setThemeState(suivant);
      window.setTimeout(resolve, 300); // filet de sécurité si le rendu tarde
    }));

    transition.ready
      .then(() => {
        // Le nouveau thème s'étend en cercle depuis le bouton ; fondu simple si les animations sont réduites
        document.documentElement.animate(
          reduit
            ? { opacity: [0, 1] }
            : { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rayon}px at ${x}px ${y}px)`] },
          {
            duration: reduit ? 260 : DUREE_REVELATION,
            easing: EASE_REVELATION,
            pseudoElement: '::view-transition-new(root)',
          },
        );
      })
      .catch(() => {});
    transition.finished.finally(() => {
      revelationEnCours.current = false;
    });
  };

  const setTheme = (newTheme, evenement) => changerTheme(newTheme, evenement);

  const toggleTheme = (evenement) => changerTheme(theme === 'dark' ? 'light' : 'dark', evenement);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
