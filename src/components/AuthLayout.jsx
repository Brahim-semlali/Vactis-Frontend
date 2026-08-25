const logo = new URL('./icons/logo.png', import.meta.url).href;
export const showcaseLogo = new URL('./icons/logo1.png', import.meta.url).href;

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <aside className="auth-showcase" aria-hidden="true">
        <div className="auth-showcase-content">
          <img className="auth-showcase-logo" src={showcaseLogo} alt="" />
          <h2>VACTIS</h2>
          <p>Smart Data. <span>Smarter Decisions.</span></p>
        </div>
      </aside>
      <div className={`auth-card ${title === 'Inscription' ? 'auth-card--register' : ''}`}>
        <header className="auth-header">
          <div className="auth-mark">
            <img className="auth-logo" src={showcaseLogo} alt="VACTIS" />
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
