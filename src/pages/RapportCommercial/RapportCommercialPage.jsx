import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BadgeCheck, ClipboardList, Download, Flag, Printer, RefreshCw, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import VactisPilotBanner from '../../components/VactisPilotBanner';
import { getBridgeToGoal } from '../../api/vactis.js';
import {
  getCompteRenduTerrain,
  getEvolutionParCommercial,
  getMoisDisponibles,
  getMoisTerrainDisponibles,
  getRapportImpact,
} from '../../api/activite.js';
import { getMedecins } from '../../api/medecins.js';
import RapportCommercialInsights from './RapportCommercialInsights.jsx';
import { getLatestCompletedMonth } from '../../utils/reportingPeriod.js';
import { downloadExcelXml, isAdminProfile } from '../../utils/adminExports.js';

const formatMad = (value) => `${Number(value ?? 0).toLocaleString('fr-FR')} MAD`;

function LegacyRapportCommercialPage({ navigate }) {
  const { token, userProfile } = useAuth();
  const isAdmin = isAdminProfile(userProfile);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moisDisponibles, setMoisDisponibles] = useState([]);
  const [moisSelectionne, setMoisSelectionne] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
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
        if (disponibles.length > 0) setMoisSelectionne((current) => (current && disponibles.includes(current) ? current : getLatestCompletedMonth(disponibles)));
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

  const objectifAnnuelAdmin = Number(data?.annualTargetBudget ?? data?.targetBudget ?? 0);
  const runRateAnnuel = Number(data?.runRateAnnuel ?? 0);
  const ecartAnnuelProjete = runRateAnnuel - objectifAnnuelAdmin;
  const tauxAtteinteAnnuelProjete = objectifAnnuelAdmin > 0
    ? Math.round((runRateAnnuel / objectifAnnuelAdmin) * 1000) / 10
    : 0;

  const exportExcel = () => {
    if (!isAdmin || !data) return;
    const rows = [
      ['Indicateur', 'Valeur'],
      ['Période', data?.periode],
      ['CA du mois', data?.caMoisTotal],
      ['Cas du mois', data?.casMoisTotal],
      ['Médecins identifiés', data?.medecinsIdentifies],
      ['Dossiers non affectés', data?.nonAffectesCount],
      ['CA YTD réel', data?.caYtdReel],
      ['CA N-1 comparable', data?.caNMoins1Comparable],
      ['CA moyen mensuel', data?.caMoyenMensuel],
      ['Run-rate annuel', data?.runRateAnnuel],
      ['Écart annuel projeté', ecartAnnuelProjete],
      ['Taux d’atteinte annuel projeté', tauxAtteinteAnnuelProjete],
      ['Objectif YTD proratisé', data?.objectifYtdProratise],
      ['Variance YTD', data?.varianceYtd],
      ['Variance YTD %', data?.varianceYtdPct],
      [],
      ['Opportunité', 'Segment', 'Médecins', 'CA de référence', 'Potentiel'],
      ...(data?.opportunites ?? []).map((opportunity) => [
        opportunity.label,
        opportunity.segment,
        opportunity.medecins,
        opportunity.caReference,
        opportunity.potentielTheorique,
      ]),
    ];
    downloadExcelXml(rows, `rapport-commercial-${moisSelectionne || 'periode'}.xls`, 'Rapport commercial');
  };

  return (
    <div className="rapport-commercial space-y-6 max-w-[1700px] mx-auto pb-16 font-sans antialiased text-slate-800 dark:text-slate-100">
      <style>{`@media print { body { background: #fff !important; } .rapport-no-print, aside, nav { display: none !important; } .rapport-commercial { max-width: none !important; padding: 0 !important; color: #111827 !important; } .rapport-commercial section { break-inside: avoid; box-shadow: none !important; } }`}</style>
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
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Période {data?.periode ?? (loading ? 'Chargement…' : '—')}</span>
          </div>
        </div>
        <div className="rapport-no-print flex flex-wrap items-center gap-2">
          {isAdmin && <>
            <button type="button" onClick={() => isAdmin && window.print()} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold" title="Imprimer ou enregistrer en PDF"><Printer size={15} /> PDF</button>
            <button type="button" onClick={exportExcel} disabled={!data} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold disabled:opacity-50" title="Télécharger le rapport au format Excel"><Download size={15} /> Excel</button>
          </>}
          <button type="button" onClick={loadReport} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{loading ? 'Chargement...' : 'Rafraîchir'}</button>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {!data && <div role="status" className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">{loading ? 'Chargement des indicateurs depuis le serveur…' : 'Les indicateurs ne sont pas affichés sans réponse valide de la base de données.'}</div>}

      <section className="flex flex-col gap-3 rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50 via-sky-50 to-white p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 sm:flex-row sm:items-center sm:justify-between">
        <div><span className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-400">Lecture commerciale stratégique</span><h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Activité, trajectoire et portefeuille</h2><p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">Suivi du chiffre d’affaires, comparaison à l’objectif annuel défini par l’administration et lecture des leviers commerciaux.</p></div>
        <div className="flex shrink-0 flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-wide"><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-500 dark:border-slate-700 dark:bg-slate-800">1 · Passé</span><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-500 dark:border-slate-700 dark:bg-slate-800">2 · Présent</span><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-500 dark:border-slate-700 dark:bg-slate-800">3 · Tendance</span><span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">4 · Opportunités</span></div>
      </section>

      {data && <>
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
        <Metric label="Objectif annuel admin" value={formatMad(objectifAnnuelAdmin)} hint={`Cible définie par l’administration pour ${moisSelectionne?.slice(0, 4) ?? 'l’année'}`} tone="blue" />
        <Metric label="Run-rate annuel projeté" value={formatMad(runRateAnnuel)} hint="CA YTD extrapolé sur 12 mois" />
        <Metric label="Écart annuel projeté" value={formatMad(ecartAnnuelProjete)} hint="Run-rate annuel − objectif annuel admin" tone={ecartAnnuelProjete < 0 ? 'rose' : 'default'} />
        <Metric label="Atteinte annuelle projetée" value={`${tauxAtteinteAnnuelProjete} %`} hint="Run-rate annuel / objectif annuel admin" tone={tauxAtteinteAnnuelProjete < 100 ? 'rose' : 'default'} />
        <Metric label="Période couverte" value={data?.periode ?? '—'} hint="Mois actif de calcul" />
        <Metric label="Mois écoulés" value={`${data?.moisEcoules ?? 0} mois`} hint="Base de comparaison" />
        <Metric label="CA moyen mensuel" value={formatMad(data?.caMoyenMensuel)} hint="CA YTD / mois écoulés" />
      </ReportSection>

      <ReportSection number="2" title="Présent — Situation à date" status={data?.statutYtd} statusClass={statusClass}>
        <Metric label="Objectif du mois admin" value={formatMad(data?.monthlyTargetBudget)} hint={data?.monthlyTargetMethod === 'PERCENTAGE' ? `Cible mensuelle définie par une hausse de ${data?.monthlyTargetInputValue ?? 0} %` : 'Cible mensuelle définie par l’administration'} tone="blue" />
        <Metric label="CA réalisé du mois" value={formatMad(data?.caMoisTotal)} hint={`Activité facturée en ${data?.periode ?? moisSelectionne}`} />
        <Metric label="Écart mensuel" value={formatMad(Number(data?.caMoisTotal ?? 0) - Number(data?.monthlyTargetBudget ?? 0))} hint="CA du mois − objectif du mois" tone={Number(data?.caMoisTotal ?? 0) >= Number(data?.monthlyTargetBudget ?? 0) ? 'default' : 'rose'} />
        <Metric label="Objectif YTD proratisé" value={formatMad(data?.objectifYtdProratise)} hint={`Objectif calculé pour ${data?.moisEcoules ?? 0}/12 à partir de la cible annuelle admin`} tone="blue" />
        <Metric label="Variance YTD" value={formatMad(data?.varianceYtd)} hint="CA YTD - objectif YTD" tone="rose" />
        <Metric label="Variance YTD %" value={`${data?.varianceYtdPct ?? 0} %`} hint="Écart relatif à l’objectif" tone="rose" />
      </ReportSection>
      </>}

      <RapportCommercialInsights
        token={token}
        data={data}
        moisSelectionne={moisSelectionne}
        moisDisponibles={moisDisponibles}
        navigate={navigate}
      />
    </div>
  );
}

