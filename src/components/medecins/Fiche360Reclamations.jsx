import { formaterDate } from './fiche360.js';

/** Onglet « Réclamations » : tickets ouverts puis traités, avec description et solution. */
export default function Fiche360Reclamations({ fiche }) {
  const reclamations = [...(fiche.reclamations ?? [])].sort((a, b) => Number(b.ouverte) - Number(a.ouverte));
  const ouvertes = reclamations.filter((r) => r.ouverte).length;

  if (reclamations.length === 0) {
    return <p className="py-8 text-center text-xs italic text-slate-400">Aucune réclamation déclarée pour ce médecin.</p>;
  }

  return (
    <section aria-label="Réclamations du médecin" className="space-y-3">
      <p className="text-xs font-semibold text-slate-600">
        {reclamations.length} réclamation(s), dont <strong className={ouvertes ? 'text-rose-600' : 'text-emerald-700'}>{ouvertes} ouverte(s)</strong>.
      </p>
      {reclamations.map((r) => (
        <article
          key={r.id}
          className={`rounded-2xl border p-4 text-xs ${r.ouverte ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white'}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-extrabold text-slate-900">Réclamation #{r.id} · {r.categorie ?? '—'}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${r.ouverte ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {r.statut ?? '—'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Déclarée le {formaterDate(r.dateDeclaration)}{r.commercial ? ` par ${r.commercial}` : ''} · priorité {String(r.priorite ?? '—').toLowerCase()}
          </p>
          {r.description && <p className="mt-2 text-slate-700">{r.description}</p>}
          {(r.solution || r.responsable || r.dateResolution) && (
            <div className="mt-2 rounded-xl bg-white/80 p-2.5 text-[11px] text-slate-600 ring-1 ring-slate-100">
              {r.solution && <p><strong className="text-slate-800">Solution :</strong> {r.solution}</p>}
              {(r.responsable || r.dateResolution) && (
                <p className="mt-0.5">
                  {r.responsable ? `Responsable : ${r.responsable}` : ''}
                  {r.responsable && r.dateResolution ? ' · ' : ''}
                  {r.dateResolution ? `traitée le ${formaterDate(r.dateResolution)}` : ''}
                </p>
              )}
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
