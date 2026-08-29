import { useEffect, useState } from 'react';
import { changePassword, getPasswordPolicy } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

function PasswordRequirements({ password, policy }) {
  const requirements = [
    [`Au moins ${policy.mdpLongueurMinimale} caractères`, password.length >= policy.mdpLongueurMinimale],
    ...(policy.mdpExigeMajuscule ? [['Une majuscule', /[A-Z]/.test(password)]] : []),
    ...(policy.mdpExigeChiffre ? [['Un chiffre', /\d/.test(password)]] : []),
    ...(policy.mdpExigeCaractereSpecial ? [['Un caractère spécial', /[^a-zA-Z0-9]/.test(password)]] : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-medium">
      {requirements.map(([label, valid]) => (
        <span key={label} className={valid ? 'text-emerald-700' : 'text-rose-600'}>
          <span className="mr-1 font-bold">{valid ? '✓' : '!'}</span>{label}
        </span>
      ))}
    </div>
  );
}

export default function ChangePasswordModal({ onClose }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState({ mdpLongueurMinimale: 8, mdpExigeMajuscule: false, mdpExigeChiffre: false, mdpExigeCaractereSpecial: false });

  useEffect(() => {
    getPasswordPolicy(token).then(setPolicy).catch(() => {});
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.newPassword.length < policy.mdpLongueurMinimale
      || (policy.mdpExigeMajuscule && !/[A-Z]/.test(form.newPassword))
      || (policy.mdpExigeChiffre && !/\d/.test(form.newPassword))
      || (policy.mdpExigeCaractereSpecial && !/[^a-zA-Z0-9]/.test(form.newPassword))) {
      setError('Le nouveau mot de passe ne respecte pas la politique de sécurité configurée.');
      return;
    }
    if (form.newPassword !== form.confirmation) {
      setError('Les deux nouveaux mots de passe doivent être identiques.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(token, form.currentPassword, form.newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message ?? 'Impossible de modifier le mot de passe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-teal-600">Sécurité</p><h2 className="mt-1 text-2xl font-black text-slate-900">Changer le mot de passe</h2></div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-2xl text-slate-400">×</button>
        </div>
        {success ? <div className="grid gap-4"><p className="text-emerald-700">Votre mot de passe a été modifié.</p><button type="button" onClick={onClose} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">Fermer</button></div> : (
          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Mot de passe actuel<input required type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Nouveau mot de passe<input required type="password" minLength={policy.mdpLongueurMinimale} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" />
              <PasswordRequirements password={form.newPassword} policy={policy} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Confirmation<input required type="password" minLength={policy.mdpLongueurMinimale} value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2" /></label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={saving} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Modification…' : 'Modifier le mot de passe'}</button>
          </form>
        )}
      </section>
    </div>
  );
}