export default function PlaceholderPage({ title, description }) {
  return (
    <section className="page-panel">
      <header className="page-panel-header">
        <p className="page-eyebrow">PILOTAGE</p>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </header>

      <div className="page-panel-card">
        <p>Cette section sera bientôt disponible.</p>
      </div>
    </section>
  );
}
