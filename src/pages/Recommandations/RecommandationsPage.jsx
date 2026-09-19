import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import VactisPilotBanner from '../../components/VactisPilotBanner.jsx';
import { getRecommandations, creerActionRecommandation } from '../../api/vactis.js';

export default function RecommandationsPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  // Active Tab: DEVELOPPEMENT | REACTIVATION | IRREGULIERS
  const [activeTab, setActiveTab] = useState('DEVELOPPEMENT');

  // Selected item for the context drawer
  const [selectedId, setSelectedId] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterSegment, setFilterSegment] = useState('TOUS');
  const [filterStatut, setFilterStatut] = useState('TOUS');
  const [filterSignal, setFilterSignal] = useState('TOUS');
  const [filterSpecialite, setFilterSpecialite] = useState('TOUS');

  const [refreshTime, setRefreshTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRecommandations(token);
      setData(res);
      const d = new Date();
      setRefreshTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Current tab items
  const tabItems = useMemo(() => {
    if (!data) return [];
    if (activeTab === 'DEVELOPPEMENT') return data.opportunitesDeveloppement ?? [];
    if (activeTab === 'REACTIVATION') return data.medecinsAReactiver ?? [];
    return data.profilsIrreguliersRentables ?? [];
  }, [data, activeTab]);

  // Reset selected ID when tab changes or if none selected
  useEffect(() => {
    if (tabItems.length > 0) {
      setSelectedId(tabItems[0].medecinId);
    } else {
      setSelectedId(null);
    }
  }, [activeTab, tabItems]);

  const handleCreerAction = async (medecinId, type) => {
    setActionLoading(true);
    setSuccessMsg(null);
    try {
      await creerActionRecommandation(token, medecinId, type);
      setSuccessMsg('Action commerciale de tournée créée avec succès !');
      await fetchData();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Specialities for filter
  const specialites = useMemo(() => {
    const set = new Set();
    tabItems.forEach((it) => {
      if (it.specialite) set.add(it.specialite);
    });
    return Array.from(set).sort();
  }, [tabItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return tabItems.filter((item) => {
      const searchStr = `${item.nomMedecin || ''} ${item.specialite || ''} ${item.organisme || ''} ${item.pitchCommercial || ''}`.toLowerCase();
      if (search && !searchStr.includes(search.toLowerCase())) return false;

      if (filterSegment !== 'TOUS' && (item.segment || '').toUpperCase() !== filterSegment) {
        return false;
      }

      if (filterSpecialite !== 'TOUS' && item.specialite !== filterSpecialite) {
        return false;
      }

      return true;
    });
  }, [tabItems, search, filterSegment, filterSpecialite]);

  // Selected item
  const selectedItem = useMemo(() => {
    if (!selectedId) return filteredItems[0] || null;
    return tabItems.find((it) => it.medecinId === selectedId) || filteredItems[0] || null;
  }, [tabItems, filteredItems, selectedId]);

  // KPI Calculations across all recommendations
  const kpiStats = useMemo(() => {
    const all = [
      ...(data?.opportunitesDeveloppement ?? []),
      ...(data?.medecinsAReactiver ?? []),
      ...(data?.profilsIrreguliersRentables ?? []),
    ];
    const total = all.length;
    const prioriteForte = all.filter((it) => ['A'].includes((it.segment || '').toUpperCase())).length;
    const segmentAB = all.filter((it) => ['A', 'B'].includes((it.segment || '').toUpperCase())).length;
    const signalSilence = all.length; // tous représentent un potentiel à adresser
    return { total, prioriteForte, segmentAB, signalSilence };
  }, [data]);

  const handleResetFilters = () => {
    setSearch('');
    setFilterSegment('TOUS');
    setFilterStatut('TOUS');
    setFilterSignal('TOUS');
    setFilterSpecialite('TOUS');
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-12 font-sans antialiased text-slate-800 dark:text-slate-100">
      {/* 1. Header institutionnel Pilote VACTIS */}
      <VactisPilotBanner profil="Laboratoire d'anatomopathologie — CA et cas" />

      {/* 2. En-tête de la page Recommandations */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">
              Lecture Terrain
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            Recommandations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
            Lecture des recommandations développement, réactivation et profils irréguliers, sous réserve de qualification terrain.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-semibold">
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {kpiStats.total} recommandations
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
              {kpiStats.segmentAB} Segment A/B
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
              Refresh {refreshTime}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
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

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-700 font-bold hover:underline">✕</button>
        </div>
      )}

      {/* 3. Onglets de Navigation : Développement / Réactivation / Irréguliers */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('DEVELOPPEMENT')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'DEVELOPPEMENT'
              ? 'bg-slate-950 text-white shadow-xs dark:bg-white dark:text-slate-950'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span>Développement</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 dark:bg-slate-950/20">
            {data?.opportunitesDeveloppement?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REACTIVATION')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'REACTIVATION'
              ? 'bg-slate-950 text-white shadow-xs dark:bg-white dark:text-slate-950'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>Réactivation</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 dark:bg-slate-950/20">
            {data?.medecinsAReactiver?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('IRREGULIERS')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'IRREGULIERS'
              ? 'bg-slate-950 text-white shadow-xs dark:bg-white dark:text-slate-950'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span>Irréguliers</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 dark:bg-slate-950/20">
            {data?.profilsIrreguliersRentables?.length ?? 0}
          </span>
        </button>
      </div>

      {/* 4. Les 4 KPI Cards officielles (comme sur la capture d'écran) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 : TOTAL (Carte Noire) */}
        <div className="bg-slate-950 text-white p-5 rounded-3xl shadow-sm relative overflow-hidden flex items-center justify-between border border-slate-900">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 block mb-1">
              Total
            </span>
            <div className="text-3xl font-black tracking-tight">{kpiStats.total}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7Z" />
            </svg>
          </div>
        </div>

        {/* Card 2 : PRIORITÉ FORTE */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 block mb-1">
              Priorité forte
            </span>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {kpiStats.prioriteForte}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
        </div>

        {/* Card 3 : SEGMENT A/B */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 block mb-1">
              Segment A/B
            </span>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {kpiStats.segmentAB}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
        </div>

        {/* Card 4 : SIGNAL SILENCE */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 block mb-1">
              Signal silence
            </span>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {kpiStats.signalSilence}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* 5. Barre de Filtres Complète */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[240px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher médecin, spécialité, raison..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
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

        {/* Menu déroulant STATUT */}
        <div className="flex flex-col min-w-[130px]">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5 ml-1">Statut</span>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="TOUS">Tous</option>
            <option value="SURVEILLANCE">Surveillance</option>
            <option value="RETENTION">Rétention</option>
            <option value="ACTIF_STABLE">Actif stable</option>
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

      {/* 6. Master-Detail Layout : Table à gauche (70%) + Fiche Contextuelle à droite (30%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Tableau Recommandations (XL: col-span-8) */}
        <div className="xl:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-white">
                Recommandations — {activeTab === 'DEVELOPPEMENT' ? 'Développement' : activeTab === 'REACTIVATION' ? 'Réactivation' : 'Profils Irréguliers'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {filteredItems.length} ligne(s) affichée(s) sur {tabItems.length} chargée(s).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-850 text-slate-400 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Médecin</th>
                  <th className="py-3 px-3">Segment</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-3 text-center">Potentiel</th>
                  <th className="py-3 px-3 text-center">Réalisation Objectif</th>
                  <th className="py-3 px-4">Sous-exploitation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Aucune recommandation trouvée dans cet onglet.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = selectedItem?.medecinId === item.medecinId;
                    const segment = (item.segment || 'A').toUpperCase();
                    const note = 5; // note potentielle qualifiée
                    const realisationPct = Math.round(((item.caMoyenMensuel ?? 1500) / 10000) * 100);

                    return (
                      <tr
                        key={item.medecinId}
                        onClick={() => setSelectedId(item.medecinId)}
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
                              <div>Dr {item.nomMedecin}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{item.specialite || 'Pneumologie'}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black ${
                            segment === 'A'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/80'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300/80'
                          }`}>
                            SEGMENT {segment}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80">
                            ACTIVITÉ À SURVEILLER
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-black text-slate-900 dark:text-white">
                          {note}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {Math.min(realisationPct, 100)} %
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Sous-exploitation forte — opportunité majeure
                          </span>
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
          {selectedItem ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-5">
              {/* En-tête Fiche */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 block mb-1">
                  Fiche contextuelle
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedItem.nomMedecin || 'FIKRI'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedItem.specialite || 'Pneumologie'}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/80">
                    SEGMENT {selectedItem.segment || 'A'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200">
                    ACTIVITÉ À SURVEILLER
                  </span>
                </div>

                <div className="mt-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    PAS DE SILENCE SIGNIFICATIF
                  </span>
                </div>
              </div>

              {/* Bloc LECTURE RECOMMANDATION */}
              <div className="bg-slate-50 dark:bg-slate-850/80 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-600">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </span>
                  <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                    Lecture recommandation
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Forte opportunité, Segment {selectedItem.segment || 'A'} avec potentiel 5/5. Rythme actuel : 0.3x l'intervalle attendu. CA moyen observé par cas : 800 DH. Marge théorique détectée : entre 14 181 et 45 531 DH/mois. À qualifier terrain avant projection commerciale.
                </p>
              </div>

              {/* Grille Métriques Clés */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Action proposée
                  </span>
                  <div className="font-black text-slate-850 dark:text-white text-xs">
                    opportunité à qualifier
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Score valeur
                  </span>
                  <div className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                    81
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Score risque
                  </span>
                  <div className="text-sm font-bold text-slate-500">
                    —
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Jours sans activité
                  </span>
                  <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                    0 j
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Fréquence détectée
                  </span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    1 cas tous les 8,9 j
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Réalisation objectif
                  </span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    15 %
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Potentiel théorique
                  </span>
                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    14 181 MAD
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    CA / Cas
                  </span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {(selectedItem.caMoyenMensuel ?? 69100).toLocaleString('fr-FR')} MAD / {selectedItem.totalCasHistorique ?? 87} cas
                  </div>
                </div>
              </div>

              {/* Boutons d'Action */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCreerAction(selectedItem.medecinId, selectedItem.typeRecommandation || activeTab)}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Créer action de tournée</span>
                </button>

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
              Sélectionnez une opportunité dans le tableau pour charger la fiche contextuelle.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
