import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import VactisPilotBanner from '../../components/VactisPilotBanner';
import { getBridgeGoalMonthlyTarget, getBridgeToGoal, saveBridgeGoalMonthlyTarget } from '../../api/vactis.js';
import { getMoisDisponibles } from '../../api/activite.js';
import { getSettings, updateBridgeGoalTarget } from '../../api/settings.js';
import { getLatestCompletedMonth } from '../../utils/reportingPeriod.js';

const COVERAGE_DECISIONS = {
  PORTEFEUILLE_SUFFISANT: {
    title: 'Portefeuille suffisant',
    description: 'Le potentiel interne identifié couvre le gap projeté. La prospection externe n’est pas prioritaire.',
  },
  PROSPECTION_CIBLEE: {
    title: 'Prospection ciblée',
    description: 'Le portefeuille couvre au moins la moitié du gap. Compléter par une prospection ciblée.',
  },
  PROSPECTION_INDISPENSABLE: {
    title: 'Prospection indispensable',
    description: 'Le portefeuille couvre une partie du gap, mais la prospection est nécessaire pour atteindre l’objectif.',
  },
  ACQUISITION_NECESSAIRE: {
    title: 'Acquisition nécessaire',
    description: 'La couverture interne reste inférieure à 25 %. L’acquisition de nouveaux médecins est nécessaire.',
  },
};

