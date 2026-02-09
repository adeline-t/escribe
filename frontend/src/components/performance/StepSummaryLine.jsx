export default function StepSummaryLine({
  item,
  inactiveLabel = "inactif",
  resolveTermLabel = null,
}) {
  function resolve(type, value) {
    if (typeof resolveTermLabel !== "function") return value;
    return resolveTermLabel(type, value);
  }

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

  function joinDelimitedLabel(value, type = "term") {
    if (!value) return "";
    return value
      .split(" · ")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => resolve(type, entry))
      .join(" ");
  }

  if (item.mode === "choreography") {
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
        [
          resolve("action", detail?.action),
          resolve("attaque_attribut", detail?.attribute),
        ]
          .filter(Boolean)
          .join(" "),
      )
      .filter(Boolean);
    const actionBitsFallback = [
      resolve("action", item.action),
      item.attackAttribute?.length
        ? item.attackAttribute
            .map((entry) => resolve("attaque_attribut", entry))
            .join(", ")
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const actionBits = actionBitsFromDetails.length
      ? actionBitsFromDetails
      : actionBitsFallback
        ? [actionBitsFallback]
        : [];
    const moveLabel = joinDelimitedLabel(item.attackMove, "deplacement");
    return (
      <span>
        {badge(resolve("offensive", item.offensive), "offensive", "offensive")}
        {actionBits.length ? (
          <span> en {badgeList(actionBits, "action", "action")}</span>
        ) : null}
        {item.target ? (
          <span>
            {" "}
            sur {badge(resolve("target", item.target), "target", "target")}
          </span>
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
      .map((detail) => [resolve("action", detail?.action)].filter(Boolean).join(" "))
      .filter(Boolean);
    const actionBitsFallback = [resolve("action", item.action)]
      .filter(Boolean)
      .join(" ");
    const actionBits = actionBitsFromDetails.length
      ? actionBitsFromDetails
      : actionBitsFallback
        ? [actionBitsFallback]
        : [];
    const position =
      resolve("parade_numero", actionDetails[0]?.attribute) ??
      (Array.isArray(item.attackAttribute) && item.attackAttribute.length
        ? resolve("parade_attribut", item.attackAttribute[0])
        : "");
    const positionComplements =
      Array.isArray(item.attackAttribute) && item.attackAttribute.length > 0
        ? item.attackAttribute.map((entry) =>
            resolve("parade_attribut", entry),
          )
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
          <span>
            {" "}
            sur {badge(resolve("target", item.target), "target", "target")}
          </span>
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
        if (detail?.defense) parts.push(resolve("defensive", detail.defense));
        if (detail?.position)
          parts.push(`de ${resolve("parade_numero", detail.position)}`);
        if (detail?.attribute) {
          parts.push(
            detail.attribute
              .split(" · ")
              .map((entry) => resolve("parade_attribut", entry.trim()))
              .filter(Boolean)
              .join(" "),
          );
        }
        return parts.join(" ");
      })
      .filter(Boolean);
    const paradeLabel = [
      resolve("parade_numero", item.paradeNumber),
      item.paradeAttribute
        ? item.paradeAttribute
            .split(" · ")
            .map((entry) => resolve("parade_attribut", entry.trim()))
            .filter(Boolean)
            .join(" ")
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const defenseLabel = resolve("defensive", item.defense ?? item.defensive ?? "");
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
    const moveLabel = joinDelimitedLabel(item.defendMove, "deplacement");
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
