import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import AuthField from '../../components/AuthField.jsx';
import AuthAlert from '../../components/auth/AuthAlert.jsx';
import AuthFormHeader from '../../components/auth/AuthFormHeader.jsx';
import AuthSubmitButton from '../../components/auth/AuthSubmitButton.jsx';
import AuthSwitchPrompt from '../../components/auth/AuthSwitchPrompt.jsx';
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

/**
 * Le formulaire saisit un « nom complet » ; l'API attend un prénom et un nom.
 * Le premier mot devient le prénom, le reste le nom (« Marie de la Tour »
 * → « Marie » / « de la Tour »). Un prénom composé s'écrit avec un trait d'union.
 */
export function splitFullName(value) {
  const [firstName = '', ...rest] = value.trim().split(/\s+/).filter(Boolean);
  return { firstName, lastName: rest.join(' ') };
}

export default function Register({ onShowLogin }) {
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [errorPulse, setErrorPulse] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = passwordStrength(password);
  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordsMismatch = confirm.length > 0 && password !== confirm;

  function fail(message) {
    setError(message);
    setErrorPulse((n) => n + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName || !lastName) {
      fail('Indiquez votre prénom et votre nom');
      return;
    }

    if (password !== confirm) {
      fail('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      fail('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      await register({
        username: username.trim(),
        password,
        firstName,
        lastName,
        email: email.trim(),
        phone: null,
      });
      setSuccess(true);
    } catch (err) {
      fail(err.message || 'Impossible de créer le compte');
      logger.warn('Inscription échouée', { username: username.trim(), message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthFormHeader title="Créez votre compte" subtitle="Rejoignez votre espace VACTIS" />

      <form className="vxa-form vxa-form--compact" onSubmit={handleSubmit} noValidate>
        <AnimatePresence initial={false}>
          {error && (
            <AuthAlert key="register-alert" pulseKey={errorPulse}>
              <p className="vxa-alert-text">{error}</p>
            </AuthAlert>
          )}
        </AnimatePresence>

        <AuthField
          label="Nom complet"
          icon="user"
          type="text"
          name="fullName"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jean Dupont"
          disabled={loading}
        />

        <AuthField
          label="Nom d'utilisateur"
          icon="username"
          type="text"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="jdupont"
          disabled={loading}
        />

        <AuthField
          label="Adresse e-mail"
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
          label="Mot de passe"
          icon="lock"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6 caractères minimum"
          disabled={loading}
        >
          {password.length > 0 && (
            <div className={`vxa-strength is-level-${strength.level}`} aria-live="polite">
              <span className="vxa-strength-bars" aria-hidden="true">
                {[1, 2, 3].map((step) => (
                  <span key={step} className={strength.level >= step ? 'is-on' : undefined} />
                ))}
              </span>
              <span className="vxa-strength-label">{strength.label}</span>
            </div>
          )}
        </AuthField>

        <AuthField
          label="Confirmation du mot de passe"
          icon="lock"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Saisissez-le à nouveau"
          disabled={loading}
          status={passwordsMismatch ? 'error' : passwordsMatch ? 'success' : undefined}
          hint={passwordsMismatch ? 'Les mots de passe ne correspondent pas' : undefined}
        />

        <AuthSubmitButton loading={loading} loadingLabel="Création…" success={success} successLabel="Compte créé">
          Créer mon compte
        </AuthSubmitButton>
      </form>

      <AuthSwitchPrompt question="Déjà un compte ?" action="Se connecter" onClick={onShowLogin} disabled={loading} />
    </>
  );
}
