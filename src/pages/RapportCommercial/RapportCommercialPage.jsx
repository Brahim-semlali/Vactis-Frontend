import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import VactisPilotBanner from '../../components/VactisPilotBanner.jsx';
import { getBridgeToGoal } from '../../api/vactis.js';
import { getMoisDisponibles } from '../../api/activite.js';

const formatMad = (value) => `${Number(value ?? 0).toLocaleString('fr-FR')} MAD`;

export default function RapportCommercialPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moisDisponibles, setMoisDisponibles] = useState([]);
  const [moisSelectionne, setMoisSelectionne] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getBridgeToGoal(token, { mois: moisSelectionne || undefined }));
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger le rapport commercial.');
    } finally {
      setLoading(false);
    }
  }, [moisSelectionne, token]);

  useEffect(() => {
    let actif = true;
    getMoisDisponibles(token)
      .then((mois) => {
        if (!actif) return;
        const disponibles = Array.isArray(mois) ? mois : [];
        setMoisDisponibles(disponibles);
        if (disponibles.length > 0) setMoisSelectionne((current) => current || disponibles[0]);
      })
      .catch((requestError) => {
        if (actif) setError(requestError.message || 'Impossible de charger les mois disponibles.');
      });
    return () => { actif = false; };
  }, [token]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const statusClass = useMemo(() => {
    if (data?.statutYtd === 'EN AVANCE') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (data?.statutYtd === 'RETARD IMPORTANT') return 'border-rose-200 bg-rose-50 text-rose-800';
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }, [data?.statutYtd]);

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16 font-sans antialiased text-slate-800 dark:text-slate-100">
      <VactisPilotBanner profil="Laboratoire d'anatomopathologie — CA et cas" />
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">Lecture commerciale YTD</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">Rapport commercial</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-3xl">Synthèse de l’activité facturée, de la période couverte et de la situation actuelle par rapport à l’objectif proratisé.</p>
          <div className="flex flex-wrap items-center gap-2 pt-3 text-xs font-semibold">
            <label htmlFor="rapport-commercial-mois" className="sr-only">Choisir le mois</label>
            <select
              id="rapport-commercial-mois"
              value={moisSelectionne}
              onChange={(event) => setMoisSelectionne(event.target.value)}
              disabled={moisDisponibles.length === 0 || loading}
              className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-800 text-slate-700 dark:text-slate-200 font-semibold outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
            >
              {moisDisponibles.length === 0 ? <option value="">Aucun mois disponible</option> : moisDisponibles.map((mois) => <option key={mois} value={mois}>{mois}</option>)}
            </select>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Période {data?.periode ?? 'en cours'}</span>
            <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Données backend</span>
          </div>
        </div>
        <button type="button" onClick={loadReport} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50">{loading ? 'Chargement...' : 'Rafraîchir'}</button>
      </section>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="bg-gradient-to-r from-slate-900 via-slate-850 to-cyan-950 text-white p-6 rounded-3xl border border-slate-800 space-y-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Rapport commercial</span>
        <h2 className="text-xl font-black">Lecture de l’activité et de la variance YTD</h2>
        <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">Cette page présente la situation commerciale observée. Les projections, opportunités, scénarios et besoins de prospection sont réservés à Bridge to Goal.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-black text-slate-950 dark:text-white">Contexte activité laboratoire</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ContextMetric label="CA mois total" value={formatMad(data?.caMoisTotal)} hint="Activité réelle du laboratoire" />
          <ContextMetric label="Cas mois total" value={Number(data?.casMoisTotal ?? 0).toLocaleString('fr-FR')} hint="Tous types de dossiers" />
          <ContextMetric label="Médecins identifiés" value={Number(data?.medecinsIdentifies ?? 0).toLocaleString('fr-FR')} hint="Avec activité sur la période" />
          <ContextMetric label="Non affectés" value={Number(data?.nonAffectesCount ?? 0).toLocaleString('fr-FR')} hint="Dossiers sans médecin rattaché" />
        </div>
      </section>

      <ReportSection number="1" title="Passé — Base de comparaison">
        <Metric label="CA YTD réel" value={formatMad(data?.caYtdReel)} hint="Total observé depuis janvier" />
        <Metric label="Période couverte" value={data?.periode ?? '—'} hint="Mois actif de calcul" />
        <Metric label="Mois écoulés" value={`${data?.moisEcoules ?? 0} mois`} hint="Base de comparaison" />
        <Metric label="CA moyen mensuel" value={formatMad(data?.caMoyenMensuel)} hint="CA YTD / mois écoulés" />
      </ReportSection>

      <ReportSection number="2" title="Présent — Situation à date" status={data?.statutYtd} statusClass={statusClass}>
        <Metric label="Objectif YTD proratisé" value={formatMad(data?.objectifYtdProratise)} hint={`Objectif calculé pour ${data?.moisEcoules ?? 0}/12`} />
        <Metric label="Variance YTD" value={formatMad(data?.varianceYtd)} hint="CA YTD - objectif YTD" tone="rose" />
        <Metric label="Variance YTD %" value={`${data?.varianceYtdPct ?? 0} %`} hint="Écart relatif à l’objectif" tone="rose" />
      </ReportSection>
    </div>
  );
}

function ReportSection({ number, title, status, statusClass, children }) {
  return <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">{number}</span><h2 className="text-base font-black text-slate-950 dark:text-white">{title}</h2></div>{status && <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusClass}`}>{status}</span>}</div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{children}</div></section>;
}

function ContextMetric({ label, value, hint }) {
  return <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs"><span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">{label}</span><div className="text-2xl font-black text-slate-950 dark:text-white">{value}</div><p className="text-[10px] text-slate-400 mt-1">{hint}</p></div>;
}

function Metric({ label, value, hint, tone = 'default' }) {
  return <div className={`p-4 rounded-2xl border ${tone === 'rose' ? 'bg-rose-50/70 border-rose-200 text-rose-700' : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800 text-slate-950 dark:text-white'}`}><span className="text-[10px] font-black uppercase tracking-wider opacity-70 block mb-1">{label}</span><div className="text-xl font-black">{value}</div><span className="text-[10px] opacity-70">{hint}</span></div>;
}
