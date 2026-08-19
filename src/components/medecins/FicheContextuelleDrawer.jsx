import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getFicheContextuelleApi } from '../../api/actions.js';

export default function FicheContextuelleDrawer({ medecinId, token, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && medecinId && token) {
      setLoading(true);
      setError(null);
      getFicheContextuelleApi(token, medecinId)
        .then((res) => {
          setData(res);
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
                  <span className="text-sm font-extrabold text-teal-700">{medecin?.statut ?? 'ACTIF_STABLE'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Segment</span>
                  <span className="text-sm font-extrabold text-indigo-600">SEGMENT {medecin?.segment ?? 'D'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">Score Valeur</span>
                  <span className="text-sm font-extrabold text-emerald-600">{medecin?.scoreValeur ?? 60} / 100</span>
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
                      <div key={v.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{v.dateVisite ? new Date(v.dateVisite).toLocaleDateString('fr-FR') : 'Date NC'}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${
                            v.statutVisite === 'REALISEE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {v.statutVisite}
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium">{v.commentaire || 'Aucun commentaire'}</p>
                        {v.visiteur && <p className="text-[11px] text-slate-400">Visiteur : {v.visiteur}</p>}
                      </div>
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
