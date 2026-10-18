import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getReclamations,
  creerReclamation,
  mettreAJourStatutReclamation,
  getReclamationHistorique,
} from '../../api/vactis.js';
import { getMedecins } from '../../api/medecins.js';

const STATUTS_VACTIS = [
  { value: 'A_TRAITER', label: 'À traiter', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'EN_COURS', label: 'En cours', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'TRAITEE', label: 'Traité', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'EN_ATTENTE_INFORMATION', label: "En attente d'information", color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'CLOTURE_SANS_ACTION', label: 'Clôturé sans action', color: 'bg-slate-100 text-slate-800 border-slate-200' },
];

const STATUTS_LEGACY_MAP = {
  OUVERTE: { label: 'À traiter (ancienne)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  RESOLUE: { label: 'Traité (ancienne)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJETEE: { label: 'Rejetée (archivée)', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  CLOTUREE: { label: 'Clôturée (archivée)', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const CATEGORIES = [
  { value: 'DELAIS_RESULTATS', label: 'Délais des résultats' },
  { value: 'ERREUR_TECHNIQUE', label: 'Erreur ou non-conformité analyse' },
  { value: 'FACTURATION_TARIFS', label: 'Problème de facturation' },
  { value: 'LOGISTIQUE_COURSIER', label: 'Retard de transmission / logistique' },
  { value: 'RELATIONNEL_ACCUEIL', label: 'Relation ou accueil patient' },
  { value: 'AUTRE', label: 'Autre motif (dont kit ou prélèvement)' },
];

const PRIORITES = [
  { value: 'BASSE', label: 'Basse', color: 'bg-slate-100 text-slate-700' },
  { value: 'MOYENNE', label: 'Moyenne', color: 'bg-sky-100 text-sky-800' },
  { value: 'HAUTE', label: 'Haute', color: 'bg-amber-100 text-amber-800 font-semibold' },
  { value: 'URGENTE', label: 'Urgente', color: 'bg-rose-100 text-rose-800 font-bold' },
];

function formatDoctorOption(medecin) {
  const name = [medecin.prenom, medecin.nom].filter(Boolean).join(' ').trim();
  const identity = name ? `Dr ${name}` : medecin.codeMedecin || `Médecin #${medecin.id}`;
  const details = [medecin.specialite, medecin.organisme, medecin.ville].filter(Boolean).join(' · ');
  return details ? `${identity} — ${details}` : identity;
}

export default function ReclamationsPage() {
  const { token, userProfile } = useAuth();

  const isDirectionOrAdmin = useMemo(() => {
    const role = (userProfile?.role || '').toUpperCase();
    return role.includes('ADMIN') || role.includes('DIRECTION') || role.includes('DIRECTEUR') || role.includes('PILOTAGE');
  }, [userProfile]);

  const [reclamations, setReclamations] = useState([]);
  const [medecinsList, setMedecinsList] = useState([]);
  const [loadingMedecins, setLoadingMedecins] = useState(false);
  const [medecinsError, setMedecinsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterPriorite, setFilterPriorite] = useState('');
  const [search, setSearch] = useState('');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReclamation, setSelectedReclamation] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);

  // Formulaire création
  const [createForm, setCreateForm] = useState({
    medecinId: '',
    dateVisite: new Date().toISOString().split('T')[0],
    categorie: 'DELAIS_RESULTATS',
    priorite: 'MOYENNE',
    description: '',
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const updateCreateForm = (changes) => {
    setCreateForm((current) => ({ ...current, ...changes }));
    setCreateError('');
  };

  // Formulaire mise à jour statut (Direction/Admin)
  const [updateForm, setUpdateForm] = useState({
    statut: 'TRAITEE',
    solution: '',
    responsable: '',
    prochaineInstruction: '',
    dateTraitement: new Date().toISOString().split('T')[0],
  });
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const loadReclamations = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getReclamations(token, {
        search: search || undefined,
        statut: filterStatut || undefined,
        categorie: filterCategorie || undefined,
        priorite: filterPriorite || undefined,
      });
      setReclamations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement réclamations:', err);
      setReclamations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReclamations();
  }, [token, filterStatut, filterCategorie, filterPriorite]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoadingMedecins(true);
    setMedecinsError('');
    getMedecins(token)
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res)
          ? res
          : res?.items ?? res?.medecins ?? res?.content ?? [];
        setMedecinsList(Array.isArray(list) ? list.filter((medecin) => medecin?.id != null) : []);
      })
      .catch((requestError) => {
        if (!active) return;
        setMedecinsList([]);
        setMedecinsError(requestError.message || 'Impossible de charger la liste des médecins.');
      })
      .finally(() => {
        if (active) setLoadingMedecins(false);
      });
    return () => { active = false; };
  }, [token]);

  const handleOpenDetail = async (rec) => {
    setSelectedReclamation(rec);
    setUpdateForm({
      statut: rec.statut || 'TRAITEE',
      solution: rec.solutionApportee || '',
      responsable: rec.responsableAffecte || '',
      prochaineInstruction: rec.prochaineInstruction || '',
      dateTraitement: rec.dateResolution || new Date().toISOString().split('T')[0],
    });
    setUpdateError('');
    setLoadingHistorique(true);
    try {
      const hist = await getReclamationHistorique(token, rec.id);
      setHistorique(Array.isArray(hist) ? hist : []);
    } catch {
      setHistorique([]);
    } finally {
      setLoadingHistorique(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.medecinId) {
      setCreateError('Veuillez sélectionner un médecin.');
      return;
    }
    if (!createForm.dateVisite) {
      setCreateError('La date de visite est obligatoire.');
      return;
    }
    if (!createForm.description.trim()) {
      setCreateError('La description / motif de la réclamation est obligatoire.');
      return;
    }

    setCreating(true);
    try {
      await creerReclamation(token, {
        medecinId: Number(createForm.medecinId),
        dateVisite: createForm.dateVisite,
        categorie: createForm.categorie,
        priorite: createForm.priorite,
        description: createForm.description.trim(),
      });
      setShowCreateModal(false);
      setCreateForm({
        medecinId: '',
        dateVisite: new Date().toISOString().split('T')[0],
        categorie: 'DELAIS_RESULTATS',
        priorite: 'MOYENNE',
        description: '',
      });
      loadReclamations();
    } catch (err) {
      setCreateError(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatutSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReclamation) return;
    setUpdateError('');
    if ((updateForm.statut === 'TRAITEE' || updateForm.statut === 'CLOTURE_SANS_ACTION') && (!updateForm.solution || !updateForm.solution.trim())) {
      setUpdateError('Le commentaire de réponse est obligatoire pour Traité ou Clôturé sans action.');
      return;
    }
    if (updateForm.statut === 'EN_COURS' && !updateForm.responsable.trim()) {
      setUpdateError('Un responsable doit être affecté avant le passage En cours.');
      return;
    }
    setUpdating(true);
    try {
      const updated = await mettreAJourStatutReclamation(token, selectedReclamation.id, {
        statut: updateForm.statut,
        solution: updateForm.solution,
        responsable: updateForm.responsable,
        prochaineInstruction: updateForm.prochaineInstruction,
        dateTraitement: updateForm.dateTraitement,
      });
      setSelectedReclamation(updated);
      loadReclamations();
      // Recharger l'historique
      const hist = await getReclamationHistorique(token, selectedReclamation.id);
      setHistorique(Array.isArray(hist) ? hist : []);
    } catch (err) {
      setUpdateError(err.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Gestion des Réclamations
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isDirectionOrAdmin
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            }`}>
              {isDirectionOrAdmin ? 'Vue Direction / Pilotage' : 'Vue Commercial'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ticketing réclamations prescripteurs, instructions direction et historique de résolution (Sections 5 et 7).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#009B83] hover:bg-[#00826e] text-white font-semibold text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Déclarer une réclamation
        </button>
      </div>

      {/* Barre de filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Recherche</label>
          <input
            type="text"
            placeholder="Médecin, motif..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadReclamations()}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#009B83]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Statut (5 autorisés)</label>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#009B83]"
          >
            <option value="">Tous les statuts</option>
            {STATUTS_VACTIS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Catégorie</label>
          <select
            value={filterCategorie}
            onChange={(e) => setFilterCategorie(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#009B83]"
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Priorité</label>
          <select
            value={filterPriorite}
            onChange={(e) => setFilterPriorite(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#009B83]"
          >
            <option value="">Toutes les priorités</option>
            {PRIORITES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau des réclamations */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Réf / Date</th>
                <th className="px-4 py-3">Médecin & Organisme</th>
                <th className="px-4 py-3">Commercial</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Priorité</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Prochaine Instruction</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                    Chargement des réclamations...
                  </td>
                </tr>
              ) : reclamations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-slate-400">
                    Aucune réclamation trouvée pour ces critères.
                  </td>
                </tr>
              ) : (
                reclamations.map((rec) => {
                  const statutInfo = STATUTS_VACTIS.find((s) => s.value === rec.statut)
                    || STATUTS_LEGACY_MAP[rec.statut]
                    || {
                      label: rec.statut,
                      color: 'bg-slate-100 text-slate-800',
                    };
                  const prioriteInfo = PRIORITES.find((p) => p.value === rec.priorite) || {
                    label: rec.priorite,
                    color: 'bg-slate-100 text-slate-700',
                  };
                  const categorieInfo = CATEGORIES.find((c) => c.value === rec.categorie) || {
                    label: rec.categorie,
                  };

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          #{rec.id}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          {rec.dateCreation
                            ? new Date(rec.dateCreation).toLocaleDateString('fr-FR')
                            : '—'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Dr {rec.medecin ? `${rec.medecin.prenom || ''} ${rec.medecin.nom}`.trim() : 'Prescripteur inconnu'}
                        </span>
                        {rec.medecin?.organisme && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {rec.medecin.organisme}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {rec.commercialDeclarant || '—'}
                      </td>

                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {categorieInfo.label}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${prioriteInfo.color}`}>
                          {prioriteInfo.label}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statutInfo.color}`}>
                          {statutInfo.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 max-w-[200px]">
                        {rec.prochaineInstruction ? (
                          <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium line-clamp-2">
                            {rec.prochaineInstruction}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">En attente d'instruction</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(rec)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                        >
                          {isDirectionOrAdmin ? 'Traiter / Fiche' : 'Consulter'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉATION RÉCLAMATION (Commercial & Direction) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Déclarer une réclamation prescripteur
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="reclamation-medecin" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Médecin prescripteur *
                </label>
                <select
                  id="reclamation-medecin"
                  required
                  value={createForm.medecinId}
                  onChange={(e) => updateCreateForm({ medecinId: e.target.value })}
                  disabled={loadingMedecins || medecinsList.length === 0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">
                    {loadingMedecins ? 'Chargement des médecins…' : medecinsList.length ? 'Sélectionner un médecin…' : 'Aucun médecin disponible'}
                  </option>
                  {medecinsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {formatDoctorOption(m)}
                    </option>
                  ))}
                </select>
                {medecinsError && <p role="alert" className="mt-1 text-[11px] text-rose-600">{medecinsError}</p>}
                {!loadingMedecins && !medecinsError && medecinsList.length > 0 && <p className="mt-1 text-[10px] text-slate-500">{medecinsList.length} médecins disponibles</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reclamation-categorie" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Catégorie *
                  </label>
                  <select
                    id="reclamation-categorie"
                    value={createForm.categorie}
                    onChange={(e) => updateCreateForm({ categorie: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="reclamation-priorite" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priorité *
                  </label>
                  <select
                    id="reclamation-priorite"
                    value={createForm.priorite}
                    onChange={(e) => updateCreateForm({ priorite: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {PRIORITES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="reclamation-date-visite" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date de la visite *
                </label>
                <input
                  id="reclamation-date-visite"
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={createForm.dateVisite}
                  onChange={(e) => updateCreateForm({ dateVisite: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Motif initial *
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Décrivez précisément l'incident ou l'insatisfaction remontée par le prescripteur..."
                  value={createForm.description}
                  onChange={(e) => updateCreateForm({ description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                La déclaration créera une notification instantanée pour la direction/administration.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-[#009B83] text-white font-semibold hover:bg-[#00826e] disabled:opacity-50"
                >
                  {creating ? 'Enregistrement...' : 'Enregistrer la réclamation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FICHE COMPLÈTE & TRAITEMENT (Points 1b et 1c) */}
      {selectedReclamation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Fiche Réclamation #{selectedReclamation.id}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  (STATUTS_VACTIS.find((s) => s.value === selectedReclamation.statut) || STATUTS_LEGACY_MAP[selectedReclamation.statut])?.color || 'bg-slate-100 text-slate-800'
                }`}>
                  {(STATUTS_VACTIS.find((s) => s.value === selectedReclamation.statut) || STATUTS_LEGACY_MAP[selectedReclamation.statut])?.label || selectedReclamation.statut}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReclamation(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Fiche synthétique */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
              <div>
                <span className="text-slate-400 block">Médecin :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Dr {selectedReclamation.medecin ? `${selectedReclamation.medecin.prenom || ''} ${selectedReclamation.medecin.nom}`.trim() : 'Prescripteur'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Organisme :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedReclamation.medecin?.organisme || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Commercial déclarant :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedReclamation.commercialDeclarant || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Catégorie :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {CATEGORIES.find((c) => c.value === selectedReclamation.categorie)?.label || selectedReclamation.categorie}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Priorité :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedReclamation.priorite}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Date création :</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedReclamation.dateCreation ? new Date(selectedReclamation.dateCreation).toLocaleDateString('fr-FR') : '—'}
                </span>
              </div>
            </div>

            {/* Commentaire initial */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400 block font-semibold mb-1">Commentaire initial du déclarant :</span>
              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {selectedReclamation.description || 'Aucun commentaire initial.'}
              </p>
            </div>

            {/* Zone de traitement : uniquement pour Direction/Admin */}
            {isDirectionOrAdmin ? (
              <form onSubmit={handleUpdateStatutSubmit} className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-purple-900 dark:text-purple-300">
                    Mise à jour du statut & instructions de direction
                  </span>
                  <span className="text-[10px] text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                    Réservé Direction/Admin
                  </span>
                </div>

                {updateError && (
                  <div className="p-2 rounded bg-rose-100 text-rose-800 text-xs">
                    {updateError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Statut (5 statuts seulement) *
                    </label>
                    <select
                      value={updateForm.statut}
                      onChange={(e) => setUpdateForm({ ...updateForm, statut: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      {STATUTS_VACTIS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Responsable affecté {updateForm.statut === 'EN_COURS' && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      required={updateForm.statut === 'EN_COURS'}
                      placeholder="Ex: Directeur Médical, Responsable Labo"
                      value={updateForm.responsable}
                      onChange={(e) => setUpdateForm({ ...updateForm, responsable: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Solution apportée {(updateForm.statut === 'TRAITEE' || updateForm.statut === 'CLOTURE_SANS_ACTION') && <span className="text-rose-500 font-bold">* (obligatoire)</span>}
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Protocole validé, ajustement technique, geste commercial..."
                    value={updateForm.solution}
                    onChange={(e) => setUpdateForm({ ...updateForm, solution: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prochaine instruction envoyée au commercial (Section 7)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Prévoir visite de réassurance sous 48h..."
                    value={updateForm.prochaineInstruction}
                    onChange={(e) => setUpdateForm({ ...updateForm, prochaineInstruction: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 rounded-xl bg-purple-700 text-white font-semibold hover:bg-purple-800 disabled:opacity-50"
                  >
                    {updating ? 'Mise à jour...' : 'Enregistrer la décision direction'}
                  </button>
                </div>
              </form>
            ) : (
              /* Vue Commercial de la solution et de l'instruction */
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Décision & Prochaine Instruction de la Direction
                </span>
                <div>
                  <span className="text-slate-400 block">Solution apportée :</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedReclamation.solutionApportee || 'En cours d\'instruction par la direction.'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block">Prochaine instruction :</span>
                  <p className="font-semibold text-indigo-700 dark:text-indigo-300">
                    {selectedReclamation.prochaineInstruction || 'Aucune consigne particulière reçue.'}
                  </p>
                </div>
              </div>
            )}

            {/* Historique des modifications */}
            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                Historique des statuts & modifications :
              </span>
              {loadingHistorique ? (
                <div className="text-slate-400">Chargement historique...</div>
              ) : historique.length === 0 ? (
                <div className="text-slate-400">Aucune modification enregistrée.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {historique.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between items-start"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {h.ancienStatut ? `${h.ancienStatut} → ` : ''}{h.nouveauStatut}
                        </span>
                        {h.commentaire && (
                          <p className="text-slate-600 dark:text-slate-400 mt-0.5">{h.commentaire}</p>
                        )}
                        <span className="text-[10px] text-slate-400">
                          Modifié par {h.auteur || 'Direction'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {h.dateChangement ? new Date(h.dateChangement).toLocaleString('fr-FR') : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedReclamation(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
