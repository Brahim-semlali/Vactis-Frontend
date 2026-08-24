import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function ModalVisiteLibre({ medecinsList = [], isOpen, onClose, onSubmit, isSubmitting }) {
  const [useExisting, setUseExisting] = useState(true);
  const [selectedMedecinId, setSelectedMedecinId] = useState('');
  
  // Nouveau médecin fields
  const [nomMedecin, setNomMedecin] = useState('');
  const [prenomMedecin, setPrenomMedecin] = useState('');
  const [specialite, setSpecialite] = useState('Généraliste');
  const [organisme, setOrganisme] = useState('Cabinet privé');

  // Visite fields
  const [dateVisite, setDateVisite] = useState(new Date().toISOString().split('T')[0]);
  const [actionRealisee, setActionRealisee] = useState(true);
  const [motifNonRealisation, setMotifNonRealisation] = useState('');
  const [qualification, setQualification] = useState('FAVORABLE');
  const [commentaire, setCommentaire] = useState('');
  const [noteTerrain, setNoteTerrain] = useState('');
  const [prochaineAction, setProchaineAction] = useState('');
  const [dateProchaineAction, setDateProchaineAction] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (useExisting && !selectedMedecinId) {
      setErrorMsg('Veuillez sélectionner un médecin existant.');
      return;
    }

    if (!useExisting && !nomMedecin.trim()) {
      setErrorMsg('Le nom du nouveau médecin est obligatoire.');
      return;
    }

    if (!actionRealisee && !motifNonRealisation.trim()) {
      setErrorMsg('Le motif de non-réalisation est obligatoire.');
      return;
    }

    if (qualification === 'RECLAMATION' && !commentaire.trim()) {
      setErrorMsg('Le commentaire est obligatoire en cas de réclamation.');
      return;
    }

    onSubmit({
      medecinId: useExisting ? parseInt(selectedMedecinId, 10) : null,
      nomMedecin: !useExisting ? nomMedecin : null,
      prenomMedecin: !useExisting ? prenomMedecin : null,
      specialite: !useExisting ? specialite : null,
      organisme: !useExisting ? organisme : null,
      dateVisite,
      actionRealisee,
      motifNonRealisation: actionRealisee ? null : motifNonRealisation,
      qualification,
      commentaire,
      noteTerrain: noteTerrain ? parseFloat(noteTerrain) : null,
      prochaineAction,
      dateProchaineAction: dateProchaineAction || null,
    });
  };

  return createPortal(
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
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Onglet Visite Spontanée</span>
            <h3 className="text-lg font-bold">Nouvelle Visite Commerciale Libre</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-slate-800 text-sm">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-xl text-xs">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Toggle Existant / Nouveau */}
          <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setUseExisting(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                useExisting ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sélectionner Médecin Existant
            </button>
            <button
              type="button"
              onClick={() => setUseExisting(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                !useExisting ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              + Créer Nouveau Médecin
            </button>
          </div>

          {useExisting ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Rechercher / Choisir un médecin <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedMedecinId}
                onChange={(e) => setSelectedMedecinId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Sélectionner dans le portefeuille --</option>
                {medecinsList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom} {m.prenom} ({m.specialite ?? 'Spécialité NC'} - {m.organisme ?? 'Organisme NC'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nom <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Nom du médecin"
                    value={nomMedecin}
                    onChange={(e) => setNomMedecin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prénom</label>
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={prenomMedecin}
                    onChange={(e) => setPrenomMedecin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Spécialité</label>
                  <input
                    type="text"
                    placeholder="Cardiologie, ORL..."
                    value={specialite}
                    onChange={(e) => setSpecialite(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Organisme / Clinique</label>
                  <input
                    type="text"
                    placeholder="Clinique Riad, Cabinet..."
                    value={organisme}
                    onChange={(e) => setOrganisme(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 bg-white font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Details Visite */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date de la visite</label>
              <input
                type="date"
                required
                value={dateVisite}
                onChange={(e) => setDateVisite(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Action réalisée <span className="text-rose-500">*</span></label>
              <select
                value={actionRealisee ? 'OUI' : 'NON'}
                onChange={(e) => setActionRealisee(e.target.value === 'OUI')}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-semibold"
              >
                <option value="OUI">Oui</option>
                <option value="NON">Non</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Qualification</label>
              <select
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-semibold"
              >
                <option value="FAVORABLE">Favorable</option>
                <option value="NEUTRE">Neutre</option>
                <option value="DEFAVORABLE">Défavorable</option>
                <option value="RECLAMATION">Réclamation</option>
              </select>
            </div>
          </div>

          {!actionRealisee && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Motif de non-réalisation <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={motifNonRealisation}
                onChange={(e) => setMotifNonRealisation(e.target.value)}
                className="w-full rounded-xl border border-amber-300 p-2.5 bg-amber-50 font-medium"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Note potentielle du médecin (1 à 5)</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNoteTerrain(n.toString())}
                  className={`flex-1 h-10 rounded-xl font-extrabold text-xs border ${noteTerrain === n.toString() ? 'bg-amber-400 text-slate-900 border-amber-500' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                >
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => setNoteTerrain('')} className="h-10 px-4 rounded-xl font-bold text-xs border border-slate-200">—</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Commentaire {qualification === 'RECLAMATION' && <span className="text-rose-500">* (Obligatoire)</span>}</label>
            <textarea
              rows={3}
              placeholder="Remarques et détails de la visite commerciale libre..."
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prochaine action</label>
              <input
                type="text"
                placeholder="Suite à donner..."
                value={prochaineAction}
                onChange={(e) => setProchaineAction(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date prévue</label>
              <input
                type="date"
                value={dateProchaineAction}
                onChange={(e) => setDateProchaineAction(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-medium"
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
              className="px-6 py-2.5 rounded-xl font-bold text-slate-900 bg-amber-400 hover:bg-amber-500 shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer visite libre'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
