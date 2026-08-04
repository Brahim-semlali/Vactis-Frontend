import { useCallback, useEffect, useState } from 'react';
import {
  createControle,
  deleteControle,
  getControlesByType,
  updateControle,
} from '../../api/controle.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { MenuIcon } from '../../components/icons/MenuIcons.jsx';

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
      className="controle-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="controle-field">
        <span>État / libellé</span>
        <input
          type="text"
          value={form.etat}
          onChange={(e) => onChange({ ...form, etat: e.target.value })}
          placeholder={isSegmentTab ? 'Ex. A, B, C, D…' : 'Ex. ACTIF, NOUVEAU…'}
          required
        />
      </label>
      <label className="controle-field">
        <span>{isSegmentTab ? 'Score min (sur 100)' : 'CA min (MAD)'}</span>
        <input
          type="number"
          min="0"
          max={isSegmentTab ? '100' : undefined}
          value={form.minCA}
          onChange={(e) => onChange({ ...form, minCA: e.target.value })}
          required
        />
      </label>
      <label className="controle-field">
        <span>{isSegmentTab ? 'Score max (sur 100)' : 'CA max (MAD)'}</span>
        <input
          type="number"
          min="0"
          max={isSegmentTab ? '100' : undefined}
          value={form.maxCA}
          onChange={(e) => onChange({ ...form, maxCA: e.target.value })}
          required
        />
      </label>
      <label className="controle-field controle-field--checkbox">
        <input
          type="checkbox"
          checked={form.actif}
          onChange={(e) => onChange({ ...form, actif: e.target.checked })}
        />
        <span>Règle active</span>
      </label>
      <div className="controle-form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            Annuler
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {submitLabel}
        </button>
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
    <div className="medecins-page controle-page">

      <section className="medecins-card medecins-hero">
        <div className="medecins-hero-main">
          <div className="medecins-hero-heading">
            <span className="medecins-hero-icon" aria-hidden="true">
              <MenuIcon name="controle" />
            </span>
            <div>
              <p className="medecins-eyebrow">Table controle</p>
              <h2 className="medecins-title">Règles par palier de CA</h2>
            </div>
          </div>
          <p className="medecins-description">{currentTab.description}</p>
          <div className="medecins-meta">
            <span>{rules.length} règle{rules.length !== 1 ? 's' : ''}</span>
            <span>Type actif : {currentTab.label}</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary medecins-refresh-btn"
          onClick={loadRules}
          disabled={loading || saving}
        >
          <ControleIcon name="refresh" />
          Rafraîchir
        </button>
      </section>

      <nav className="controle-tabs" aria-label="Types de contrôle">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`controle-tab${activeTab === tab.id ? ' controle-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error && (
        <section className="medecins-card medecins-error">
          <p>{error}</p>
        </section>
      )}

      <section className="medecins-card controle-create-card">
        <header className="medecins-panel-header">
          <div>
            <h3>Ajouter une règle</h3>
            <p>Nouveau palier pour les {currentTab.label.toLowerCase()}.</p>
          </div>
        </header>
        <RuleForm
          form={createForm}
          onChange={setCreateForm}
          onSubmit={handleCreate}
          submitLabel={saving ? 'Enregistrement…' : 'Ajouter'}
          loading={saving}
          isSegmentTab={activeTab === 'SEGEMENTS'}
        />
      </section>

      <section className="medecins-card controle-table-card">
        <header className="medecins-panel-header">
          <div>
            <h3>Règles {currentTab.label.toLowerCase()}</h3>
            <p>Les règles actives alimentent les filtres de la page Médecins.</p>
          </div>
        </header>

        <div className="medecins-table-wrap">
          <table className="medecins-table controle-table">
            <thead>
              <tr>
                <th scope="col">État</th>
                <th scope="col">{activeTab === 'SEGEMENTS' ? 'Score min' : 'CA min'}</th>
                <th scope="col">{activeTab === 'SEGEMENTS' ? 'Score max' : 'CA max'}</th>
                <th scope="col">Actif</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="controle-empty">
                    Chargement…
                  </td>
                </tr>
              )}

              {!loading && rules.length === 0 && (
                <tr>
                  <td colSpan={5} className="controle-empty">
                    Aucune règle configurée pour ce type.
                  </td>
                </tr>
              )}

              {!loading &&
                rules.map((rule) =>
                  editingId === rule.idControle ? (
                    <tr key={rule.idControle} className="controle-edit-row">
                      <td colSpan={5}>
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
                      </td>
                    </tr>
                  ) : (
                    <tr key={rule.idControle}>
                      <td>
                        <span className="controle-etat-badge">{rule.etat}</span>
                      </td>
                      <td>{formatRuleVal(rule.minCA, activeTab === 'SEGEMENTS')}</td>
                      <td>{formatRuleVal(rule.maxCA, activeTab === 'SEGEMENTS')}</td>
                      <td>
                        <span
                          className={`controle-status-pill${
                            rule.actif !== false ? ' controle-status-pill--active' : ''
                          }`}
                        >
                          {rule.actif !== false ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <div className="controle-row-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => startEdit(rule)}
                            disabled={saving}
                            aria-label={`Modifier ${rule.etat}`}
                          >
                            <ControleIcon name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm controle-delete-btn"
                            onClick={() => handleDelete(rule.idControle)}
                            disabled={saving}
                            aria-label={`Supprimer ${rule.etat}`}
                          >
                            <ControleIcon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
