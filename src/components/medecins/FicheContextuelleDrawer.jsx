import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getFicheContextuelleApi } from '../../api/actions.js';
import { getFiche360, telechargerFiche360Pdf } from '../../api/medecins.js';
import Fiche360Historique from './Fiche360Historique.jsx';
import Fiche360Reclamations from './Fiche360Reclamations.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatMad, formatNumber, formatPercent, formatSignedPercent } from '../../utils/indicatorFormatting.js';

export default function FicheContextuelleDrawer({ medecinId, token, isOpen, onClose }) {
  const { userProfile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [onglet, setOnglet] = useState('synthese');
  const [fiche360, setFiche360] = useState(null);
  const [chargement360, setChargement360] = useState(false);
  const [erreur360, setErreur360] = useState(null);
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const [erreurPdf, setErreurPdf] = useState(null);

  // Nouveau médecin : retour à la synthèse, la fiche 360° sera rechargée à la demande
  useEffect(() => {
    setOnglet('synthese');
    setFiche360(null);
    setErreur360(null);
    setErreurPdf(null);
  }, [medecinId]);

  useEffect(() => {
    if (!isOpen || onglet === 'synthese' || fiche360 || !medecinId || !token) return undefined;
    let annule = false;
    setChargement360(true);
    setErreur360(null);
    getFiche360(token, medecinId)
      .then((res) => { if (!annule) setFiche360(res); })
      .catch((err) => { if (!annule) setErreur360(err.message || 'Impossible de charger la fiche 360°'); })
      .finally(() => { if (!annule) setChargement360(false); });
    return () => { annule = true; };
  }, [isOpen, onglet, fiche360, medecinId, token]);

  const telechargerPdf = async () => {
    setPdfEnCours(true);
    setErreurPdf(null);
    try {
      await telechargerFiche360Pdf(token, medecinId);
    } catch (err) {
      setErreurPdf(err.message || 'Impossible de générer le PDF');
    } finally {
      setPdfEnCours(false);
    }
  };

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
  const roleName = String(userProfile?.role ?? userProfile?.roles?.nameRole ?? userProfile?.roles?.[0]?.nameRole ?? '').toUpperCase();
  const canViewDirection = roleName.includes('ADMIN');

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex justify-end bg-slate-900/20 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
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
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={telechargerPdf}
              disabled={pdfEnCours || !medecinId}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#009B83] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-teal-600 active:scale-95 disabled:opacity-60"
              title="Télécharger toutes les données du médecin en PDF"
            >
              <Download size={14} aria-hidden="true" />
              {pdfEnCours ? 'Génération…' : 'Télécharger PDF'}
            </button>
            <button
              onClick={onClose}
              type="button"
              aria-label="Fermer la fiche"
              className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div role="tablist" aria-label="Sections de la fiche médecin" className="flex gap-1 border-b border-slate-200 bg-slate-50 px-4 pt-2">
          {[['synthese', 'Synthèse'], ['historique', 'Historique 360°'], ['reclamations', 'Réclamations']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={onglet === id}
              onClick={() => setOnglet(id)}
              className={`rounded-t-lg px-3 py-2 text-xs font-bold transition-colors ${onglet === id
                ? 'bg-white text-slate-900 shadow-[0_-1px_0_#e2e8f0,1px_0_0_#e2e8f0,-1px_0_0_#e2e8f0]'
                : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {erreurPdf && (
          <div role="alert" className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {erreurPdf}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
          {onglet !== 'synthese' && (
            <>
              {chargement360 && <div className="py-12 text-center text-slate-400 font-medium">Chargement de l’historique complet…</div>}
              {erreur360 && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">{erreur360}</div>
              )}
              {fiche360 && !chargement360 && onglet === 'historique' && <Fiche360Historique fiche={fiche360} />}
              {fiche360 && !chargement360 && onglet === 'reclamations' && <Fiche360Reclamations fiche={fiche360} />}
            </>
          )}

          {onglet === 'synthese' && loading && (
            <div className="py-12 text-center text-slate-400 font-medium">
              Chargement des détails contextuels...
            </div>
          )}

          {onglet === 'synthese' && error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">
              {error}
            </div>
          )}

          {onglet === 'synthese' && data && !loading && (
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

              <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm" aria-label="Indicateurs du mois">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Indicateurs du mois</h3>
                    <p className="mt-1 text-[11px] text-slate-500">Référence {medecin?.dateReferenceIndicateurs ? new Date(`${medecin.dateReferenceIndicateurs}T00:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'}</p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Rythme {medecin?.sourceRythme === 'RECENT' ? 'récent' : medecin?.sourceRythme === 'HISTORIQUE' ? 'historique' : '30 jours par défaut'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <IndicatorMetric label="CA courant" value={formatMad(medecin?.caMoisAnalyse)} />
                  <IndicatorMetric label="Cas courants" value={formatNumber(medecin?.casMoisAnalyse, 0)} />
                  <IndicatorMetric label="Référence CA" value={formatMad(medecin?.referenceCa)} />
                  <IndicatorMetric label="Référence cas" value={formatNumber(medecin?.referenceVolume)} />
                  <IndicatorMetric label="Variation CA" value={formatSignedPercent(medecin?.variationCa)} />
                  <IndicatorMetric label="Variation cas" value={formatSignedPercent(medecin?.variationVolume)} />
                  <IndicatorMetric label="Variation mixte" value={formatSignedPercent(medecin?.variationMixteSur100)} />
                  <IndicatorMetric label="Silence score" value={formatPercent(medecin?.scoreSilence)} />
                  <IndicatorMetric label="Intervalle effectif" value={medecin?.intervalleEffectif == null ? '—' : `${formatNumber(medecin.intervalleEffectif)} jours`} />
                  <IndicatorMetric label="Jours sans activité" value={medecin?.joursSansActivite == null ? '—' : `${medecin.joursSansActivite} jours`} />
                  <IndicatorMetric label="Urgence / rang" value={Number(medecin?.scoreUrgence) > 0 ? `${formatPercent(medecin.scoreUrgence)} · rang ${medecin.rangUrgence ?? '—'}` : '—'} />
                  <IndicatorMetric label="Classe silence" value={medecin?.classeSilence?.replaceAll('_', ' ') || '—'} />
                  <IndicatorMetric label="Dernier envoi" value={medecin?.dateDerniereActiviteCalcul ? new Date(`${medecin.dateDerniereActiviteCalcul}T00:00:00`).toLocaleDateString('fr-FR') : '—'} />
                </div>
                {['INACTIF', 'EXCLU', 'ACTIVITE_IRREGULIERE', 'BLOQUE'].includes(String(medecin?.statut || '').toUpperCase()) && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">Médecin sans action automatique : urgence 0.</p>
                )}
                {medecin?.referenceCa === 0 && medecin?.referenceVolume === 0 && (
                  <p className="mt-2 text-[11px] text-slate-500">Référence nulle : les variations correspondantes sont fixées à 0 %.</p>
                )}
              </section>

              <details className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <summary className="cursor-pointer text-xs font-extrabold text-slate-800 dark:text-slate-100">Pourquoi ces valeurs ?</summary>
                <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  <p>Référence CA = moyenne des {medecin?.nombreMoisReference ?? 0} mois disponibles avant le mois analysé = <strong>{formatMad(medecin?.referenceCa)}</strong>.</p>
                  <p>Référence cas = moyenne des {medecin?.nombreMoisReference ?? 0} mois disponibles avant le mois analysé = <strong>{formatNumber(medecin?.referenceCas ?? medecin?.referenceVolume)}</strong>.</p>
                  <p>Variation CA = ({formatMad(medecin?.caMoisAnalyse)} − {formatMad(medecin?.referenceCa)}) / max({formatMad(medecin?.referenceCa)} ; 300) = <strong>{formatSignedPercent(medecin?.variationCa)}</strong>.</p>
                  <p>Variation cas = ({formatNumber(medecin?.casMoisAnalyse)} − {formatNumber(medecin?.referenceCas ?? medecin?.referenceVolume)}) / max({formatNumber(medecin?.referenceCas ?? medecin?.referenceVolume)} ; 1) = <strong>{formatSignedPercent(medecin?.variationCas ?? medecin?.variationVolume)}</strong>.</p>
                  <p>Variation mixte = 0,60 × {formatSignedPercent(medecin?.variationCa)} + 0,40 × {formatSignedPercent(medecin?.variationCas ?? medecin?.variationVolume)} = <strong>{formatSignedPercent(medecin?.variationMixteSur100)}</strong>.</p>
                  <p>Silence = min(100 ; 20 × {medecin?.joursSansActivite ?? '—'} / {formatNumber(medecin?.intervalleEffectif)}) = <strong>{formatPercent(medecin?.scoreSilence)}</strong> ; source du rythme : {medecin?.sourceRythme === 'RECENT' ? 'fenêtre récente fiable' : medecin?.sourceRythme === 'HISTORIQUE' ? 'rythme historique' : 'repli 30 jours'}.</p>
                  <p>Urgence finale = urgence brute {formatNumber(medecin?.urgenceBrute)} × facteur de matérialité {formatNumber(medecin?.facteurMaterialite)} = <strong>{Number(medecin?.scoreUrgence) > 0 ? formatPercent(medecin.scoreUrgence) : '—'}</strong>.</p>
                  <p>Perte CA = {formatMad(medecin?.perteCa)} ; seuil d’impact = {formatMad(medecin?.seuilImpact)} ; baisse de référence = {formatNumber(medecin?.baisseReference)} % ; baisse courte = {formatNumber(medecin?.baisseCourte)} % ; risque = {formatNumber(medecin?.scoreRisque)} / 100.</p>
                </div>
              </details>

              <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-100 space-y-2">
                <h4 className="text-xs font-extrabold text-teal-900 uppercase tracking-wider">Résumé court</h4>
                <p className="text-xs text-teal-950 font-medium leading-relaxed">
                  {data.commentaireMoteurResume || data.commentaireMoteurTitre || 'Résumé non disponible.'}
                </p>
              </div>

              {/* Explication du Statut */}
              <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-2">
                <h4 className="text-xs font-extrabold text-sky-900 uppercase tracking-wider">
                  Commentaire détaillé
                </h4>
                {data.commentaireMoteurTitre && (
                  <p className="text-xs font-extrabold text-sky-950">{data.commentaireMoteurTitre}</p>
                )}
                <p className="text-xs text-sky-950 font-medium leading-relaxed">
                  {data.commentaireMoteurDetail || data.statutExplanation}
                </p>
              </div>

              {canViewDirection && data.commentaireMoteurDirection && (
                <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Message direction</h4>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{data.commentaireMoteurDirection}</p>
                </div>
              )}

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
                  {data.joursSansActivite == null ? 'Données indisponibles' : `${data.joursSansActivite} jours sans activité détectée`}
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

function IndicatorMetric({ label, value }) {
  return <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5">
    <span className="block truncate text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
    <span className="mt-1 block break-words text-xs font-extrabold text-slate-900">{value}</span>
  </div>;
}
