import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowRight, Clock, LockKeyhole } from 'lucide-react';
import AuthField from '../../components/AuthField.jsx';
import AuthAlert from '../../components/auth/AuthAlert.jsx';
import AuthFormHeader from '../../components/auth/AuthFormHeader.jsx';
import AuthSubmitButton from '../../components/auth/AuthSubmitButton.jsx';
import AuthSwitchPrompt from '../../components/auth/AuthSwitchPrompt.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { AuthError, getAccountStatus } from '../../api/auth.js';
import { formatLockedUntil, logger } from '../../utils/logger.js';

const MAX_SEGMENTS_TENTATIVES = 10;

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
  // Incrémenté à chaque refus pour rejouer l'animation de l'alerte
  const [errorPulse, setErrorPulse] = useState(0);
  // Retours visuels : identifiants refusés (champs en rouge) et connexion réussie
  const [credentialsRejected, setCredentialsRejected] = useState(false);
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
      logger.info('Session ouverte depuis la page login', { username: trimmed });
    } catch (err) {
      if (err instanceof AuthError && err.code === 'ACCOUNT_LOCKED') {
        await refreshAccountStatus(trimmed);
      } else if (err instanceof AuthError && err.code === 'BAD_CREDENTIALS') {
        setRemainingAttempts(err.remainingAttempts);
        setMaxAttempts(err.maxAttempts);
        setCredentialsRejected(true);
      }

      const message = buildErrorMessage(err, status);
      setError(message);
      setErrorPulse((n) => n + 1);
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

  const lockTotalSeconds = lockMinutes ? Number(lockMinutes) * 60 : 0;
  const lockProgress = lockTotalSeconds > 0 ? Math.max(0, Math.min(1, countdown / lockTotalSeconds)) : null;

  const tentativesMax = maxAttempts != null ? Number(maxAttempts) : NaN;
  const tentativesRestantes = remainingAttempts != null ? Number(remainingAttempts) : NaN;
  const showAttempts =
    !isLocked && Number.isFinite(tentativesMax) && Number.isFinite(tentativesRestantes) && tentativesMax > 0;

  return (
    <>
      <AuthFormHeader title="Ravi de vous revoir" subtitle="Connectez-vous à votre espace personnel" />

      <form className="vxa-form" onSubmit={handleSubmit} noValidate>
        <AnimatePresence initial={false}>
          {error && (
            <AuthAlert
              key="login-alert"
              tone={isLocked ? 'warning' : 'error'}
              icon={isLocked ? LockKeyhole : undefined}
              pulseKey={errorPulse}
            >
              <p className="vxa-alert-text">{error}</p>

              {isLocked && countdown > 0 && (
                <div className="vxa-lock">
                  <p className="vxa-lock-head">
                    <Clock size={13} strokeWidth={2.4} aria-hidden="true" />
                    Temps restant : <strong>{formatCountdown(countdown)}</strong>
                  </p>
                  {lockProgress != null && (
                    <span className="vxa-lock-bar" aria-hidden="true">
                      <span style={{ '--p': lockProgress }} />
                    </span>
                  )}
                </div>
              )}

              {showAttempts && (
                <div className={`vxa-attempts ${tentativesRestantes <= 1 ? 'is-critical' : ''}`}>
                  <span className="vxa-attempts-segments" aria-hidden="true">
                    {Array.from({ length: Math.min(tentativesMax, MAX_SEGMENTS_TENTATIVES) }, (_, i) => (
                      <span key={i} className={i < tentativesRestantes ? 'is-on' : undefined} />
                    ))}
                  </span>
                  <span>
                    Tentatives restantes : <strong>{tentativesRestantes}</strong> / {tentativesMax}
                  </span>
                </div>
              )}
            </AuthAlert>
          )}
        </AnimatePresence>

        <AuthField
          label="Nom d'utilisateur"
          icon="user"
          type="text"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setCredentialsRejected(false);
          }}
          onBlur={(e) => refreshAccountStatus(e.target.value)}
          placeholder="Entrez votre nom d'utilisateur"
          disabled={formDisabled}
          status={credentialsRejected ? 'error' : undefined}
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
          onChange={(e) => {
            setPassword(e.target.value);
            setCredentialsRejected(false);
          }}
          placeholder="Entrez votre mot de passe"
          disabled={formDisabled}
          status={credentialsRejected ? 'error' : undefined}
        />

        <div className="vxa-form-options">
          <label className="vxa-check">
            <input type="checkbox" name="remember" />
            <span>Se souvenir de moi</span>
          </label>
          <button type="button" className="vxa-link" disabled={formDisabled}>
            Mot de passe oublié ?
          </button>
        </div>

        <AuthSubmitButton
          loading={loading}
          loadingLabel="Connexion…"
          success={success}
          successLabel="Connexion réussie"
          disabled={formDisabled}
          icon={isLocked ? LockKeyhole : ArrowRight}
        >
          {isLocked ? 'Compte suspendu' : 'Se connecter'}
        </AuthSubmitButton>
      </form>

      <AuthSwitchPrompt
        question="Pas encore de compte ?"
        action="Créer un compte"
        onClick={onShowRegister}
        disabled={loading}
      />
    </>
  );
}
