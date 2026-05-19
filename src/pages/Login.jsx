import { useState } from 'react';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login({ onShowRegister }) {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accédez à votre espace"
      footer={
        <p>
          Pas encore de compte ?{' '}
          <button type="button" className="link-btn" onClick={onShowRegister}>
            Créer un compte
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
            autoComplete="current-password"
            required
            minLength={4}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </AuthLayout>
  );
}