function RapportCommercialTerrainPage() {
  const { token, userProfile } = useAuth();
  const isAdmin = isAdminProfile(userProfile);
  const [moisDisponibles, setMoisDisponibles] = useState([]);
  const [mois, setMois] = useState('');
  const [rapport, setRapport] = useState(null);
  const [bridgeGoal, setBridgeGoal] = useState(null);
  const [bridgeGoalError, setBridgeGoalError] = useState('');
  const [impact, setImpact] = useState(null);
  const [evolution, setEvolution] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commercialFiltre, setCommercialFiltre] = useState('');
  const [qualificationFiltre, setQualificationFiltre] = useState('');
  const [realisationFiltre, setRealisationFiltre] = useState('');
  const [commercialSelectionne, setCommercialSelectionne] = useState(null);

  const charger = useCallback(async (periode = mois) => {
    if (!token || !periode) return;
    setLoading(true);
    setError('');
    setBridgeGoal(null);
    setBridgeGoalError('');
    const [terrain, impactResult, evolutionResult, medecinsResult, bridgeGoalResult] = await Promise.allSettled([
      getCompteRenduTerrain(token, periode),
      getRapportImpact(token, periode),
      getEvolutionParCommercial(token, periode),
      getMedecins(token),
      getBridgeToGoal(token, { mois: periode }),
    ]);
    const echecs = [terrain, impactResult, evolutionResult].filter((resultat) => resultat.status === 'rejected');
    if (terrain.status === 'fulfilled') setRapport(terrain.value);
    if (impactResult.status === 'fulfilled') setImpact(impactResult.value);
    if (evolutionResult.status === 'fulfilled') setEvolution(evolutionResult.value);
    if (medecinsResult.status === 'fulfilled') setMedecins(medecinsResult.value?.items ?? []);
    if (bridgeGoalResult.status === 'fulfilled') setBridgeGoal(bridgeGoalResult.value);
    else setBridgeGoalError(bridgeGoalResult.reason?.message || 'Objectifs administrateur indisponibles.');
    if (echecs.length) setError(echecs[0].reason?.message || 'Impossible de charger les données du rapport.');
    setLoading(false);
  }, [mois, token]);

  useEffect(() => {
    let actif = true;
    getMoisTerrainDisponibles(token)
      .then((resultat) => {
        if (!actif) return;
        const moisApi = Array.isArray(resultat) ? resultat : [];
        setMoisDisponibles(moisApi);
        if (moisApi.length) setMois((current) => (current && moisApi.includes(current) ? current : getLatestCompletedMonth(moisApi)));
        else setLoading(false);
      })
      .catch((requestError) => {
        if (!actif) return;
        setError(requestError.message || 'Impossible de charger les périodes disponibles.');
        setLoading(false);
      });
    return () => { actif = false; };
  }, [token]);

  useEffect(() => {
    if (mois) charger(mois);
  }, [charger, mois]);

  const retoursFiltres = useMemo(() => (rapport?.retours ?? []).filter((retour) =>
    (!commercialFiltre || retour.visiteur === commercialFiltre)
    && (!qualificationFiltre || retour.qualification === qualificationFiltre)
    && (!realisationFiltre || retour.statutVisite === realisationFiltre),
  ), [commercialFiltre, qualificationFiltre, rapport?.retours, realisationFiltre]);

  const totaux = useMemo(() => ({
    renseignes: retoursFiltres.length,
    realisees: retoursFiltres.filter((retour) => retour.statutVisite === 'REALISEE').length,
    nonRealisees: retoursFiltres.filter((retour) => retour.statutVisite === 'NON_REALISEE').length,
    reclamations: retoursFiltres.filter((retour) => retour.reclamation).length,
  }), [retoursFiltres]);

  const bilanCommercial = useMemo(() => {
    const groupes = new Map();
    retoursFiltres.forEach((retour) => {
      const nom = retour.visiteur || 'Non renseigné';
      const ligne = groupes.get(nom) ?? { commercial: nom, renseignees: 0, realisees: 0, nonRealisees: 0 };
      ligne.renseignees += 1;
      if (retour.statutVisite === 'REALISEE') ligne.realisees += 1;
      if (retour.statutVisite === 'NON_REALISEE') ligne.nonRealisees += 1;
      groupes.set(nom, ligne);
    });
    return [...groupes.values()].sort((a, b) => b.renseignees - a.renseignees);
  }, [retoursFiltres]);

  const typesVisite = useMemo(() => {
    const groupes = new Map();
    retoursFiltres.filter((retour) => retour.statutVisite === 'REALISEE').forEach((retour) => {
      const type = retour.typeVisite || 'NON_RENSEIGNE';
      groupes.set(type, (groupes.get(type) ?? 0) + 1);
    });
    return [...groupes.entries()].sort((a, b) => b[1] - a[1]);
  }, [retoursFiltres]);

  const evolutionsFiltrees = useMemo(() => (evolution?.evolutionParCommercial ?? []).filter((ligne) =>
    !commercialFiltre || ligne.commercial === commercialFiltre,
  ), [commercialFiltre, evolution?.evolutionParCommercial]);

  const portefeuilleCommercial = useMemo(() => {
    const groupes = new Map();
    medecins.forEach((medecin) => {
      const nom = medecin.commercialReferent || 'Sans commercial référent';
      const ligne = groupes.get(nom) ?? { commercial: nom, medecins: 0, actifs: 0 };
      ligne.medecins += 1;
      if (medecin.statut !== 'INACTIF') ligne.actifs += 1;
      groupes.set(nom, ligne);
    });
    return [...groupes.values()].sort((a, b) => b.medecins - a.medecins);
  }, [medecins]);

  const commerciaux = useMemo(() => [...new Set((rapport?.retours ?? []).map((retour) => retour.visiteur).filter(Boolean))].sort(), [rapport?.retours]);
  const qualifications = useMemo(() => [...new Set((rapport?.retours ?? []).map((retour) => retour.qualification).filter(Boolean))].sort(), [rapport?.retours]);
  const statutsVisite = useMemo(() => [...new Set((rapport?.retours ?? []).map((retour) => retour.statutVisite).filter(Boolean))].sort(), [rapport?.retours]);
  const tauxRealisation = totaux.renseignes ? Math.round((totaux.realisees / totaux.renseignes) * 100) : 0;
  const visitesAnalysees = evolutionsFiltrees.reduce((total, ligne) => total + (ligne.totalAnalyse ?? 0), 0);
  const favorables = evolutionsFiltrees.reduce((total, ligne) => total + (ligne.favorable ?? 0), 0);
  const stables = evolutionsFiltrees.reduce((total, ligne) => total + (ligne.stable ?? 0), 0);
  const defavorables = evolutionsFiltrees.reduce((total, ligne) => total + (ligne.defavorable ?? 0), 0);
  const nonObservables = evolutionsFiltrees.reduce((total, ligne) => total + (ligne.nonObservable ?? 0), 0);
  const tauxFavorable = visitesAnalysees - nonObservables > 0 ? Math.round((favorables / (visitesAnalysees - nonObservables)) * 100) : 0;
  const medecinsSansCommercial = portefeuilleCommercial.find((ligne) => ligne.commercial === 'Sans commercial référent')?.medecins ?? 0;
  const medecinsSelectionnes = useMemo(() => medecins.filter((medecin) => (
    commercialSelectionne === '__SANS_REFERENT__'
      ? !medecin.commercialReferent
      : medecin.commercialReferent === commercialSelectionne
  )), [commercialSelectionne, medecins]);

  const exporterExcel = () => {
    if (!isAdmin || !rapport) return;
    const lignes = [
      ['Commercial', 'Médecin', 'Spécialité', 'Date', 'Réalisation', 'Qualification', 'Type de visite', 'Réclamation'],
      ...retoursFiltres.map((retour) => [retour.visiteur, retour.nomMedecin, retour.specialite, retour.dateVisite, retour.statutVisite, retour.qualification, retour.typeVisite, retour.reclamation ? 'Oui' : 'Non']),
      [],
      ['Objectifs administrateur', 'Période', 'Objectif annuel admin', 'Objectif du mois', 'CA du mois', 'Écart mensuel', 'Objectif YTD proratisé', 'CA YTD', 'Écart YTD', 'Écart YTD %'],
      ...(bridgeGoal ? [[
        'Bridge to Goal',
        mois,
        bridgeGoal.annualTargetBudget ?? bridgeGoal.targetBudget,
        bridgeGoal.monthlyTargetBudget,
        bridgeGoal.caMoisTotal ?? rapport?.caMoisTotal,
        Number(bridgeGoal.caMoisTotal ?? rapport?.caMoisTotal ?? 0) - Number(bridgeGoal.monthlyTargetBudget ?? 0),
        bridgeGoal.objectifYtdProratise,
        bridgeGoal.caYtdReel,
        bridgeGoal.varianceYtd,
        bridgeGoal.varianceYtdPct,
      ]] : []),
    ];
    downloadExcelXml(lignes, `rapport-commercial-terrain-${mois || 'periode'}.xls`, 'Rapport terrain');
  };

  return (
    <main className="rapport-commercial mx-auto w-full max-w-[1500px] space-y-4 pb-10 text-slate-800 dark:text-slate-100">
      <style>{`@media print { .rapport-no-print, aside, nav { display:none !important; } body { background:#fff !important; } .rapport-commercial section { break-inside:avoid; box-shadow:none !important; } }`}</style>
      <VactisPilotBanner profil="Pilotage terrain — visites et portefeuilles commerciaux" />
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-[240px] items-start gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-300"><ClipboardList size={18} /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">Pilotage terrain · équipe commerciale</p>
            <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-slate-950 dark:text-white">Rapport commercial</h1>
            <p className="mt-1 max-w-xl text-xs text-slate-500 dark:text-slate-400">Visites, résultats terrain et couverture des portefeuilles attribués.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold">
              <label htmlFor="rapport-commercial-mois" className="sr-only">Période du rapport</label>
              <select id="rapport-commercial-mois" aria-label="Période" value={mois} onChange={(event) => setMois(event.target.value)} className="h-8 rounded-full border border-cyan-200 bg-white px-3 text-[11px] text-slate-700 shadow-sm dark:border-cyan-900 dark:bg-slate-900 dark:text-slate-200">
            {moisDisponibles.map((periode) => <option key={periode} value={periode}>{periode}</option>)}
          </select>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{rapport?.mois ?? (loading ? 'Chargement…' : 'Période')}</span>
            </div>
          </div>
        </div>
        <div className="rapport-no-print flex flex-wrap items-center gap-2 self-start lg:self-center">
          <button type="button" onClick={() => charger(mois)} disabled={loading || !mois} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser</button>
          {isAdmin && <>
            <button type="button" onClick={exporterExcel} disabled={!rapport} className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-3 text-xs font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"><Download size={14} /> Excel</button>
            <button type="button" onClick={() => isAdmin && window.print()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Printer size={14} /> PDF</button>
          </>}
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {bridgeGoalError && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Impossible de charger les objectifs administrateur : {bridgeGoalError}</p>}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50/80 via-sky-50/50 to-white px-4 py-3 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850">
        <div className="mr-auto flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm dark:bg-slate-800 dark:text-cyan-300"><Activity size={17} /></span>
          <div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-700 dark:text-cyan-400">Lecture terrain</p><p className="text-xs font-bold text-slate-800 dark:text-slate-200">Suivi des visites et de la couverture commerciale</p></div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400"><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">1. Visites</span><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">2. Résultats</span><span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">3. Portefeuille</span></div>
      </section>

      <div className="rapport-no-print flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Filter label="Commercial" value={commercialFiltre} onChange={setCommercialFiltre} options={commerciaux} />
        <Filter label="Qualification" value={qualificationFiltre} onChange={setQualificationFiltre} options={qualifications} />
        <Filter label="Réalisation" value={realisationFiltre} onChange={setRealisationFiltre} options={statutsVisite} />
        <button type="button" onClick={() => { setCommercialFiltre(''); setQualificationFiltre(''); setRealisationFiltre(''); }} className="h-9 px-1 text-xs font-semibold text-teal-700 underline dark:text-teal-400">Effacer les filtres</button>
        <span className="ml-auto self-center text-[11px] font-semibold text-slate-500">{loading ? 'Chargement…' : `${retoursFiltres.length} visites affichées`}</span>
      </div>

      {rapport && <>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-700 dark:text-cyan-400">Synthèse période</p><h2 className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">Activité terrain</h2></div><span className="text-[10px] text-slate-400">{rapport.mois}</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Kpi icon={ClipboardList} label="Visites renseignées" value={totaux.renseignes} tone="dark" />
            <Kpi icon={BadgeCheck} label="Réalisées" value={totaux.realisees} tone="green" />
            <Kpi icon={Activity} label="Non réalisées" value={totaux.nonRealisees} tone="amber" />
            <Kpi icon={Activity} label="Taux de réalisation" value={`${tauxRealisation} %`} tone="cyan" />
            <Kpi icon={Flag} label="Réclamations" value={totaux.reclamations} tone="rose" />
          </div>
        </section>

        {bridgeGoal && <section className="rounded-2xl border border-cyan-200/80 bg-white p-4 shadow-sm dark:border-cyan-900 dark:bg-slate-900 sm:p-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-700 dark:text-cyan-400">Objectifs définis par l’administration</p>
              <h2 className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">Objectif annuel et suivi du mois {mois}</h2>
            </div>
            <span className="text-[10px] text-slate-500">Écarts = réalisé − objectif</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <SmallMetric label="Objectif annuel admin" value={formatMad(bridgeGoal.annualTargetBudget ?? bridgeGoal.targetBudget)} tone="teal" />
            <SmallMetric label="Objectif du mois admin" value={formatMad(bridgeGoal.monthlyTargetBudget)} />
            <SmallMetric label="CA réalisé du mois" value={formatMad(bridgeGoal.caMoisTotal ?? rapport.caMoisTotal)} />
            <SmallMetric label="Écart mensuel" value={formatMad(Number(bridgeGoal.caMoisTotal ?? rapport.caMoisTotal ?? 0) - Number(bridgeGoal.monthlyTargetBudget ?? 0))}
              tone={Number(bridgeGoal.caMoisTotal ?? rapport.caMoisTotal ?? 0) >= Number(bridgeGoal.monthlyTargetBudget ?? 0) ? 'green' : 'red'} />
            <SmallMetric label="Objectif YTD proratisé" value={formatMad(bridgeGoal.objectifYtdProratise)} />
            <SmallMetric label="Écart YTD" value={`${formatMad(bridgeGoal.varianceYtd)} (${Number(bridgeGoal.varianceYtdPct ?? 0).toLocaleString('fr-FR')} %)`}
              tone={Number(bridgeGoal.varianceYtd ?? 0) >= 0 ? 'green' : 'red'} />
          </div>
          <p className="mt-3 text-[10px] text-slate-500">
            Calcul YTD : CA cumulé {formatMad(bridgeGoal.caYtdReel)} − objectif annuel proratisé pour {bridgeGoal.moisEcoules ?? 0}/12 ({formatMad(bridgeGoal.objectifYtdProratise)}).
            {bridgeGoal.monthlyTargetMethod ? ` Cible mensuelle personnalisée (${bridgeGoal.monthlyTargetMethod === 'PERCENTAGE' ? `${bridgeGoal.monthlyTargetInputValue ?? 0} % du CA précédent` : 'montant direct'}).` : ' Cible mensuelle calculée à partir de l’objectif annuel ÷ 12.'}
          </p>
        </section>}

        <DataSection number="1" title="Bilan par commercial" subtitle="Visites renseignées et exécution terrain">
          <DataTable headers={['Commercial', 'Renseignées', 'Réalisées', 'Non réalisées', 'Taux']} rows={bilanCommercial.map((ligne) => [ligne.commercial, ligne.renseignees, ligne.realisees, ligne.nonRealisees, `${ligne.renseignees ? Math.round(ligne.realisees * 100 / ligne.renseignees) : 0} %`])} empty="Aucune visite pour cette sélection." />
        </DataSection>

        <DataSection number="2" title="Types de visite" subtitle="Répartition des visites réalisées">
          {typesVisite.length ? <div className="space-y-3">{typesVisite.map(([type, total]) => <div key={type}><div className="mb-1 flex justify-between text-xs"><span>{type.replaceAll('_', ' ')}</span><strong>{total}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.max(3, total * 100 / Math.max(...typesVisite.map((item) => item[1])))}%` }} /></div></div>)}</div> : <p className="py-4 text-xs text-slate-500">Aucune visite réalisée pour cette sélection.</p>}
        </DataSection>

        <DataSection number="3" title="Résultats observés après visite" subtitle="Évolution mesurable des visites VACTIS, sans attribuer de causalité à la visite">
          <DataTable
            headers={['Commercial', 'Analysées', 'Favorables', 'Stables', 'Défavorables', 'Non observables', 'Taux favorable']}
            rows={evolutionsFiltrees.map((ligne) => [ligne.commercial, ligne.totalAnalyse, ligne.favorable, ligne.stable, ligne.defavorable, ligne.nonObservable, `${ligne.tauxFavorable} %`] )}
            empty="Aucune visite VACTIS analysable pour cette période."
          />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SmallMetric label="Visites analysées" value={visitesAnalysees} />
            <SmallMetric label="Favorables" value={favorables} tone="green" />
            <SmallMetric label="Défavorables" value={defavorables} tone="red" />
            <SmallMetric label="Taux favorable" value={`${tauxFavorable} %`} tone="teal" />
          </div>
        </DataSection>

        <DataSection number="4" title="Portefeuille par commercial" subtitle="Médecins attribués, segment et statut actuel d’après le portefeuille enregistré">
          <p className="mb-3 text-[10px] text-slate-500">L’activité visitée est calculée sur la période sélectionnée; l’attribution provient du portefeuille médecin.</p>
          {medecinsSansCommercial > 0 && <button type="button" onClick={() => setCommercialSelectionne((current) => current === '__SANS_REFERENT__' ? null : '__SANS_REFERENT__')} className="mb-3 flex w-full items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><span>{medecinsSansCommercial} médecins sans commercial référent; non inclus dans les portefeuilles commerciaux.</span><Users size={16} /></button>}
          <DataTable
            headers={['Commercial', 'Médecins attribués', 'Actifs']}
            rows={portefeuilleCommercial.filter((ligne) => ligne.commercial !== 'Sans commercial référent' && (!commercialFiltre || ligne.commercial === commercialFiltre)).map((ligne) => [ligne.commercial, ligne.medecins, ligne.actifs])}
            empty="Aucun médecin attribué à ce commercial."
            onRowClick={(row) => setCommercialSelectionne((current) => current === row[0] ? null : row[0])}
          />
          {commercialSelectionne && <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-900 dark:bg-teal-950/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><h3 className="text-sm font-bold text-slate-900 dark:text-white">{commercialSelectionne === '__SANS_REFERENT__' ? 'Médecins sans commercial référent' : `Portefeuille de ${commercialSelectionne}`}</h3><p className="mt-0.5 text-xs text-slate-500">{medecinsSelectionnes.length} médecins concernés</p></div>
              <button type="button" onClick={() => setCommercialSelectionne(null)} className="rounded-lg p-2 text-slate-500 hover:bg-white dark:hover:bg-slate-800" aria-label="Fermer le détail du portefeuille"><X size={16} /></button>
            </div>
            <DataTable headers={['Médecin', 'Spécialité', 'Ville', 'Statut', 'Segment']} rows={medecinsSelectionnes.map((medecin) => [[medecin.prenom, medecin.nom].filter(Boolean).join(' ') || medecin.codeMedecin, medecin.specialite || '—', medecin.ville || '—', (medecin.statut || medecin.statutPilotage || '—').replaceAll('_', ' '), medecin.segment || '—'])} empty="Aucun médecin dans ce portefeuille." />
          </div>}
        </DataSection>

        {impact && <p className="text-[10px] text-slate-400">Période des visites: {impact.mois}. Réalisées VACTIS: {impact.vactisRealisees}; actions sans retour terrain: {impact.sanRetourTerrain}.</p>}
      </>}
    </main>
  );
}

export default LegacyRapportCommercialPage;

function Filter({ label, value, onChange, options }) {
  return <label className="grid gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 min-w-28 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">Tous</option>{options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label>;
}

function Kpi({ icon: Icon, label, value, tone }) {
  const colors = {
    dark: 'border-slate-900 bg-slate-950 text-white dark:border-slate-700 dark:bg-slate-950',
    green: 'border-emerald-200 bg-white text-slate-950 dark:border-emerald-900 dark:bg-slate-900 dark:text-white',
    amber: 'border-amber-200 bg-white text-slate-950 dark:border-amber-900 dark:bg-slate-900 dark:text-white',
    cyan: 'border-cyan-200 bg-white text-slate-950 dark:border-cyan-900 dark:bg-slate-900 dark:text-white',
    rose: 'border-rose-200 bg-white text-slate-950 dark:border-rose-900 dark:bg-slate-900 dark:text-white',
  };
  const iconColors = { dark: 'bg-white/10 text-cyan-200', green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300', rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300' };
  const labelColors = { dark: 'text-slate-300', green: 'text-slate-500 dark:text-slate-400', amber: 'text-slate-500 dark:text-slate-400', cyan: 'text-slate-500 dark:text-slate-400', rose: 'text-slate-500 dark:text-slate-400' };
  return <div className={`min-h-[94px] rounded-xl border p-3 shadow-sm ${colors[tone]}`}><div className="flex items-start justify-between gap-2"><span className={`max-w-[130px] text-[9px] font-black uppercase leading-4 tracking-wide ${labelColors[tone]}`}>{label}</span><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColors[tone]}`}><Icon size={15} /></span></div><strong className={`mt-2 block text-[23px] font-black leading-none ${tone === 'dark' ? 'text-white' : 'text-slate-950 dark:text-white'}`}>{value}</strong></div>;
}

function DataSection({ number, title, subtitle, children }) {
  return <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"><div className="mb-3 flex items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-black text-white dark:bg-cyan-700">{number}</span><div><h2 className="text-sm font-black text-slate-950 dark:text-white">{title}</h2><p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</p></div></div>{children}</section>;
}

function DataTable({ headers, rows, empty, onRowClick }) {
  if (!rows.length) return <p className="rounded-lg bg-slate-50 px-3 py-4 text-xs text-slate-500 dark:bg-slate-800/70">{empty}</p>;
  return <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr>{headers.map((header, index) => <th key={header} className={`px-3 py-3 font-bold ${index > 0 ? 'text-right' : ''}`}>{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-teal-50/60 dark:hover:bg-teal-950/20`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}`} className={`px-3 py-3 ${cellIndex === 0 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-right text-slate-600 dark:text-slate-300'}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function SmallMetric({ label, value, tone = 'slate' }) {
  const styles = { slate: 'bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-white', green: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200', red: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200', teal: 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200' };
  return <div className={`rounded-lg px-3 py-2.5 ${styles[tone]}`}><span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span><strong className="mt-1 block text-lg font-black">{value}</strong></div>;
}


function ReportSection({ number, title, status, statusClass, children }) {
  return <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">{number}</span><h2 className="text-base font-black text-slate-950 dark:text-white">{title}</h2></div>{status && <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusClass}`}>{status}</span>}</div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{children}</div></section>;
}

function ContextMetric({ label, value, hint }) {
  return <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs"><span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">{label}</span><div className="text-2xl font-black text-slate-950 dark:text-white">{value}</div><p className="text-[10px] text-slate-400 mt-1">{hint}</p></div>;
}

function Metric({ label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800 text-slate-950 dark:text-white',
    rose: 'bg-rose-50/70 border-rose-200 text-rose-700',
    blue: 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-100',
  };
  return <div className={`p-4 rounded-2xl border ${tones[tone]}`}><span className="text-[10px] font-black uppercase tracking-wider opacity-70 block mb-1">{label}</span><div className="text-xl font-black">{value}</div><span className="text-[10px] opacity-70">{hint}</span></div>;
}
