import { useId, useState } from 'react';
import { ArrowBigUp, AtSign, CircleCheck, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';

const ICONS = {
  user: UserRound,
  username: AtSign,
  mail: Mail,
  phone: Phone,
  lock: LockKeyhole,
};

/**
 * Champ de formulaire d'authentification.
 * - `status` : 'error' | 'success' (bordure et icône d'état)
 * - `hint`   : message affiché sous le champ et relié par aria-describedby
 * - `children` : contenu complémentaire sous le champ (ex. jauge de robustesse)
 * Les champs mot de passe ont un bouton afficher/masquer et signalent la touche Verr. Maj.
 */
export default function AuthField({
  label,
  icon,
  type = 'text',
  disabled,
  status,
  hint,
  className = '',
  id,
  children,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = id ?? `vxa-field-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;

  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  const Icon = icon ? ICONS[icon] : null;

  // Signale le verrouillage des majuscules pendant la saisie d'un mot de passe
  function detectCapsLock(event) {
    if (isPassword && typeof event.getModifierState === 'function') {
      setCapsLock(event.getModifierState('CapsLock'));
    }
  }

  const classes = ['vxa-field', status && `is-${status}`, disabled && 'is-disabled', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <label className="vxa-field-label" htmlFor={inputId}>
        {label}
      </label>

      <div className="vxa-field-control">
        {Icon && <Icon className="vxa-field-icon" size={18} strokeWidth={2} aria-hidden="true" />}
        <input
          id={inputId}
          className="vxa-field-input"
          type={inputType}
          disabled={disabled}
          aria-invalid={status === 'error' || undefined}
          aria-describedby={hintId}
          {...inputProps}
          onKeyDown={(event) => {
            detectCapsLock(event);
            onKeyDown?.(event);
          }}
          onKeyUp={(event) => {
            detectCapsLock(event);
            onKeyUp?.(event);
          }}
          onBlur={(event) => {
            setCapsLock(false);
            onBlur?.(event);
          }}
        />

        {isPassword && capsLock && (
          <span className="vxa-field-caps" title="Verrouillage des majuscules activé" aria-hidden="true">
            <ArrowBigUp size={13} strokeWidth={2.4} />
            Maj
          </span>
        )}

        {status === 'success' && (
          <CircleCheck className="vxa-field-status" size={18} strokeWidth={2.2} aria-hidden="true" />
        )}

        {isPassword && (
          <button
            type="button"
            className="vxa-field-toggle"
            onClick={() => setShowPassword((v) => !v)}
            disabled={disabled}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff key="masquer" size={18} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Eye key="afficher" size={18} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {children}

      {hint && (
        <p id={hintId} className="vxa-field-hint">
          {hint}
        </p>
      )}

      {isPassword && (
        <span className="sr-only" aria-live="polite">
          {capsLock ? 'Verrouillage des majuscules activé' : ''}
        </span>
      )}
    </div>
  );
}
