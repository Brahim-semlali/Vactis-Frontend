import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BellOff,
  CalendarDays,
  CircleCheck,
  Clock,
  Eye,
  Footprints,
  Gauge,
  MessageSquareWarning,
  OctagonAlert,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import { getDashboardDirection } from '../../api/direction.js';
import { getMoisDisponibles } from '../../api/activite.js';
import { getLatestCompletedMonth } from '../../utils/reportingPeriod.js';
import { formatPercent, formatSignedPercent } from '../../utils/indicatorFormatting.js';
import {
  AnimatedValue,
  Carte,
  Delta,
  EASE,
  HeroBadge,
  ICON_TONES,
  Kpi,
  LienDetail,
  PageHero,
  SectionBloc,
  Squelette,
  apparition,
  conteneur,
  fmtCompact,
  fmtEntier,
  fmtMad,
  fmtMadSigne,
  heroButtonClass,
  heroSelectClass,
  libelleMois,
} from '../../components/pilotage/PilotageUI.jsx';

const STATUT_TRAJECTOIRE = {
  'EN AVANCE': { label: 'En avance sur l’objectif', classes: 'bg-emerald-400/20 text-emerald-50 ring-emerald-200/50', icon: TrendingUp },
  'RETARD MODERE': { label: 'Retard modéré', classes: 'bg-amber-400/25 text-amber-50 ring-amber-200/50', icon: Clock },
  'RETARD IMPORTANT': { label: 'Retard important', classes: 'bg-rose-500/30 text-rose-50 ring-rose-200/50', icon: TriangleAlert },
  OBJECTIF_NON_DEFINI: { label: 'Objectif non paramétré', classes: 'bg-white/15 text-white ring-white/30', icon: Target },
};

