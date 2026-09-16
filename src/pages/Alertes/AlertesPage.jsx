import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import VactisPilotBanner from '../../components/VactisPilotBanner.jsx';
import {
  getAlertesActives,
  getToutesAlertes,
  runBatchAlertes,
  traiterAlerte,
  genererActionDepuisAlerte,
} from '../../api/vactis.js';

export default function AlertesPage() {
  const { token } = useAuth();
  const [alertes, setAlertes] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [batchMsg, setBatchMsg] = useState(null);
  const [error, setError] = useState(null);

  // Selected item for the right context panel (Master-Detail)
  const [selectedId, setSelectedId] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterSilence, setFilterSilence] = useState('TOUS');
  const [filterStatut, setFilterStatut] = useState('TOUS');
  const [filterSegment, setFilterSegment] = useState('TOUS');
  const [filterSpecialite, setFilterSpecialite] = useState('TOUS');
  const [filterUrgence, setFilterUrgence] = useState('TOUS');

  const [refreshTime, setRefreshTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const fetchAlertes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = showAll ? await getToutesAlertes(token) : await getAlertesActives(token);
      const list = data ?? [];
      setAlertes(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
      const d = new Date();
      setRefreshTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, showAll, selectedId]);

  useEffect(() => {
    fetchAlertes();
  }, [fetchAlertes]);

  const handleRunBatch = async () => {
    setActionLoading(true);
    setBatchMsg(null);
    try {
      const res = await runBatchAlertes(token);
      setBatchMsg(`✅ Surveillance hebdomadaire exécutée : ${res.nbAlertesCreees} alerte(s) générée(s).`);
      await fetchAlertes();
    } catch (e) {
      setBatchMsg(`❌ Erreur batch : ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTraiter = async (id, statut) => {
    setActionLoading(true);
    try {
      await traiterAlerte(token, id, statut);
      await fetchAlertes();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenererAction = async (id) => {
    setActionLoading(true);
    try {
      await genererActionDepuisAlerte(token, id);
      alert('Action commerciale prioritaire créée avec succès !');
      await fetchAlertes();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Unique specialities for filter
  const specialites = useMemo(() => {
    const set = new Set();
    alertes.forEach((a) => {
      if (a.medecin?.specialite) set.add(a.medecin.specialite);
    });
    return Array.from(set).sort();
  }, [alertes]);

  // Filtered alertes
  const filteredAlertes = useMemo(() => {
    return alertes.filter((a) => {
      const m = a.medecin || {};
      const nomComplet = `${m.nom || ''} ${m.prenom || ''} ${m.organisme || ''} ${m.specialite || ''}`.toLowerCase();
      if (search && !nomComplet.includes(search.toLowerCase())) return false;

      if (filterSilence !== 'TOUS') {
        const type = a.typeAlerte || '';
        if (filterSilence === 'CRITIQUE' && !type.includes('SILENCE') && !type.includes('CHURN')) return false;
      }

      if (filterStatut !== 'TOUS') {
        const st = m.statut || m.statutPilotage || '';
        if (st.toUpperCase() !== filterStatut.toUpperCase()) return false;
      }

      if (filterSegment !== 'TOUS') {
        const seg = m.segment || '';
        if (seg.toUpperCase() !== filterSegment.toUpperCase()) return false;
      }

      if (filterSpecialite !== 'TOUS' && m.specialite !== filterSpecialite) {
        return false;
      }

      if (filterUrgence !== 'TOUS') {
        const score = a.scoreUrgenceSilence ?? 0;
        if (filterUrgence === 'CRITIQUE' && score < 75) return false;
        if (filterUrgence === 'MOYEN' && (score < 40 || score >= 75)) return false;
      }

      return true;
    });
  }, [alertes, search, filterSilence, filterStatut, filterSegment, filterSpecialite, filterUrgence]);

  // Selected item
  const selectedAlerte = useMemo(() => {
    if (!selectedId) return filteredAlertes[0] || null;
    return alertes.find((a) => a.id === selectedId) || filteredAlertes[0] || null;
  }, [alertes, filteredAlertes, selectedId]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = alertes.length;
    const silencesCritiques = alertes.filter((a) => (a.scoreUrgenceSilence ?? 0) >= 70 || a.typeAlerte === 'CHURN_IMMINENT' || a.joursSilence >= 30).length;
    const segmentAB = alertes.filter((a) => ['A', 'B'].includes((a.medecin?.segment || '').toUpperCase())).length;
    const actionsUrgence = alertes.filter((a) => a.statutAlerte === 'A_TRAITER').length;
    return { total, silencesCritiques, segmentAB, actionsUrgence };
  }, [alertes]);

  const handleResetFilters = () => {
    setSearch('');
    setFilterSilence('TOUS');
    setFilterStatut('TOUS');
    setFilterSegment('TOUS');
    setFilterSpecialite('TOUS');
    setFilterUrgence('TOUS');
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-12 font-sans antialiased text-slate-800 dark:text-slate-100">
      {/* 1. Header institutionnel Pilote VACTIS */}
      <VactisPilotBanner profil="Laboratoire d'anatomopathologie — CA et cas" />

      {/* 2. En-tête de la page Alertes */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.2 19.1 19.1M12 12h.01" />
              </svg>
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">
              Surveillance Hebdomadaire
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            Alertes hebdo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
            Surveillance hebdomadaire des silences radio et signaux critiques détectés par VACTIS.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-semibold">
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {kpis.total} alertes
            </span>
            <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold">
              {kpis.silencesCritiques} silences critiques
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
              Refresh {refreshTime}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchAlertes}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={loading ? 'animate-spin' : ''}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Rafraîchir</span>
          </button>

          <button
            type="button"
            onClick={handleRunBatch}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Lancer surveillance batch</span>
          </button>
        </div>
      </div>

      {batchMsg && (
        <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-900 text-cyan-900 dark:text-cyan-200 text-xs font-semibold flex items-center justify-between">
          <span>{batchMsg}</span>
          <button type="button" onClick={() => setBatchMsg(null)} className="text-cyan-700 font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* 3. Les 4 KPI Cards officielles (comme sur la capture d'écran) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 : ALERTES TOTALES (Carte Noire) */}
        <div className="bg-slate-950 text-white p-5 rounded-3xl shadow-sm relative overflow-hidden flex items-center justify-between border border-slate-900">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">
              Alertes totales
            </span>
            <div className="text-3xl font-black tracking-tight">{kpis.total}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>

        {/* Card 2 : SILENCES CRITIQUES */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 block mb-1">
              Silences critiques
            </span>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {kpis.silencesCritiques}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
        </div>

        {/* Card 3 : SEGMENT A/B */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 block mb-1">
              Segment A/B
            </span>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {kpis.segmentAB}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>

        {/* Card 4 : ACTIONS URGENCE */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 block mb-1">
              Actions urgence
            </span>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {kpis.actionsUrgence}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
      </div>

      {/* 4. Barre de Filtres Complète */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[240px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher médecin, spécialité, organisme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Menu déroulant NIVEAU SILENCE */}
        <div className="flex flex-col min-w-[130px]">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5 ml-1">Niveau silence</span>
          <select
            value={filterSilence}
            onChange={(e) => setFilterSilence(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="TOUS">Tous</option>
            <option value="CRITIQUE">Silence critique</option>
          </select>
        </div>

        {/* Menu déroulant STATUT */}
        <div className="flex flex-col min-w-[130px]">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5 ml-1">Statut</span>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="TOUS">Tous</option>
            <option value="RETENTION">Rétention</option>
            <option value="SURVEILLANCE">Surveillance</option>
            <option value="PROGRESSION">Progression</option>
            <option value="ACTIF_STABLE">Actif stable</option>
            <option value="ONBOARDING">Onboarding</option>
          </select>
        </div>

        {/* Menu déroulant SEGMENT */}
        <div className="flex flex-col min-w-[110px]">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5 ml-1">Segment</span>
          <select
            value={filterSegment}
            onChange={(e) => setFilterSegment(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="TOUS">Tous</option>
            <option value="A">Segment A</option>
            <option value="B">Segment B</option>
            <option value="C">Segment C</option>
            <option value="D">Segment D</option>
          </select>
        </div>

        {/* Menu déroulant SPÉCIALITÉ */}
        {specialites.length > 0 && (
          <div className="flex flex-col min-w-[130px]">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5 ml-1">Spécialité</span>
            <select
              value={filterSpecialite}
              onChange={(e) => setFilterSpecialite(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="TOUS">Tous</option>
              {specialites.map((sp) => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>
        )}

        {/* Menu déroulant URGENCE */}
        <div className="flex flex-col min-w-[110px]">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5 ml-1">Urgence</span>
          <select
            value={filterUrgence}
            onChange={(e) => setFilterUrgence(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="TOUS">Tous</option>
            <option value="CRITIQUE">Critique</option>
            <option value="MOYEN">Moyen</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleResetFilters}
          className="self-end px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Reset</span>
        </button>
      </div>

      {/* 5. Master-Detail Layout : Table à gauche (70%) + Fiche Contextuelle à droite (30%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Tableau Signaux Hebdomadaires (XL: col-span-8) */}
        <div className="xl:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-white">
                Signaux hebdomadaires
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {filteredAlertes.length} alerte(s) affichée(s) sur {alertes.length} chargée(s).
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span>Inclure traitées & ignorées</span>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-850 text-slate-400 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Médecin</th>
                  <th className="py-3 px-4">Lieu / Organisme</th>
                  <th className="py-3 px-3">Segment</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-3">Niveau Silence</th>
                  <th className="py-3 px-3 text-center">Jours sans act.</th>
                  <th className="py-3 px-4">Fréquence Détectée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAlertes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Aucun signal hebdomadaire ne correspond à vos filtres.
                    </td>
                  </tr>
                ) : (
                  filteredAlertes.map((a) => {
                    const isSelected = selectedAlerte?.id === a.id;
                    const m = a.medecin || {};
                    const segment = (m.segment || 'C').toUpperCase();
                    const intervalle = a.intervalleMoyen ? `${a.intervalleMoyen} jours` : '15 jours';

                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedId(a.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-50/70 dark:bg-cyan-950/40 font-semibold'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-1.5">
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 shrink-0" />
                            )}
                            <div>
                              <div>Dr {m.nom} {m.prenom || ''}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{m.specialite || 'Généraliste'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {m.organisme || 'Cabinet privé'}
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black ${
                            segment === 'A'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/80'
                              : segment === 'B'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300/80'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            SEGMENT {segment}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80">
                            {m.statut || m.statutPilotage || 'RÉTENTION'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            silence critique
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-black text-slate-850 dark:text-white">
                          {a.joursSilence}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              1 cas tous les {intervalle}
                            </span>
                            <span className="text-[9px] font-bold tracking-wider uppercase text-cyan-700 dark:text-cyan-400">
                              RYTHME RÉCENT
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fiche Contextuelle à droite (XL: col-span-4) */}
        <div className="xl:col-span-4 sticky top-6">
          {selectedAlerte ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-5">
              {/* En-tête Fiche */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 block mb-1">
                  Fiche contextuelle
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedAlerte.medecin?.nom || 'MÉDECIN'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedAlerte.medecin?.specialite || 'Autre'}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/80">
                    SEGMENT {selectedAlerte.medecin?.segment || 'A'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200">
                    {selectedAlerte.medecin?.statut || 'RÉTENTION (RELATION À CONSOLIDER)'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                    SILENCE CRITIQUE
                  </span>
                </div>
              </div>

              {/* Bloc SILENCE RADIO */}
              <div className="bg-slate-50 dark:bg-slate-850/80 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-rose-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.2 19.1 19.1M12 12h.01" />
                    </svg>
                  </span>
                  <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                    Silence radio
                  </span>
                </div>

                <div className="text-sm font-black text-rose-700 dark:text-rose-400">
                  SILENCE CRITIQUE
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                  {selectedAlerte.joursSilence} jours sans activité
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                    Fréquence détectée
                  </span>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                    1 cas tous les {selectedAlerte.intervalleMoyen || 5} jours
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                    RYTHME RÉCENT
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Rupture observée
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                    rupture critique
                  </span>
                </div>
              </div>

              {/* Grille Score Urgence & Action Silence */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Score urgence
                  </span>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                    {Math.round(selectedAlerte.scoreUrgenceSilence ?? 84.2)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Action silence
                  </span>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    urgence silence
                  </div>
                </div>
              </div>

              {/* Bouton Action VACTIS Détaillée & Déclenchement */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleGenererAction(selectedAlerte.id)}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <span>Créer action de tournée (J+3)</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleTraiter(selectedAlerte.id, 'TRAITEE')}
                    disabled={actionLoading}
                    className="flex-1 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer"
                  >
                    ✓ Marquer traitée
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTraiter(selectedAlerte.id, 'IGNOREE')}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Ignorer
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 text-white flex items-center justify-center gap-2 text-xs font-bold shadow-xs cursor-pointer hover:bg-slate-900 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  <span>Analyse VACTIS détaillée</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 text-xs">
              Sélectionnez une ligne dans le tableau pour charger la fiche contextuelle.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
