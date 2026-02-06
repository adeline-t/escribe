export default function CombatPageLayout({
  title,
  subtitle,
  backLabel = "Retour à la liste",
  onBack,
  children,
}) {
  return (
    <section className="panel">
      <div className="stack-2">
        {onBack ? (
          <button type="button" className="chip inline-fit" onClick={onBack}>
            {backLabel}
          </button>
        ) : null}
        <div className="panel-header mb-3">
          <div>
            <h2 className="title">{title}</h2>
            {subtitle ? <p className="subtitle mt-2 mb-2">{subtitle}</p> : null}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}
