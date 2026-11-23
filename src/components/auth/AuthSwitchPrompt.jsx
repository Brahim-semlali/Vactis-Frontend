/** Lien de bascule entre Connexion et Inscription (« Pas encore de compte ? … »). */
export default function AuthSwitchPrompt({ question, action, onClick, disabled = false }) {
  return (
    <p className="vxa-switch">
      {question}{' '}
      <button type="button" className="vxa-link" onClick={onClick} disabled={disabled}>
        {action}
      </button>
    </p>
  );
}
