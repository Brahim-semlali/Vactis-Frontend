import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../api/settings.js';
import { useAuth } from '../../context/AuthContext.jsx';

const DEFAULT_FORM = {
  dureeSessionMinutes: '', dureeInactiviteJours: '', mdpLongueurMinimale: '',
  mdpExigeMajuscule: false, mdpExigeChiffre: false, mdpExigeCaractereSpecial: false,
  maxTentativesConnexion: '', dureeBlocageMinutes: '15', journalConnexionActif: true,
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
    const integerFields = ['dureeSessionMinutes', 'dureeInactiviteJours', 'mdpLongueurMinimale', 'maxTentativesConnexion', 'dureeBlocageMinutes'];
    const values = Object.fromEntries(integerFields.map((key) => [key, Number(form[key])]));
    if (!Number.isInteger(values.dureeSessionMinutes) || values.dureeSessionMinutes <= 0
      || !Number.isInteger(values.dureeInactiviteJours) || values.dureeInactiviteJours <= 0
      || !Number.isInteger(values.mdpLongueurMinimale) || values.mdpLongueurMinimale <= 0
      || !Number.isInteger(values.maxTentativesConnexion) || values.maxTentativesConnexion <= 0
      || !Number.isInteger(values.dureeBlocageMinutes) || values.dureeBlocageMinutes < 0) {
      setError('Les valeurs doivent être des entiers positifs; la durée de blocage peut être à zéro.');
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
    <section className="mx-auto w-full max-w-6xl">
      <header className="mb-7 flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-teal-700">Administration</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Paramètres système</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Gérez les règles de session, de mot de passe et de protection des comptes.</p>
        </div>
        <div className="hidden rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-right sm:block">
          <span className="block text-[10px] font-black uppercase tracking-widest text-teal-700">Sécurité active</span>
          <span className="mt-1 block text-xs font-semibold text-teal-900">Configuration globale</span>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.07)] sm:p-7">
        {loading ? <p className="text-sm text-slate-500">Chargement des paramètres…</p> : (
          <form onSubmit={handleSubmit} className="grid gap-6">
            <fieldset className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 sm:p-5">
              <legend className="px-1 text-base font-black text-slate-900">Session</legend>
              <label className="grid gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <span>Durée de session <em className="font-normal normal-case tracking-normal text-slate-400">en minutes</em></span>
                <input type="number" min="1" step="1" value={form.dureeSessionMinutes} required
                  onChange={(event) => setForm({ ...form, dureeSessionMinutes: event.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
              </label>
              <label className="grid gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <span>Durée d’inactivité <em className="font-normal normal-case tracking-normal text-slate-400">en jours</em></span>
                <input type="number" min="1" step="1" value={form.dureeInactiviteJours} required
                  onChange={(event) => setForm({ ...form, dureeInactiviteJours: event.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
              </label>
            </fieldset>
            <fieldset className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 sm:p-5">
              <legend className="px-1 text-base font-black text-slate-900">Mot de passe</legend>
              <label className="grid gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span>Longueur minimale</span><input type="number" min="1" step="1" value={form.mdpLongueurMinimale} required onChange={(e) => setForm({ ...form, mdpLongueurMinimale: e.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label>
              <div className="grid gap-2 sm:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Complexité</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {['mdpExigeMajuscule', 'mdpExigeChiffre', 'mdpExigeCaractereSpecial'].map((key) => (
                    <label key={key} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${form[key] ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 accent-teal-600" />
                      {key === 'mdpExigeMajuscule' ? 'Majuscule' : key === 'mdpExigeChiffre' ? 'Chiffre' : 'Spécial'}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>
            <fieldset className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 sm:p-5">
              <legend className="px-1 text-base font-black text-slate-900">Tentatives de connexion</legend>
              <label className="grid gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span>Nombre maximal de tentatives</span><input type="number" min="1" step="1" value={form.maxTentativesConnexion} required onChange={(e) => setForm({ ...form, maxTentativesConnexion: e.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label>
              <label className="grid gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span>Durée du blocage <em className="font-normal normal-case tracking-normal text-slate-400">0 = permanent</em></span><input type="number" min="0" step="1" value={form.dureeBlocageMinutes} onChange={(e) => setForm({ ...form, dureeBlocageMinutes: e.target.value })} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" /></label>
            </fieldset>
            <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              {metadata.updatedAt ? <p className="text-xs text-slate-500">Dernière modification par <strong className="text-slate-700">{metadata.updatedBy ?? 'système'}</strong><br />{new Date(metadata.updatedAt).toLocaleString('fr-FR')}</p> : <span />}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center"><span className="text-xs text-slate-400">Ces réglages s’appliquent à tous les utilisateurs.</span><button type="submit" disabled={saving} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 hover:shadow-md disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
            </div>
            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
          </form>
        )}
      </div>
    </section>
  );
}