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

  function badgeList(labels, variant, keyPrefix) {
    return labels.map((label, index) => (
      <span key={`${keyPrefix}-${index}`}>
        {index > 0 ? " · " : ""}
        {badge(label, variant, `${keyPrefix}-${index}`)}
      </span>
    ));
  }

  function joinDelimitedLabel(value) {
    if (!value) return "";
    return value
      .split(" · ")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(" ");
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
    const actionDetails = Array.isArray(item.actionDetails)
      ? item.actionDetails
      : [];
    const actionBitsFromDetails = actionDetails
      .map((detail) =>
        [detail?.action, detail?.attribute].filter(Boolean).join(" "),
      )
      .filter(Boolean);
    const actionBitsFallback = [
      item.action,
      item.attackAttribute?.length ? item.attackAttribute.join(", ") : "",
    ]
      .filter(Boolean)
      .join(" ");
    const actionBits = actionBitsFromDetails.length
      ? actionBitsFromDetails
      : actionBitsFallback
        ? [actionBitsFallback]
        : [];
    const moveLabel = joinDelimitedLabel(item.attackMove);
    return (
      <span>
        {badge(item.offensive, "offensive", "offensive")}
        {actionBits.length ? (
          <span> en {badgeList(actionBits, "action", "action")}</span>
        ) : null}
        {item.target ? (
          <span> sur {badge(item.target, "target", "target")}</span>
        ) : null}
        {moveLabel ? (
          <span> avec {badge(moveLabel, "move", "move")}</span>
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

  if (item.role === "preparation") {
    if (item.noteOverrides) {
      return (
        <span>
          <span className="note-inline">{item.note}</span>
        </span>
      );
    }
    const actionDetails = Array.isArray(item.actionDetails)
      ? item.actionDetails
      : [];
    const actionBitsFromDetails = actionDetails
      .map((detail) =>
        [detail?.action].filter(Boolean).join(" "),
      )
      .filter(Boolean);
    const actionBitsFallback = [item.action].filter(Boolean).join(" ");
    const actionBits = actionBitsFromDetails.length
      ? actionBitsFromDetails
      : actionBitsFallback
        ? [actionBitsFallback]
        : [];
    const position =
      actionDetails[0]?.attribute ??
      (Array.isArray(item.attackAttribute) && item.attackAttribute.length
        ? item.attackAttribute[0]
        : "");
    const positionComplements =
      Array.isArray(item.attackAttribute) && item.attackAttribute.length > 0
        ? item.attackAttribute
        : [];
    const positionBits = position
      ? [position, ...positionComplements.filter((entry) => entry !== position)]
      : positionComplements;
    const positionLabel = positionBits.join(" ");
    return (
      <span>
        {actionBits.length ? (
          <span>préparation {badgeList(actionBits, "action", "action")}</span>
        ) : (
          <span>préparation</span>
        )}
        {item.target ? (
          <span> sur {badge(item.target, "target", "target")}</span>
        ) : null}
        {positionLabel ? (
          <span> en {badge(positionLabel, "move", "position")}</span>
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
    const defenseDetails = Array.isArray(item.defenseDetails)
      ? item.defenseDetails
      : [];
    const defenseBitsFromDetails = defenseDetails
      .map((detail) => {
        const parts = [];
        if (detail?.defense) parts.push(detail.defense);
        if (detail?.position) parts.push(`de ${detail.position}`);
        if (detail?.attribute) parts.push(detail.attribute);
        return parts.join(" ");
      })
      .filter(Boolean);
    const paradeLabel = [item.paradeNumber, item.paradeAttribute]
      .filter(Boolean)
      .join(" ");
    const defenseLabel = item.defense ?? item.defensive ?? "";
    const defenseBits =
      defenseBitsFromDetails.length > 0
        ? defenseBitsFromDetails
        : defenseLabel || paradeLabel
          ? [
              [defenseLabel, paradeLabel ? `de ${paradeLabel}` : ""]
                .filter(Boolean)
                .join(" "),
            ]
          : [];
    const moveLabel = joinDelimitedLabel(item.defendMove);
    return (
      <span>
        {defenseBits.length ? (
          badgeList(defenseBits, "defensive", "defensive")
        ) : null}
        {moveLabel ? (
          <span> en {badge(moveLabel, "move", "move")}</span>
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
