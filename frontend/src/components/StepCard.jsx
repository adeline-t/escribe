export default function StepCard({ type, title, lines, accent, tags }) {
  return (
    <div className={`card-mini ${type}`}>
      <div className="card-mini__title">
        <span className={`dot ${accent}`} />
        {title}
      </div>
      <div className="card-mini__lines">
        {lines.filter(Boolean).map((line, index) => (
          <div key={index} className="card-mini__line">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