export default function BridgeToGoalPage() {
  const { token, userProfile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const roleName = useMemo(() => {
    const value = userProfile?.role ?? userProfile?.roles?.nameRole ?? userProfile?.roles?.[0]?.nameRole ?? '';
    return String(value ?? '').trim().toUpperCase();
  }, [userProfile]);

  const isAdmin = useMemo(() => roleName.includes('ADMIN') || roleName.includes('ADMINISTRATEUR'), [roleName]);

  // User Target input
  const [targetInput, setTargetInput] = useState('');
  const [targetMethod, setTargetMethod] = useState('DIRECT');
  const [editingTarget, setEditingTarget] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalMessage, setGoalMessage] = useState('');
  const [goalError, setGoalError] = useState('');
  const [editingAnnualTarget, setEditingAnnualTarget] = useState(false);
  const [annualTargetMethod, setAnnualTargetMethod] = useState('DIRECT');
  const [annualTargetInput, setAnnualTargetInput] = useState('');
  const [annualReferenceRevenue, setAnnualReferenceRevenue] = useState(0);
  const [annualSaving, setAnnualSaving] = useState(false);
  const [annualMessage, setAnnualMessage] = useState('');
  const [annualError, setAnnualError] = useState('');
  const [moisInput, setMoisInput] = useState('');
  const [moisDisponibles, setMoisDisponibles] = useState([]);

  // Selected opportunity block for context drawer
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getBridgeToGoal(token, { mois: moisInput || undefined });
      setData(res);
      if (isAdmin) {
        const monthlyTarget = moisInput ? await getBridgeGoalMonthlyTarget(token, moisInput) : null;
        setTargetMethod(monthlyTarget?.method ?? 'DIRECT');
        setTargetInput(monthlyTarget?.value != null
          ? String(monthlyTarget.value)
          : String(res?.monthlyTargetBudget ?? Math.round((res?.targetBudget ?? 0) / 12)));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, moisInput, isAdmin]);

  useEffect(() => {
    let actif = true;
    getMoisDisponibles(token)
      .then((mois) => {
        if (!actif) return;
        const disponibles = Array.isArray(mois) ? mois : [];
        setMoisDisponibles(disponibles);
        if (disponibles.length > 0) setMoisInput((current) => current || getLatestCompletedMonth(disponibles));
      })
      .catch(() => {
        if (actif) setMoisDisponibles([]);
      });
    return () => { actif = false; };
  }, [token]);

  useEffect(() => {
    if (!isAdmin || !token) return undefined;
    let actif = true;
    getSettings(token)
      .then((settings) => {
        if (!actif) return;
        setAnnualTargetMethod(settings.bridgeGoalMethod ?? 'DIRECT');
        setAnnualTargetInput(String(settings.bridgeGoalInputValue ?? settings.bridgeGoalTarget ?? ''));
        setAnnualReferenceRevenue(Number(settings.bridgeGoalReferenceRevenue ?? 0));
      })
      .catch((requestError) => {
        if (actif) setAnnualError(requestError.message || 'Impossible de charger l’objectif annuel.');
      });
    return () => { actif = false; };
  }, [isAdmin, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveTarget = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    const parsed = Number(targetInput);
    if (!Number.isFinite(parsed) || (targetMethod === 'DIRECT' ? parsed <= 0 : parsed < 0)) {
      setGoalError(targetMethod === 'DIRECT'
        ? 'L’objectif doit être un nombre strictement positif.'
        : 'Le pourcentage d’augmentation doit être positif ou nul.');
      return;
    }

    setSavingGoal(true);
    setGoalError('');
    setGoalMessage('');

    try {
      const saved = await saveBridgeGoalMonthlyTarget(token, {
        mois: moisInput,
        method: targetMethod,
        value: parsed,
      });
      setTargetInput(String(saved.value));
      setGoalMessage('Objectif Bridge to Goal enregistré.');
      setEditingTarget(false);
      await fetchData();
    } catch (e) {
      setGoalError(e.message || 'Impossible d’enregistrer l’objectif.');
    } finally {
      setSavingGoal(false);
    }
  }, [fetchData, isAdmin, moisInput, targetInput, targetMethod, token]);

  const annualInputNumber = Number(annualTargetInput);
  const annualTargetPreview = annualTargetMethod === 'PERCENTAGE'
    ? Math.round(annualReferenceRevenue * (1 + (annualInputNumber || 0) / 100))
    : Math.round(annualInputNumber || 0);

  const handleSaveAnnualTarget = useCallback(async () => {
    if (!isAdmin) return;
    if (!Number.isFinite(annualInputNumber)
      || (annualTargetMethod === 'DIRECT' && annualInputNumber <= 0)
      || (annualTargetMethod === 'PERCENTAGE' && (annualInputNumber < 0 || annualReferenceRevenue <= 0))
      || annualTargetPreview <= 0) {
      setAnnualError('Saisissez un objectif annuel valide. Le mode pourcentage nécessite un CA positif sur l’année précédente.');
      return;
    }

    setAnnualSaving(true);
    setAnnualError('');
    setAnnualMessage('');
    try {
      const savedTarget = await updateBridgeGoalTarget(token, annualInputNumber, annualTargetMethod);
      setAnnualTargetInput(annualTargetMethod === 'DIRECT' ? String(annualInputNumber) : String(annualInputNumber));
      setAnnualMessage(`Objectif annuel enregistré : ${Number(savedTarget).toLocaleString('fr-FR')} MAD.`);
      setEditingAnnualTarget(false);
      await fetchData();
    } catch (requestError) {
      setAnnualError(requestError.message || 'Impossible d’enregistrer l’objectif annuel.');
    } finally {
      setAnnualSaving(false);
    }
  }, [annualInputNumber, annualReferenceRevenue, annualTargetMethod, annualTargetPreview, fetchData, isAdmin, token]);

  const caMoisTotalLabo = data?.caMoisTotal ?? 0;
  const casMoisTotalLabo = data?.casMoisTotal ?? 0;
  const caPortefeuille = data?.caPortefeuille ?? 0;
  const nonAffectesCount = data?.nonAffectesCount ?? 0;
  const nbMedecinsActifs = data?.nbMedecinsActifs ?? 0;
  const moisEcoules = data?.moisEcoules ?? 0;
  const moisRestants = data?.moisRestants ?? 0;
  const caYtdReel = data?.caYtdReel ?? 0;
  const caNMoins1Comparable = data?.caNMoins1Comparable ?? 0;
  const caMoyenMensuel = data?.caMoyenMensuel ?? 0;
  const targetAnnuel = data?.targetBudget ?? 0;
  const objectifMoisActuel = data?.monthlyTargetBudget ?? Math.round(targetAnnuel / 12);
  const caMoisPrecedent = data?.previousMonthRevenue ?? 0;
  const objectifMensuelCalcule = targetMethod === 'PERCENTAGE'
    ? Math.round(caMoisPrecedent * (1 + (Number(targetInput) || 0) / 100))
    : (Number(targetInput) || 0);
  const objectifYtdProratise = data?.objectifYtdProratise ?? 0;
  const varianceYtd = data?.varianceYtd ?? 0;
  const varianceYtdPct = data?.varianceYtdPct ?? 0;
  const statutYtd = data?.statutYtd ?? 'EN ATTENTE';
  const runRateAnnuel = data?.runRateAnnuel ?? 0;
  const gapProjete = data?.gapProjete ?? 0;
  const effortAdditionnelMensuel = data?.effortAdditionnelMensuel ?? 0;

  // Opportunités internes VACTIS dérivées des indicateurs calculés par le backend.
  const opportunitesBlocs = (data?.opportunites ?? []).map((item) => ({
      titre: item.label,
      segment: item.segment,
      medecins: item.medecins,
      caReference: item.caReference,
      potentielTheorique: item.potentielTheorique,
      description: item.description,
    }));

  const totalPotentielDetecte = (data?.gainOnboarding ?? 0) + (data?.gainRetention ?? 0) + (data?.gainDeveloppement ?? 0);
  const couvertureGapPct = gapProjete > 0 ? Math.round((Math.min(totalPotentielDetecte, gapProjete) / gapProjete) * 1000) / 10 : 100;
  const decisionCouverture = data?.decisionCouverture || (
    couvertureGapPct >= 100 ? 'PORTEFEUILLE_SUFFISANT'
      : couvertureGapPct >= 50 ? 'PROSPECTION_CIBLEE'
        : couvertureGapPct >= 25 ? 'PROSPECTION_INDISPENSABLE' : 'ACQUISITION_NECESSAIRE'
  );
  const recommandationCouverture = COVERAGE_DECISIONS[decisionCouverture] || COVERAGE_DECISIONS.ACQUISITION_NECESSAIRE;
  const gapRestantApresActivation = Math.max(0, gapProjete - totalPotentielDetecte);
  const nombreBlocsOpportunites = opportunitesBlocs.length;
  const nombreMedecinsOpportunites = opportunitesBlocs.reduce((total, bloc) => total + bloc.medecins, 0);
  const scenarioActivation = [
    { label: 'Prudent 20 %', taux: 0.2, className: 'text-amber-600' },
    { label: 'Réaliste 35 %', taux: 0.35, className: 'text-cyan-700' },
    { label: 'Ambitieux 50 %', taux: 0.5, className: 'text-emerald-600' },
  ].map((scenario) => {
    const potentielActivable = Math.round(totalPotentielDetecte * scenario.taux);
    const couverture = gapProjete > 0 ? Math.round(Math.min(potentielActivable, gapProjete) / gapProjete * 1000) / 10 : 100;
    return { ...scenario, potentielActivable, couverture };
  });
  const selectedBlock = opportunitesBlocs[selectedBlockIndex] || opportunitesBlocs[0] || null;

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16 font-sans antialiased text-slate-800 dark:text-slate-100">
      {/* 1. Header institutionnel Pilote VACTIS */}
      <VactisPilotBanner profil="Laboratoire d'anatomopathologie — CA et cas" />

      {/* 2. En-tête de la page Bridge to Goal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">
              Simulation & Trajectoire Budgétaire
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            Bridge to Goal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-3xl">
            Prospective financière, analyse Run-Rate d'atterrissage et plan d'action pour combler l'écart vers l'objectif annuel.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-semibold">
            <label htmlFor="bridge-to-goal-mois" className="sr-only">Choisir le mois Bridge to Goal</label>
            <select
              id="bridge-to-goal-mois"
              value={moisInput}
              onChange={(event) => setMoisInput(event.target.value)}
              disabled={moisDisponibles.length === 0 || loading}
              className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-cyan-200 dark:border-cyan-800 font-semibold outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60"
            >
              {moisDisponibles.length === 0
                ? <option value="">Aucun mois disponible</option>
                : moisDisponibles.map((mois) => <option key={mois} value={mois}>{mois}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isAdmin && (
            editingAnnualTarget ? (
              <button type="button" onClick={() => setEditingAnnualTarget(false)} className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-800 transition hover:bg-sky-100">
                Fermer objectif annuel
              </button>
            ) : (
              <button type="button" onClick={() => { setEditingTarget(false); setAnnualMessage(''); setAnnualError(''); setEditingAnnualTarget(true); }} className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-800 transition hover:bg-sky-100">
                Objectif annuel
              </button>
            )
          )}

          {isAdmin && !editingTarget && !editingAnnualTarget && (
            <button type="button" onClick={() => { setEditingAnnualTarget(false); setGoalError(''); setGoalMessage(''); setEditingTarget(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer">
              Objectif du mois
            </button>
          )}

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={loading ? 'animate-spin' : ''}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Rafraîchir</span>
          </button>
        </div>
      </div>

      {isAdmin && editingTarget && (
        <section className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm dark:border-cyan-900 dark:bg-slate-900" aria-labelledby="monthly-goal-editor-title">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-cyan-100 bg-sky-50/70 px-4 py-2.5 dark:border-cyan-900/70 dark:bg-sky-950/30">
            <div>
              <h2 id="monthly-goal-editor-title" className="text-sm font-black text-slate-950 dark:text-white">Objectif mensuel · {moisInput || 'mois sélectionné'}</h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Cible de la période, indépendante de l’objectif annuel.</p>
            </div>
            <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[10px] font-bold text-cyan-800 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-200">Cible mensuelle</span>
          </div>

          <div className="grid items-end gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(230px,1.2fr)_auto]">
            <label className="grid gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              <span className="uppercase tracking-wide">Méthode</span>
              <select
                id="bridge-goal-method"
                aria-label="Méthode de calcul mensuel"
                value={targetMethod}
                onChange={(event) => {
                  setTargetMethod(event.target.value);
                  setTargetInput('');
                  setGoalError('');
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="DIRECT">Montant mensuel fixe</option>
                <option value="PERCENTAGE">Pourcentage du CA précédent</option>
              </select>
            </label>
            <label className="grid gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              <span className="uppercase tracking-wide">{targetMethod === 'DIRECT' ? 'Objectif (MAD)' : 'Hausse (%)'}</span>
              <input
                type="number"
                min={targetMethod === 'DIRECT' ? '0.01' : '0'}
                step={targetMethod === 'DIRECT' ? '1' : '0.1'}
                value={targetInput}
                onChange={(event) => setTargetInput(event.target.value)}
                aria-label={targetMethod === 'DIRECT' ? 'Objectif mensuel en MAD' : 'Pourcentage d’augmentation'}
                placeholder={targetMethod === 'DIRECT' ? 'Ex. 100000' : 'Ex. 12'}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <div className="min-h-14 rounded-lg border border-cyan-200 bg-cyan-50/70 px-3 py-2 dark:border-cyan-900 dark:bg-cyan-950/30">
              <p className="text-[9px] font-black uppercase tracking-wide text-cyan-800 dark:text-cyan-300">Aperçu · {moisInput}</p>
              <p className="text-base font-black text-cyan-950 dark:text-cyan-100">{objectifMensuelCalcule.toLocaleString('fr-FR')} MAD</p>
              <p className="text-[10px] text-cyan-800/80 dark:text-cyan-200/80">
                {targetMethod === 'PERCENTAGE'
                  ? `CA précédent ${caMoisPrecedent.toLocaleString('fr-FR')} × (1 + ${Number(targetInput) || 0} %)`
                  : 'Montant fixe saisi'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 lg:flex-col lg:items-stretch">
              <button type="button" onClick={() => { setEditingTarget(false); setGoalError(''); setGoalMessage(''); fetchData(); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                Annuler
              </button>
              <button type="button" onClick={handleSaveTarget} disabled={savingGoal} className="h-9 rounded-lg bg-cyan-700 px-3 text-xs font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50">
                {savingGoal ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </section>
      )}

      {isAdmin && editingAnnualTarget && (
        <section className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm dark:border-sky-900 dark:bg-slate-900" aria-labelledby="annual-goal-editor-title">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-sky-100 bg-sky-50/70 px-4 py-2.5 dark:border-sky-900/70 dark:bg-sky-950/30">
            <div>
              <h2 id="annual-goal-editor-title" className="text-sm font-black text-slate-950 dark:text-white">Objectif annuel de direction</h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Pilote le prorata YTD et les projections, indépendamment de la cible mensuelle.</p>
            </div>
            <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[10px] font-bold text-sky-800 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200">Cible annuelle</span>
          </div>

          <div className="grid items-end gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(230px,1.2fr)_auto]">
            <label className="grid gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              <span className="uppercase tracking-wide">Méthode</span>
              <select
                id="bridge-annual-goal-method"
                value={annualTargetMethod}
                onChange={(event) => {
                  setAnnualTargetMethod(event.target.value);
                  setAnnualTargetInput('');
                  setAnnualError('');
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="DIRECT">Montant annuel fixe</option>
                <option value="PERCENTAGE">Hausse sur le CA de l’année précédente</option>
              </select>
            </label>
            <label className="grid gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              <span className="uppercase tracking-wide">{annualTargetMethod === 'DIRECT' ? 'Objectif annuel (MAD)' : 'Hausse (%)'}</span>
              <input
                type="number"
                min={annualTargetMethod === 'DIRECT' ? '1' : '0'}
                step={annualTargetMethod === 'DIRECT' ? '1' : '0.1'}
                value={annualTargetInput}
                onChange={(event) => setAnnualTargetInput(event.target.value)}
                aria-label={annualTargetMethod === 'DIRECT' ? 'Objectif annuel en MAD' : 'Pourcentage annuel'}
                placeholder={annualTargetMethod === 'DIRECT' ? 'Ex. 1200000' : 'Ex. 12'}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <div className="min-h-14 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/30">
              <p className="text-[9px] font-black uppercase tracking-wide text-sky-800 dark:text-sky-300">Aperçu annuel</p>
              <p className="text-base font-black text-sky-950 dark:text-sky-100">{annualTargetPreview.toLocaleString('fr-FR')} MAD</p>
              <p className="text-[10px] text-sky-800/80 dark:text-sky-200/80">
                {annualTargetMethod === 'PERCENTAGE'
                  ? `CA N-1 ${annualReferenceRevenue.toLocaleString('fr-FR')} × (1 + ${annualInputNumber || 0} %)`
                  : 'Montant annuel fixe'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 lg:flex-col lg:items-stretch">
              <button type="button" onClick={() => { setEditingAnnualTarget(false); setAnnualError(''); setAnnualMessage(''); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                Annuler
              </button>
              <button type="button" onClick={handleSaveAnnualTarget} disabled={annualSaving} className="h-9 rounded-lg bg-sky-700 px-3 text-xs font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50">
                {annualSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </section>
      )}

      {(annualMessage || annualError) && (
        <div role={annualError ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-3 text-sm ${annualError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-sky-200 bg-sky-50 text-sky-800'}`}>
          {annualError || annualMessage}
        </div>
      )}

      {(goalMessage || goalError) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${goalError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {goalError || goalMessage}
        </div>
      )}

      {!data && <div role={error ? 'alert' : 'status'} className={`rounded-2xl border px-4 py-5 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900'}`}>{loading ? 'Chargement des données et de l’objectif enregistrés…' : error || 'Aucune donnée disponible.'}</div>}

      {data && <>
      {/* 3. Encart VACTIS Méthode Bridge to Goal */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-cyan-950 text-white p-6 rounded-3xl shadow-sm border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
            Section 8 - Méthode / Lecture Expo-Clé Cycle VACTIS
          </span>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">1. PASSÉ</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">2. PRÉSENT</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">3. RUN-RATE</span>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-900 text-cyan-300 border border-cyan-700">4. FUTUR</span>
          </div>
        </div>
        <h2 className="text-xl font-black tracking-tight">Bridge to Goal</h2>
        <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">
          Lecture commerciale stratégique selon la méthode Bridge to Goal. Analyse de variance et extrapolation linéaire YTD. Méthode préconisée : arbitrage commercial direct sur le portefeuille interne et dimensionnement des actions requises pour combler l'écart.
        </p>
      </div>

      {/* 4. En-tête Synthèse Laboratoire (4 Métriques Clés) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">
            CA Mois Total Data
          </span>
          <div className="text-2xl font-black text-slate-950 dark:text-white">
            {caMoisTotalLabo.toLocaleString('fr-FR')} MAD
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Activité réelle du laboratoire</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">
            Cas Mois Total Data
          </span>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {casMoisTotalLabo}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Tous types de dossiers validés</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">
            CA Portefeuille
          </span>
          <div className="text-2xl font-black text-slate-950 dark:text-white">
            {(data?.caPortefeuille ?? 0).toLocaleString('fr-FR')} MAD
          </div>
            <p className="text-[10px] text-slate-400 mt-1">Activité facturée aux médecins identifiés</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">
            Cas non affectés
          </span>
          <div className="text-2xl font-black text-slate-950 dark:text-white">
            {nonAffectesCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{(data?.caNonAffectes ?? 0).toLocaleString('fr-FR')} MAD sans médecin rattaché</p>
        </div>
      </div>

      {/* 5. ÉTAPE 1 : Passé — Base de comparaison */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-black">
              1
            </span>
            <h3 className="text-base font-black text-slate-950 dark:text-white">
              Passé — Base de comparaison
            </h3>
          </div>
          <span className="text-xs text-slate-400">Données réelles de facturation cumulée</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">CA YTD Réel</span>
            <div className="text-lg font-black text-slate-950 dark:text-white">{caYtdReel.toLocaleString('fr-FR')} MAD</div>
            <span className="text-[10px] text-slate-400">Total observé</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Période Couverte</span>
            <div className="text-lg font-black text-slate-950 dark:text-white">{moisInput}</div>
            <span className="text-[10px] text-slate-400">Mois actif de calcul</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Mois Écoulés</span>
            <div className="text-lg font-black text-cyan-600 dark:text-cyan-400">{moisEcoules} mois</div>
            <span className="text-[10px] text-slate-400">Base de proratisation</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">CA N-1 Comparable</span>
            <div className="text-lg font-black text-slate-950 dark:text-white">{caNMoins1Comparable.toLocaleString('fr-FR')} MAD</div>
            <span className="text-[10px] text-slate-400">Référence N-1 fin 8 mois</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">CA Moyen Mensuel</span>
            <div className="text-lg font-black text-slate-950 dark:text-white">{caMoyenMensuel.toLocaleString('fr-FR')} MAD</div>
            <span className="text-[10px] text-slate-400">Moyenne glissante</span>
          </div>
        </div>
      </div>

      {/* 6. ÉTAPE 2 : Présent — Où on en est vs objectif prorata */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-black">
              2
            </span>
            <h3 className="text-base font-black text-slate-950 dark:text-white">
              Présent — Où on en est vs objectif prorata
            </h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statutYtd === 'EN AVANCE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : statutYtd === 'RETARD IMPORTANT' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
              {statutYtd === 'RETARD MODERE' ? 'Retard modéré' : statutYtd}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-800 dark:text-cyan-300 block mb-1">
              Objectif du mois sélectionné
            </span>
            <div className="text-xl font-black text-cyan-900 dark:text-cyan-100">
              {objectifMoisActuel.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-cyan-700 dark:text-cyan-300">
              {data?.monthlyTargetMethod
                ? data.monthlyTargetMethod === 'PERCENTAGE'
                  ? `${caMoisPrecedent.toLocaleString('fr-FR')} × (1 + ${(data.monthlyTargetInputValue ?? 0)} / 100) = ${objectifMoisActuel.toLocaleString('fr-FR')} MAD`
                  : 'Montant mensuel direct enregistré'
                : `${targetAnnuel.toLocaleString('fr-FR')} MAD ÷ 12 = ${objectifMoisActuel.toLocaleString('fr-FR')} MAD`}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Objectif YTD Proratisé
            </span>
            <div className="text-xl font-black text-slate-950 dark:text-white">
              {objectifYtdProratise.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-slate-400">Objectif YTD proratisé pour {moisEcoules}/12</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-1">
              Variance YTD
            </span>
            <div className="text-xl font-black text-rose-700 dark:text-rose-400">
              {varianceYtd.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-rose-600 dark:text-rose-400">Écart net observé</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-1">
              Variance YTD %
            </span>
            <div className="text-xl font-black text-rose-700 dark:text-rose-400">
              {varianceYtdPct} %
            </div>
            <span className="text-[10px] text-rose-600 dark:text-rose-400">Variance / objectif YTD</span>
          </div>
        </div>
      </div>

      {/* 7. ÉTAPE 3 : Run-rate — Où on va si rien ne change */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-black">
              3
            </span>
            <h3 className="text-base font-black text-slate-950 dark:text-white">
              Run-rate — Où on va si rien ne change
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Run-Rate Annuel
            </span>
            <div className="text-lg font-black text-slate-950 dark:text-white">
              {runRateAnnuel.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-slate-400">CA YTD extrapolé 12 mois</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-1">
              Écart Projeté Direction
            </span>
            <div className="text-lg font-black text-rose-700 dark:text-rose-400">
              {gapProjete.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-rose-600">Montant net à combler</span>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Objectif Annuel Direction
            </span>
            <div className="text-lg font-black text-sky-900 dark:text-sky-100">
              {targetAnnuel.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-sky-700 dark:text-sky-300">Objectif annuel configuré par l’administration</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Mois Restants
            </span>
            <div className="text-lg font-black text-cyan-600 dark:text-cyan-400">
              {moisRestants} mois
            </div>
            <span className="text-[10px] text-slate-400">Base effort restant</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1">
              Effort Mensuel Requis
            </span>
            <div className="text-lg font-black text-amber-800 dark:text-amber-300">
              {effortAdditionnelMensuel.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400">Au-dessus du run-rate</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-500 space-y-1">
          <div className="font-bold text-slate-800 dark:text-slate-200">Mode de projection : Projection linéaire non saisonnalisée</div>
          <p className="text-[11px] leading-relaxed">
            Projection actuelle : linéaire. Saisonnalité : non intégrée. Niveau de confiance : moyen. La projection annuelle actuelle est basée sur le CA YTD observé et le nombre de mois écoulés.
          </p>
        </div>
      </div>

      {/* 8. ÉTAPE 4 : Futur — Comment combler le gap via opportunités VACTIS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-black">
              4
            </span>
            <div>
              <h3 className="text-base font-black text-slate-950 dark:text-white">
                Futur — Comment combler le gap via opportunités VACTIS
              </h3>
              <p className="text-xs text-slate-400 font-medium">Opportunités identifiées, à confirmer terrain et sous réserve d'exécution terrain</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs">
              {nombreBlocsOpportunites} blocs / {nombreMedecinsOpportunites} médecins
            </span>
          </div>
        </div>

        {/* 3 Cartes de cadrage Futur */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Opportunités Identifiées
            </span>
            <div className="text-xl font-black text-slate-950 dark:text-white">
              {nombreBlocsOpportunites} blocs / {nombreMedecinsOpportunites} médecins
            </div>
            <span className="text-[10px] text-slate-400">Lignes retournées par VACTIS</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block mb-1">
              Potentiel Théorique Détecté
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              {totalPotentielDetecte.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-emerald-600">Scénario prudent si disponible</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1">
              Gap Projeté
            </span>
            <div className="text-xl font-black text-amber-800 dark:text-amber-300">
              {gapProjete.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-amber-700">Référence Bridge to Goal si rien ne change</span>
          </div>
        </div>

        {/* Master-Detail Opportunités : Tableau à gauche + Fiche Contextuelle bloc à droite */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start pt-2">
          {/* Tableau Opportunités Prioritaires (col-span-8) */}
          <div className="xl:col-span-8 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 text-xs font-black text-slate-900 dark:text-white">
              Opportunités prioritaires (Lecture prudente des blocs disponibles)
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 dark:bg-slate-850/50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Opportunité</th>
                  <th className="py-2.5 px-3 text-center">Segment</th>
                  <th className="py-2.5 px-3 text-center">Médecins</th>
                  <th className="py-2.5 px-4 text-right">CA Référence</th>
                  <th className="py-2.5 px-4 text-right">Potentiel Théorique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {opportunitesBlocs.map((b, idx) => {
                  const isSelected = selectedBlockIndex === idx;
                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedBlockIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-50/80 dark:bg-cyan-950/50 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-850/50'
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-bold">
                        {b.titre}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                          b.segment === 'A'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                        }`}>
                          SEGMENT {b.segment}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-black text-slate-800 dark:text-slate-200">
                        {b.medecins}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-300">
                        {b.caReference.toLocaleString('fr-FR')} MAD
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {b.potentielTheorique.toLocaleString('fr-FR')} MAD
                      </td>
                    </tr>
                  );
                })}
                {opportunitesBlocs.length === 0 && <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">Aucune opportunité retournée par les données actuelles.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Fiche contextuelle bloc (col-span-4) */}
          {selectedBlock ? <div className="xl:col-span-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 block">
              Fiche contextuelle
            </span>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white text-base">
                {selectedBlock.titre}
              </h4>
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                SEGMENT {selectedBlock.segment}
              </span>
              <span className="ml-2 text-xs font-bold text-slate-500">
                {selectedBlock.medecins} MÉDECINS
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-750">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">CA Référence</span>
                <div className="text-xs font-black text-slate-850 dark:text-white">
                  {selectedBlock.caReference.toLocaleString('fr-FR')} MAD
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Potentiel Théorique</span>
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {selectedBlock.potentielTheorique.toLocaleString('fr-FR')} MAD
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
              {selectedBlock.description}
            </p>
          </div> : <div className="xl:col-span-4 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-400">Aucune opportunité à détailler.</div>}
        </div>
      </div>

      {/* 9. Décision VACTIS & Arbitrage Managérial (Section 13) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-400 block mb-1">
            Section 13 — Arbitrage Stratégique
          </span>
          <h3 className="text-xl font-black text-slate-950 dark:text-white">
            Décision VACTIS & Prospection
          </h3>
          <p className="text-xs text-slate-400 font-medium">Lecture directionnelle du gap projeté, du potentiel théorique et des scénarios d'activation</p>
        </div>

        {/* 4 Indicateurs Décisionnels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 text-white">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Couverture du Gap VACTIS
            </span>
            <div className="text-2xl font-black text-amber-400">
              {couvertureGapPct} %
            </div>
            <span className="text-[10px] text-slate-400">Part du gap couvrable en interne</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1">
              Gap Restant Après Activation
            </span>
            <div className="text-2xl font-black text-amber-800 dark:text-amber-300">
              {gapRestantApresActivation.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-amber-700">Écart résiduel à combler</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Potentiel Théorique Détecté
            </span>
            <div className="text-2xl font-black text-slate-950 dark:text-white">
              {totalPotentielDetecte.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-slate-400">Montant calculé depuis les leviers backend</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Gap Projeté
            </span>
            <div className="text-2xl font-black text-slate-950 dark:text-white">
              {gapProjete.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-slate-400">Référence Bridge to Goal</span>
          </div>
        </div>

        {/* Recommandation Commerciale Prioritaire (Alerte Managériale) */}
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
              Recommandation Commerciale Prioritaire : {recommandationCouverture.title}
            </span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
            {recommandationCouverture.description} Couverture actuelle : {couvertureGapPct} %. Potentiel théorique à confirmer sur le terrain, sous réserve d'exécution commerciale.
          </p>
        </div>

        {/* Scénarios d'activation des opportunités */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Scénarios d'activation des opportunités (Potentiel activable déduit du potentiel théorique)
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Scénario</th>
                  <th className="py-2.5 px-4 text-right">Potentiel Activable</th>
                  <th className="py-2.5 px-4 text-center">Couverture du Gap</th>
                  <th className="py-2.5 px-4">Lecture Managériale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {scenarioActivation.map((scenario, index) => (
                  <tr key={scenario.label} className={index === 1 ? 'bg-cyan-50/40 dark:bg-cyan-950/20 font-semibold' : ''}>
                    <td className={`py-3 px-4 font-bold ${scenario.className}`}>{scenario.label}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-slate-200">{scenario.potentielActivable.toLocaleString('fr-FR')} MAD</td>
                    <td className={`py-3 px-4 text-center font-bold ${scenario.className}`}>{scenario.couverture} %</td>
                    <td className="py-3 px-4 text-slate-500">{index === 1 ? 'Scénario central recommandé' : index === 0 ? 'Activation limitée' : 'Forte exécution terrain'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Besoin de prospection estimé par segment */}
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Besoin de prospection estimé
            </h4>
            <p className="text-[11px] text-slate-500">
              Pour combler le gap restant de {gapRestantApresActivation.toLocaleString('fr-FR')} MAD, voici le nombre estimé de nouveaux médecins par segment, avec une montée en charge de 50 %.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1">
                Segment A
              </span>
              <div className="text-2xl font-black text-amber-800 dark:text-amber-300">
                {data?.nouveauxMedecinsSegmentA ?? 0}
              </div>
              <p className="text-[10px] text-amber-700 mt-0.5">nouveaux médecins estimés</p>
              <span className="text-[9px] text-slate-400 block mt-2">CA moyen: {(data?.caMoyenSegmentA ?? 0).toLocaleString('fr-FR')} MAD, montée en charge 50 %</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 block mb-1">
                Segment B
              </span>
              <div className="text-2xl font-black text-blue-800 dark:text-blue-300">
                {data?.nouveauxMedecinsSegmentB ?? 0}
              </div>
              <p className="text-[10px] text-blue-700 mt-0.5">nouveaux médecins estimés</p>
              <span className="text-[9px] text-slate-400 block mt-2">CA moyen: {(data?.caMoyenSegmentB ?? 0).toLocaleString('fr-FR')} MAD, montée en charge 50 %</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
                Segment C
              </span>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-200">
                {data?.nouveauxMedecinsSegmentC ?? 0}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">nouveaux médecins estimés</p>
              <span className="text-[9px] text-slate-400 block mt-2">CA moyen: {(data?.caMoyenSegmentC ?? 0).toLocaleString('fr-FR')} MAD, montée en charge 50 %</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
                Segment D
              </span>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-200">
                {data?.nouveauxMedecinsSegmentD ?? 0}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">nouveaux médecins estimés</p>
              <span className="text-[9px] text-slate-400 block mt-2">CA moyen: {(data?.caMoyenSegmentD ?? 0).toLocaleString('fr-FR')} MAD, montée en charge 50 %</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Répartition dynamique du portefeuille
            </h4>
            <p className="text-[11px] text-slate-500">Nombre de médecins par segment selon les données actuellement enregistrées.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['A', data?.nbMedecinsSegmentA ?? 0, 'amber'],
              ['B', data?.nbMedecinsSegmentB ?? 0, 'blue'],
              ['C', data?.nbMedecinsSegmentC ?? 0, 'slate'],
              ['D', data?.nbMedecinsSegmentD ?? 0, 'slate'],
            ].map(([segment, count, color]) => (
              <div key={segment} className={`p-4 rounded-2xl border ${color === 'amber' ? 'bg-amber-50 border-amber-200' : color === 'blue' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'} dark:bg-slate-850 dark:border-slate-800`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Segment {segment}</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{count}</div>
                <span className="text-[10px] text-slate-500">médecins enregistrés</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>}
    </div>
  );
}
