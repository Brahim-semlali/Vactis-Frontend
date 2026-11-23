import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquareWarning, RefreshCw } from 'lucide-react';
import { getEquipeCommerciale } from '../../api/activite.js';
import { getVactisStatutMeta } from './activiteLabels.js';
import {
  bornesMois,
  filtrerVisites,
  libelleMois,
  naturePassage,
  pointsDecision,
  pourcentage,
} from './equipeCommerciale.js';

const QUALIFICATIONS = [
  { key: 'FAVORABLE', label: 'Favorable', couleur: 'bg-emerald-500' },
  { key: 'NEUTRE', label: 'Neutre', couleur: 'bg-sky-500' },
  { key: 'DEFAVORABLE', label: 'Refus', couleur: 'bg-amber-500' },
  { key: 'RECLAMATION', label: 'Réclamation', couleur: 'bg-rose-500' },
  { key: 'CONGE_ABSENCE', label: 'Congé / absence', couleur: 'bg-violet-400' },
  { key: 'NON_RENSEIGNE', label: 'Non renseignée', couleur: 'bg-slate-400' },
];

const EVOLUTIONS = {
  FAVORABLE: { label: 'Progression', sub: 'Observée', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
  STABLE: { label: 'Stable', sub: 'Observée', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200' },
  DEFAVORABLE: { label: 'Baisse', sub: 'À examiner', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' },
  NON_OBSERVABLE: { label: 'Non observable', sub: 'M+1 non clôturé ou sans données', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
};

const QUALIF_LABEL = Object.fromEntries(QUALIFICATIONS.map((q) => [q.key, q.label]));

const carte = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const selectCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const thCls = 'px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400';
const tdCls = 'px-3 py-2 text-sm text-slate-700 dark:text-slate-200';

function Bloc({ numero, titre, sousTitre, children, id }) {
  return (
    <section id={id} className={`${carte} overflow-hidden`} aria-labelledby={`${id}-titre`}>
      <header className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h2 id={`${id}-titre`} className="text-base font-bold text-slate-900 dark:text-white">
          {numero} · {titre}
        </h2>
        {sousTitre && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sousTitre}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Indicateur({ label, valeur, detail, ton = 'default' }) {
  const tons = {
    default: 'text-slate-900 dark:text-white',
    alerte: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tons[ton]}`}>{valeur ?? 0}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
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

// ── 1 · Travail confié et terrain parcouru ─────────────────────────────────

function BlocTerrain({ data, periode, setPeriode, commercial, setCommercial, onActualiser, loading }) {
  const s = data?.synthese ?? {};
  const individuel = Boolean(data?.commercial);
  return (
    <Bloc id="equipe-terrain" numero="1" titre="Le travail confié et le terrain parcouru"
      sousTitre="Une action VACTIS peut entraîner plusieurs visites. Les passages hors VACTIS sont suivis séparément.">
      <div className="mb-4 flex flex-wrap items-end gap-3">
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Indicateur label="Passages réalisés" valeur={s.passagesRealises}
          detail={`${s.passagesSaisis ?? 0} saisis · ${Math.round(s.tauxRealisation ?? 0)} % réalisés${individuel ? ` · ${s.participationsAppui ?? 0} en appui` : ''}`} />
        <Indicateur label="Visites VACTIS" valeur={s.visitesVactis} detail="Passages liés à une action" />
        <Indicateur label="Hors VACTIS" valeur={s.horsVactis} detail={`${s.passagesService ?? 0} passage(s) de service`} />
        <Indicateur label="Médecins en échange" valeur={s.medecinsEnEchange} detail="Médecins connus rapprochés, services exclus" />
        <Indicateur label="Prospects à rapprocher" valeur={s.prospects} detail="Sans dossier au laboratoire · suivi dans Zone intelligence" />
        <Indicateur label="Relais effectués" valeur={s.relais} detail="Réalisateur différent du prioritaire" />
      </div>
    </Bloc>
  );
}

// ── 2 · Répartition par commercial ─────────────────────────────────────────

function BlocRepartition({ lignes, commercialSelectionne }) {
  return (
    <Bloc id="equipe-repartition" numero="2" titre="Répartition par commercial"
      sousTitre="Même période pour toute l'équipe. Les participations en appui sont comptées à part du responsable principal.">
      {lignes.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun passage saisi sur la période.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700">
              <tr>
                {['Commercial', 'Passages principaux', 'Participation en appui', 'VACTIS', 'Hors VACTIS', 'Services',
                  'Médecins en échange', 'Prospects', 'Retours qualifiés', 'Refus / réclamations', 'Relais'].map((h, i) => (
                  <th key={h} className={`${thCls} ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lignes.map((l) => {
                const actif = commercialSelectionne && l.commercial.toLowerCase() === commercialSelectionne.toLowerCase();
                return (
                  <tr key={l.commercial} className={actif ? 'bg-teal-50/60 dark:bg-teal-500/10' : undefined}>
                    <td className={`${tdCls} font-semibold text-slate-900 dark:text-white`}>{l.commercial}</td>
                    {[l.passagesPrincipaux, l.participationsAppui, l.visitesVactis, l.horsVactis, l.services,
                      l.medecinsEnEchange, l.prospects, fraction(l.retoursQualifies, l.echanges), l.refusOuReclamations, l.relais]
                      .map((v, i) => <td key={i} className={`${tdCls} text-right tabular-nums`}>{v}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        La répartition des tâches et les motifs diffèrent entre commerciaux : ces colonnes ne constituent pas un classement de performance.
      </p>
    </Bloc>
  );
}

// ── 3 · Comparer deux commerciaux ──────────────────────────────────────────

const INDICATEURS_COMPARAISON = [
  ['Passages réalisés, responsable principal', (l) => l.passagesPrincipaux],
  ['Participations en appui', (l) => l.participationsAppui],
  ['Visites VACTIS', (l) => l.visitesVactis],
  ['Hors VACTIS', (l) => l.horsVactis],
  ['Passages de service', (l) => l.services],
  ['Médecins en échange', (l) => l.medecinsEnEchange],
  ['Prospects à rapprocher', (l) => l.prospects],
  ['Retours qualifiés / échanges', (l) => fraction(l.retoursQualifies, l.echanges)],
  ['Retours favorables / échanges', (l) => fraction(l.retoursFavorables, l.echanges)],
  ['Refus ou réclamations', (l) => l.refusOuReclamations],
  ['Progressions observées / comparables', (l) => fraction(l.progressions, l.comparables)],
  ['Baisses observées', (l) => l.baisses],
  ['Relais effectués', (l) => l.relais],
];

const LIGNE_VIDE = Object.freeze({});

function BlocComparaison({ token, commerciaux, moisDisponibles }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [de, setDe] = useState('');
  const [jusqua, setJusqua] = useState('');
  const [lignes, setLignes] = useState([]);
  const [erreur, setErreur] = useState(null);

  // Valeurs par défaut dès que les listes sont connues
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

  const trouver = (nom) => lignes.find((l) => l.commercial.toLowerCase() === nom.toLowerCase()) ?? LIGNE_VIDE;
  const la = trouver(a);
  const lb = trouver(b);
  const max = Math.max(la.passagesPrincipaux ?? 0, lb.passagesPrincipaux ?? 0, 1);

  const entete = (nom, ligne, couleur) => (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold text-slate-900 dark:text-white">{nom || '—'}</p>
        <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{ligne.passagesPrincipaux ?? 0}</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-2 rounded-full ${couleur}`} style={{ width: `${pourcentage(ligne.passagesPrincipaux ?? 0, max)}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {ligne.participationsAppui ?? 0} participation(s) en appui · {pourcentage(ligne.retoursQualifies ?? 0, ligne.echanges ?? 0)} % d'échanges qualifiés
      </p>
    </div>
  );

  const selecteur = (label, value, onChange, options, format = (o) => o) => (
    <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
      <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </label>
  );

  return (
    <Bloc id="equipe-comparaison" numero="3" titre="Comparer deux commerciaux"
      sousTitre="Même période et mêmes définitions pour les deux profils. Les passages de service sont visibles sans entrer dans la couverture commerciale.">
      {commerciaux.length < 2 ? (
        <p className="text-sm text-slate-500">Il faut au moins deux commerciaux ayant saisi des visites pour comparer.</p>
      ) : (
        <>
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
            Les progressions comparent le statut du médecin le mois de la visite VACTIS et le mois suivant. Elles ne démontrent pas
            que la visite a causé le changement. La charge confiée et les types de mission peuvent différer : utilisez cet écart pour
            décider quoi examiner ou réattribuer, pas comme un classement automatique.
          </p>
        </>
      )}
    </Bloc>
  );
}

// ── 4 · Qualité des échanges et évolution observée ─────────────────────────

function BlocQualite({ qualifications, evolutions }) {
  const max = Math.max(1, ...QUALIFICATIONS.map((q) => qualifications?.[q.key] ?? 0));
  return (
    <Bloc id="equipe-qualite" numero="4" titre="Qualité des échanges et évolution observée"
      sousTitre="Qualification terrain et statut du médecin répondent à deux questions différentes.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Qualification des échanges</h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Passages de service exclus.</p>
          <ul className="space-y-2">
            {QUALIFICATIONS.map((q) => {
              const v = qualifications?.[q.key] ?? 0;
              return (
                <li key={q.key} className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 text-slate-700 dark:text-slate-200">{q.label}</span>
                  <span className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                    <span className={`block h-2 rounded-full ${q.couleur}`} style={{ width: `${pourcentage(v, max)}%` }} />
                  </span>
                  <span className="w-8 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{v}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Après les visites VACTIS</h3>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Statut du médecin le mois de la visite comparé au mois suivant.</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(EVOLUTIONS).map(([cle, meta]) => (
              <Indicateur key={cle} label={meta.label} valeur={evolutions?.[cle] ?? 0} detail={meta.sub}
                ton={cle === 'DEFAVORABLE' && evolutions?.[cle] > 0 ? 'alerte' : 'default'} />
            ))}
          </div>
        </div>
      </div>
    </Bloc>
  );
}

// ── 5 · Lecture détaillée ──────────────────────────────────────────────────

function BlocDetail({ visites, compteRenduTerrain, selectedMois }) {
  const [recherche, setRecherche] = useState('');
  const [nature, setNature] = useState('TOUS');
  const [voirReclamations, setVoirReclamations] = useState(false);
  const lignes = useMemo(() => filtrerVisites(visites, { recherche, nature }), [visites, recherche, nature]);
  const reclamations = useMemo(() => (visites ?? []).filter((v) => v.reclamation), [visites]);
  const cr = compteRenduTerrain;

  return (
    <Bloc id="equipe-detail" numero="5" titre="Lecture détaillée médecin par médecin"
      sousTitre="Chaque passage saisi, avec la qualification terrain et l'évolution observée du statut pour les visites VACTIS.">
      <div className="mb-3 flex flex-wrap gap-3">
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
                  {v.medecinNom}
                  {v.prospect && <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">Prospect</span>}
                </td>
                <td className={tdCls}>
                  {v.commercial}
                  {v.commercialAppui && <span className="block text-xs text-slate-500">appui : {v.commercialAppui}</span>}
                  {v.relais && <span className="block text-xs text-amber-700 dark:text-amber-400">relais de {v.commercialPrioritaire}</span>}
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
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Indicateurs déjà présents dans l'onglet Activité du laboratoire, toute l'équipe.</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Indicateur label="Visites renseignées" valeur={cr.visitesRenseignees} />
            <Indicateur label="Visites réalisées" valeur={cr.visitesRealisees} />
            <Indicateur label="Taux terrain" valeur={`${Math.round(cr.tauxTerrain ?? 0)} %`} />
            <Indicateur label="Favorables" valeur={cr.favorables} />
            <Indicateur label="Défavorables / refus" valeur={cr.defavorablesRefus} />
            <Indicateur label="Avec réclamation" valeur={cr.visitesAvecReclamation} />
          </div>
        </div>
      )}
    </Bloc>
  );
}

// ── 6 · Décisions ─────────────────────────────────────────────────────────

const ACTIONS_AFFICHEES = 8;

function BlocDecisions({ data }) {
  const d = data?.decisions ?? {};
  const actions = d.actionsSansVisite ?? [];
  const individuel = Boolean(data?.commercial);
  return (
    <Bloc id="equipe-decisions" numero="6" titre="Décisions et suites à donner"
      sousTitre="Ces listes orientent le prochain point d'équipe ; elles ne constituent pas un jugement automatique sur les commerciaux.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur label="Actions sans visite" valeur={actions.length}
          detail={`Classeur actif${d.cycleActif ? ` ${libelleMois(d.cycleActif)}` : ''}, ${individuel ? 'actions attribuées' : 'toutes attributions'}`} />
        <Indicateur label="Réclamations / refus" valeur={d.refusOuReclamations} detail="Échanges à reprendre" />
        <Indicateur label="Baisses observées" valeur={d.baissesObservees} detail="Médecins à examiner" ton={d.baissesObservees > 0 ? 'alerte' : 'default'} />
        <Indicateur label="Retours à compléter" valeur={d.retoursACompleter} detail="Échanges sans qualification" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Actions VACTIS sans visite enregistrée</h3>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Actions du classeur actif rapprochées de toutes les visites VACTIS.{individuel ? ' Vue individuelle : seules les actions attribuées sont affichées.' : ''}
          </p>
          {actions.length === 0 ? (
            <p className="text-sm text-slate-500">Toutes les actions du classeur actif ont une visite.</p>
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
    </Bloc>
  );
}

// ── Onglet ─────────────────────────────────────────────────────────────────

export default function EquipeCommercialeTab({ token, compteRenduTerrain, selectedMois }) {
  const [periode, setPeriode] = useState('');
  const [commercial, setCommercial] = useState('');
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

  const commerciaux = data?.commerciaux ?? [];
  const moisDisponibles = data?.moisDisponibles ?? [];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
        <strong>Lecture de l'équipe.</strong> Les blocs ci-dessous combinent les actions VACTIS et les visites saisies dans Actions
        (VACTIS, hors VACTIS et passages de service). Une évolution de statut observée après une visite ne prouve pas l'effet de la visite.
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">{error}</div>}
      {loading && !data && <p className="text-sm text-slate-500">Chargement de la lecture équipe…</p>}

      {data && (
        <>
          <BlocTerrain data={data} periode={periode} setPeriode={setPeriode} commercial={commercial}
            setCommercial={setCommercial} onActualiser={charger} loading={loading} />
          <BlocRepartition lignes={data.parCommercial ?? []} commercialSelectionne={data.commercial} />
          <BlocComparaison token={token} commerciaux={commerciaux} moisDisponibles={moisDisponibles} />
          <BlocQualite qualifications={data.qualifications} evolutions={data.evolutions} />
          <BlocDetail visites={data.visites} compteRenduTerrain={compteRenduTerrain} selectedMois={selectedMois} />
          <BlocDecisions data={data} />
        </>
      )}
    </div>
  );
}
