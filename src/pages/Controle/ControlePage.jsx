import { useCallback, useEffect, useState } from 'react';
import {
  createControle,
  deleteControle,
  getControlesByType,
  reinitialiserControles,
  updateControle,
} from '../../api/controle.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { MenuIcon } from '../../components/icons/MenuIcons.jsx';
import BridgeGoalSettings from './BridgeGoalSettings.jsx';

// UI components shadcn/ui
import { Card } from '../../components/ui/card.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Skeleton } from '../../components/ui/skeleton.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.jsx';

// Plafond technique du dernier palier côté back (PaliersControle.PLAFOND) : affiché « ∞ »
const PLAFOND = 100000;

/**
 * Configuration des onglets.
 * - mode 'palier' : état + bornes min / max
 * - mode 'delai'  : état + valeur (jours)
 * - mode 'bridge' : objectifs Bridge to Goal (annuel + mensuel), hors table de règles
 * - etats : liste fermée des états reconnus par le moteur (sinon saisie libre)
 * - intervalleSemiOuvert : bornes [min ; max[ (la borne max est exclue, sauf pour le dernier palier)
 */
export const TABS = [
  {
    id: 'STATUT',
    label: 'Statuts',
    mode: 'palier',
    description: 'Règles de statut médecin selon la variation du CA (M vs M-1)',
    minLabel: 'Variation min (%)',
    maxLabel: 'Variation max (%)',
    colMin: 'Variation min',
    colMax: 'Variation max',
    placeholderEtat: 'Ex. Progression, Surveillance…',
    placeholderMin: '-10',
    placeholderMax: '20',
    bornes: { min: -100, max: 1000 },
    format: (v) => `${Number(v) > 0 ? '+' : ''}${Number(v)}%`,
  },
  {
    id: 'SEGEMENTS',
    label: 'Segments',
    mode: 'palier',
    description: 'Règles de segmentation selon le score de valeur (Potentiel 40%, Performance 40%, Poids éco 20%)',
    minLabel: 'Score min (sur 100)',
    maxLabel: 'Score max (sur 100)',
    colMin: 'Score min',
    colMax: 'Score max',
    placeholderEtat: 'Ex. A, B, C, D…',
    placeholderMin: '0',
    placeholderMax: '100',
    bornes: { min: 0, max: 100 },
    format: (v) => `${Number(v).toLocaleString('fr-FR')} pts`,
  },
  {
    id: 'RUPTURE',
    label: 'Rupture',
    mode: 'palier',
    reinitialisable: true,
    intervalleSemiOuvert: true,
    description:
      'Niveau de rupture de rythme selon le ratio jours de silence / intervalle moyen du médecin (150 % = 1,5× son rythme habituel). Alimente les alertes hebdomadaires.',
    etats: ['AUCUNE', 'SURVEILLANCE', 'CRITIQUE'],
    minLabel: 'Ratio min (% de l’intervalle)',
    maxLabel: 'Ratio max (% de l’intervalle)',
    colMin: 'Ratio min',
    colMax: 'Ratio max',
    placeholderMin: '150',
    placeholderMax: '200',
    bornes: { min: 0, max: PLAFOND },
    format: (v) => `${Number(v).toLocaleString('fr-FR')} % (×${(Number(v) / 100).toLocaleString('fr-FR')})`,
  },
  {
    id: 'URGENCE',
    label: 'Urgence',
    mode: 'palier',
    reinitialisable: true,
    intervalleSemiOuvert: true,
    description:
      'Niveau d’urgence médecin selon le score d’urgence finale (0-100). Le score de risque suit les mêmes paliers, plafonné à ELEVE.',
    etats: ['FAIBLE', 'MOYEN', 'ELEVE', 'URGENT'],
    minLabel: 'Score min (sur 100)',
    maxLabel: 'Score max (sur 100)',
    colMin: 'Score min',
    colMax: 'Score max',
    placeholderMin: '50',
    placeholderMax: '75',
    bornes: { min: 0, max: 100 },
    format: (v) => `${Number(v).toLocaleString('fr-FR')} pts`,
  },
  {
    id: 'FIABILITE',
    label: 'Fiabilité',
    mode: 'palier',
    reinitialisable: true,
    intervalleSemiOuvert: true,
    description:
      'Fiabilité de l’historique selon le nombre de mois actifs. FIABLE exige en plus 6 mois d’ancienneté de collaboration.',
    etats: ['NON_FIABLE', 'PARTIEL', 'FIABLE'],
    minLabel: 'Mois actifs min',
    maxLabel: 'Mois actifs max',
    colMin: 'Mois min',
    colMax: 'Mois max',
    placeholderMin: '2',
    placeholderMax: '3',
    bornes: { min: 0, max: 1200 },
    format: (v) => `${Number(v)} mois`,
  },
  {
    id: 'DELAI_ACTION',
    label: 'Délai d’action',
    mode: 'delai',
    reinitialisable: true,
    description:
      'Délai recommandé (en jours) pour traiter une action selon le niveau d’intensité du risque. SILENCE_STRATEGIQUE s’applique aux silences critiques des segments A/B.',
    etats: ['SILENCE_STRATEGIQUE', 'CRITIQUE', 'ELEVEE', 'NORMALE'],
    valeurLabel: 'Délai (jours)',
    colValeur: 'Délai',
    placeholderValeur: '7',
    format: (v) => `${Number(v)} jour${Number(v) > 1 ? 's' : ''}`,
  },
  {
    id: 'BRIDGE_GOAL',
    label: 'Bridge to Goal',
    mode: 'bridge',
    description:
      'Objectif de CA annuel et objectifs mensuels utilisés par Bridge to Goal pour mesurer l’écart à l’objectif et le gap à combler.',
  },
];

