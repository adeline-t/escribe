export default function StepCard({ type, title, lines, accent, tags }) {
  return (
    <div className={`card-mini ${type}`}>
      <div className="card-mini__title">
        <span className={`dot ${accent}`} />
        {title}
      </div>
      <div className="card-mini__lines">
        {lines.filter(Boolean).map((line) => (
          <div key={line} className="card-mini__line">
            {line}
          </div>
        ))}
      </div>
      {tags?.length ? (
        <div className="card-mini__tags">
          {tags
            .filter((tag) => tag && tag.label)
            .map((tag) => (
              <span key={tag.label} className={`tag tag--${tag.variant || "neutral"}`}>
                {tag.label}
              </span>
            ))}
        </div>
      ) : null}
    </div>
  );
}
