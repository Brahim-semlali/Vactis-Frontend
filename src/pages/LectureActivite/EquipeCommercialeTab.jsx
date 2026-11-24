import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, MessageSquareWarning, RefreshCw } from 'lucide-react';
import { getEquipeCommerciale } from '../../api/activite.js';
import FicheContextuelleDrawer from '../../components/medecins/FicheContextuelleDrawer.jsx';
import { getVactisStatutMeta } from './activiteLabels.js';
import {
  bornesMois,
  evolutionSeul,
  filtrerVisites,
  libelleMois,
  naturePassage,
  pointsDecision,
  pourcentage,
  tauxFavorableSeul,
} from './equipeCommerciale.js';

const QUALIFICATIONS = [
  { key: 'FAVORABLE', label: 'Favorable', couleur: 'bg-emerald-500' },
  { key: 'NEUTRE', label: 'Neutre', couleur: 'bg-sky-500' },
  { key: 'DEFAVORABLE', label: 'Défavorable', couleur: 'bg-amber-500' },
  { key: 'RECLAMATION', label: 'Réclamation', couleur: 'bg-rose-500' },
  { key: 'CONGE_ABSENCE', label: 'Congé / absence', couleur: 'bg-violet-400' },
  { key: 'NON_RENSEIGNE', label: 'Non renseignée', couleur: 'bg-slate-400' },
];

