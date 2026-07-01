import { useCallback, useEffect, useState } from 'react';
import AuthLayout from '../../components/AuthLayout.jsx';
import AuthField from '../../components/AuthField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { AuthError, getAccountStatus } from '../../api/auth.js';
import { formatLockedUntil, logger } from '../../utils/logger.js';

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function buildErrorMessage(err, accountStatus) {
  if (!(err instanceof AuthError)) {
    return err.message || 'Identifiants incorrects';
  }

  if (err.code === 'ACCOUNT_LOCKED') {
    const minutes = err.lockMinutes ?? accountStatus?.lockMinutes;
    const endTime = err.lockedUntil ?? accountStatus?.lockedUntil;
    const until = formatLockedUntil(endTime);
    if (minutes && until) {
      return `Compte suspendu pour ${minutes} minute(s). Réessayez après ${until}.`;
    }
    if (minutes) {
      return `Compte suspendu pour ${minutes} minute(s).`;
    }
    return err.message;
  }

  if (err.code === 'ACCOUNT_DISABLED') {
    return 'Compte désactivé. Contactez un administrateur.';
  }

  if (err.code === 'ACCESS_DENIED') {
    return 'Accès refusé. Vérifiez que le backend est démarré sur le port 8082.';
  }

  return err.message;
}

function applyStatusToState(status, setters) {
  const {
    setIsLocked,
    setLockMinutes,
    setLockedUntil,
    setCountdown,
    setMaxAttempts,
    setRemainingAttempts,
    setError,
  } = setters;

  if (!status) return;

  setMaxAttempts(status.maxAttempts);
  setRemainingAttempts(status.remainingAttempts);
  setLockMinutes(status.lockMinutes ?? null);
  setLockedUntil(status.lockedUntil ?? null);

  if (status.suspended && status.remainingSeconds > 0) {
    setIsLocked(true);
    setCountdown(status.remainingSeconds);
    const until = formatLockedUntil(status.lockedUntil);
    const minutes = status.lockMinutes ?? '?';
    setError(
      until
        ? `Compte suspendu pour ${minutes} minute(s). Réessayez après ${until}.`
        : `Compte suspendu pour ${minutes} minute(s).`,
    );
    return;
  }

  setIsLocked(false);
  setCountdown(0);
  setLockMinutes(null);
  setLockedUntil(null);
}

export default function Login({ onShowRegister }) {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [lockMinutes, setLockMinutes] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(null);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [loading, setLoading] = useState(false);

  const setters = {
    setIsLocked,
    setLockMinutes,
    setLockedUntil,
    setCountdown,
    setMaxAttempts,
    setRemainingAttempts,
    setError,
  };

  const refreshAccountStatus = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    try {
      const status = await getAccountStatus(trimmed);
      applyStatusToState(status, setters);
      return status;
    } catch {
      logger.debug('Impossible de récupérer le statut du compte', { username: trimmed });
      return null;
    }
  }, []);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) return undefined;

    refreshAccountStatus(trimmed);

    if (!isLocked) return undefined;

    const interval = setInterval(async () => {
      const status = await getAccountStatus(trimmed);
      if (status?.suspended && status.remainingSeconds > 0) {
        applyStatusToState(status, setters);
      } else {
        setIsLocked(false);
        setCountdown(0);
        setLockMinutes(null);
        setLockedUntil(null);
        setError('');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [username, isLocked, refreshAccountStatus]);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmed = username.trim();
    const status = await refreshAccountStatus(trimmed);

    if (status?.suspended && status.remainingSeconds > 0) {
      setError(`Compte suspendu. Temps restant : ${formatCountdown(status.remainingSeconds)}`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(trimmed, password);
      logger.info('Session ouverte depuis la page login', { username: trimmed });
    } catch (err) {
      if (err instanceof AuthError && err.code === 'ACCOUNT_LOCKED') {
        await refreshAccountStatus(trimmed);
      } else if (err instanceof AuthError && err.code === 'BAD_CREDENTIALS') {
        setRemainingAttempts(err.remainingAttempts);
        setMaxAttempts(err.maxAttempts);
      }

      const message = buildErrorMessage(err, status);
      setError(message);
      logger.warn('Connexion refusée sur la page login', {
        username: trimmed,
        code: err instanceof AuthError ? err.code : null,
        remainingAttempts: err instanceof AuthError ? err.remainingAttempts : null,
        maxAttempts: err instanceof AuthError ? err.maxAttempts : null,
      });
    } finally {
      setLoading(false);
    }
  }

  const formDisabled = loading || isLocked;

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accédez à votre espace personnel"
      footer={
        <p>
          Pas encore de compte ?{' '}
          <button type="button" className="link-btn" onClick={onShowRegister} disabled={loading}>
            Créer un compte
          </button>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div
            className={`alert ${isLocked ? 'alert-warning' : 'alert-error'}`}
            role="alert"
          >
            <span className="alert-icon" aria-hidden="true">
              {isLocked ? '⏳' : '⚠'}
            </span>
            <div>
              {error}
              {isLocked && countdown > 0 && (
                <p className="lock-countdown">Temps restant : {formatCountdown(countdown)}</p>
              )}
            </div>
          </div>
        )}

        {!isLocked && remainingAttempts != null && maxAttempts != null && error && (
          <p className="attempts-info">
            Tentatives restantes : <strong>{remainingAttempts}</strong> / {maxAttempts}
          </p>
        )}

        <AuthField
          label="Nom d'utilisateur"
          icon="user"
          type="text"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onBlur={(e) => refreshAccountStatus(e.target.value)}
          placeholder="votre_nom"
          disabled={formDisabled}
        />

        <AuthField
          label="Mot de passe"
          icon="lock"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={formDisabled}
        />

        <button type="submit" className="btn btn-primary btn-block" disabled={formDisabled}>
          {loading && <span className="btn-spinner" aria-hidden="true" />}
          {loading ? 'Connexion…' : isLocked ? 'Compte suspendu' : 'Se connecter'}
        </button>
      </form>
    </AuthLayout>
  );
}
