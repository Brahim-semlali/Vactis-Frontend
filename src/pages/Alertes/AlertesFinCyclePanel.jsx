import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import FicheContextuelleDrawer from '../../components/medecins/FicheContextuelleDrawer.jsx';
import useAlertesFinCycle from '../../components/alertes/useAlertesFinCycle.js';
import {
  TYPES_ALERTE,
  filtrerAlertes,
  libelleEcheance,
  pastilleEcheance,
  resumeParType,
} from '../../components/alertes/finCycle.js';

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

function formaterDate(iso) {
  if (!iso) return '—';
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? iso : FORMAT_DATE.format(date);
}

function BadgeGravite({ gravite }) {
  const urgent = gravite === 'URGENT';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${urgent
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'}`}
    >
      {urgent ? 'Urgent' : 'Attention'}
    </span>
  );
}

/** Onglet « Fin de cycle » de la page Alertes. */
export default function AlertesFinCyclePanel({ navigate }) {
  const { token } = useAuth();
  const { donnees, chargement, erreur, recharger } = useAlertesFinCycle();
  const [type, setType] = useState('TOUS');
  const [gravite, setGravite] = useState('TOUS');
  const [recherche, setRecherche] = useState('');
  const [medecinOuvert, setMedecinOuvert] = useState(null);

  const alertes = donnees?.alertes ?? [];
  const resume = useMemo(() => resumeParType(alertes), [alertes]);
  const visibles = useMemo(() => filtrerAlertes(alertes, { type, gravite, recherche }), [alertes, type, gravite, recherche]);
  const vueEquipe = Boolean(donnees?.vueEquipe);

  if (chargement && !donnees) {
    return <div className="p-10 text-center text-sm text-slate-500">Chargement des alertes de fin de cycle…</div>;
  }
  if (erreur && !donnees) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
        {erreur}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Échéance du cycle"
        className="vx-hero flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="space-y-1.5">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
            Clôture du cycle
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Alertes de fin de cycle
          </h1>
          <p className="max-w-2xl text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
            {libelleEcheance(donnees)}.{' '}
            {vueEquipe
              ? 'Ce qui risque de rester ouvert à la clôture, pour toute l’équipe.'
              : 'Ce qui vous reste à faire avant la clôture.'}
          </p>
          {donnees?.cycle && !donnees.fenetreActive && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ces alertes remonteront dans la cloche à partir de J-{donnees.fenetreJours ?? 7}.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-semibold">
            {donnees?.cycle && (
              <span className={`rounded-full px-3 py-1 font-extrabold text-white ${donnees.urgent ? 'bg-rose-600' : 'bg-amber-500'}`}>
                {pastilleEcheance(donnees)}
              </span>
            )}
            {resume.map((ligne) => (
              <button
                key={ligne.type}
                type="button"
                onClick={() => setType(type === ligne.type ? 'TOUS' : ligne.type)}
                aria-pressed={type === ligne.type}
                className={`rounded-full border px-3 py-1 transition-colors ${type === ligne.type
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
              >
                {ligne.count} {ligne.label.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={recharger}
          disabled={chargement}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white lg:self-center"
        >
          Rafraîchir
        </button>
      </section>

      {vueEquipe && (donnees?.parCommercial ?? []).length > 0 && (
        <section aria-label="Avancement par commercial" className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
            Avancement par commercial
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-2.5">Commercial</th>
                  <th className="px-3 py-2.5 text-right">Actions visitées</th>
                  <th className="px-3 py-2.5 text-right">Réalisation</th>
                  <th className="px-3 py-2.5 text-right">Retours à qualifier</th>
                  <th className="px-5 py-2.5 text-right">Réclamations en attente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {donnees.parCommercial.map((ligne) => {
                  const faible = ligne.actionsDuCycle > 0 && ligne.tauxRealisation < (donnees.seuilRealisation ?? 60);
                  return (
                    <tr key={ligne.commercial}>
                      <td className="px-5 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{ligne.commercial}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{ligne.actionsVisitees} / {ligne.actionsDuCycle}</td>
                      <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${faible ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {Math.round(ligne.tauxRealisation)} %
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{ligne.retoursAQualifier}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{ligne.reclamationsEnAttente}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-label="Liste des alertes de fin de cycle" className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {visibles.length} alerte{visibles.length > 1 ? 's' : ''}
          </h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Médecin, commercial…"
              aria-label="Rechercher une alerte"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Type d'alerte"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="TOUS">Tous les types</option>
              {Object.entries(TYPES_ALERTE).map(([code, { label }]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
            <select
              value={gravite}
              onChange={(e) => setGravite(e.target.value)}
              aria-label="Gravité"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="TOUS">Toutes gravités</option>
              <option value="URGENT">Urgent</option>
              <option value="ATTENTION">Attention</option>
            </select>
          </div>
        </div>

        {visibles.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {alertes.length === 0 ? 'Rien en suspens pour ce cycle.' : 'Aucune alerte ne correspond aux filtres.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-2.5">Gravité</th>
                  <th className="px-3 py-2.5">Alerte</th>
                  <th className="px-3 py-2.5">Médecin</th>
                  {vueEquipe && <th className="px-3 py-2.5">Commercial</th>}
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-5 py-2.5 text-right"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibles.map((a, index) => (
                  <tr key={`${a.type}-${a.actionId ?? a.retourTerrainId ?? a.reclamationId ?? a.commercial}-${index}`}>
                    <td className="px-5 py-2.5"><BadgeGravite gravite={a.gravite} /></td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{a.libelle}</p>
                      {a.detail && <p className="text-slate-500 dark:text-slate-400">{a.detail}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      {a.medecinId ? (
                        <button
                          type="button"
                          onClick={() => setMedecinOuvert(a.medecinId)}
                          className="font-semibold text-[#009B83] hover:underline"
                        >
                          {a.medecinNom}
                        </button>
                      ) : '—'}
                    </td>
                    {vueEquipe && <td className="px-3 py-2.5">{a.commercial}</td>}
                    <td className="px-3 py-2.5 tabular-nums">{formaterDate(a.date)}</td>
                    <td className="px-5 py-2.5 text-right">
                      {navigate && TYPES_ALERTE[a.type] && (
                        <button
                          type="button"
                          onClick={() => navigate(TYPES_ALERTE[a.type].route)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Traiter
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <FicheContextuelleDrawer
        medecinId={medecinOuvert}
        token={token}
        isOpen={medecinOuvert != null}
        onClose={() => setMedecinOuvert(null)}
      />
    </div>
  );
}