const SITUATIONS = [
  { key: 'retention', code: 'RETENTION', label: 'Rétention', icon: ShieldAlert, rgb: '244 63 94', chip: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800' },
  { key: 'silence', code: 'SILENCE', label: 'Silence', icon: BellOff, rgb: '245 158 11', chip: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800' },
  { key: 'surveillance', code: 'SURVEILLANCE', label: 'Surveillance', icon: Eye, rgb: '14 165 233', chip: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800' },
];
const SITUATION_PAR_CODE = Object.fromEntries(SITUATIONS.map((s) => [s.code, s]));

// ── Graphiques ───────────────────────────────────────────────────────────────

function InfobulleTendance({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <p className="font-bold text-slate-900 dark:text-white">{libelleMois(label)}</p>
      <p className="mt-1 text-cyan-700 dark:text-cyan-300">CA : <span className="font-bold">{fmtMad(point.ca)}</span></p>
      <p className="text-slate-500 dark:text-slate-400">N-1 : {fmtMad(point.caNMoins1)}</p>
      <p className="text-slate-500 dark:text-slate-400">{fmtEntier(point.cas)} cas</p>
      {point.caNMoins1 > 0 && <div className="mt-1"><Delta value={((point.ca - point.caNMoins1) / point.caNMoins1) * 100} suffix=" vs N-1" /></div>}
    </div>
  );
}

function TendanceChart({ points, moisSelectionne }) {
  const reduce = useReducedMotion();
  return (
    <Carte hover={false} className="h-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Tendance du CA sur 6 mois</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Survolez une barre pour le détail.</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-b from-cyan-400 to-teal-600" />Année en cours</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-300 dark:bg-slate-600" />N-1</span>
        </div>
      </div>
      <div className="mt-4 h-56" role="img" aria-label="Évolution mensuelle du CA comparée à N-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} barGap={4} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="direction-ca" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
            <XAxis dataKey="mois" tickFormatter={(m) => libelleMois(m, false)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={48} />
            <Tooltip content={<InfobulleTendance />} cursor={{ fill: 'rgba(14, 165, 233, 0.06)', radius: 8 }} />
            <Bar dataKey="caNMoins1" name="N-1" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={22} isAnimationActive={!reduce} animationDuration={900} />
            <Bar dataKey="ca" name="Année en cours" fill="url(#direction-ca)" radius={[6, 6, 0, 0]} maxBarSize={22} isAnimationActive={!reduce} animationDuration={1100} animationBegin={150} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {moisSelectionne && <p className="mt-2 text-right text-[11px] text-slate-400">Dernier mois affiché : {libelleMois(moisSelectionne)}</p>}
    </Carte>
  );
}

function AnneauProjection({ projection, objectif }) {
  const reduce = useReducedMotion();
  const ratio = objectif > 0 ? projection / objectif : null;
  const rayon = 52;
  const circonference = 2 * Math.PI * rayon;
  const rempli = ratio == null ? 0 : Math.min(1, ratio);
  const atteint = ratio != null && ratio >= 1;
  return (
    <Carte className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Projection annuelle</p>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${ICON_TONES.indigo}`}><Gauge aria-hidden="true" className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={rayon} fill="none" strokeWidth="10" className="stroke-slate-100 dark:stroke-slate-800" />
            <motion.circle
              cx="60" cy="60" r={rayon} fill="none" strokeWidth="10" strokeLinecap="round"
              className={atteint ? 'stroke-emerald-500' : 'stroke-indigo-500'}
              strokeDasharray={circonference}
              initial={{ strokeDashoffset: reduce ? circonference * (1 - rempli) : circonference }}
              animate={{ strokeDashoffset: circonference * (1 - rempli) }}
              transition={{ duration: 1.3, ease: EASE, delay: 0.2 }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-2xl font-black text-slate-950 dark:text-white">{ratio == null ? '—' : `${Math.round(ratio * 100)} %`}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">de l’objectif</p>
            </div>
          </div>
        </div>
        <p className="text-xl font-black tabular-nums text-slate-950 dark:text-white"><AnimatedValue value={projection} format={fmtMad} /></p>
      </div>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Estimation au rythme moyen observé depuis janvier, ce n’est pas un engagement.
        {objectif ? ` Objectif annuel : ${fmtMad(objectif)}.` : ' Aucun objectif annuel paramétré.'}
      </p>
    </Carte>
  );
}

function BarreExecution({ execution }) {
  const reduce = useReducedMotion();
  const total = Math.max(1, execution.actionsDuCycle ?? 0);
  const segments = [
    { key: 'realisees', label: 'Réalisées', value: execution.visitesVactisRealisees ?? 0, color: 'bg-emerald-500' },
    { key: 'non', label: 'Non réalisées', value: execution.visitesVactisNonRealisees ?? 0, color: 'bg-rose-500' },
    { key: 'sans', label: 'Sans retour terrain', value: execution.actionsSansRetour ?? 0, color: 'bg-slate-300 dark:bg-slate-600' },
  ];
  return (
    <Carte hover={false}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions VACTIS du cycle</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-slate-950 dark:text-white"><AnimatedValue value={execution.actionsDuCycle} format={fmtEntier} /></p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Taux de réalisation</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{formatPercent(execution.tauxRealisation)}</p>
        </div>
      </div>
      <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        {segments.map((s, i) => (
          <motion.div
            key={s.key}
            className={`h-full ${s.color}`}
            initial={{ width: reduce ? `${(s.value / total) * 100}%` : 0 }}
            animate={{ width: `${(s.value / total) * 100}%` }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.15, ease: EASE }}
            title={`${s.label} : ${s.value}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
            {s.label} <span className="font-bold text-slate-900 dark:text-white">{fmtEntier(s.value)}</span>
          </span>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        Une action planifiée n’est pas une visite réalisée. Encore planifiées : <span className="font-bold text-slate-700 dark:text-slate-200">{fmtEntier(execution.actionsPlanifiees)}</span>.
      </p>
    </Carte>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardDirectionPage({ navigate }) {
  const { token } = useAuth();
  const [moisDisponibles, setMoisDisponibles] = useState([]);
  const [mois, setMois] = useState('');
  const [moisPrets, setMoisPrets] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [majLe, setMajLe] = useState(null);

  const goTo = useCallback((route) => {
    if (route && typeof navigate === 'function') navigate(route);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    getMoisDisponibles(token)
      .then((periodes) => {
        if (cancelled) return;
        const liste = Array.isArray(periodes) ? [...periodes].sort().reverse() : [];
        setMoisDisponibles(liste);
        setMois((current) => current || getLatestCompletedMonth(liste));
      })
      .catch(() => { if (!cancelled) setMoisDisponibles([]); })
      // Le dashboard n'est chargé qu'une fois le mois connu (évite un double appel)
      .finally(() => { if (!cancelled) setMoisPrets(true); });
    return () => { cancelled = true; };
  }, [token]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboardDirection(token, { mois }));
      setMajLe(new Date());
    } catch (err) {
      setError(err.message ?? 'Impossible de charger le tableau de bord Direction.');
    } finally {
      setLoading(false);
    }
  }, [token, mois]);

  useEffect(() => {
    if (moisPrets) load();
  }, [load, moisPrets]);

  const t = data?.trajectoire;
  const p = data?.portefeuille;
  const e = data?.execution;
  const statut = STATUT_TRAJECTOIRE[t?.statutTrajectoire] ?? STATUT_TRAJECTOIRE.OBJECTIF_NON_DEFINI;
  const StatutIcon = statut.icon;

  const maxCellule = useMemo(() => Math.max(1, ...(p?.segments ?? []).flatMap((l) => SITUATIONS.map((s) => l[s.key]?.nombre ?? 0))), [p]);
  const maxCaPrioritaire = useMemo(() => Math.max(1, ...(p?.prioritaires ?? []).map((m) => m.caReference ?? 0)), [p]);
  const nbCritiques = (data?.sujets ?? []).filter((s) => s.niveau === 'CRITIQUE').length;

  return (
    <div className="mx-auto max-w-[1700px] space-y-10 pb-16 font-sans text-slate-800 antialiased dark:text-slate-100">
      {/* En-tête */}
      <PageHero
        icon={Activity}
        eyebrow="Pilotage Direction"
        title="Tableau de bord Direction"
        description="Où en sommes-nous par rapport à la cible, quels médecins arbitrer, qu’a réellement fait l’équipe. Le détail reste dans les pages métiers."
        badges={data && (
          <>
            <HeroBadge icon={StatutIcon} className={`font-bold ${statut.classes}`}>{statut.label}</HeroBadge>
            <HeroBadge icon={nbCritiques > 0 ? OctagonAlert : CircleCheck}>
              {nbCritiques > 0 ? `${nbCritiques} sujet(s) critique(s)` : 'Aucun sujet critique'}
            </HeroBadge>
          </>
        )}
        actions={(
          <>
            <div className="flex items-center gap-2">
              <label htmlFor="direction-mois" className="inline-flex items-center gap-1.5 text-xs font-bold text-white/90">
                <CalendarDays aria-hidden="true" className="h-4 w-4" /> Mois
              </label>
              <select
                id="direction-mois"
                value={mois}
                onChange={(event) => setMois(event.target.value)}
                disabled={moisDisponibles.length === 0 || loading}
                className={heroSelectClass}
              >
                {moisDisponibles.length === 0
                  ? <option value="">Dernier mois disponible</option>
                  : moisDisponibles.map((m) => <option key={m} value={m}>{libelleMois(m)}</option>)}
              </select>
              <button type="button" onClick={load} disabled={loading} className={heroButtonClass}>
                <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Chargement…' : 'Rafraîchir'}
              </button>
            </div>
            {majLe && <p className="text-[11px] text-white/80">Mis à jour à {majLe.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>}
          </>
        )}
      />

      {error && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
          <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" /> {error}
        </motion.div>
      )}

      {loading && !data && <Squelette />}

      {data && (
        <div key={data.mois} className="space-y-12">
          {/* A. Résultat et trajectoire */}
          <SectionBloc id="direction-bloc-A" marker="A" accent="teal"
            title="Résultat et trajectoire"
            description={`${libelleMois(data.mois)} · CA = prix à payer du laboratoire complet ; la part portefeuille exclut l’activité non rattachée à un médecin.`}
            action={<LienDetail onClick={() => goTo('/bridge-to-goal')}>Bridge to Goal</LienDetail>}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                icon={Wallet}
                tone="teal"
                label="CA du mois"
                value={t.caMois}
                badge={<Delta value={t.evolutionMoisNMoins1Pct} suffix=" vs N-1" />}
                hint={`${fmtEntier(t.casMois)} cas · portefeuille ${fmtMad(t.caPortefeuilleMois)} · non affecté ${fmtMad(t.caNonAffecteMois)}`}
              />
              <Kpi
                icon={Target}
                tone={t.objectifDefini ? (t.ecartObjectifMois >= 0 ? 'emerald' : 'rose') : 'slate'}
                label="Écart à l’objectif du mois"
                value={t.ecartObjectifMois}
                format={fmtMadSigne}
                display={t.objectifDefini ? undefined : 'Non paramétré'}
                valueClassName={t.objectifDefini ? (t.ecartObjectifMois >= 0 ? '!text-emerald-600 dark:!text-emerald-400' : '!text-rose-600 dark:!text-rose-400') : '!text-slate-400'}
                progress={t.objectifDefini ? t.tauxAtteinteMois : null}
                progressTone={t.tauxAtteinteMois >= 100 ? 'emerald' : 'rose'}
                hint={t.objectifDefini ? `Objectif ${fmtMad(t.objectifMois)} · atteint à ${formatPercent(t.tauxAtteinteMois)}` : 'Définir l’objectif dans Bridge to Goal.'}
              />
              <Kpi
                icon={CalendarDays}
                tone="sky"
                label="CA cumulé depuis janvier"
                value={t.caCumule}
                progress={t.objectifDefini && t.objectifCumuleProratise > 0 ? (t.caCumule / t.objectifCumuleProratise) * 100 : null}
                progressTone={t.ecartObjectifCumule >= 0 ? 'emerald' : 'teal'}
                hint={t.objectifDefini ? `Écart à l’objectif proratisé : ${fmtMadSigne(t.ecartObjectifCumule)}` : 'Objectif proratisé non disponible.'}
              />
              <Kpi
                icon={t.evolutionCumuleNMoins1Pct < 0 ? TrendingDown : TrendingUp}
                tone={t.evolutionCumuleNMoins1Pct < 0 ? 'rose' : 'emerald'}
                label="Évolution vs N-1"
                value={t.evolutionCumuleNMoins1Pct}
                format={formatSignedPercent}
                valueClassName={t.evolutionCumuleNMoins1Pct < 0 ? '!text-rose-600 dark:!text-rose-400' : '!text-emerald-600 dark:!text-emerald-400'}
                hint={`Cumul N-1 même période : ${fmtMad(t.caCumuleNMoins1)} · mois : ${formatSignedPercent(t.evolutionMoisNMoins1Pct)}`}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2"><TendanceChart points={t.tendance ?? []} moisSelectionne={data.mois} /></div>
              <AnneauProjection projection={t.projectionAnnuelle} objectif={t.objectifAnnuel} />
            </div>
          </SectionBloc>

          {/* B. Portefeuille à arbitrer */}
          <SectionBloc id="direction-bloc-B" marker="B" accent="amber"
            title="Portefeuille à arbitrer"
            description="Médecins des segments A et B en rétention, silence ou surveillance. Le CA de référence mesure le poids du portefeuille concerné : ce n’est pas une perte prévisionnelle."
            action={<LienDetail onClick={() => goTo('/medecins')}>Liste des médecins</LienDetail>}
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
              <Carte hover={false} className="xl:col-span-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Répartition par segment</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Nombre de médecins et CA mensuel de référence.</p>
                <div className="mt-4 grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-2 text-xs">
                  <span />
                  {SITUATIONS.map((s) => (
                    <span key={s.key} className="inline-flex items-center justify-center gap-1 font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <s.icon aria-hidden="true" className="h-3.5 w-3.5" /> {s.label}
                    </span>
                  ))}
                  {(p.segments ?? []).map((ligne) => (
                    <div key={ligne.segment} className="contents">
                      <span className="flex items-center pr-2 text-sm font-black text-slate-900 dark:text-white">Segment {ligne.segment}</span>
                      {SITUATIONS.map((s) => {
                        const cellule = ligne[s.key] ?? { nombre: 0, caReference: 0 };
                        const intensite = cellule.nombre > 0 ? 0.12 + 0.5 * (cellule.nombre / maxCellule) : 0;
                        return (
                          <motion.div
                            key={s.key}
                            variants={apparition}
                            whileHover={{ scale: 1.04 }}
                            className="rounded-xl p-3 text-center ring-1 ring-slate-200/80 dark:ring-slate-800"
                            style={{ backgroundColor: cellule.nombre > 0 ? `rgb(${s.rgb} / ${intensite})` : undefined }}
                          >
                            <p className="text-xl font-black text-slate-950 dark:text-white"><AnimatedValue value={cellule.nombre} format={fmtEntier} /></p>
                            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{fmtMad(cellule.caReference)}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Total concerné</span>
                  <span className="font-bold text-slate-900 dark:text-white">{fmtEntier(p.totalMedecins)} médecins · {fmtMad(p.totalCaReference)}</span>
                </div>
              </Carte>

              <Carte hover={false} className="xl:col-span-3">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Liste priorisée</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Par gravité de situation, segment, puis CA de référence.</p>
                {(p.prioritaires ?? []).length === 0 ? (
                  <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    <CircleCheck aria-hidden="true" className="h-8 w-8 text-emerald-500" />
                    Aucun médecin A/B en rétention, silence ou surveillance.
                  </div>
                ) : (
                  <motion.ul variants={conteneur} className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                    {p.prioritaires.map((m) => {
                      const situation = SITUATION_PAR_CODE[m.situation];
                      const initiales = (m.nom ?? '?').split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
                      return (
                        <motion.li key={m.id} variants={apparition} className="flex items-center gap-3 py-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-black text-slate-700 dark:from-slate-800 dark:to-slate-700 dark:text-slate-200">{initiales}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{m.nom}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {m.specialite ?? '—'} · segment {m.segment}{m.joursSansActivite != null ? ` · ${m.joursSansActivite} j sans activité` : ''}
                            </p>
                            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${((m.caReference ?? 0) / maxCaPrioritaire) * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                              />
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${situation?.chip ?? ''}`}>
                              {situation && <situation.icon aria-hidden="true" className="h-3 w-3" />}
                              {situation?.label ?? m.situation}
                            </span>
                            <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">{fmtMad(m.caReference)}</span>
                          </div>
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                )}
              </Carte>
            </div>
          </SectionBloc>

          {/* C. Exécution commerciale */}
          <SectionBloc id="direction-bloc-C" marker="C" accent="sky"
            title="Exécution commerciale"
            description={`Cycle ${libelleMois(e.cycle)}. Tous les chiffres portent sur le même cycle ; les visites libres sont comptées à part.`}
            action={(
              <div className="flex flex-wrap gap-2">
                <LienDetail onClick={() => goTo('/actions')}>Actions</LienDetail>
                <LienDetail onClick={() => goTo('/suivi-equipe')}>Suivi équipe</LienDetail>
              </div>
            )}
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
              <div className="xl:col-span-3"><BarreExecution execution={e} /></div>
              <div className="grid grid-cols-2 gap-4 xl:col-span-2">
                <Kpi icon={CircleCheck} tone="emerald" label="Visites VACTIS réalisées" value={e.visitesVactisRealisees} format={fmtEntier} hint={`Taux : ${formatPercent(e.tauxRealisation)}`} />
                <Kpi icon={Clock} tone={e.actionsEnRetard > 0 ? 'rose' : 'slate'} label="Actions en retard" value={e.actionsEnRetard} format={fmtEntier} hint="Échéance dépassée" valueClassName={e.actionsEnRetard > 0 ? '!text-rose-600 dark:!text-rose-400' : ''} />
                <Kpi icon={Footprints} tone="indigo" label="Visites libres réalisées" value={e.visitesLibresRealisees} format={fmtEntier} hint="Hors actions VACTIS" />
                <Kpi
                  icon={MessageSquareWarning}
                  tone={e.reclamationsEcheanceDepassee > 0 ? 'rose' : 'amber'}
                  label="Réclamations ouvertes"
                  value={e.reclamationsOuvertes}
                  format={fmtEntier}
                  hint={`${fmtEntier(e.reclamationsEcheanceDepassee)} en retard · ${fmtEntier(e.reclamationsSansEcheance)} sans échéance`}
                />
              </div>
            </div>
          </SectionBloc>

          {/* D. Sujets à arbitrer */}
          <SectionBloc id="direction-bloc-D" marker="D" accent="slate" title="Sujets à arbitrer" description="Points qui demandent une décision de la direction, du plus critique au moins critique.">
            {(data.sujets ?? []).length === 0 ? (
              <Carte hover={false} className="flex items-center gap-3 border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40">
                <CircleCheck aria-hidden="true" className="h-6 w-6 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Aucun sujet bloquant ce mois-ci.</p>
              </Carte>
            ) : (
              <motion.ul variants={conteneur} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {data.sujets.map((s) => {
                  const critique = s.niveau === 'CRITIQUE';
                  const Icone = critique ? OctagonAlert : TriangleAlert;
                  return (
                    <motion.li
                      key={`${s.titre}-${s.lien}`}
                      variants={apparition}
                      whileHover={{ y: -2 }}
                      className={`flex items-center gap-4 rounded-2xl border border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900 ${critique ? 'border-rose-200 border-l-rose-500 dark:border-rose-900' : 'border-amber-200 border-l-amber-500 dark:border-amber-900'}`}
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${critique ? ICON_TONES.rose : ICON_TONES.amber}`}>
                        <Icone aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide ${critique ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>{s.niveau}</span>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{s.titre}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.detail}</p>
                      </div>
                      {s.lien && <LienDetail onClick={() => goTo(s.lien)}>Ouvrir</LienDetail>}
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
          </SectionBloc>
        </div>
      )}
    </div>
  );
}
