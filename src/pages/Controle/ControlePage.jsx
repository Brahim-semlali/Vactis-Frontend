import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  createControle,
  deleteControle,
  getControlesByType,
  updateControle,
} from '../../api/controle.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { MenuIcon } from '../../components/icons/MenuIcons.jsx';

// UI components shadcn/ui
import { Card } from '../../components/ui/card.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Skeleton } from '../../components/ui/skeleton.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.jsx';

const TABS = [
  { id: 'STATUT', label: 'Statuts', description: 'Règles de statut médecin selon le CA' },
  {
    id: 'SEGEMENTS',
    label: 'Segments',
    description:
      'Règles de segmentation selon le score de valeur (Potentiel 40%, Performance 40%, Poids éco 20%)',
  },
];

const EMPTY_FORM = {
  etat: '',
  minCA: '',
  maxCA: '',
  actif: true,
};

function formatRuleVal(value, isSegmentTab) {
  if (value === null || value === undefined || value === '') return '—';
  return isSegmentTab
    ? `${Number(value).toLocaleString('fr-FR')} pts`
    : `${Number(value).toLocaleString('fr-FR')} MAD`;
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

function RuleForm({ form, onChange, onSubmit, onCancel, submitLabel, loading, isSegmentTab }) {
  return (
    <form
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700">État / libellé</label>
        <input
          type="text"
          value={form.etat}
          onChange={(e) => onChange({ ...form, etat: e.target.value })}
          placeholder={isSegmentTab ? 'Ex. A, B, C, D…' : 'Ex. ACTIF, NOUVEAU…'}
          className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700">
          {isSegmentTab ? 'Score min (sur 100)' : 'CA min (MAD)'}
        </label>
        <input
          type="number"
          min="0"
          max={isSegmentTab ? '100' : undefined}
          value={form.minCA}
          onChange={(e) => onChange({ ...form, minCA: e.target.value })}
          className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700">
          {isSegmentTab ? 'Score max (sur 100)' : 'CA max (MAD)'}
        </label>
        <input
          type="number"
          min="0"
          max={isSegmentTab ? '100' : undefined}
          value={form.maxCA}
          onChange={(e) => onChange({ ...form, maxCA: e.target.value })}
          className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
          required
        />
      </div>

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

export default function ControlePage({ navigate }) {
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

  const loadRules = useCallback(async () => {
    if (!token) return;

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
    loadRules();
  }, [loadRules]);

  const buildPayload = (form) => ({
    type: activeTab,
    etat: form.etat.trim(),
    minCA: Number(form.minCA),
    maxCA: Number(form.maxCA),
    actif: Boolean(form.actif),
  });

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

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="p-6 bg-white shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                <MenuIcon name="controle" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Table contrôle</p>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Règles par palier de CA</h1>
              </div>
            </div>
            <p className="text-sm text-slate-600 pt-1">{currentTab.description}</p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span>{rules.length} règle{rules.length !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span className="font-semibold text-slate-600">Type actif : {currentTab.label}</span>
            </div>
          </div>

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
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
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
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Add Rule Form Card */}
      <Card className="p-5 bg-white border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Ajouter une règle</h3>
          <p className="text-xs text-slate-500">Nouveau palier pour les {currentTab.label.toLowerCase()}.</p>
        </div>
        <RuleForm
          form={createForm}
          onChange={setCreateForm}
          onSubmit={handleCreate}
          submitLabel={saving ? 'Enregistrement…' : 'Ajouter'}
          loading={saving}
          isSegmentTab={activeTab === 'SEGEMENTS'}
        />
      </Card>

      {/* Rules Table Card */}
      <Card className="bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Règles {currentTab.label.toLowerCase()}</h3>
          <p className="text-xs text-slate-500">Les règles actives alimentent les filtres de l&apos;application.</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-slate-50/80 cursor-default">
              <TableHead>État</TableHead>
              <TableHead>{activeTab === 'SEGEMENTS' ? 'Score min' : 'CA min'}</TableHead>
              <TableHead>{activeTab === 'SEGEMENTS' ? 'Score max' : 'CA max'}</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx} className="hover:bg-transparent">
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            )}

            {!loading && rules.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-32 text-center text-slate-400 text-sm">
                  Aucune règle configurée pour ce type.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              rules.map((rule) =>
                editingId === rule.idControle ? (
                  <TableRow key={rule.idControle} className="bg-teal-50/30">
                    <TableCell colSpan={5} className="p-4">
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
                        isSegmentTab={activeTab === 'SEGEMENTS'}
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
                    <TableCell className="font-medium text-slate-800">
                      {formatRuleVal(rule.minCA, activeTab === 'SEGEMENTS')}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {formatRuleVal(rule.maxCA, activeTab === 'SEGEMENTS')}
                    </TableCell>
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
                )
              )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