const EMPTY_FORM = {
  etat: '',
  minCA: '',
  maxCA: '',
  valeur: '',
  actif: true,
};

export function formatRuleVal(value, tab) {
  if (value === null || value === undefined || value === '') return '—';
  if (tab.bornes && Number(value) >= PLAFOND) return '∞';
  return tab.format(value);
}

function ControleIcon({ name, size = 18 }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (name) {
    case 'plus':
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...props}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...props}>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      );
    case 'reset':
      return (
        <svg {...props}>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...props}>
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
      );
    default:
      return null;
  }
}

const INPUT_CLASS =
  'h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-primary focus:outline-none';

function RuleForm({ form, onChange, onSubmit, onCancel, submitLabel, loading, tab, idPrefix }) {
  const isDelai = tab.mode === 'delai';

  return (
    <form
      className={`grid grid-cols-1 sm:grid-cols-2 ${isDelai ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 items-end`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-etat`} className="text-xs font-semibold text-slate-700">
          {isDelai ? 'Niveau d’intensité' : 'État / libellé'}
        </label>
        {tab.etats ? (
          <select
            id={`${idPrefix}-etat`}
            value={form.etat}
            onChange={(e) => onChange({ ...form, etat: e.target.value })}
            className={INPUT_CLASS}
            required
          >
            <option value="" disabled>
              Choisir…
            </option>
            {tab.etats.map((etat) => (
              <option key={etat} value={etat}>
                {etat}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={`${idPrefix}-etat`}
            type="text"
            value={form.etat}
            onChange={(e) => onChange({ ...form, etat: e.target.value })}
            placeholder={tab.placeholderEtat}
            className={INPUT_CLASS}
            required
          />
        )}
      </div>

      {isDelai ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-valeur`} className="text-xs font-semibold text-slate-700">
            {tab.valeurLabel}
          </label>
          <input
            id={`${idPrefix}-valeur`}
            type="number"
            min="1"
            max="365"
            value={form.valeur}
            onChange={(e) => onChange({ ...form, valeur: e.target.value })}
            placeholder={tab.placeholderValeur}
            className={INPUT_CLASS}
            required
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-min`} className="text-xs font-semibold text-slate-700">
              {tab.minLabel}
              {tab.intervalleSemiOuvert && <span className="font-normal text-slate-400"> · inclus</span>}
            </label>
            <input
              id={`${idPrefix}-min`}
              type="number"
              min={tab.bornes.min}
              max={tab.bornes.max}
              value={form.minCA}
              onChange={(e) => onChange({ ...form, minCA: e.target.value })}
              placeholder={tab.placeholderMin}
              className={INPUT_CLASS}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-max`} className="text-xs font-semibold text-slate-700">
              {tab.maxLabel}
              {tab.intervalleSemiOuvert && <span className="font-normal text-slate-400"> · exclu</span>}
            </label>
            <input
              id={`${idPrefix}-max`}
              type="number"
              min={tab.bornes.min}
              max={tab.bornes.max}
              value={form.maxCA}
              onChange={(e) => onChange({ ...form, maxCA: e.target.value })}
              placeholder={tab.placeholderMax}
              className={INPUT_CLASS}
              required
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3 h-10">
        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-teal-700 focus:ring-primary h-4 w-4"
            checked={form.actif}
            onChange={(e) => onChange({ ...form, actif: e.target.checked })}
          />
          Règle active
        </label>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              onClick={onCancel}
              disabled={loading}
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
            disabled={loading}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function ControlePage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('STATUT');
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const currentTab = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const isDelai = currentTab.mode === 'delai';
  const isBridge = currentTab.mode === 'bridge';
  const nbColonnes = isDelai ? 4 : 5;

  const loadRules = useCallback(async () => {
    if (!token) return;
    // L'onglet Bridge to Goal gère ses propres données (paramètres système)
    if (TABS.find((tab) => tab.id === activeTab)?.mode === 'bridge') {
      setRules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getControlesByType(token, activeTab);
      setRules(data ?? []);
    } catch (err) {
      setError(err.message ?? 'Impossible de charger les règles');
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [token, activeTab]);

  useEffect(() => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
    setCreateForm(EMPTY_FORM);
    loadRules();
  }, [loadRules]);

  const buildPayload = (form) =>
    isDelai
      ? { type: activeTab, etat: form.etat.trim(), valeur: Number(form.valeur), actif: Boolean(form.actif) }
      : {
          type: activeTab,
          etat: form.etat.trim(),
          minCA: Number(form.minCA),
          maxCA: Number(form.maxCA),
          actif: Boolean(form.actif),
        };

  const handleCreate = async () => {
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      await createControle(token, buildPayload(createForm));
      setCreateForm(EMPTY_FORM);
      await loadRules();
    } catch (err) {
      setError(err.message ?? 'Création impossible');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (rule) => {
    setEditingId(rule.idControle);
    setEditForm({
      etat: rule.etat ?? '',
      minCA: rule.minCA ?? '',
      maxCA: rule.maxCA ?? '',
      valeur: rule.valeur ?? '',
      actif: rule.actif !== false,
    });
  };

  const handleUpdate = async () => {
    if (!token || editingId == null) return;

    setSaving(true);
    setError(null);

    try {
      await updateControle(token, editingId, buildPayload(editForm));
      setEditingId(null);
      setEditForm(EMPTY_FORM);
      await loadRules();
    } catch (err) {
      setError(err.message ?? 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (idControle) => {
    if (!token) return;
    if (!window.confirm('Supprimer cette règle ?')) return;

    setSaving(true);
    setError(null);

    try {
      await deleteControle(token, idControle);
      if (editingId === idControle) {
        setEditingId(null);
        setEditForm(EMPTY_FORM);
      }
      await loadRules();
    } catch (err) {
      setError(err.message ?? 'Suppression impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!token) return;
    if (
      !window.confirm(
        `Remplacer toutes les règles « ${currentTab.label} » par les règles VACTIS par défaut ?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = await reinitialiserControles(token, activeTab);
      setRules(data ?? []);
      setEditingId(null);
      setEditForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message ?? 'Réinitialisation impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="vx-hero p-6 bg-white shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                <MenuIcon name="controle" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Table contrôle</p>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Règles et paliers du moteur VACTIS</h1>
              </div>
            </div>
            <p className="text-sm text-slate-600 pt-1">{currentTab.description}</p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              {!isBridge && (
                <>
                  <span>{rules.length} règle{rules.length !== 1 ? 's' : ''}</span>
                  <span>•</span>
                </>
              )}
              <span className="font-semibold text-slate-600">Type actif : {currentTab.label}</span>
            </div>
          </div>

          {!isBridge && (
          <div className="flex flex-wrap items-center gap-2">
            {currentTab.reinitialisable && (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 font-semibold text-sm transition-all border border-slate-200 disabled:opacity-50"
                onClick={handleReset}
                disabled={loading || saving}
              >
                <ControleIcon name="reset" />
                Valeurs par défaut
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm transition-all shadow-md shadow-teal-700/20 disabled:opacity-50"
              onClick={loadRules}
              disabled={loading || saving}
            >
              <ControleIcon name="refresh" />
              Rafraîchir
            </button>
          </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto" role="tablist">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-teal-700 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium" role="alert">
          {error}
        </div>
      )}

      {isBridge ? (
        <BridgeGoalSettings />
      ) : (
      <>
      {/* Add Rule Form Card */}
      <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Ajouter une règle</h3>
          <p className="text-xs text-slate-500">
            {isDelai
              ? 'Un délai par niveau d’intensité.'
              : `Nouveau palier pour : ${currentTab.label.toLowerCase()}.`}
            {currentTab.intervalleSemiOuvert &&
              ' Les paliers vont de la borne min (incluse) à la borne max (exclue) et ne doivent pas se chevaucher.'}
          </p>
        </div>
        <RuleForm
          form={createForm}
          onChange={setCreateForm}
          onSubmit={handleCreate}
          submitLabel={saving ? 'Enregistrement…' : 'Ajouter'}
          loading={saving}
          tab={currentTab}
          idPrefix="controle-creation"
        />
      </Card>

      {/* Rules Table Card */}
      <Card className="bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Règles {currentTab.label.toLowerCase()}</h3>
          <p className="text-xs text-slate-500">
            {currentTab.reinitialisable
              ? 'Les règles actives sont appliquées au prochain recalcul du moteur (import ou batch). Sans règle active, les valeurs par défaut s’appliquent.'
              : 'Les règles actives alimentent les filtres de l’application.'}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-slate-50/80 cursor-default">
              <TableHead>{isDelai ? 'Niveau' : 'État'}</TableHead>
              {isDelai ? (
                <TableHead>{currentTab.colValeur}</TableHead>
              ) : (
                <>
                  <TableHead>{currentTab.colMin}</TableHead>
                  <TableHead>{currentTab.colMax}</TableHead>
                </>
              )}
              <TableHead>Actif</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx} className="hover:bg-transparent">
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  {!isDelai && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                  <TableCell><Skeleton className="h-6 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}

            {!loading && rules.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={nbColonnes} className="h-32 text-center text-slate-400 text-sm">
                  Aucune règle configurée pour ce type
                  {currentTab.reinitialisable ? ' : les valeurs VACTIS par défaut sont appliquées.' : '.'}
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              rules.map((rule) =>
                editingId === rule.idControle ? (
                  <TableRow key={rule.idControle} className="bg-teal-50/30">
                    <TableCell colSpan={nbColonnes} className="p-4">
                      <RuleForm
                        form={editForm}
                        onChange={setEditForm}
                        onSubmit={handleUpdate}
                        onCancel={() => {
                          setEditingId(null);
                          setEditForm(EMPTY_FORM);
                        }}
                        submitLabel={saving ? 'Enregistrement…' : 'Enregistrer'}
                        loading={saving}
                        tab={currentTab}
                        idPrefix={`controle-edition-${rule.idControle}`}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={rule.idControle} className="hover:bg-teal-50/30 cursor-default">
                    <TableCell>
                      <Badge variant="outline" className="font-semibold text-slate-800 bg-slate-50">
                        {rule.etat}
                      </Badge>
                    </TableCell>
                    {isDelai ? (
                      <TableCell className="font-medium text-slate-800">
                        {formatRuleVal(rule.valeur, currentTab)}
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="font-medium text-slate-800">
                          {formatRuleVal(rule.minCA, currentTab)}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {formatRuleVal(rule.maxCA, currentTab)}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Badge variant={rule.actif !== false ? 'actif' : 'muted'}>
                        {rule.actif !== false ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                          onClick={() => startEdit(rule)}
                          disabled={saving}
                          aria-label={`Modifier ${rule.etat}`}
                        >
                          <ControleIcon name="edit" size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          onClick={() => handleDelete(rule.idControle)}
                          disabled={saving}
                          aria-label={`Supprimer ${rule.etat}`}
                        >
                          <ControleIcon name="trash" size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ),
              )}
          </TableBody>
        </Table>
      </Card>
      </>
      )}
    </div>
  );
}
