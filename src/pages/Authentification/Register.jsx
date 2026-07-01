import { useState } from 'react';
import AuthLayout from '../../components/AuthLayout.jsx';
import AuthField from '../../components/AuthField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { logger } from '../../utils/logger.js';

function passwordStrength(value) {
  if (!value) return { level: 0, label: '' };
  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 10) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;

  if (score <= 1) return { level: 1, label: 'Faible' };
  if (score <= 2) return { level: 2, label: 'Moyen' };
  return { level: 3, label: 'Fort' };
}

export default function Register({ onShowLogin }) {
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      await register({
        username: username.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      });
    } catch (err) {
      setError(err.message || 'Impossible de créer le compte');
      logger.warn('Inscription échouée', { username: username.trim(), message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Inscription"
      subtitle="Rejoignez la plateforme en quelques minutes"
      footer={
        <p>
          Déjà inscrit ?{' '}
          <button type="button" className="link-btn" onClick={onShowLogin}>
            Se connecter
          </button>
        </p>
      }
    >
      <form className="auth-form auth-form--register" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon" aria-hidden="true">⚠</span>
            <div>{error}</div>
          </div>
        )}

        <div className="field-row">
          <AuthField
            label="Prénom"
            icon="user"
            type="text"
            name="firstName"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jean"
            disabled={loading}
          />

          <AuthField
            label="Nom"
            type="text"
            name="lastName"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Dupont"
            disabled={loading}
          />
        </div>

        <AuthField
          label="Email"
          icon="mail"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jean.dupont@exemple.fr"
          disabled={loading}
        />

        <AuthField
          label="Téléphone (optionnel)"
          icon="phone"
          type="tel"
          name="phone"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="06 12 34 56 78"
          disabled={loading}
        />

        <AuthField
          label="Nom d'utilisateur"
          icon="user"
          type="text"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="votre_nom"
          disabled={loading}
        />

        <div className="field-group">
          <AuthField
            label="Mot de passe"
            icon="lock"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />

          {password.length > 0 && (
            <div className="password-strength" aria-live="polite">
              <div className="password-strength-bars">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`password-strength-bar ${
                      strength.level >= step ? `password-strength-bar--${strength.level}` : ''
                    }`}
                  />
                ))}
              </div>
              <span className="password-strength-label">{strength.label}</span>
            </div>
          )}
        </div>

        <AuthField
          label="Confirmer le mot de passe"
          icon="lock"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          disabled={loading}
          className={passwordsMismatch ? 'field--error' : passwordsMatch ? 'field--success' : ''}
        />

        {passwordsMismatch && (
          <p className="field-hint field-hint--error">Les mots de passe ne correspondent pas</p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading && <span className="btn-spinner" aria-hidden="true" />}
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
    </AuthLayout>
  );
}
