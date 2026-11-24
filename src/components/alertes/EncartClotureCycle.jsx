import useAlertesFinCycle from './useAlertesFinCycle.js';
import { libelleEcheance, pastilleEcheance, resumeParType } from './finCycle.js';

/**
 * Encart « Risques de clôture » (Dashboard Direction, Suivi équipe) :
 * échéance du cycle actif, alertes par type et avancement de chaque commercial.
 */
export default function EncartClotureCycle({ navigate }) {
  const { donnees } = useAlertesFinCycle();
  if (!donnees?.cycle) return null;

  const resume = resumeParType(donnees.alertes);
  const seuil = donnees.seuilRealisation ?? 60;
  const lignes = donnees.parCommercial ?? [];
  const ton = donnees.urgent
    ? 'border-rose-200 dark:border-rose-900/60'
    : 'border-amber-200 dark:border-amber-900/60';

  return (
    <section
      aria-label="Risques de clôture"
      className={`rounded-3xl border bg-white p-5 shadow-xs dark:bg-slate-900 ${donnees.fenetreActive ? ton : 'border-slate-200/80 dark:border-slate-800'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Risques de clôture</p>
          <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">{libelleEcheance(donnees)}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${donnees.fenetreActive
            ? `text-white ${donnees.urgent ? 'bg-rose-600' : 'bg-amber-500'}`
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {pastilleEcheance(donnees)}
          </span>
          {typeof navigate === 'function' && (
            <button
              type="button"
              onClick={() => navigate('/alertes-fin-cycle')}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Voir les alertes
            </button>
          )}
        </div>
      </div>

      {resume.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Rien en suspens pour ce cycle.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          {resume.map((ligne) => (
            <li
              key={ligne.type}
              className={`rounded-full px-3 py-1 ${ligne.urgent
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}
            >
              <span className="tabular-nums">{ligne.count}</span> {ligne.label.toLowerCase()}
            </li>
          ))}
        </ul>
      )}

      {lignes.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Réalisation des actions du cycle par commercial">
          {lignes.map((ligne) => {
            const taux = Math.round(ligne.tauxRealisation ?? 0);
            const faible = ligne.actionsDuCycle > 0 && taux < seuil;
            return (
              <li key={ligne.commercial} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{ligne.commercial}</span>
                  <span className={`font-bold tabular-nums ${faible ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {ligne.actionsVisitees} / {ligne.actionsDuCycle} · {taux} %
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${faible ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, taux)}%` }}
                  />
                </div>
                {(ligne.retoursAQualifier > 0 || ligne.reclamationsEnAttente > 0) && (
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {ligne.retoursAQualifier > 0 && `${ligne.retoursAQualifier} retour(s) à qualifier`}
                    {ligne.retoursAQualifier > 0 && ligne.reclamationsEnAttente > 0 && ' · '}
                    {ligne.reclamationsEnAttente > 0 && `${ligne.reclamationsEnAttente} réclamation(s) en attente`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
