export default function StepSummaryLine({
  item,
  inactiveLabel = "inactif",
}) {
  function badge(label, variant = "note", key) {
    if (!label) return null;
    return (
      <span key={key || label} className={`tag tag--${variant}`}>
        {label}
      </span>
    );
  }

  if (item.mode === "choregraphie") {
    return (
      <span>
        chorégraphie{" "}
        {item.chorePhase ? (
          <span className="note-inline">{item.chorePhase}</span>
        ) : (
          ""
        )}
        {item.note ? (
          <span>
            {" "}
            (<span className="note-inline">{item.note}</span>)
          </span>
        ) : null}
      </span>
    );
  }

  if (item.mode === "note") {
    return (
      <span>
        <span className="note-inline">{item.note || "à compléter"}</span>
      </span>
    );
  }

  if (item.role === "attack") {
    if (item.noteOverrides) {
      return (
        <span>
          <span className="note-inline">{item.note}</span>
        </span>
      );
    }
    const attackAttribute = item.attackAttribute?.length
      ? item.attackAttribute.join(", ")
      : "";
    const actionBits = [item.action, attackAttribute].filter(Boolean).join(" ");
    return (
      <span>
        {badge(item.offensive, "offensive", "offensive")}
        {actionBits ? <> en {badge(actionBits, "action", "action")}</> : null}
        {item.target ? (
          <span> sur {badge(item.target, "target", "target")}</span>
        ) : null}
        {item.attackMove ? (
          <span> avec {badge(item.attackMove, "move", "move")}</span>
        ) : null}
        {item.note ? (
          <span>
            {" "}
            (<span className="note-inline">{item.note}</span>)
          </span>
        ) : null}
      </span>
    );
  }

  if (item.role === "defense") {
    if (item.noteOverrides) {
      return (
        <span>
          <span className="note-inline">{item.note}</span>
        </span>
      );
    }
    const defenseLabel = item.defense ?? item.defensive ?? "";
    const paradeLabel = [item.paradeNumber, item.paradeAttribute]
      .filter(Boolean)
      .join(" ");
    return (
      <span>
        {badge(defenseLabel, "defensive", "parade")}
        {paradeLabel ? (
          <> de {badge(paradeLabel, "parade-number", "paradeLabel")}</>
        ) : null}
        {item.defendMove ? (
          <span> en {badge(item.defendMove, "move", "move")}</span>
        ) : null}
        {item.note ? (
          <span>
            {" "}
            (<span className="note-inline">{item.note}</span>)
          </span>
        ) : null}
      </span>
    );
  }

  if (item.note) {
    return (
      <span>
        (<span className="note-inline">{item.note}</span>)
      </span>
    );
  }

  return (
    <span>
      {inactiveLabel}
    </span>
  );
}
