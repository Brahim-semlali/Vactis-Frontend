import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import VactisPilotBanner from '../../components/VactisPilotBanner.jsx';
import { getBridgeToGoal } from '../../api/vactis.js';
import { getBridgeGoalTarget, updateBridgeGoalTarget } from '../../api/settings.js';
import { getMoisDisponibles } from '../../api/activite.js';

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
  const targetInputRef = useRef('');
  useEffect(() => {
    targetInputRef.current = targetInput;
  }, [targetInput]);
  const [editingTarget, setEditingTarget] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalMessage, setGoalMessage] = useState('');
  const [goalError, setGoalError] = useState('');
  const [moisInput, setMoisInput] = useState('');
  const [moisDisponibles, setMoisDisponibles] = useState([]);

  // Selected opportunity block for context drawer
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const savedTarget = isAdmin ? await getBridgeGoalTarget(token) : null;
      const currentTarget = savedTarget ?? targetInputRef.current;
      const res = await getBridgeToGoal(token, {
        target: currentTarget ? parseInt(currentTarget, 10) : undefined,
        mois: moisInput || undefined,
      });
      setData(res);
      if (isAdmin) {
        const nextTarget = savedTarget ?? res?.targetBudget ?? currentTarget;
        setTargetInput(String(nextTarget));
        targetInputRef.current = String(nextTarget);
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
        if (disponibles.length > 0) setMoisInput((current) => current || disponibles[0]);
      })
      .catch(() => {
        if (actif) setMoisDisponibles([]);
      });
    return () => { actif = false; };
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveTarget = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    const parsed = Number(targetInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setGoalError('L’objectif doit être un nombre strictement positif.');
      return;
    }

    setSavingGoal(true);
    setGoalError('');
    setGoalMessage('');

    try {
      const saved = await updateBridgeGoalTarget(token, parsed);
      setTargetInput(String(saved));
      targetInputRef.current = String(saved);
      setGoalMessage('Objectif Bridge to Goal enregistré.');
      setEditingTarget(false);
      await fetchData();
    } catch (e) {
      setGoalError(e.message || 'Impossible d’enregistrer l’objectif.');
    } finally {
      setSavingGoal(false);
    }
  }, [fetchData, isAdmin, targetInput, token]);

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
  const targetAnnuel = data?.targetBudget ?? (Number(targetInput) || 0);
  const objectifYtdProratise = data?.objectifYtdProratise ?? 0;
  const varianceYtd = data?.varianceYtd ?? 0;
  const varianceYtdPct = data?.varianceYtdPct ?? 0;
  const statutYtd = data?.statutYtd ?? 'EN ATTENTE';
  const runRateAnnuel = data?.runRateAnnuel ?? 0;
  const gapProjete = data?.gapProjete ?? 0;
  const effortAdditionnelMensuel = data?.effortAdditionnelMensuel ?? 0;

  // Opportunités internes VACTIS dérivées des indicateurs calculés par le backend.
  const opportunitesBlocs = [
    {
      titre: 'Rétention / baisse activité',
      segment: 'RETENTION',
      medecins: data?.nbMedecinsEnRetention ?? 0,
      caReference: caPortefeuille,
      potentielTheorique: data?.gainRetention ?? 0,
      description: "Potentiel calculé à partir des médecins actuellement classés en rétention.",
    },
    {
      titre: 'Sous-exploitation / développement',
      segment: 'A/B',
      medecins: data?.nbMedecinsDeveloppement ?? 0,
      caReference: caPortefeuille,
      potentielTheorique: data?.gainDeveloppement ?? 0,
      description: 'Potentiel calculé à partir des médecins actifs des segments A et B.',
    },
  ];

  const totalPotentielDetecte = (data?.gainOnboarding ?? 0) + (data?.gainRetention ?? 0) + (data?.gainDeveloppement ?? 0);
  const couvertureGapPct = gapProjete > 0 ? Math.round((Math.min(totalPotentielDetecte, gapProjete) / gapProjete) * 1000) / 10 : 100;
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
  const caParAction = data?.actionsRequises > 0 && gapProjete > 0
    ? Math.round(gapProjete / data.actionsRequises)
    : 0;

  const selectedBlock = opportunitesBlocs[selectedBlockIndex] || opportunitesBlocs[0];

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16 font-sans antialiased text-slate-800 dark:text-slate-100">
      {/* 1. Header institutionnel Pilote VACTIS */}
      <VactisPilotBanner profil="Laboratoire d'anatomopathologie — CA et cas" />

      {/* 2. En-tête de la page Rapport Commercial / Bridge to Goal */}
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
              Lecture Commerciale d'Époque
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            Rapport commercial
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-3xl">
            Bridge to Goal / Variance-to-Plan Analysis YTD + cumul de l'année en cours depuis le 1er janvier jusqu'au mois actif.
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
            <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
              Workbook vactis_amana_marrakech_ca_septembre_2026
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Refresh récent
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isAdmin && (
            editingTarget ? (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <input
                  type="number"
                  min="1"
                  value={targetInput}
                  onChange={(event) => setTargetInput(event.target.value)}
                  className="h-10 w-36 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500"
                />
                <button type="button" onClick={handleSaveTarget} disabled={savingGoal} className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {savingGoal ? '...' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => { setEditingTarget(false); setGoalError(''); setGoalMessage(''); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  Annuler
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingTarget(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer">
                Modifier l’objectif
              </button>
            )
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

      {(goalMessage || goalError) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${goalError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {goalError || goalMessage}
        </div>
      )}

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
            CA Mois Total Labo
          </span>
          <div className="text-2xl font-black text-slate-950 dark:text-white">
            {caMoisTotalLabo.toLocaleString('fr-FR')} MAD
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Activité réelle du laboratoire</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">
            Cas Mois Total Labo
          </span>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {casMoisTotalLabo}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Tous types de dossiers validés</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">
            Médecins identifiés
          </span>
          <div className="text-2xl font-black text-slate-950 dark:text-white">
            {data?.medecinsIdentifies ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Médecins avec activité sur la période</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">
            Non affectés
          </span>
          <div className="text-2xl font-black text-slate-950 dark:text-white">
            {nonAffectesCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Dossiers sans médecin rattaché</p>
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
            {statutYtd}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          {isAdmin && (
            <button
              type="button"
              onClick={() => setEditingTarget((prev) => !prev)}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              <span>Modifier l'objectif</span>
            </button>
          )}
        </div>

        {isAdmin && editingTarget && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <label className="text-xs font-bold">Objectif Annuel Direction (MAD) :</label>
            <input
              type="number"
              min="1"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold w-44"
            />
            <button
              type="button"
              onClick={handleSaveTarget}
              disabled={savingGoal}
              className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50"
            >
              {savingGoal ? '...' : 'Appliquer'}
            </button>
            <button
              type="button"
              onClick={() => { setEditingTarget(false); setGoalError(''); setGoalMessage(''); }}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700"
            >
              Annuler
            </button>
          </div>
        )}

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

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Objectif Annuel Direction
            </span>
            <div className="text-lg font-black text-slate-950 dark:text-white">
              {targetAnnuel.toLocaleString('fr-FR')} MAD
            </div>
            <span className="text-[10px] text-slate-400">Hypothèse : croissance +10%</span>
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
              </tbody>
            </table>
          </div>

          {/* Fiche contextuelle bloc (col-span-4) */}
          <div className="xl:col-span-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
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
          </div>
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
              Recommandation Commerciale Prioritaire : Prospection indispensable
            </span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
            Le portefeuille actuel ne couvre pas suffisamment le gap ({couvertureGapPct}% &lt; 50%). Les actions internes sont nécessaires, mais la prospection devient indispensable. Potentiel théorique à confirmer terrain, sous réserve d'exécution commerciale.
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
              Pour combler le gap restant de {gapRestantApresActivation.toLocaleString('fr-FR')} MAD, le système estime {data?.actionsRequises ?? 0} actions supplémentaires.
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
    </div>
  );
}
