import { useState } from 'react';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register({ onShowLogin }) {
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 4) {
      setError('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }

    setLoading(true);

    try {
      await register(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Impossible de créer le compte');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Inscription"
      subtitle="Créez votre compte"
      footer={
        <p>
          Déjà inscrit ?{' '}
          <button type="button" className="link-btn" onClick={onShowLogin}>
            Se connecter
          </button>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <label className="field">
          <span>Nom d&apos;utilisateur</span>
          <input
            type="text"
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="votre_nom"
          />
        </label>

        <label className="field">
          <span>Mot de passe</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={4}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <label className="field">
          <span>Confirmer le mot de passe</span>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={4}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
    </AuthLayout>
  );
}
