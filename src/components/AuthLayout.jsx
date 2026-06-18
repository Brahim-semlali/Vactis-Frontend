export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <div className="auth-mark">
            <span className="auth-mark-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="3" y="6" width="26" height="20" rx="4" stroke="currentColor" strokeWidth="1.75" />
                <path d="M3 13h26" stroke="currentColor" strokeWidth="1.75" />
                <path d="M10 22h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </span>
            <span className="auth-mark-name">vactis</span>
          </div>
          <h1>{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        </header>
        {children}
        {footer && <footer className="auth-footer">{footer}</footer>}
      </div>
    </div>
  );
}
