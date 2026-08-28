import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../api/settings.js';
import { useAuth } from '../../context/AuthContext.jsx';

const DEFAULT_FORM = {
  dureeSessionMinutes: '', dureeInactiviteJours: '', mdpLongueurMinimale: '',
  mdpExigeMajuscule: false, mdpExigeChiffre: false, mdpExigeCaractereSpecial: false,
  mdpExpirationJours: '0', maxTentativesConnexion: '', dureeBlocageMinutes: '15', journalConnexionActif: true,
};

export default function SettingsPage() {
  const { token } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [metadata, setMetadata] = useState({ updatedAt: null, updatedBy: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSettings(token)
      .then((settings) => {
        if (!cancelled) {
          setForm(Object.fromEntries(Object.keys(DEFAULT_FORM).map((key) => [key, typeof DEFAULT_FORM[key] === 'boolean' ? Boolean(settings[key]) : String(settings[key] ?? DEFAULT_FORM[key])] )));
          setMetadata({ updatedAt: settings.updatedAt, updatedBy: settings.updatedBy });
        }
      })
      .catch((err) => !cancelled && setError(err.message ?? 'Impossible de charger les paramètres'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const integerFields = ['dureeSessionMinutes', 'dureeInactiviteJours', 'mdpLongueurMinimale', 'maxTentativesConnexion', 'mdpExpirationJours', 'dureeBlocageMinutes'];
    const values = Object.fromEntries(integerFields.map((key) => [key, Number(form[key])]));
    if (!Number.isInteger(values.dureeSessionMinutes) || values.dureeSessionMinutes <= 0
      || !Number.isInteger(values.dureeInactiviteJours) || values.dureeInactiviteJours <= 0
      || !Number.isInteger(values.mdpLongueurMinimale) || values.mdpLongueurMinimale <= 0
      || !Number.isInteger(values.maxTentativesConnexion) || values.maxTentativesConnexion <= 0
      || !Number.isInteger(values.mdpExpirationJours) || values.mdpExpirationJours < 0
      || !Number.isInteger(values.dureeBlocageMinutes) || values.dureeBlocageMinutes < 0) {
      setError('Les valeurs doivent être des entiers positifs; expiration et blocage peuvent être à zéro.');
      return;
    }
    if (!window.confirm('Ces réglages s’appliqueront à tous les utilisateurs. Confirmer la sauvegarde ?')) return;

    setSaving(true);
    try {
      const settings = await updateSettings(token, { ...values, mdpExigeMajuscule: form.mdpExigeMajuscule, mdpExigeChiffre: form.mdpExigeChiffre, mdpExigeCaractereSpecial: form.mdpExigeCaractereSpecial, journalConnexionActif: form.journalConnexionActif });
      setMetadata({ updatedAt: settings.updatedAt, updatedBy: settings.updatedBy });
      setMessage('Paramètres enregistrés. Les prochains tokens utiliseront la nouvelle durée de session.');
    } catch (err) {
      setError(err.message ?? 'Impossible d’enregistrer les paramètres');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-panel">
      <header className="page-panel-header">
        <p className="page-eyebrow">Administration</p>
        <h1 className="page-title">Paramètres système</h1>
        <p className="page-description">Contrôlez la durée de validité des sessions et l’inactivité des comptes.</p>
      </header>

      <div className="page-panel-card">
        {loading ? <p>Chargement des paramètres…</p> : (
          <form onSubmit={handleSubmit} className="grid gap-5">
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-5"><legend className="col-span-full text-lg font-bold text-slate-900">Session</legend>
              <label className="controle-field">
                <span>Durée de session (minutes)</span>
                <input type="number" min="1" step="1" value={form.dureeSessionMinutes} required
                  onChange={(event) => setForm({ ...form, dureeSessionMinutes: event.target.value })} />
              </label>
              <label className="controle-field">
                <span>Durée d’inactivité (jours)</span>
                <input type="number" min="1" step="1" value={form.dureeInactiviteJours} required
                  onChange={(event) => setForm({ ...form, dureeInactiviteJours: event.target.value })} />
              </label>
            </fieldset>
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-5"><legend className="col-span-full text-lg font-bold text-slate-900">Mot de passe</legend>
              <label className="controle-field"><span>Longueur minimale</span><input type="number" min="1" step="1" value={form.mdpLongueurMinimale} required onChange={(e) => setForm({ ...form, mdpLongueurMinimale: e.target.value })} /></label>
              <label className="controle-field"><span>Expiration (jours, 0 = désactivée)</span><input type="number" min="0" step="1" value={form.mdpExpirationJours} onChange={(e) => setForm({ ...form, mdpExpirationJours: e.target.value })} /></label>
              {['mdpExigeMajuscule', 'mdpExigeChiffre', 'mdpExigeCaractereSpecial'].map((key) => <label key={key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />{key === 'mdpExigeMajuscule' ? 'Exiger une majuscule' : key === 'mdpExigeChiffre' ? 'Exiger un chiffre' : 'Exiger un caractère spécial'}</label>)}
            </fieldset>
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-5"><legend className="col-span-full text-lg font-bold text-slate-900">Tentatives de connexion</legend>
              <label className="controle-field"><span>Nombre maximal de tentatives</span><input type="number" min="1" step="1" value={form.maxTentativesConnexion} required onChange={(e) => setForm({ ...form, maxTentativesConnexion: e.target.value })} /></label>
              <label className="controle-field"><span>Blocage (minutes, 0 = permanent)</span><input type="number" min="0" step="1" value={form.dureeBlocageMinutes} onChange={(e) => setForm({ ...form, dureeBlocageMinutes: e.target.value })} /></label>
            </fieldset>
            {metadata.updatedAt && <p className="page-description">Dernière modification par <strong>{metadata.updatedBy ?? 'système'}</strong> le {new Date(metadata.updatedAt).toLocaleString('fr-FR')}</p>}
            {error && <p role="alert" className="text-red-700">{error}</p>}
            {message && <p role="status" className="text-emerald-700">{message}</p>}
            <button type="submit" disabled={saving} className="w-fit px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}