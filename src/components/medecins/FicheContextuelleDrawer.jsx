import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getFicheContextuelleApi } from '../../api/actions.js';

export default function FicheContextuelleDrawer({ medecinId, token, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVisitId, setSelectedVisitId] = useState(null);

  useEffect(() => {
    if (isOpen && medecinId && token) {
      setLoading(true);
      setError(null);
      getFicheContextuelleApi(token, medecinId)
        .then((res) => {
          setData(res);
          setSelectedVisitId(null);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Impossible de charger la fiche contextuelle');
          setLoading(false);
        });
    }
  }, [isOpen, medecinId, token]);

  if (!isOpen) return null;

  const medecin = data?.medecin;
  const historique = data?.historiqueVisites ?? [];

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex justify-end bg-slate-900/20 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-400">Fiche Contextuelle Médecin</span>
            <h2 className="text-xl font-bold pt-0.5">
              {medecin ? `${medecin.nom ?? ''} ${medecin.prenom ?? ''}`.trim() : 'Chargement...'}
            </h2>
            <p className="text-xs text-slate-300">{medecin?.specialite} — {medecin?.organisme}</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
          {loading && (
            <div className="py-12 text-center text-slate-400 font-medium">
              Chargement des détails contextuels...
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">
              ⚠️ {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Badges & Synthèse */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap gap-2 items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Statut VACTIS</span>
                  <span className="text-sm font-extrabold text-teal-700">{medecin?.statut || '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Segment</span>
                  <span className="text-sm font-extrabold text-indigo-600">{medecin?.segment ? `SEGMENT ${medecin.segment}` : '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Score Valeur</span>
                  <span className="text-sm font-extrabold text-emerald-600">{medecin?.scoreValeur != null ? `${medecin.scoreValeur} / 100` : '—'}</span>
                </div>
              </div>

              {/* Explication du Statut */}
              <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-2">
                <h4 className="text-xs font-extrabold text-sky-900 uppercase tracking-wider">
                  Explication du Statut Métier
                </h4>
                <p className="text-xs text-sky-950 font-medium leading-relaxed">
                  {data.statutExplanation}
                </p>
              </div>

              {/* Silence Radio */}
              <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-rose-900 uppercase tracking-wider">
                    Silence Radio & Rythme
                  </h4>
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-200 text-rose-800">
                    {data.silenceRadioStatus}
                  </span>
                </div>
                <p className="text-sm font-extrabold text-rose-950">
                  {data.joursSansActivite} jours sans activité détectée
                </p>
                <p className="text-xs text-rose-800">
                  Fréquence habituelle attendue : 1 visite tous les {data.frequenceJours} jours.
                </p>
              </div>

              {/* Historique des Visites */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  Historique des Visites ({historique.length})
                </h4>

                {historique.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune visite terrain enregistrée jusqu'ici.</p>
                ) : (
                  <div className="space-y-2.5">
                    {historique.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVisitId((current) => current === v.id ? null : v.id)}
                        className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1 text-left hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                        aria-expanded={selectedVisitId === v.id}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{v.dateVisite ? new Date(v.dateVisite).toLocaleDateString('fr-FR') : 'Date NC'}</span>
                          <span className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                            v.statutVisite === 'REALISEE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {v.statutVisite || 'NON_RENSEIGNE'}
                            </span>
                            <span className="text-slate-400">{selectedVisitId === v.id ? '−' : '+'}</span>
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium">Note terrain : <strong className="text-slate-800">{v.note != null ? `${v.note} / 5` : 'Non renseignée'}</strong></p>
                        {v.visiteur && <p className="text-[11px] text-slate-400">Visiteur : {v.visiteur}</p>}
                        {selectedVisitId === v.id && (
                          <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-[11px] text-slate-600 sm:grid-cols-2">
                            <p><strong className="text-slate-800">ID visite :</strong> {v.id ?? '—'}</p>
                            <p><strong className="text-slate-800">Médecin :</strong> {v.nomMedecin || `${medecin?.nom ?? ''} ${medecin?.prenom ?? ''}`.trim() || '—'}</p>
                            <p><strong className="text-slate-800">Date :</strong> {v.dateVisite ? new Date(v.dateVisite).toLocaleDateString('fr-FR') : '—'}</p>
                            <p><strong className="text-slate-800">Note terrain :</strong> {v.note != null ? `${v.note} / 5` : 'Non renseignée'}</p>
                            <p><strong className="text-slate-800">Statut :</strong> {v.statutVisite || 'Non renseigné'}</p>
                            <p><strong className="text-slate-800">Qualification :</strong> {v.reclamation ? 'RECLAMATION' : (v.qualification || 'Non renseignée')}</p>
                            <p><strong className="text-slate-800">Réclamation :</strong> {v.reclamation ? 'Oui' : 'Non'}</p>
                            <p><strong className="text-slate-800">Visiteur :</strong> {v.visiteur || 'Non renseigné'}</p>
                            <p><strong className="text-slate-800">Type de visite :</strong> {v.typeVisite || 'Non renseigné'}</p>
                            <p><strong className="text-slate-800">Créée le :</strong> {v.createdAt ? new Date(v.createdAt).toLocaleString('fr-FR') : 'Non renseignée'}</p>
                            {v.action && <p><strong className="text-slate-800">Action :</strong> #{v.action.id ?? '—'} {v.action.actionRecommandee || ''}</p>}
                            <p className="sm:col-span-2"><strong className="text-slate-800">Commentaire :</strong> {v.commentaire || 'Aucun commentaire'}</p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
