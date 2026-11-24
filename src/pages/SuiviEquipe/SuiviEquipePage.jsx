import { useCallback, useEffect, useMemo, useState } from 'react';
import EncartClotureCycle from '../../components/alertes/EncartClotureCycle.jsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CalendarDays,
  CircleCheck,
  Clock,
  Footprints,
  MessageSquareWarning,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,

  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getEvolutionMedecin,
  getSuiviCommerciaux,
  getSuiviReclamations,
  getSuiviVisites,
} from '../../api/direction.js';
import { formatSignedPercent } from '../../utils/indicatorFormatting.js';
import {
  Carte,
  EASE,
  HeroBadge,
  Kpi,
  PageHero,
  Progression,
  SectionBloc,
  Squelette,
  Stagger,
  apparition,
  conteneur,
  fmtCompact,
  fmtEntier,
  fmtMad,
  libelleMois,
} from '../../components/pilotage/PilotageUI.jsx';

const TYPES_VISITE = ['FIDELISATION', 'RETENTION', 'PROSPECTION', 'DIAGNOSTIC', 'RECONNAISSANCE', 'URGENCE_SILENCE'];

const QUALIFICATIONS = {
  FAVORABLE: { label: 'Favorable', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800' },
  DEFAVORABLE: { label: 'Défavorable', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-800' },
  NEUTRE: { label: 'Neutre', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700' },
  RECLAMATION: { label: 'Réclamation', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800' },
  CONGE_ABSENCE: { label: 'Congé / absence', dot: 'bg-sky-400', chip: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800' },
  NON_RENSEIGNE: { label: 'Non renseignée', dot: 'bg-slate-300', chip: 'bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700' },
};

const TENDANCES = {
  EN_HAUSSE: { label: 'En hausse', className: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' },
  STABLE: { label: 'Stable', className: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-400' },
  EN_BAISSE: { label: 'En baisse', className: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' },
  NON_OBSERVABLE: { label: 'Non observable', className: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-300' },
};

const AVATAR_COULEURS = [
  'from-teal-400 to-cyan-600', 'from-indigo-400 to-sky-600', 'from-violet-400 to-fuchsia-600',
  'from-amber-400 to-orange-600', 'from-rose-400 to-pink-600', 'from-emerald-400 to-teal-600',
];

function libelle(value) {
  if (!value) return '—';
  return String(value).replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).split('-');
  return d ? `${d}/${m}/${y}` : value;
}

function initiales(nom) {
  return (nom ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
}

function couleurAvatar(nom) {
  const code = [...(nom ?? '')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COULEURS[code % AVATAR_COULEURS.length];
}

function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    cyan: 'bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200 dark:bg-cyan-950 dark:text-cyan-200 dark:ring-cyan-800',
    amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800',
    rose: 'bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800',
    emerald: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${tones[tone]}`}>{children}</span>;
}

function QualifChip({ code }) {
  const q = QUALIFICATIONS[code] ?? QUALIFICATIONS.NON_RENSEIGNE;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${q.chip}`}><span className={`h-1.5 w-1.5 rounded-full ${q.dot}`} />{q.label}</span>;
}

// ── Carte commercial ─────────────────────────────────────────────────────────

function CarteCommercial({ c, actif, onSelect }) {
  const prevues = Math.max(c.actionsPrevues, c.visitesVactis);
  const tauxRealisation = prevues > 0 ? (c.visitesVactis / prevues) * 100 : null;
  const totalQualif = c.qualificationsFavorables + c.qualificationsDefavorables + c.qualificationsNeutres + c.qualificationsNonRenseignees;
  const segmentsQualif = [
    { key: 'fav', value: c.qualificationsFavorables, className: 'bg-emerald-500', label: 'favorables' },
    { key: 'neutre', value: c.qualificationsNeutres + c.qualificationsNonRenseignees, className: 'bg-slate-300 dark:bg-slate-600', label: 'autres' },
    { key: 'defav', value: c.qualificationsDefavorables, className: 'bg-rose-500', label: 'défavorables' },
  ];
  return (
    <Carte className={`!p-4 ${actif ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${couleurAvatar(c.commercial)} text-sm font-black text-white shadow-sm`}>
          {initiales(c.commercial)}
        </span>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onSelect} aria-pressed={actif} className="truncate text-left text-sm font-black text-slate-900 hover:text-indigo-700 dark:text-white dark:hover:text-indigo-300">
            {c.commercial}
          </button>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {fmtEntier(c.medecinsVisites)} médecins · dernière visite {formatDate(c.derniereVisite)}
          </p>
        </div>
        {actif && <Badge tone="cyan">Sélectionné</Badge>}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-800/60">
          <p className="text-lg font-black tabular-nums text-slate-900 dark:text-white">{c.visitesRealisees}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Réalisées</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-800/60">
          <p className="text-lg font-black tabular-nums text-slate-900 dark:text-white">{c.actionsPrevues}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Prévues</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-800/60">
          <p className={`text-lg font-black tabular-nums ${c.visitesNonRealisees > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{c.visitesNonRealisees}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Non réalisées</p>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Actions VACTIS réalisées</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{c.visitesVactis} / {prevues} · {c.visitesLibres} libre(s)</span>
        </div>
        <Progression pourcentage={tauxRealisation ?? 0} tone="indigo" className="" />
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Qualifications</span>
          <span><span className="font-bold text-emerald-600">{c.qualificationsFavorables} fav.</span> · <span className="font-bold text-rose-600">{c.qualificationsDefavorables} défav.</span></span>
        </div>
        <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
          {totalQualif > 0 && segmentsQualif.map((s, i) => (
            <motion.div
              key={s.key}
              className={`h-full ${s.className}`}
              initial={{ width: 0 }}
              animate={{ width: `${(s.value / totalQualif) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: EASE }}
              title={`${s.value} ${s.label}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.actionsEnRetard > 0 && <Badge tone="rose">{c.actionsEnRetard} action(s) en retard</Badge>}
        {c.reclamationsOuvertes > 0 && <Badge tone="amber">{c.reclamationsOuvertes} réclamation(s) ouverte(s)</Badge>}
        {c.actionsEnRetard === 0 && c.reclamationsOuvertes === 0 && <Badge tone="emerald">Rien en attente</Badge>}
      </div>
    </Carte>
  );
}

// ── Historique ───────────────────────────────────────────────────────────────

function FriseVisites({ visites, onMedecin }) {
  return (
    <motion.ol variants={conteneur} initial="hidden" animate="show" className="relative space-y-3 before:absolute before:bottom-2 before:left-[5.25rem] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
      {visites.map((v) => {
        const q = QUALIFICATIONS[v.qualification] ?? QUALIFICATIONS.NON_RENSEIGNE;
        const nonRealisee = v.statutVisite === 'NON_REALISEE';
        return (
          <motion.li key={v.id} variants={apparition} className="relative flex gap-4">
            <div className="w-[4.5rem] shrink-0 pt-3 text-right">
              <p className="text-xs font-bold text-slate-900 dark:text-white">{formatDate(v.dateVisite)}</p>
              <p className="text-[10px] text-slate-400">{v.commercial}</p>
            </div>
            <span className={`relative z-10 mt-4 h-3 w-3 shrink-0 rounded-full ring-4 ring-white dark:ring-slate-900 ${nonRealisee ? 'bg-slate-300' : q.dot}`} />
            <div className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onMedecin(v.medecinId)} className="text-sm font-bold text-indigo-700 hover:underline dark:text-indigo-300">{v.medecinNom}</button>
                <span className="text-xs text-slate-500">{libelle(v.typeVisite)}</span>
                <Badge tone={v.vactis ? 'cyan' : 'slate'}>{v.vactis ? 'VACTIS' : 'Libre'}</Badge>
                {v.visiteRepetee && <Badge tone="amber">Répétée</Badge>}
                {nonRealisee ? <Badge tone="rose">{libelle(v.statutVisite)}</Badge> : <QualifChip code={v.qualification} />}
                {v.reclamation && <Badge tone="rose">Réclamation</Badge>}
              </div>
              {v.motifNonRealisation && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Motif : {v.motifNonRealisation}</p>}
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{v.commentaire || <span className="italic text-slate-400">Pas de commentaire</span>}</p>
              {v.prochaineAction && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Sparkles aria-hidden="true" className="h-3 w-3" /> Prochaine action : {v.prochaineAction}{v.dateProchaineAction ? ` (${formatDate(v.dateProchaineAction)})` : ''}
                </p>
              )}
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}

function ListeReclamations({ reclamations, onMedecin }) {
  return (
    <motion.ul variants={conteneur} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {reclamations.map((r) => (
        <motion.li
          key={r.id}
          variants={apparition}
          className={`rounded-2xl border border-l-4 bg-white p-4 shadow-sm dark:bg-slate-900 ${r.enRetard ? 'border-rose-200 border-l-rose-500 dark:border-rose-900' : r.ouverte ? 'border-amber-200 border-l-amber-500 dark:border-amber-900' : 'border-emerald-200 border-l-emerald-500 dark:border-emerald-900'}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <button type="button" onClick={() => onMedecin(r.medecinId)} className="text-sm font-bold text-indigo-700 hover:underline dark:text-indigo-300">{r.medecinNom}</button>
              <p className="text-[11px] text-slate-500">Déclarée le {formatDate(r.dateDeclaration)} par {r.commercial}</p>
            </div>
            <Badge tone={r.ouverte ? 'amber' : 'emerald'}>{libelle(r.statut)}</Badge>
          </div>
          {r.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{r.description}</p>}
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-400">Catégorie</p>
              <p className="font-bold text-slate-700 dark:text-slate-200">{libelle(r.categorie)}</p>
              <p className="text-slate-500">{libelle(r.priorite)}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-400">Responsable</p>
              <p className="font-bold text-slate-700 dark:text-slate-200">{r.responsable || <span className="font-normal text-slate-400">Non affecté</span>}</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wide text-slate-400">Échéance</p>
              <p className="font-bold text-slate-700 dark:text-slate-200">{r.dateEcheance ? formatDate(r.dateEcheance) : <span className="font-normal text-slate-400">Non définie</span>}</p>
              {r.enRetard && <Badge tone="rose">En retard</Badge>}
            </div>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}

// ── Panneau d'évolution ──────────────────────────────────────────────────────

function GraphiqueEvolution({ mois }) {
  const reduce = useReducedMotion();
  const visitesMois = mois.filter((m) => m.visites > 0).map((m) => m.mois);
  return (
    <div className="h-56" role="img" aria-label="CA mensuel du médecin avec les mois de visite">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={mois} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="suivi-ca" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="#e2e8f0" />
          <XAxis dataKey="mois" tickFormatter={(m) => libelleMois(m, false)} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={44} />
          <Tooltip
            formatter={(value, name) => (name === 'ca' ? [fmtMad(value), 'CA'] : [fmtEntier(value), 'Cas'])}
            labelFormatter={(m) => libelleMois(m)}
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
          />
          {visitesMois.map((m) => <ReferenceLine key={m} x={m} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: 'visite', position: 'top', fontSize: 9, fill: '#d97706' }} />)}
          <Bar dataKey="ca" fill="url(#suivi-ca)" radius={[6, 6, 0, 0]} maxBarSize={20} isAnimationActive={!reduce} animationDuration={900} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function PanneauEvolution({ evolution, loading, error, onClose }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Évolution du médecin"
        onClick={(event) => event.stopPropagation()}
        initial={{ x: reduce ? 0 : '100%' }}
        animate={{ x: 0 }}
        exit={{ x: reduce ? 0 : '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="h-full w-full max-w-4xl overflow-y-auto bg-slate-50 shadow-2xl dark:bg-slate-950"
      >
        <div className="sticky top-0 z-10 bg-gradient-to-br from-slate-800 via-slate-700 to-teal-700 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-base font-black ring-1 ring-white/30">{initiales(evolution?.medecinNom)}</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">Évolution observée après visite</p>
                <h2 className="text-xl font-black">{evolution?.medecinNom ?? 'Médecin'}</h2>
                {evolution && (
                  <p className="text-xs text-white/85">
                    {evolution.specialite ?? '—'} · segment {evolution.segment ?? '—'} · {libelle(evolution.statutActuel)} · données jusqu’à {libelleMois(evolution.dernierMoisDisponible)}
                  </p>
                )}
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/30 transition hover:bg-white/25">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {loading && <Squelette blocs={2} label="Chargement de l’évolution" />}
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}

          {evolution && (
            <Stagger className="space-y-5">
              <motion.p variants={apparition} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {evolution.avertissement}
              </motion.p>

              <Carte hover={false}>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Activité mensuelle</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Les lignes orange marquent les mois avec au moins une visite.</p>
                <div className="mt-3"><GraphiqueEvolution mois={evolution.mois ?? []} /></div>
              </Carte>

              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Comparaison avant / après chaque visite réalisée</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Moyennes mensuelles sur les 3 mois disponibles avant et après le mois de la visite. M+1 et M+3 sont des repères ponctuels.</p>
                {(evolution.comparaisons ?? []).length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Aucune visite réalisée pour ce médecin.</p>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {evolution.comparaisons.map((c) => {
                      const tendance = TENDANCES[c.tendance] ?? TENDANCES.NON_OBSERVABLE;
                      return (
                        <Carte key={c.visiteId} className="!p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-black text-slate-900 dark:text-white">{formatDate(c.dateVisite)}</p>
                              <p className="text-[11px] text-slate-500">{c.commercial}</p>
                            </div>
                            <QualifChip code={c.qualification} />
                          </div>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div className="text-xs">
                              <p className="text-slate-400">CA moyen</p>
                              <p className="font-bold tabular-nums text-slate-800 dark:text-slate-100">{fmtMad(c.caMoyenAvant)} <span className="text-slate-400">→</span> {fmtMad(c.caMoyenApres)}</p>
                              <p className="text-[10px] text-slate-400">{c.moisAvantDisponibles} mois avant · {c.moisApresDisponibles} mois après</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-black tabular-nums ${tendance.className}`}>{formatSignedPercent(c.evolutionCaPct)}</p>
                              <p className={`text-[11px] font-bold ${tendance.className}`}>{tendance.label}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2 text-[11px] dark:bg-slate-800/60">
                            <p><span className="text-slate-400">M+1 :</span> <span className="font-semibold">{c.caMPlus1 == null ? 'n.d.' : fmtMad(c.caMPlus1)}</span></p>
                            <p><span className="text-slate-400">M+3 :</span> <span className="font-semibold">{c.caMPlus3 == null ? 'n.d.' : fmtMad(c.caMPlus3)}</span></p>
                            <p className="col-span-2"><span className="text-slate-400">Statut :</span> <span className="font-semibold">{libelle(c.statutAvant)} → {libelle(c.statutApres)}</span></p>
                          </div>
                          {(c.donneesInsuffisantes || c.visitesRepetees) && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {c.donneesInsuffisantes && <Badge tone="amber">Données insuffisantes</Badge>}
                              {c.visitesRepetees && <Badge tone="cyan">Visites répétées</Badge>}
                            </div>
                          )}
                        </Carte>
                      );
                    })}
                  </div>
                )}
              </div>

              <Carte hover={false}>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Chronologie mensuelle</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                        <th className="py-2 pr-3">Mois</th>
                        <th className="py-2 pr-3 text-right">CA</th>
                        <th className="py-2 pr-3 text-right">Cas</th>
                        <th className="py-2 pr-3">Statut</th>
                        <th className="py-2 text-right">Visites</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(evolution.mois ?? []).map((m) => (
                        <tr key={m.mois} className={`border-t border-slate-100 dark:border-slate-800 ${m.visites > 0 ? 'bg-amber-50/70 dark:bg-amber-950/30' : ''}`}>
                          <td className="py-2 pr-3 font-semibold">{libelleMois(m.mois)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtMad(m.ca)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtEntier(m.cas)}</td>
                          <td className="py-2 pr-3">{m.statut ? libelle(m.statut) : 'n.d.'}</td>
                          <td className="py-2 text-right">{m.visites || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Carte>
            </Stagger>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SuiviEquipePage({ navigate }) {
  const { token } = useAuth();
  const [filters, setFilters] = useState({ debut: '', fin: '', type: '', statut: '' });
  const [commerciaux, setCommerciaux] = useState([]);
  const [selected, setSelected] = useState('');
  const [onglet, setOnglet] = useState('visites');
  const [visites, setVisites] = useState([]);
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evolutionState, setEvolutionState] = useState(null);

  const periode = useMemo(() => ({ debut: filters.debut, fin: filters.fin }), [filters.debut, filters.fin]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSuiviCommerciaux(token, periode)
      .then((liste) => { if (!cancelled) setCommerciaux(Array.isArray(liste) ? liste : []); })
      .catch((err) => { if (!cancelled) setError(err.message ?? 'Erreur de chargement du suivi équipe.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, periode]);

  useEffect(() => {
    let cancelled = false;
    const params = { ...periode, commercial: selected };
    Promise.all([
      getSuiviVisites(token, { ...params, type: filters.type, statut: filters.statut }),
      getSuiviReclamations(token, params),
    ])
      .then(([v, r]) => {
        if (cancelled) return;
        setVisites(Array.isArray(v) ? v : []);
        setReclamations(Array.isArray(r) ? r : []);
      })
      .catch((err) => { if (!cancelled) setError(err.message ?? 'Erreur de chargement de l’historique.'); });
    return () => { cancelled = true; };
  }, [token, periode, selected, filters.type, filters.statut]);

  const ouvrirEvolution = useCallback(async (medecinId) => {
    if (!medecinId) return;
    setEvolutionState({ loading: true, data: null, error: null });
    try {
      const data = await getEvolutionMedecin(token, medecinId);
      setEvolutionState({ loading: false, data, error: null });
    } catch (err) {
      setEvolutionState({ loading: false, data: null, error: err.message ?? 'Erreur de chargement.' });
    }
  }, [token]);

  const fermerEvolution = useCallback(() => setEvolutionState(null), []);

  const totaux = useMemo(() => commerciaux.reduce((acc, c) => ({
    realisees: acc.realisees + c.visitesRealisees,
    nonRealisees: acc.nonRealisees + c.visitesNonRealisees,
    favorables: acc.favorables + c.qualificationsFavorables,
    reclamationsOuvertes: acc.reclamationsOuvertes + c.reclamationsOuvertes,
    libres: acc.libres + c.visitesLibres,
  }), { realisees: 0, nonRealisees: 0, favorables: 0, reclamationsOuvertes: 0, libres: 0 }), [commerciaux]);
  const tauxRealisation = totaux.realisees + totaux.nonRealisees > 0 ? (totaux.realisees / (totaux.realisees + totaux.nonRealisees)) * 100 : null;
  const tauxFavorable = totaux.realisees > 0 ? (totaux.favorables / totaux.realisees) * 100 : null;

  const updateFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  const filtreClass = 'rounded-xl border-0 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm outline-none ring-1 ring-white/40 focus:ring-2 focus:ring-white';
  const filtresActifs = Object.values(filters).some(Boolean);

  return (
    <div className="mx-auto max-w-[1700px] space-y-10 pb-16 font-sans text-slate-800 antialiased dark:text-slate-100">
      <PageHero
        icon={Users}
        eyebrow="Pilotage terrain"
        title="Suivi équipe"
        description="Historique complet par commercial : visites prévues et réalisées, qualifications, commentaires et réclamations. Cliquez sur un médecin pour voir son évolution dans le temps."
        badges={!loading && (
          <>
            <HeroBadge icon={UserRound}>{commerciaux.length} commercial(aux)</HeroBadge>
            <HeroBadge icon={Footprints}>{fmtEntier(totaux.realisees)} visites réalisées</HeroBadge>
            {totaux.reclamationsOuvertes > 0 && <HeroBadge icon={MessageSquareWarning}>{totaux.reclamationsOuvertes} réclamation(s) ouverte(s)</HeroBadge>}
          </>
        )}
      >
        <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur">
          <label className="flex flex-col gap-1 text-[11px] font-bold text-white/90">
            <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" /> Du</span>
            <input type="date" value={filters.debut} onChange={updateFilter('debut')} className={filtreClass} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-white/90">
            <span>au</span>
            <input type="date" value={filters.fin} onChange={updateFilter('fin')} className={filtreClass} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-white/90">
            <span>Type</span>
            <select value={filters.type} onChange={updateFilter('type')} className={filtreClass}>
              <option value="">Tous</option>
              {TYPES_VISITE.map((t) => <option key={t} value={t}>{libelle(t)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-white/90">
            <span>Statut</span>
            <select value={filters.statut} onChange={updateFilter('statut')} className={filtreClass}>
              <option value="">Tous</option>
              <option value="REALISEE">Réalisée</option>
              <option value="NON_REALISEE">Non réalisée</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFilters({ debut: '', fin: '', type: '', statut: '' })}
            disabled={!filtresActifs}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25 disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Tout l’historique
          </button>
        </div>
      </PageHero>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          <TriangleAlert aria-hidden="true" className="h-4 w-4" /> {error}
        </div>
      )}

      <EncartClotureCycle navigate={navigate} />

      {loading ? <Squelette label="Chargement du suivi équipe" /> : (
        <>
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={Footprints} tone="indigo" label="Visites réalisées" value={totaux.realisees} format={fmtEntier} hint={`${fmtEntier(totaux.libres)} visite(s) libre(s) incluse(s)`} />
            <Kpi icon={CircleCheck} tone="emerald" label="Taux de réalisation" value={tauxRealisation} format={(v) => `${Math.round(v)} %`} progress={tauxRealisation} progressTone="emerald" hint={`${fmtEntier(totaux.nonRealisees)} visite(s) non réalisée(s)`} />
            <Kpi icon={Sparkles} tone="teal" label="Visites favorables" value={tauxFavorable} format={(v) => `${Math.round(v)} %`} progress={tauxFavorable} progressTone="teal" hint={`${fmtEntier(totaux.favorables)} qualification(s) favorable(s)`} />
            <Kpi icon={MessageSquareWarning} tone={totaux.reclamationsOuvertes > 0 ? 'amber' : 'slate'} label="Réclamations ouvertes" value={totaux.reclamationsOuvertes} format={fmtEntier} hint="Déclarées par l’équipe" />
          </Stagger>

          <SectionBloc
            id="suivi-commerciaux"
            marker={<Users aria-hidden="true" className="h-4 w-4" />}
            accent="sky"
            title="Commerciaux"
            description="Cliquez sur un nom pour filtrer l’historique sur ce commercial."
          >
            {commerciaux.length === 0 ? (
              <Carte hover={false} className="text-center text-sm text-slate-500">Aucune activité commerciale sur la période.</Carte>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {commerciaux.map((c) => {
                  const actif = selected.toLowerCase() === c.commercial.toLowerCase();
                  return <CarteCommercial key={c.commercial} c={c} actif={actif} onSelect={() => setSelected(actif ? '' : c.commercial)} />;
                })}
              </div>
            )}
          </SectionBloc>
        </>
      )}

      <SectionBloc
        id="suivi-historique"
        marker={<Clock aria-hidden="true" className="h-4 w-4" />}
        accent="violet"
        title={`Historique ${selected ? `de ${selected}` : 'de toute l’équipe'}`}
        description="Visites dans l’ordre chronologique inverse, et réclamations avec responsable et échéance."
        action={(
          <div role="tablist" className="relative flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
            {[['visites', `Visites (${visites.length})`], ['reclamations', `Réclamations (${reclamations.length})`]].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={onglet === key}
                onClick={() => setOnglet(key)}
                className={`relative rounded-lg px-3 py-1.5 transition-colors ${onglet === key ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}
              >
                {onglet === key && <motion.span layoutId="suivi-onglet" className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-slate-900" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div key={onglet} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {onglet === 'visites'
              ? (visites.length === 0 ? <Carte hover={false} className="text-center text-sm text-slate-500">Aucune visite.</Carte> : <FriseVisites visites={visites} onMedecin={ouvrirEvolution} />)
              : (reclamations.length === 0 ? <Carte hover={false} className="text-center text-sm text-slate-500">Aucune réclamation.</Carte> : <ListeReclamations reclamations={reclamations} onMedecin={ouvrirEvolution} />)}
          </motion.div>
        </AnimatePresence>
      </SectionBloc>

      <AnimatePresence>
        {evolutionState && (
          <PanneauEvolution
            evolution={evolutionState.data}
            loading={evolutionState.loading}
            error={evolutionState.error}
            onClose={fermerEvolution}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
