import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, BriefcaseBusiness, Search, X } from 'lucide-react';
import { getKpisMensuels, getTopMouvements } from '../../api/activite.js';
import { getMedecins } from '../../api/medecins.js';

const formatMad = (value) => `${Number(value ?? 0).toLocaleString('fr-FR')} MAD`;
const formatNumber = (value) => Number(value ?? 0).toLocaleString('fr-FR');

export default function RapportCommercialInsights({ token, data, moisSelectionne, moisDisponibles, navigate }) {
  const [evolution, setEvolution] = useState([]);
  const [mouvements, setMouvements] = useState({ progressions: [], baisses: [] });
  const [insightError, setInsightError] = useState('');
  const [recherche, setRecherche] = useState('');
  const [typeMouvement, setTypeMouvement] = useState('tous');
  const [segment, setSegment] = useState('tous');
  const [potentielMinimum, setPotentielMinimum] = useState('');
  const [selectionMedecins, setSelectionMedecins] = useState(null);
  const anneeSelectionnee = moisSelectionne?.slice(0, 4) || moisDisponibles[0]?.slice(0, 4) || '';
  const moisAnnee = useMemo(() => moisDisponibles
    .filter((periode) => String(periode).startsWith(`${anneeSelectionnee}-`))
    .sort(), [anneeSelectionnee, moisDisponibles]);

  useEffect(() => {
    let actif = true;
    const mois = moisAnnee;
    if (!token || mois.length === 0) {
      setEvolution([]);
      return () => { actif = false; };
    }

    Promise.allSettled(mois.map((periode) => getKpisMensuels(token, periode)))
      .then((resultats) => {
        if (!actif) return;
        setEvolution(resultats.flatMap((resultat, index) => {
          if (resultat.status !== 'fulfilled') return [];
          return [{
            mois: mois[index],
            libelleMois: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(`${mois[index]}-01T00:00:00`)).replace('.', ''),
            chiffreAffaires: Number(resultat.value?.caMoisTotal ?? 0),
            cas: Number(resultat.value?.casMoisTotal ?? 0),
          }];
        }));
      })
      .catch(() => {
        if (actif) setInsightError('Impossible de charger l’évolution mensuelle.');
      });

    return () => { actif = false; };
  }, [moisAnnee, token]);

  const caAnnee = evolution.reduce((total, periode) => total + periode.chiffreAffaires, 0);
  const casAnnee = evolution.reduce((total, periode) => total + periode.cas, 0);

  useEffect(() => {
    let actif = true;
    if (!token || !moisSelectionne) {
      setMouvements({ progressions: [], baisses: [] });
      return () => { actif = false; };
    }

    getTopMouvements(token, moisSelectionne, 'ca', 10)
      .then((resultat) => {
        if (actif) setMouvements({
          progressions: resultat?.progressions ?? [],
          baisses: resultat?.baisses ?? [],
        });
      })
      .catch(() => {
        if (actif) setInsightError('Impossible de charger les mouvements des médecins.');
      });

    return () => { actif = false; };
  }, [moisSelectionne, token]);

  const lignesMouvements = useMemo(() => {
    const toutes = [
      ...(typeMouvement === 'baisses' ? [] : mouvements.progressions.map((item) => ({ ...item, tendance: 'hausse' }))),
      ...(typeMouvement === 'progressions' ? [] : mouvements.baisses.map((item) => ({ ...item, tendance: 'baisse' }))),
    ];
    const terme = recherche.trim().toLocaleLowerCase('fr');
    return toutes.filter((item) => !terme || `${item.nomMedecin} ${item.specialite ?? ''}`.toLocaleLowerCase('fr').includes(terme));
  }, [mouvements, recherche, typeMouvement]);

  const opportunites = useMemo(() => {
    const valeurMinimum = Number(potentielMinimum) || 0;
    return (data?.opportunites ?? []).filter((item) =>
      (segment === 'tous' || item.segment === segment)
      && Number(item.potentielTheorique ?? 0) >= valeurMinimum,
    );
  }, [data?.opportunites, potentielMinimum, segment]);

  const segments = ['A', 'B', 'C', 'D'];

  return (
    <>
      {insightError && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">{insightError}</p>}

      {data && <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">Tendance d’activité · {anneeSelectionnee}</span>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Évolution annuelle du chiffre d’affaires</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">CA facturé et volume de cas par mois, selon les périodes disponibles.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[300px]">
            <div className="rounded-xl bg-slate-950 px-3.5 py-2.5 text-white"><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-300">CA de l’année affichée</span><strong className="mt-1 block text-base font-black">{formatMad(caAnnee)}</strong></div>
            <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3.5 py-2.5 text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-100"><span className="block text-[9px] font-bold uppercase tracking-wide opacity-70">Cas sur les mois affichés</span><strong className="mt-1 block text-base font-black">{formatNumber(casAnnee)}</strong></div>
          </div>
        </div>
        {evolution.length > 0 ? (
          <div className="h-[340px] w-full sm:h-[390px]" role="img" aria-label={`Graphique du chiffre d’affaires et du nombre de cas pour ${anneeSelectionnee}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolution} margin={{ top: 18, right: 12, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="libelleMois" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis yAxisId="ca" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <YAxis yAxisId="cas" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.mois ?? ''} formatter={(value, name) => [name === 'CA' ? formatMad(value) : formatNumber(value), name]} contentStyle={{ borderRadius: 12, borderColor: '#cbd5e1', fontSize: 12 }} />
                <Bar yAxisId="ca" dataKey="chiffreAffaires" name="CA" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {evolution.map((periode) => <Cell key={periode.mois} fill={periode.mois === moisSelectionne ? '#0f172a' : '#0e7490'} />)}
                </Bar>
                <Line yAxisId="cas" dataKey="cas" name="Cas" type="monotone" stroke="#d97706" strokeWidth={3} dot={{ r: 4, fill: '#d97706', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">Aucune donnée mensuelle disponible pour {anneeSelectionnee || 'cette année'}.</div>
        )}
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-500 dark:border-slate-800"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-cyan-700" /> Chiffre d’affaires mensuel</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Nombre de cas</span><span className="ml-auto">{evolution.length} mois avec données</span></div>
      </section>}

      {data && <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">Portefeuille médecins</span>
            <h2 className="text-base font-black text-slate-950 dark:text-white">Progressions et baisses du CA</h2>
            <p className="text-xs text-slate-500">Comparaison avec le mois précédent pour {moisSelectionne || 'la période sélectionnée'}.</p>
          </div>
          <div className="rapport-no-print flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Rechercher un médecin</span>
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher un médecin" className="w-52 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800" />
            </label>
            <select value={typeMouvement} onChange={(event) => setTypeMouvement(event.target.value)} aria-label="Filtrer par tendance" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
              <option value="tous">Toutes les tendances</option>
              <option value="progressions">Progressions</option>
              <option value="baisses">Baisses</option>
            </select>
            <button type="button" onClick={() => navigate?.('/actions')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-cyan-700">
              <BriefcaseBusiness size={14} /> Actions commerciales
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <tr><th className="px-4 py-3">Médecin</th><th className="px-4 py-3">Spécialité</th><th className="px-4 py-3 text-right">Mois précédent</th><th className="px-4 py-3 text-right">Mois choisi</th><th className="px-4 py-3 text-right">Évolution</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lignesMouvements.map((item, index) => (
                <tr key={`${item.nomMedecin}-${item.tendance}-${index}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{item.nomMedecin}</td>
                  <td className="px-4 py-3 text-slate-500">{item.specialite || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatMad(item.valeurMm1)}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{formatMad(item.valeurM)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${item.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    <span className="inline-flex items-center justify-end gap-1">{item.delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{formatMad(item.delta)}</span>
                  </td>
                </tr>
              ))}
              {lignesMouvements.length === 0 && <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">Aucun mouvement correspondant à la recherche.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">Segmentation du portefeuille</span>
          <h2 className="text-base font-black text-slate-950 dark:text-white">Répartition et CA moyen par segment</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {segments.map((code) => (
            <button
              key={code}
              type="button"
              aria-expanded={selectionMedecins?.id === `segment-${code}`}
              onClick={() => setSelectionMedecins((current) => current?.id === `segment-${code}` ? null : {
                id: `segment-${code}`,
                titre: `Médecins du segment ${code}`,
                segment: code,
                emplacement: 'segments',
              })}
              className={`rounded-2xl border p-4 text-left transition-colors ${selectionMedecins?.id === `segment-${code}` ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' : 'border-slate-200 bg-slate-50 hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-850'}`}
            >
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Segment {code}</span>
              <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{formatNumber(data?.[`nbMedecinsSegment${code}`])} médecins</div>
              <p className="mt-1 text-xs text-slate-500">CA moyen : {formatMad(data?.[`caMoyenSegment${code}`])}</p>
            </button>
          ))}
        </div>
        {selectionMedecins?.emplacement === 'segments' && <DoctorsSelection token={token} selection={selectionMedecins} onClose={() => setSelectionMedecins(null)} />}
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">Leviers commerciaux</span>
            <h2 className="text-base font-black text-slate-950 dark:text-white">Opportunités filtrables</h2>
          </div>
          <div className="rapport-no-print flex flex-wrap gap-2">
            <label className="text-xs font-semibold text-slate-500">Segment
              <select value={segment} onChange={(event) => setSegment(event.target.value)} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option value="tous">Tous</option>
                {[...new Set((data?.opportunites ?? []).map((item) => item.segment).filter(Boolean))].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">Potentiel min. (MAD)
              <input type="number" min="0" value={potentielMinimum} onChange={(event) => setPotentielMinimum(event.target.value)} className="ml-2 w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-4 py-3">Opportunité</th><th className="px-4 py-3">Segment</th><th className="px-4 py-3 text-right">Médecins</th><th className="px-4 py-3 text-right">CA référence</th><th className="px-4 py-3 text-right">Potentiel</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {opportunites.map((item, index) => {
                const id = `opportunite-${item.type}-${item.segment}-${index}`;
                return (
                  <tr
                    key={id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Afficher les médecins de l’opportunité ${item.label}, segment ${item.segment}`}
                    aria-expanded={selectionMedecins?.id === id}
                    onClick={() => setSelectionMedecins((current) => current?.id === id ? null : {
                      id,
                      titre: `${item.label} — Segment ${item.segment}`,
                      segment: item.segment,
                      type: item.type,
                      emplacement: 'opportunites',
                    })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectionMedecins((current) => current?.id === id ? null : {
                          id,
                          titre: `${item.label} — Segment ${item.segment}`,
                          segment: item.segment,
                          type: item.type,
                          emplacement: 'opportunites',
                        });
                      }
                    }}
                    className={`cursor-pointer hover:bg-cyan-50/70 dark:hover:bg-cyan-950/30 ${selectionMedecins?.id === id ? 'bg-cyan-50 dark:bg-cyan-950/40' : ''}`}
                  >
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{item.label}</td>
                    <td className="px-4 py-3">{item.segment || '—'}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(item.medecins)}</td>
                    <td className="px-4 py-3 text-right">{formatMad(item.caReference)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatMad(item.potentielTheorique)}</td>
                  </tr>
                );
              })}
              {opportunites.length === 0 && <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">Aucune opportunité ne correspond aux filtres.</td></tr>}
            </tbody>
          </table>
        </div>
        {selectionMedecins?.emplacement === 'opportunites' && <DoctorsSelection token={token} selection={selectionMedecins} onClose={() => setSelectionMedecins(null)} />}
      </section>
    </>
  );
}

function DoctorsSelection({ token, selection, onClose }) {
  const [medecins, setMedecins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let actif = true;
    setLoading(true);
    setError('');
    getMedecins(token, selection.segment ? { segment: selection.segment } : {})
      .then((resultat) => {
        if (!actif) return;
        const items = resultat?.items ?? [];
        const correspond = items.filter((medecin) => matchesOpportunity(medecin, selection.type));
        setMedecins(correspond);
      })
      .catch((requestError) => {
        if (actif) setError(requestError.message || 'Impossible de charger les médecins concernés.');
      })
      .finally(() => {
        if (actif) setLoading(false);
      });

    return () => { actif = false; };
  }, [selection, token]);

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4 dark:border-cyan-900 dark:bg-cyan-950/20" aria-live="polite">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">{selection.titre}</h3>
          <p className="text-xs text-slate-500">Médecins correspondant au segment et aux critères sélectionnés</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-white dark:hover:bg-slate-800" aria-label="Fermer la liste des médecins" title="Fermer"><X size={16} /></button>
      </div>
      {loading ? <p className="py-5 text-center text-xs text-slate-500">Chargement des médecins…</p> : error ? <p role="alert" className="py-4 text-xs text-rose-700">{error}</p> : medecins.length === 0 ? <p className="py-5 text-center text-xs text-slate-500">Aucun médecin ne correspond à ce critère.</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="bg-white text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-3 py-2.5">Médecin</th><th className="px-3 py-2.5">Spécialité</th><th className="px-3 py-2.5">Ville</th><th className="px-3 py-2.5">Statut</th><th className="px-3 py-2.5">Segment</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {medecins.map((medecin) => <tr key={medecin.id}><td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-white">{[medecin.prenom, medecin.nom].filter(Boolean).join(' ') || medecin.codeMedecin}</td><td className="px-3 py-2.5">{medecin.specialite || '—'}</td><td className="px-3 py-2.5">{medecin.ville || '—'}</td><td className="px-3 py-2.5">{(medecin.statut || medecin.statutPilotage || '—').replaceAll('_', ' ')}</td><td className="px-3 py-2.5">{medecin.segment || '—'}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function matchesOpportunity(medecin, type) {
  if (!type) return true;
  const statut = String(medecin.statut ?? '').toUpperCase();
  const segment = String(medecin.segment ?? '').toUpperCase();
  const risque = String(medecin.risqueUrgence ?? '').toUpperCase();

  if (type === 'SILENCE') return risque === 'URGENT';
  if (type === 'RETENTION') return ['RETENTION', 'SURVEILLANCE'].includes(statut);
  if (type === 'ONBOARDING') return statut === 'ONBOARDING';
  if (type === 'DEVELOPPEMENT') return ['A', 'B'].includes(segment) && ['ACTIF_STABLE', 'PROGRESSION', 'ACTIF'].includes(statut);
  return true;
}