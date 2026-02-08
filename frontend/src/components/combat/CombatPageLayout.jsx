export default function CombatPageLayout({
  title,
  subtitle,
  backLabel = "Retour à la liste",
  onBack,
  actions,
  children,
}) {
  return (
    <section className="panel">
      <div className="stack-2">
        {onBack ? (
          <button
            type="button"
            className="button-secondary inline-fit"
            onClick={onBack}
          >
            {backLabel}
          </button>
        ) : null}
        <div className="panel-header mb-3">
          <div>
            <h2 className="title">{title}</h2>
            {subtitle ? (
              <p className="subtitle mt-2 mb-2 text-muted">{subtitle}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="panel-header-actions">{actions}</div>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