const EVOLUTIONS = {
  FAVORABLE: { label: 'Progression', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
  STABLE: { label: 'Stable', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200' },
  DEFAVORABLE: { label: 'Baisse', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' },
  NON_OBSERVABLE: { label: 'Non observable', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
};

const QUALIF_LABEL = Object.fromEntries(QUALIFICATIONS.map((q) => [q.key, q.label]));
const AIDE_COMMUNE = 'Une visite commune compte une fois pour l’équipe et pour chacun des deux participants, sans priorité liée à l’ordre des noms.';

const carte = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const selectCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const thCls = 'px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400';
const tdCls = 'px-3 py-2 text-sm text-slate-700 dark:text-slate-200';
const resumeCls = 'cursor-pointer select-none text-sm font-bold text-slate-900 dark:text-white';

function Etape({ numero, titre, sousTitre, children, id }) {
  return (
    <section id={id} className={`${carte} overflow-hidden`} aria-labelledby={`${id}-titre`}>
      <header className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h2 id={`${id}-titre`} className="text-base font-bold text-slate-900 dark:text-white">
          {numero} · {titre}
        </h2>
        {sousTitre && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sousTitre}</p>}
      </header>
      <div className="space-y-5 p-5">{children}</div>
    </section>
  );
}

function Indicateur({ label, valeur, detail, ton = 'default' }) {
  const tons = {
    default: 'text-slate-900 dark:text-white',
    alerte: 'text-rose-600 dark:text-rose-400',
    positif: 'text-emerald-600 dark:text-emerald-400',
  };
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tons[ton]}`}>{valeur ?? 0}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
}

function AideCommune() {
  return (
    <span title={AIDE_COMMUNE} className="inline-block align-[-2px] text-slate-400">
      <Info size={14} aria-hidden="true" />
    </span>
  );
}

function BadgeEvolution({ evolution }) {
  if (!evolution) return <span className="text-slate-400">—</span>;
  const meta = EVOLUTIONS[evolution] ?? EVOLUTIONS.NON_OBSERVABLE;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>{meta.label}</span>;
}

function libelleStatut(statut) {
  return statut ? getVactisStatutMeta(statut).label : '—';
}

function fraction(valeur, total) {
  return `${valeur ?? 0} / ${total ?? 0}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR');
}

/** « ↑ 38 (24 %) = 42 (27 %) ↓ 78 (49 %) » sur les visites faites seul. */
function EvolutionCompacte({ ligne }) {
  const e = evolutionSeul(ligne);
  if (e.comparables === 0) return <span className="text-xs text-slate-400">Aucune transition comparable</span>;
  return (
    <span className="whitespace-nowrap text-xs">
      <span className="font-semibold text-emerald-700 dark:text-emerald-400">↑ {e.hausse} ({e.pctHausse} %)</span>{' '}
      <span className="font-semibold text-slate-500">= {e.stable} ({e.pctStable} %)</span>{' '}
      <span className="font-semibold text-rose-600 dark:text-rose-400">↓ {e.baisse} ({e.pctBaisse} %)</span>
      <span className="block text-[11px] text-slate-400">sur {e.comparables} transition(s) comparable(s)</span>
    </span>
  );
}

// ── 1 · D'où vient l'activité terrain ? ─────────────────────────────────────

function EtapeActivite({ data, periode, setPeriode, commercial, setCommercial, onActualiser, loading, compteRenduTerrain, selectedMois, onOuvrirMedecin }) {
  const s = data?.synthese ?? {};
  const individuel = Boolean(data?.commercial);
  const ecartees = data?.datesEcartees ?? [];
  return (
    <Etape id="equipe-activite" numero="1" titre="D’où vient l’activité terrain ?"
      sousTitre="Historique des passages VACTIS et hors VACTIS, sans confondre échange commercial et service logistique.">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Période
          <select className={selectCls} value={periode} onChange={(e) => setPeriode(e.target.value)}>
            <option value="">Toutes les périodes</option>
            {(data?.moisDisponibles ?? []).map((m) => <option key={m} value={m}>{libelleMois(m)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Commercial
          <select className={selectCls} value={commercial} onChange={(e) => setCommercial(e.target.value)}>
            <option value="">Toute l'équipe</option>
            {(data?.commerciaux ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="button" onClick={onActualiser} disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
          <RefreshCw size={14} aria-hidden="true" className={loading ? 'animate-spin' : undefined} />
          Actualiser
        </button>
      </div>

      {ecartees.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <summary className="cursor-pointer font-semibold">{ecartees.length} date(s) incohérente(s) écartée(s)</summary>
          <p className="mt-1 text-xs">Ces passages ne sont comptés nulle part dans la lecture tant que leur date n’est pas corrigée.</p>
          <ul className="mt-2 space-y-1 text-xs">
            {ecartees.map((d) => (
              <li key={d.retourTerrainId}>
                <span className="font-semibold">{d.medecinNom}</span> · {d.commercial} · {d.dateVisite ? formatDate(d.dateVisite) : 'sans date'} — {d.motif}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Indicateur label="Passages réalisés" valeur={s.passagesRealises}
          detail={`${s.passagesSaisis ?? 0} saisis · ${Math.round(s.tauxRealisation ?? 0)} % réalisés`} />
        <Indicateur label="Visites VACTIS" valeur={s.visitesVactis} detail="Passages liés à une action" />
        <Indicateur label="Hors VACTIS" valeur={s.horsVactis} detail={`${s.passagesService ?? 0} passage(s) de service`} />
        <Indicateur label="Médecins en échange" valeur={s.medecinsEnEchange} detail="Médecins connus du laboratoire, services exclus" />
        <Indicateur label="Prospects à rapprocher" valeur={s.prospects} detail="Sans dossier au laboratoire · suivi dans Zone intelligence" />
        <Indicateur label="Visites communes" valeur={s.visitesCommunes}
          detail={individuel ? `Avec un collègue · dont ${s.participationsAppui ?? 0} en appui` : 'Comptées une seule fois pour l’équipe'} />
      </div>

      <DetailPassages visites={data?.visites} compteRenduTerrain={compteRenduTerrain} selectedMois={selectedMois} onOuvrirMedecin={onOuvrirMedecin} />
    </Etape>
  );
}

function DetailPassages({ visites, compteRenduTerrain, selectedMois, onOuvrirMedecin }) {
  const [recherche, setRecherche] = useState('');
  const [nature, setNature] = useState('TOUS');
  const [voirReclamations, setVoirReclamations] = useState(false);
  const lignes = useMemo(() => filtrerVisites(visites, { recherche, nature }), [visites, recherche, nature]);
  const reclamations = useMemo(() => (visites ?? []).filter((v) => v.reclamation), [visites]);
  const cr = compteRenduTerrain;

  return (
    <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700" aria-label="Lecture détaillée des passages">
      <summary className={resumeCls}>Lecture détaillée, passage par passage ({visites?.length ?? 0})</summary>
      <div className="mt-3 mb-3 flex flex-wrap gap-3">
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)}
          placeholder="Médecin, commercial, commentaire…" aria-label="Rechercher un passage"
          className={`${selectCls} min-w-[220px] flex-1`} />
        <select className={selectCls} value={nature} onChange={(e) => setNature(e.target.value)} aria-label="Nature du passage">
          <option value="TOUS">Tous les passages</option>
          <option value="VACTIS">Visites VACTIS</option>
          <option value="HORS_VACTIS">Hors VACTIS (échanges)</option>
          <option value="SERVICE">Passages de service</option>
        </select>
      </div>
      <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
            <tr>
              {['Médecin', 'Commercial', 'Passage', 'Date', 'Qualification', 'Statut M → M+1', 'Évolution', 'Commentaire'].map((h) => (
                <th key={h} className={thCls}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {lignes.length === 0 ? (
              <tr><td colSpan={8} className={`${tdCls} py-6 text-center text-slate-500`}>Aucun passage pour ces critères.</td></tr>
            ) : lignes.map((v) => (
              <tr key={v.retourTerrainId}>
                <td className={`${tdCls} font-semibold text-slate-900 dark:text-white`}>
                  {v.medecinId ? (
                    <button type="button" onClick={() => onOuvrirMedecin?.(v.medecinId)}
                      className="text-left font-semibold text-[#009B83] hover:underline" title="Ouvrir la fiche 360° du médecin">
                      {v.medecinNom}
                    </button>
                  ) : v.medecinNom}
                  {v.prospect && <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">Prospect</span>}
                </td>
                <td className={tdCls}>
                  {v.commercialAppui ? `${v.commercial} et ${v.commercialAppui}` : v.commercial}
                  {v.commercialAppui && <span className="block text-xs text-slate-500">visite commune</span>}
                </td>
                <td className={tdCls}>
                  {naturePassage(v)}
                  {v.actionRecommandee && <span className="block text-xs text-slate-500">{v.actionRecommandee}</span>}
                  {!v.realisee && <span className="block text-xs font-semibold text-rose-600">Non réalisé</span>}
                </td>
                <td className={`${tdCls} whitespace-nowrap`}>{formatDate(v.dateVisite)}</td>
                <td className={tdCls}>{v.service ? '—' : (QUALIF_LABEL[v.qualification] ?? v.qualification)}</td>
                <td className={`${tdCls} whitespace-nowrap`}>
                  {v.vactis && v.realisee ? `${libelleStatut(v.statutAvant)} → ${v.statutApres ? libelleStatut(v.statutApres) : '?'}` : '—'}
                </td>
                <td className={tdCls}><BadgeEvolution evolution={v.evolution} /></td>
                <td className={`${tdCls} max-w-xs text-xs`}>{v.commentaire || v.motifNonRealisation || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">Réclamations collectées par les visites terrain</p>
            <p className="text-xs text-rose-700/80 dark:text-rose-300/80">Médecin concerné, commercial et commentaire terrain.</p>
          </div>
          <button type="button" onClick={() => setVoirReclamations((v) => !v)} aria-expanded={voirReclamations}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-bold text-rose-700 dark:border-rose-500/40 dark:bg-slate-900 dark:text-rose-300">
            <MessageSquareWarning size={14} aria-hidden="true" /> {reclamations.length}
          </button>
        </div>
        {voirReclamations && (
          <ul className="mt-3 space-y-2">
            {reclamations.length === 0 && <li className="text-sm text-rose-800 dark:text-rose-200">Aucune réclamation sur la période.</li>}
            {reclamations.map((r) => (
              <li key={r.retourTerrainId} className="rounded-lg bg-white p-2.5 text-sm dark:bg-slate-900">
                <span className="font-semibold text-slate-900 dark:text-white">{r.medecinNom}</span>
                <span className="text-slate-500"> · {r.commercial} · {formatDate(r.dateVisite)}</span>
                <p className="text-xs text-slate-600 dark:text-slate-300">{r.commentaire || '—'}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cr && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Rapport terrain du classeur mensuel · {libelleMois(cr.mois || selectedMois)}</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Indicateur label="Visites renseignées" valeur={cr.visitesRenseignees} />
            <Indicateur label="Visites réalisées" valeur={cr.visitesRealisees} />
            <Indicateur label="Taux terrain" valeur={`${Math.round(cr.tauxTerrain ?? 0)} %`} />
            <Indicateur label="Favorables" valeur={cr.favorables} />
            <Indicateur label="Défavorables / refus" valeur={cr.defavorablesRefus} />
            <Indicateur label="Avec réclamation" valeur={cr.visitesAvecReclamation} />
          </div>
        </div>
      )}
    </details>
  );
}

// ── 2 · Qu'a réalisé chaque commercial ? ────────────────────────────────────

function EtapeRealisations({ data, token }) {
  const lignes = data?.parCommercial ?? [];
  const selection = data?.commercial?.toLowerCase();
  return (
    <Etape id="equipe-realisations" numero="2" titre="Réalisations et comparaison"
      sousTitre="Vue synthétique des contributions, puis comparaison détaillée sur la période choisie.">
      <p className="text-sm text-slate-600 dark:text-slate-300">{AIDE_COMMUNE} <AideCommune /></p>
      {lignes.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun passage saisi sur la période.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" aria-label="Contributions par commercial">
            <thead className="border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className={thCls}>Commercial</th>
                <th className={`${thCls} text-right`}>Visites seul</th>
                <th className={`${thCls} text-right`}>Communes</th>
                <th className={`${thCls} text-right`}>Échanges seul</th>
                <th className={`${thCls} text-right`}>Retours favorables</th>
                <th className={`${thCls} text-right`}>Évolution du statut, seul</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lignes.map((l) => (
                <tr key={l.commercial} className={selection === l.commercial.toLowerCase() ? 'bg-teal-50/60 dark:bg-teal-500/10' : undefined}>
                  <td className={`${tdCls} font-semibold text-slate-900 dark:text-white`}>{l.commercial}</td>
                  <td className={`${tdCls} text-right tabular-nums`}>{l.visitesSeul ?? 0}</td>
                  <td className={`${tdCls} text-right tabular-nums`}>{l.visitesCommunes ?? 0}</td>
                  <td className={`${tdCls} text-right tabular-nums`}>{l.echangesSeul ?? 0}</td>
                  <td className={`${tdCls} text-right tabular-nums`}>{tauxFavorableSeul(l)} %</td>
                  <td className={`${tdCls} text-right`}><EvolutionCompacte ligne={l} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Les taux individuels portent sur les visites réalisées seul. Les visites communes et leurs résultats sont détaillés dans la comparaison.
        La répartition des tâches diffère entre commerciaux : ce tableau n’est pas un classement de performance.
      </p>
      <details open className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <summary className={resumeCls}>Comparer deux commerciaux sur une période choisie</summary>
        <div className="mt-4">
          <Comparaison token={token} commerciaux={data?.commerciaux ?? []} moisDisponibles={data?.moisDisponibles ?? []} />
        </div>
      </details>
    </Etape>
  );
}

const INDICATEURS_COMPARAISON = [
  ['Visites réalisées seul', (l) => l.visitesSeul],
  ['Visites communes', (l) => l.visitesCommunes],
  ['VACTIS seul', (l) => l.vactisSeul],
  ['Hors VACTIS seul', (l) => l.horsVactisSeul],
  ['Services seul', (l) => l.servicesSeul],
  ['Médecins connus en échange seul', (l) => l.medecinsEnEchangeSeul],
  ['Prospects seul', (l) => l.prospectsSeul],
  ['Retours qualifiés / échanges seul', (l) => fraction(l.retoursQualifiesSeul, l.echangesSeul)],
  ['Retours favorables / échanges seul', (l) => fraction(l.retoursFavorablesSeul, l.echangesSeul)],
  ['Refus ou réclamations seul', (l) => l.refusSeul],
  ['Progressions / comparables seul', (l) => fraction(l.progressionsSeul, l.comparablesSeul)],
  ['Baisses seul', (l) => l.baissesSeul],
  ['Échanges en visite commune', (l) => l.echangesCommuns],
  ['Retours favorables en visite commune', (l) => l.retoursFavorablesCommuns],
];

const LIGNE_VIDE = Object.freeze({});

function Comparaison({ token, commerciaux, moisDisponibles }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [de, setDe] = useState('');
  const [jusqua, setJusqua] = useState('');
  const [lignes, setLignes] = useState([]);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!a && commerciaux[0]) setA(commerciaux[0]);
    if (!b && commerciaux[1]) setB(commerciaux[1]);
  }, [commerciaux, a, b]);
  useEffect(() => {
    if (!jusqua && moisDisponibles[0]) setJusqua(moisDisponibles[0]);
    if (!de && moisDisponibles[0]) setDe(moisDisponibles[1] ?? moisDisponibles[0]);
  }, [moisDisponibles, de, jusqua]);

  useEffect(() => {
    if (!token || !de || !jusqua) return undefined;
    let annule = false;
    getEquipeCommerciale(token, bornesMois(de, jusqua))
      .then((res) => { if (!annule) { setLignes(res?.parCommercial ?? []); setErreur(null); } })
      .catch((err) => { if (!annule) setErreur(err.message || 'Comparaison indisponible.'); });
    return () => { annule = true; };
  }, [token, de, jusqua]);

  if (commerciaux.length < 2) {
    return <p className="text-sm text-slate-500">Il faut au moins deux commerciaux ayant saisi des visites pour comparer.</p>;
  }

  const trouver = (nom) => lignes.find((l) => l.commercial.toLowerCase() === nom.toLowerCase()) ?? LIGNE_VIDE;
  const la = trouver(a);
  const lb = trouver(b);
  const max = Math.max(la.visitesSeul ?? 0, lb.visitesSeul ?? 0, 1);

  const entete = (nom, ligne, couleur) => {
    const e = evolutionSeul(ligne);
    return (
      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold text-slate-900 dark:text-white">{nom || '—'}</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{ligne.visitesSeul ?? 0} seul</p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={`h-2 rounded-full ${couleur}`} style={{ width: `${pourcentage(ligne.visitesSeul ?? 0, max)}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {ligne.visitesCommunes ?? 0} visite(s) commune(s) <AideCommune /> · {tauxFavorableSeul(ligne)} % de retours favorables en solo
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Évolution observée ({e.comparables} comparable(s)) : ↑ {e.pctHausse} % · = {e.pctStable} % · ↓ {e.pctBaisse} %
        </p>
      </div>
    );
  };

  const selecteur = (label, value, onChange, options, format = (o) => o) => (
    <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
      <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </label>
  );

  return (
    <section aria-label="Comparer deux commerciaux">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {selecteur('Commercial A', a, setA, commerciaux)}
        {selecteur('Commercial B', b, setB, commerciaux)}
        {selecteur('De', de, setDe, moisDisponibles, libelleMois)}
        {selecteur('À', jusqua, setJusqua, moisDisponibles, libelleMois)}
      </div>
      {erreur && <p className="mb-3 text-sm text-rose-600" role="alert">{erreur}</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {entete(a, la, 'bg-sky-500')}
        {entete(b, lb, 'bg-violet-500')}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className={thCls}>Indicateur</th>
              <th className={`${thCls} text-right`}>{a}</th>
              <th className={`${thCls} text-right`}>{b}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {INDICATEURS_COMPARAISON.map(([libelle, valeur]) => (
              <tr key={libelle}>
                <td className={tdCls}>{libelle}</td>
                <td className={`${tdCls} text-right font-semibold tabular-nums`}>{valeur(la) ?? 0}</td>
                <td className={`${tdCls} text-right font-semibold tabular-nums`}>{valeur(lb) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-sky-900 dark:bg-sky-500/10 dark:text-sky-200">
        Même période et mêmes définitions pour les deux profils. Les évolutions comparent le statut du médecin le mois de la visite
        et le mois suivant : elles ne démontrent pas que la visite a causé le changement. Utilisez cet écart pour décider quoi examiner,
        pas comme un classement automatique.
      </p>
    </section>
  );
}

// ── 3 · Qu'observe-t-on après les visites ? ────────────────────────────────

function ListeEvolutions({ titre, lignes, onOuvrirMedecin }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{titre}</h3>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Évolution observée, sans attribution causale à la visite.</p>
      {lignes.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune sur la période.</p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {lignes.map((l) => (
            <li key={l.retourTerrainId} className="rounded-lg border border-slate-100 p-2.5 text-sm dark:border-slate-800">
              <div className="flex items-baseline justify-between gap-2">
                <button type="button" onClick={() => onOuvrirMedecin?.(l.medecinId)}
                  className="text-left font-bold text-slate-900 hover:text-[#009B83] hover:underline dark:text-white">
                  {l.medecinNom}
                </button>
                <span className="shrink-0 text-xs text-slate-500">{formatDate(l.dateVisite)}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200">{libelleStatut(l.statutAvant)} → {libelleStatut(l.statutApres)}</p>
              <p className="text-xs text-slate-500">
                {l.commercialAppui ? `${l.commercial} et ${l.commercialAppui}` : l.commercial} · {QUALIF_LABEL[l.qualification] ?? l.qualification}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EtapeObservation({ data, onOuvrirMedecin }) {
  const qualifications = data?.qualifications ?? {};
  const evolutions = data?.evolutions ?? {};
  const r = data?.rapportBaisses ?? {};
  const max = Math.max(1, ...QUALIFICATIONS.map((q) => qualifications[q.key] ?? 0));
  const comparables = r.comparables ?? 0;
  const transitions = r.transitionsFrequentes ?? [];

  return (
    <Etape id="equipe-observation" numero="3" titre="Qu’observe-t-on après les visites ?"
      sousTitre="Qualification des échanges et lecture équilibrée des statuts : progression, stabilité, baisse et cas non observables.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Qualification des échanges</h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Passages de service exclus.</p>
          <ul className="space-y-2">
            {QUALIFICATIONS.map((q) => {
              const v = qualifications[q.key] ?? 0;
              return (
                <li key={q.key} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 text-slate-700 dark:text-slate-200">{q.label}</span>
                  <span className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                    <span className={`block h-2 rounded-full ${q.couleur}`} style={{ width: `${pourcentage(v, max)}%` }} />
                  </span>
                  <span className="w-10 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{v}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Statut du médecin après les visites VACTIS</h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Statut le mois de la visite comparé au mois suivant.</p>
          <div className="grid grid-cols-2 gap-3">
            <Indicateur label="Progression" valeur={evolutions.FAVORABLE} ton="positif"
              detail={`${pourcentage(evolutions.FAVORABLE ?? 0, comparables)} % des comparables`} />
            <Indicateur label="Stable" valeur={evolutions.STABLE}
              detail={`${pourcentage(evolutions.STABLE ?? 0, comparables)} % des comparables`} />
            <Indicateur label="Baisse" valeur={evolutions.DEFAVORABLE} ton={evolutions.DEFAVORABLE > 0 ? 'alerte' : 'default'}
              detail={`${pourcentage(evolutions.DEFAVORABLE ?? 0, comparables)} % des comparables`} />
            <Indicateur label="Non observable" valeur={evolutions.NON_OBSERVABLE}
              detail="Mois suivant non clôturé, statut manquant ou non classable" />
          </div>
        </div>
      </div>

      <div role="note" aria-label="Lecture des baisses"
        className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <p className="font-bold">Lecture des baisses</p>
        {r.baisses > 0 ? (
          <>
            <p className="mt-1">
              {r.baisses} baisse(s) de statut sur {comparables} transition(s) comparable(s) ({pourcentage(r.baisses, comparables)} %),
              concernant {r.medecinsEnBaisse} médecin(s). {r.medecinsBaissesRepetees} médecin(s) présentent une baisse sur plusieurs mois.
            </p>
            {r.favorablesMalgreBaisse > 0 && (
              <p className="mt-1">
                {r.favorablesMalgreBaisse} retour(s) de visite favorable(s) coexistent avec une baisse de statut : le ressenti terrain
                et le recalcul d’activité demandent alors une vérification conjointe.
              </p>
            )}
            {transitions.length > 0 && (
              <p className="mt-1">
                Transitions les plus fréquentes :{' '}
                {transitions.map((t) => `${libelleStatut(t.statutAvant)} → ${libelleStatut(t.statutApres)} (${t.nombre})`).join(' · ')}.
              </p>
            )}
          </>
        ) : (
          <p className="mt-1">Aucune baisse de statut observée sur les {comparables} transition(s) comparable(s).</p>
        )}
        <p className="mt-2 text-xs opacity-80">
          Une baisse décrit le passage vers un statut moins favorable dans le batch associé au mois de visite. Elle ne mesure pas à elle seule
          l’effet du commercial.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListeEvolutions titre="Progressions observées" lignes={r.progressions ?? []} onOuvrirMedecin={onOuvrirMedecin} />
        <ListeEvolutions titre="Baisses observées" lignes={r.baissesObservees ?? []} onOuvrirMedecin={onOuvrirMedecin} />
      </div>
    </Etape>
  );
}

// ── 4 · Que faut-il décider ? ──────────────────────────────────────────────

const ACTIONS_AFFICHEES = 8;

function EtapeDecisions({ data }) {
  const d = data?.decisions ?? {};
  const actions = d.actionsSansVisite ?? [];
  const individuel = Boolean(data?.commercial);
  return (
    <Etape id="equipe-decisions" numero="4" titre="Décisions et suites à donner"
      sousTitre="Ces listes orientent le prochain point d'équipe ; elles ne constituent pas un jugement automatique sur les commerciaux.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur label="Actions sans retour rapproché" valeur={actions.length}
          detail={`Classeur actif${d.cycleActif ? ` ${libelleMois(d.cycleActif)}` : ''}`} />
        <Indicateur label="Retours défavorables" valeur={d.retoursDefavorables} detail="Échanges à reprendre" />
        <Indicateur label="Baisses malgré retour favorable" valeur={d.baissesMalgreFavorable}
          detail="À vérifier avec les données du laboratoire" ton={d.baissesMalgreFavorable > 0 ? 'alerte' : 'default'} />
        <Indicateur label="Retours à compléter" valeur={d.retoursACompleter} detail="Échanges sans qualification" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Actions du classeur actif sans retour rapproché</h3>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Actions du classeur actif rapprochées des visites VACTIS saisies.{individuel ? ' Vue individuelle : seules les actions attribuées sont affichées.' : ''}
          </p>
          {actions.length === 0 ? (
            <p className="text-sm text-slate-500">Toutes les actions du classeur actif ont un retour.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {actions.slice(0, ACTIONS_AFFICHEES).map((a) => (
                <li key={a.actionId} className="py-1.5 text-slate-700 dark:text-slate-200">
                  <span className="font-semibold">{a.medecinNom}</span> · {a.actionRecommandee}
                  {!individuel && <span className="text-slate-500"> · {a.commercial}</span>}
                </li>
              ))}
              {actions.length > ACTIONS_AFFICHEES && (
                <li className="py-1.5 text-xs text-slate-500">et {actions.length - ACTIONS_AFFICHEES} autre(s) dans la page Actions.</li>
              )}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Points de décision</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-200">
            {pointsDecision(data).map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      </div>
    </Etape>
  );
}

// ── Onglet ─────────────────────────────────────────────────────────────────

export default function EquipeCommercialeTab({ token, compteRenduTerrain, selectedMois }) {
  const [periode, setPeriode] = useState('');
  const [commercial, setCommercial] = useState('');
  const [medecinOuvert, setMedecinOuvert] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const charger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getEquipeCommerciale(token, { ...bornesMois(periode, periode), commercial }));
    } catch (err) {
      setError(err?.status === 401 ? 'Session expirée. Veuillez vous reconnecter.' : (err.message || 'Lecture de l’équipe indisponible.'));
    } finally {
      setLoading(false);
    }
  }, [token, periode, commercial]);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
        <strong>Lecture de l’équipe en quatre étapes</strong> : d’où vient l’activité, ce qu’a réalisé chaque commercial, ce qu’on observe
        après les visites, puis ce qu’il faut décider. Les passages de service comptent dans l’activité terrain, pas dans la couverture
        commerciale. Une évolution de statut observée après une visite ne prouve pas l’effet de la visite.
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">{error}</div>}
      {loading && !data && <p className="text-sm text-slate-500">Chargement de la lecture équipe…</p>}

      {data && (
        <>
          <EtapeActivite data={data} periode={periode} setPeriode={setPeriode} commercial={commercial}
            setCommercial={setCommercial} onActualiser={charger} loading={loading}
            compteRenduTerrain={compteRenduTerrain} selectedMois={selectedMois} onOuvrirMedecin={setMedecinOuvert} />
          <EtapeRealisations data={data} token={token} />
          <EtapeObservation data={data} onOuvrirMedecin={setMedecinOuvert} />
          <EtapeDecisions data={data} />
        </>
      )}
      <FicheContextuelleDrawer
        medecinId={medecinOuvert}
        token={token}
        isOpen={medecinOuvert != null}
        onClose={() => setMedecinOuvert(null)}
      />
    </div>
  );
}
