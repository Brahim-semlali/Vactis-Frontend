/**
 * Kit de design commun aux pages de pilotage (Dashboard Direction, Rapport commercial,
 * Lecture activité, Bridge to Goal, Suivi équipe) : en-tête, sections, cartes animées,
 * chiffres qui défilent, barres de progression.
 * Les animations se déclenchent à l'affichage et sont désactivées si l'utilisateur
 * a demandé de réduire les mouvements (prefers-reduced-motion).
 */
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { formatSignedPercent } from '../../utils/indicatorFormatting.js';

// ── Formatage ────────────────────────────────────────────────────────────────

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function fmtEntier(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  // Espace insécable classique : l'espace fine (U+202F) disparaît avec un interlettrage serré.
  return Math.round(Number(value)).toLocaleString('fr-FR').replace(/ /g, ' ');
}

export function fmtMad(value) {
  return value == null ? '—' : `${fmtEntier(value)} MAD`;
}

export function fmtMadSigne(value) {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${fmtEntier(Math.abs(value))} MAD`;
}

export function fmtCompact(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000).toLocaleString('fr-FR')} k`;
  return String(Math.round(n));
}

export function libelleMois(mois, avecAnnee = true) {
  if (!mois || !/^\d{4}-\d{2}$/.test(mois)) return mois ?? '';
  const [annee, m] = mois.split('-');
  return `${MOIS_COURTS[Number(m) - 1]}${avecAnnee ? ` ${annee}` : ''}`;
}

// ── Thème ────────────────────────────────────────────────────────────────────

export const ICON_TONES = {
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const ACCENTS = {
  teal: { bar: 'from-teal-500 to-cyan-500', badge: 'bg-teal-500' },
  amber: { bar: 'from-amber-500 to-orange-500', badge: 'bg-amber-500' },
  sky: { bar: 'from-sky-500 to-blue-600', badge: 'bg-sky-600' },
  violet: { bar: 'from-violet-500 to-fuchsia-500', badge: 'bg-violet-600' },
  rose: { bar: 'from-rose-500 to-orange-500', badge: 'bg-rose-500' },
  slate: { bar: 'from-slate-700 to-slate-900', badge: 'bg-slate-800' },
};

/** Couleur unique des en-têtes de toutes les pages de pilotage (ardoise foncé → sarcelle). */
export const HERO_GRADIENT = 'bg-gradient-to-br from-slate-800 via-slate-700 to-teal-700';

// ── Animations ───────────────────────────────────────────────────────────────

export const EASE = [0.22, 1, 0.36, 1];
export const conteneur = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
export const apparition = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/** Fait défiler un nombre de 0 jusqu'à sa valeur. */
export function useCountUp(target, duration = 900) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  useEffect(() => {
    if (target == null || !Number.isFinite(Number(target))) return undefined;
    if (reduce || typeof window === 'undefined' || !window.requestAnimationFrame) {
      setValue(target);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Number(target) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, duration, reduce]);
  return value;
}

export function AnimatedValue({ value, format = fmtEntier }) {
  const animated = useCountUp(value);
  if (value == null) return <>—</>;
  return <>{format(animated)}</>;
}

/** Conteneur qui fait apparaître ses enfants `Reveal`/`Carte` en cascade. */
export function Stagger({ as = 'div', className = '', children, ...rest }) {
  const Component = motion[as] ?? motion.div;
  return (
    <Component variants={conteneur} initial="hidden" animate="show" className={className} {...rest}>
      {children}
    </Component>
  );
}

/** Élément qui apparaît en glissant vers le haut (à placer dans un `Stagger`, ou seul). */
export function Reveal({ as = 'div', className = '', standalone = false, children, ...rest }) {
  const Component = motion[as] ?? motion.div;
  const autonome = standalone ? { initial: 'hidden', animate: 'show' } : {};
  return (
    <Component variants={apparition} {...autonome} className={className} {...rest}>
      {children}
    </Component>
  );
}

// ── Briques d'interface ──────────────────────────────────────────────────────

/** En-tête de page en dégradé. */
export function PageHero({ icon: Icon, eyebrow, title, description, badges, actions, children }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`relative overflow-hidden rounded-3xl ${HERO_GRADIENT} p-6 text-white shadow-lg shadow-slate-900/20 sm:p-8`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
      <div aria-hidden="true" className="pilotage-hero-shine pointer-events-none absolute inset-y-0 left-0 w-1/3" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/25">
              {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5" />} {eyebrow}
            </span>
          )}
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          {description && <p className="max-w-2xl text-sm text-white/85">{description}</p>}
          {badges && <div className="flex flex-wrap items-center gap-2 pt-1">{badges}</div>}
        </div>
        {actions && <div className="flex flex-col items-start gap-2 lg:items-end">{actions}</div>}
      </div>
      {children && <div className="relative mt-6">{children}</div>}
    </motion.header>
  );
}

