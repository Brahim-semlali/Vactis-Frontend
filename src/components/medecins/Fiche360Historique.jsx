import { useMemo, useState } from 'react';
import {
  TYPES_EVENEMENT,
  filtrerEvenements,
  formaterDate,
  formaterMad,
  grouperParMois,
  hauteursBarres,
  libelleMois,
  libelleStatut,
} from './fiche360.js';

const TONALITES = {
  POSITIF: { point: 'bg-emerald-500', carte: 'border-emerald-100 bg-emerald-50/60' },
  NEGATIF: { point: 'bg-rose-500', carte: 'border-rose-100 bg-rose-50/60' },
  NEUTRE: { point: 'bg-slate-400', carte: 'border-slate-200 bg-white' },
};

function Indicateur({ label, valeur }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="block truncate text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-1 block truncate text-sm font-extrabold text-slate-900">{valeur}</span>
    </div>
  );
}

/** Onglet « Historique 360° » : indicateurs, activité sur 12 mois, frise, obstacles et commerciaux. */
export default function Fiche360Historique({ fiche }) {
  const [type, setType] = useState('TOUS');
  const groupes = useMemo(() => grouperParMois(filtrerEvenements(fiche.evenements, type)), [fiche.evenements, type]);
  const hauteurs = useMemo(() => hauteursBarres(fiche.mois), [fiche.mois]);
  const k = fiche.indicateurs ?? {};
  const obstacles = Object.entries(fiche.obstacles ?? {});

  return (
    <div className="space-y-6">
      <section aria-label="Indicateurs 360" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Indicateur label="CA 12 mois" valeur={formaterMad(k.ca12Mois)} />
        <Indicateur label="Dossiers 12 mois" valeur={k.dossiers12Mois ?? 0} />
        <Indicateur label="Dernier dossier" valeur={formaterDate(k.dernierDossier)} />
        <Indicateur label="Dernière visite" valeur={formaterDate(k.derniereVisite)} />
        <Indicateur label="Visites réalisées" valeur={`${k.visitesRealisees ?? 0} / ${k.visites ?? 0}`} />
        <Indicateur label="Actions ouvertes" valeur={`${k.actionsOuvertes ?? 0} / ${k.actions ?? 0}`} />
        <Indicateur label="Réclamations ouvertes" valeur={`${k.reclamationsOuvertes ?? 0} / ${k.reclamations ?? 0}`} />
        <Indicateur label="Référent" valeur={fiche.identite?.commercialReferent || '—'} />
      </section>

      <section aria-label="Activité sur 12 mois" className="rounded-2xl border border-slate-200 p-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Activité sur 12 mois</h3>
        {(fiche.mois ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">Aucune activité enregistrée par le laboratoire.</p>
        ) : (
          <div className="mt-3 flex h-32 items-end gap-1.5">
            {fiche.mois.map((m, i) => (
              <div key={m.mois} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <div
                  className={`w-full rounded-t-md ${m.visites > 0 ? 'bg-[#009B83]' : 'bg-teal-200'}`}
                  style={{ height: `${Math.max(hauteurs[i], m.ca > 0 ? 4 : 1)}%` }}
                  title={`${libelleMois(m.mois)} : ${formaterMad(m.ca)} · ${m.dossiers} dossier(s) · ${libelleStatut(m.statut)}${m.visites ? ` · ${m.visites} visite(s)` : ''}`}
                />
                <span className="truncate text-[9px] font-semibold text-slate-500">{libelleMois(m.mois, true).split(' ')[0]}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[10px] text-slate-400">Barre foncée : mois avec au moins une visite. Survolez une barre pour le détail.</p>
      </section>

      <section aria-label="Frise chronologique" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Frise chronologique</h3>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Type d'événement"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option value="TOUS">Tous les événements</option>
            {Object.entries(TYPES_EVENEMENT).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>
        {groupes.length === 0 ? (
          <p className="text-xs italic text-slate-400">Aucun événement enregistré.</p>
        ) : groupes.map((groupe) => (
          <div key={groupe.cle}>
            <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{groupe.libelle}</p>
            <ol className="space-y-1.5 border-l-2 border-slate-100 pl-3">
              {groupe.evenements.map((e, i) => {
                const ton = TONALITES[e.tonalite] ?? TONALITES.NEUTRE;
                return (
                  <li key={`${e.type}-${e.referenceId ?? i}-${e.date}`} className={`relative rounded-xl border px-3 py-2 text-xs ${ton.carte}`}>
                    <span className={`absolute -left-[19px] top-3 h-2.5 w-2.5 rounded-full ring-2 ring-white ${ton.point}`} />
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900">{e.titre}</p>
                      <span className="shrink-0 text-[10px] font-semibold text-slate-500">{formaterDate(e.date)}</span>
                    </div>
                    {e.detail && <p className="mt-0.5 text-slate-600">{e.detail}</p>}
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {TYPES_EVENEMENT[e.type] ?? e.type}{e.commercial ? ` · ${e.commercial}` : ''}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-label="Obstacles récurrents" className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Obstacles récurrents</h3>
          {obstacles.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">Aucun obstacle relevé.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {obstacles.map(([obstacle, nb]) => (
                <li key={obstacle} className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  {obstacle} × {nb}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Commerciaux intervenus" className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Commerciaux intervenus</h3>
          {(fiche.commerciaux ?? []).length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">Aucun passage enregistré.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs">
              {fiche.commerciaux.map((c) => (
                <li key={c.commercial} className="flex justify-between gap-2">
                  <span className="font-semibold text-slate-800">{c.commercial}</span>
                  <span className="text-slate-500">
                    {c.visites} visite(s){c.appuis ? ` · ${c.appuis} appui(s)` : ''} · {formaterDate(c.derniereVisite)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
