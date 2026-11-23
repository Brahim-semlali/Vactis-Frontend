import React, { useState } from 'react';
import { X } from 'lucide-react';
import Portal from '../Portal.jsx';

export default function ModalSaisieRetour({ action, isOpen, onClose, onSubmit, isSubmitting, errorMessage = '', onClearError, commerciaux = [] }) {
  const [actionRealisee, setActionRealisee] = useState(true);
  const [dateVisite, setDateVisite] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [motifNonRealisation, setMotifNonRealisation] = useState('');
  const [qualification, setQualification] = useState('FAVORABLE');
  const [dateDepart, setDateDepart] = useState('');
  const [dateRetourPrevue, setDateRetourPrevue] = useState('');
  const [dateRevue, setDateRevue] = useState('');
  const [obstaclePrincipal, setObstaclePrincipal] = useState('PRIX_TARIF');
  const [commentaire, setCommentaire] = useState('');
  const [noteTerrain, setNoteTerrain] = useState('');
  const [prochaineAction, setProchaineAction] = useState('');
  const [dateProchaineAction, setDateProchaineAction] = useState('');
  const [commercialAppui, setCommercialAppui] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !action) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!actionRealisee && !motifNonRealisation.trim()) {
      setErrorMsg('Le motif de non-réalisation est obligatoire.');
      return;
    }

    if (qualification === 'RECLAMATION' && !commentaire.trim()) {
      setErrorMsg('Le commentaire est obligatoire en cas de réclamation.');
      return;
    }

    if (qualification === 'DEFAVORABLE' && !commentaire.trim()) {
      setErrorMsg('Le commentaire est obligatoire pour une qualification défavorable.');
      return;
    }

    if (qualification === 'DEFAVORABLE' && !obstaclePrincipal) {
      setErrorMsg("L'obstacle principal est obligatoire en cas de qualification défavorable.");
      return;
    }

    if (actionRealisee && !qualification) {
      setErrorMsg('La qualification est obligatoire après une action réalisée.');
      return;
    }

    if (qualification === 'CONGE_ABSENCE' && (!dateDepart
      || (!dateRetourPrevue && !dateRevue)
      || (dateRetourPrevue && dateRetourPrevue < dateDepart)
      || (dateRevue && dateRevue < dateDepart))) {
      setErrorMsg('Saisissez le départ et une date de retour prévue ou une date de revue postérieure.');
      return;
    }

    onSubmit({
      actionRealisee,
      dateVisite,
      motifNonRealisation: !actionRealisee ? motifNonRealisation : null,
      qualification,
      dateDepart: qualification === 'CONGE_ABSENCE' ? dateDepart : null,
      dateRetourPrevue: qualification === 'CONGE_ABSENCE' ? (dateRetourPrevue || null) : null,
      dateRevue: qualification === 'CONGE_ABSENCE' ? (dateRevue || null) : null,
      obstaclePrincipal: qualification === 'DEFAVORABLE' ? obstaclePrincipal : null,
      commentaire,
      noteTerrain: noteTerrain ? parseFloat(noteTerrain) : null,
      prochaineAction,
      dateProchaineAction: dateProchaineAction || null,
      commercialAppui: commercialAppui.trim() || null,
    });
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Saisie Retour Terrain</span>
              <h3 className="text-lg font-bold">
                {action.medecin ? `${action.medecin.nom ?? ''} ${action.medecin.prenom ?? ''}`.trim() : 'Action VACTIS'}
              </h3>
              <p className="text-xs text-slate-300 pt-0.5">{action.actionRecommandee}</p>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            onChange={() => { if (errorMessage) onClearError?.(); }}
            className="p-6 space-y-5 text-slate-800 text-sm"
          >
            {(errorMsg || errorMessage) && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-xl text-xs">
                <span className="mr-1" aria-hidden="true">⚠</span>
                <span role="alert">{errorMsg || errorMessage}</span>
              </div>
            )}

            {/* Grid 2 Cols */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Action réalisée ? <span className="text-rose-500">*</span>
                </label>
                <select
                  value={actionRealisee ? 'OUI' : 'NON'}
                  onChange={(e) => setActionRealisee(e.target.value === 'OUI')}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="OUI">Oui (Réalisée)</option>
                  <option value="NON">Non (Non réalisée)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Date réelle de la visite <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateVisite}
                  onChange={(e) => setDateVisite(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Motif si Non réalisé */}
            {!actionRealisee && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5 animate-in fade-in duration-150">
                <label className="block text-xs font-bold text-amber-900 uppercase">
                  Motif de non-réalisation <span className="text-rose-500">*</span>
                </label>
                <select required value={motifNonRealisation} onChange={(e) => setMotifNonRealisation(e.target.value)} className="w-full rounded-xl border border-amber-300 p-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">Choisir un motif</option>
                  <option value="MEDECIN_ABSENT">Médecin absent</option>
                  <option value="MANQUE_DE_TEMPS">Manque de temps</option>
                  <option value="VISITE_REPORTEE">Visite reportée</option>
                  <option value="PRIORITE_MODIFIEE">Priorité modifiée</option>
                  <option value="ADRESSE_INCORRECTE_INDISPONIBLE">Adresse incorrecte / indisponible</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
            )}

            {/* Qualification & Note */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Qualification de la visite
                </label>
                <select
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="FAVORABLE">Favorable</option>
                  <option value="NEUTRE">Neutre</option>
                  <option value="DEFAVORABLE">Défavorable</option>
                  <option value="RECLAMATION">Réclamation</option>
                  <option value="CONGE_ABSENCE">Congé / Absence</option>
                  <option value="NON_RENSEIGNE">Non renseigné</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Note terrain (1 à 5)
                </label>
                <div className="flex items-center gap-1.5 pt-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNoteTerrain(n.toString())}
                      className={`flex-1 h-10 rounded-xl font-extrabold text-xs transition-all border ${
                        noteTerrain === n.toString()
                          ? 'bg-sky-500 text-white border-sky-600 shadow-md scale-[1.02]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Obstacle principal — obligatoire si DEFAVORABLE */}
            {qualification === 'DEFAVORABLE' && (
              <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-1.5 animate-in fade-in duration-150">
                <label className="block text-xs font-bold text-rose-900 uppercase">
                  Obstacle principal <span className="text-rose-500">* (Obligatoire)</span>
                </label>
                <select
                  value={obstaclePrincipal}
                  onChange={(e) => setObstaclePrincipal(e.target.value)}
                  className="w-full rounded-xl border border-rose-300 p-2.5 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="PRIX_TARIF">Prix / Tarification</option>
                  <option value="QUALITE">Qualité</option>
                  <option value="DELAI">Délai</option>
                  <option value="RELATION">Relation</option>
                  <option value="CONCURRENCE">Concurrence</option>
                  <option value="ORGANISATION_LOGISTIQUE">Organisation / logistique</option>
                  <option value="REFUS_EXPLICITE">Refus explicite</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
            )}

            {qualification === 'CONGE_ABSENCE' && (
              <div className="p-4 bg-sky-50/80 border border-sky-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-sky-900 uppercase mb-1">Date de départ *</label>
                    <input type="date" required value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} className="w-full rounded-xl border border-sky-300 p-2.5 bg-white font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-sky-900 uppercase mb-1">Date de retour prévue</label>
                    <input type="date" min={dateDepart || undefined} value={dateRetourPrevue} onChange={(e) => setDateRetourPrevue(e.target.value)} className="w-full rounded-xl border border-sky-300 p-2.5 bg-white font-semibold" />
                    <label className="block text-xs font-bold text-sky-900 uppercase mb-1 mt-3">Date de revue si retour inconnu</label>
                    <input type="date" min={dateDepart || undefined} value={dateRevue} onChange={(e) => setDateRevue(e.target.value)} className="w-full rounded-xl border border-sky-300 p-2.5 bg-white font-semibold" />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="saisie-retour-appui" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Commercial en appui <span className="normal-case font-medium text-slate-500">(facultatif)</span>
              </label>
              <input
                id="saisie-retour-appui"
                type="text"
                list="saisie-retour-appui-liste"
                placeholder="Collègue venu en appui de la visite"
                value={commercialAppui}
                onChange={(e) => setCommercialAppui(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <datalist id="saisie-retour-appui-liste">
                {commerciaux.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            {/* Commentaire */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Commentaire {qualification === 'RECLAMATION' && <span className="text-rose-500">* (Obligatoire)</span>}
              </label>
              <textarea
                rows={3}
                placeholder="Saisissez vos observations terrain..."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Prochaine Action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Prochaine action proposée
                </label>
                <input
                  type="text"
                  placeholder="Ex: Deuxième visite de courtoisie, remise d'échantillons..."
                  value={prochaineAction}
                  onChange={(e) => setProchaineAction(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Date prévue prochaine action
                </label>
                <input
                  type="date"
                  value={dateProchaineAction}
                  onChange={(e) => setDateProchaineAction(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer le retour'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