/** Pastille translucide pour l'en-tête. */
export function HeroBadge({ icon: Icon, children, className = 'bg-white/15 text-white ring-white/25' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${className}`}>
      {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

/** Classes communes des contrôles (select, bouton) posés sur l'en-tête en dégradé. */
export const heroSelectClass = 'rounded-xl border-0 bg-white/95 px-3 py-2 text-xs font-bold text-slate-800 shadow-sm outline-none ring-1 ring-white/40 focus:ring-2 focus:ring-white disabled:opacity-60';
export const heroButtonClass = 'inline-flex items-center gap-2 rounded-xl bg-slate-950/90 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-950 disabled:opacity-60';
export const heroGhostButtonClass = 'inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25 disabled:opacity-60';

/** Section titrée avec pastille (lettre ou numéro) et liseré coloré. */
export function SectionBloc({ id, marker, title, description, action, accent = 'teal', children, className = '' }) {
  const theme = ACCENTS[accent] ?? ACCENTS.teal;
  return (
    <motion.section variants={conteneur} initial="hidden" animate="show" className={`space-y-4 ${className}`} aria-labelledby={id}>
      <motion.div variants={apparition} className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          {marker != null && (
            <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black text-white shadow-sm ${theme.badge}`}>{marker}</span>
          )}
          <div>
            <h2 id={id} className="text-lg font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
            {description && <p className="max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
        </div>
        {action}
      </motion.div>
      <motion.div variants={apparition} className={`h-1 w-full rounded-full bg-gradient-to-r ${theme.bar} opacity-80`} />
      {children}
    </motion.section>
  );
}

/** Carte blanche avec léger soulèvement au survol. */
export function Carte({ className = '', children, hover = true, as = 'div', ...rest }) {
  const Component = motion[as] ?? motion.div;
  return (
    <Component
      variants={apparition}
      whileHover={hover ? { y: -3 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function LienDetail({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {children}
      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function Delta({ value, suffix = '' }) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const positif = value >= 0;
  const Icon = positif ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${positif ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
      <Icon aria-hidden="true" className="h-3 w-3" />
      {formatSignedPercent(value)}{suffix}
    </span>
  );
}

export function Progression({ pourcentage, tone = 'teal', className = 'mt-3' }) {
  const reduce = useReducedMotion();
  if (pourcentage == null || !Number.isFinite(Number(pourcentage))) return null;
  const largeur = Math.max(0, Math.min(100, pourcentage));
  const couleur = {
    teal: 'from-teal-500 to-cyan-500',
    rose: 'from-rose-500 to-orange-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-400 to-orange-500',
    indigo: 'from-indigo-500 to-sky-500',
  }[tone] ?? 'from-teal-500 to-cyan-500';
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`} role="progressbar" aria-valuenow={Math.round(pourcentage)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${couleur}`}
        initial={{ width: reduce ? `${largeur}%` : 0 }}
        animate={{ width: `${largeur}%` }}
        transition={{ duration: 1, ease: EASE, delay: 0.25 }}
      />
    </div>
  );
}

/** Carte indicateur : icône, libellé, valeur animée, badge, progression, aide. */
export function Kpi({ icon: Icon, tone = 'teal', label, value, format = fmtMad, display, hint, badge, progress, progressTone, valueClassName = '', className = '' }) {
  return (
    <Carte className={className}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${ICON_TONES[tone] ?? ICON_TONES.slate}`}>
            <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <p className={`mt-1 text-2xl font-black tracking-tight text-slate-950 tabular-nums dark:text-white ${valueClassName}`}>
        {display ?? <AnimatedValue value={value} format={format} />}
      </p>
      {badge && <div className="mt-1.5">{badge}</div>}
      <Progression pourcentage={progress} tone={progressTone} />
      {hint && <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>}
    </Carte>
  );
}

export function Squelette({ blocs = 4, label = 'Chargement' }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={label}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: blocs }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800" />)}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800" />
    </div>
  );
}
