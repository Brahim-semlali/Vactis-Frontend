import React, { useEffect, useState, useMemo } from 'react';
import { Building2, CalendarDays, ClipboardList, Clock3, FileText, History, Plus, Search, UserRound, X } from 'lucide-react';
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

function formatDate(value, includeTime = false) {
  if (!value) return '—';
  const normalized = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
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
      responsable: rec.responsableTraitement || rec.responsableAffecte || '',
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
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 md:p-8">
      {/* En-tête */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"><ClipboardList size={20} /></span>
          <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
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
            Suivi des demandes prescripteurs, décisions et historique de traitement.
          </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <Plus size={16} />
          Déclarer une réclamation
        </button>
      </div>

      {/* Barre de filtres */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Recherche</label>
          <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Médecin, motif..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadReclamations()}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-teal-950"
          />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Statut (5 autorisés)</label>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-teal-950"
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
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-teal-950"
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
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-teal-950"
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
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div><h2 className="text-sm font-black text-slate-900 dark:text-white">Réclamations enregistrées</h2><p className="mt-0.5 text-xs text-slate-500">Ouvrez une fiche en cliquant sur le médecin ou sur Consulter.</p></div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{reclamations.length} ticket{reclamations.length > 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Ticket / dates</th>
                <th className="px-4 py-3">Médecin / organisme</th>
                <th className="px-4 py-3">Déclarant</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Commentaire initial</th>
                <th className="px-4 py-3">Priorité</th>
                <th className="px-4 py-3">Statut / responsable</th>
                <th className="px-4 py-3">Instruction</th>
                <th className="px-4 py-3 text-right">Fiche</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-slate-400">
                    Chargement des réclamations...
                  </td>
                </tr>
              ) : reclamations.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-slate-400">
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
                      className="transition-colors hover:bg-teal-50/50 dark:hover:bg-teal-950/20"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-black text-slate-900 dark:text-slate-100">#{rec.id}</span>
                        <div className="mt-1 text-[10px] text-slate-500">Déclarée {formatDate(rec.dateDeclaration || rec.dateCreation || rec.createdAt)}</div>
                        <div className="text-[10px] text-slate-400">Visite {formatDate(rec.dateVisite)}</div>
                      </td>

                      <td className="px-4 py-3">
                        <button type="button" onClick={() => handleOpenDetail(rec)} aria-label={`Ouvrir la réclamation #${rec.id} de ${rec.medecin ? `${rec.medecin.prenom || ''} ${rec.medecin.nom || ''}`.trim() : 'ce prescripteur'}`} className="text-left font-bold text-teal-800 underline decoration-teal-200 underline-offset-2 hover:text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-teal-300 dark:decoration-teal-800 dark:hover:text-teal-100">
                          Dr {rec.medecin ? `${rec.medecin.prenom || ''} ${rec.medecin.nom || ''}`.trim() : 'Prescripteur inconnu'}
                        </button>
                        {rec.medecin?.organisme && (
                          <div className="mt-1 max-w-[180px] truncate text-[10px] text-slate-500 dark:text-slate-400">
                            {rec.medecin.organisme}
                          </div>
                        )}
                        {rec.medecin?.specialite && <div className="mt-0.5 text-[10px] text-slate-400">{rec.medecin.specialite}</div>}
                      </td>

                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {rec.commercialDeclarant || '—'}
                      </td>

                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {categorieInfo.label}
                      </td>

                      <td className="max-w-[240px] px-4 py-3">
                        <p className="line-clamp-2 text-[11px] leading-5 text-slate-600 dark:text-slate-300">{rec.description || 'Aucun commentaire'}</p>
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
                        <div className="mt-1 text-[10px] text-slate-500">{rec.responsableTraitement || rec.responsableAffecte || 'Sans responsable'}</div>
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
                          className="rounded-lg bg-slate-100 px-3 py-1.5 font-bold text-slate-700 transition-colors hover:bg-teal-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-teal-950"
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
                <X size={16} aria-hidden="true" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-6" onClick={() => setSelectedReclamation(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="reclamation-detail-title" className="my-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950/70 sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"><FileText size={20} /></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">Dossier de réclamation · #{selectedReclamation.id}</p>
                  <h2 id="reclamation-detail-title" className="mt-0.5 truncate text-lg font-black text-slate-950 dark:text-white sm:text-xl">
                    {selectedReclamation.medecin ? `Dr ${[selectedReclamation.medecin.prenom, selectedReclamation.medecin.nom].filter(Boolean).join(' ')}` : 'Prescripteur'}
                  </h2>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`hidden rounded-full border px-3 py-1 text-xs font-bold sm:inline-flex ${
                  (STATUTS_VACTIS.find((s) => s.value === selectedReclamation.statut) || STATUTS_LEGACY_MAP[selectedReclamation.statut])?.color || 'bg-slate-100 text-slate-800'
                }`}>
                  {(STATUTS_VACTIS.find((s) => s.value === selectedReclamation.statut) || STATUTS_LEGACY_MAP[selectedReclamation.statut])?.label || selectedReclamation.statut}
                </span>
              <button
                type="button"
                onClick={() => setSelectedReclamation(null)}
                aria-label="Fermer la fiche de réclamation"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={18} />
              </button>
              </div>
            </div>

            <div className="space-y-6 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-7 dark:bg-slate-950/30">
            <section aria-label="Informations de la réclamation" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <DetailField icon={CalendarDays} label="Date de déclaration" value={formatDate(selectedReclamation.dateDeclaration || selectedReclamation.dateCreation || selectedReclamation.createdAt, true)} />
              <DetailField icon={CalendarDays} label="Date de visite" value={formatDate(selectedReclamation.dateVisite)} />
              <DetailField icon={ClipboardList} label="Catégorie" value={CATEGORIES.find((c) => c.value === selectedReclamation.categorie)?.label || selectedReclamation.categorie} />
              <DetailField icon={Clock3} label="Priorité" value={PRIORITES.find((p) => p.value === selectedReclamation.priorite)?.label || selectedReclamation.priorite} />
              <DetailField icon={UserRound} label="Commercial déclarant" value={selectedReclamation.commercialDeclarant} />
              <DetailField icon={UserRound} label="Responsable traitement" value={selectedReclamation.responsableTraitement || selectedReclamation.responsableAffecte} />
              <DetailField icon={CalendarDays} label="Date de résolution" value={formatDate(selectedReclamation.dateResolution)} />
              <DetailField icon={ClipboardList} label="Retour terrain lié" value={selectedReclamation.retourTerrainId ? `#${selectedReclamation.retourTerrainId}` : 'Aucun'} />
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"><Building2 size={16} className="text-teal-700 dark:text-teal-400" /><h3 className="text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">Informations du prescripteur</h3></div>
              <div className="grid grid-cols-2 gap-2.5 p-3.5 text-xs sm:grid-cols-3 sm:p-4">
                <DetailField label="Médecin" value={selectedReclamation.medecin ? `Dr ${[selectedReclamation.medecin.prenom, selectedReclamation.medecin.nom].filter(Boolean).join(' ')}` : 'Prescripteur'} />
                <DetailField label="Spécialité" value={selectedReclamation.medecin?.specialite} />
                <DetailField label="Organisme" value={selectedReclamation.medecin?.organisme} />
                <DetailField label="Ville" value={selectedReclamation.medecin?.ville} />
                <DetailField label="Téléphone" value={selectedReclamation.medecin?.telephone} />
                <DetailField label="E-mail" value={selectedReclamation.medecin?.email} />
                <DetailField label="Code médecin" value={selectedReclamation.medecin?.codeMedecin} />
              </div>
            </section>

            {/* Commentaire initial */}
            <section className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 sm:p-5 dark:border-teal-900 dark:bg-teal-950/30">
              <div className="mb-2.5 flex items-center gap-2"><FileText size={16} className="text-teal-700 dark:text-teal-400" /><h3 className="text-[11px] font-black uppercase tracking-wide text-teal-900 dark:text-teal-200">Commentaire initial / motif</h3></div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200">{selectedReclamation.description || 'Aucun commentaire initial.'}</p>
            </section>

            {/* Zone de traitement : uniquement pour Direction/Admin */}
            {isDirectionOrAdmin ? (
              <form onSubmit={handleUpdateStatutSubmit} className="space-y-4 rounded-xl border border-sky-200 bg-white p-4 text-xs dark:border-sky-900 dark:bg-slate-900 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="font-black text-slate-900 dark:text-white">
                    Mise à jour du statut & instructions de direction
                  </span>
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200">
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={updating}
                    className="rounded-lg bg-teal-700 px-4 py-2.5 font-bold text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
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
            <section className="space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
              <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                <History size={15} />
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
            </section>

            <div className="flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
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
        </div>
      )}
    </div>
  );
}

function DetailField({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{Icon && <Icon size={12} />}{label}</span>
      <span className="mt-1 block break-words text-xs font-bold text-slate-900 dark:text-slate-100">{value || '—'}</span>
    </div>
  );
}
