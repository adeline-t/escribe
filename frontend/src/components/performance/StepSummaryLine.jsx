export default function StepSummaryLine({
  item,
  inactiveLabel = "inactif",
  resolveTermLabel = null,
}) {
  function isDisplacementPreparationToken(value) {
    const normalized = String(value ?? "")
      .toLowerCase()
      .replace(/_/g, " ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return (
      normalized === "displacements prep" || normalized === "deplacements prep"
    );
  }

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

  function resolveMoveBadges(rawItem) {
    const base = String(rawItem?.move ?? "").trim();
    const details = Array.isArray(rawItem?.moveDetails)
      ? rawItem.moveDetails
          .map((entry) => String(entry ?? "").trim())
          .filter(Boolean)
      : [];
    if (base || details.length) {
      return [base, ...details]
        .filter(Boolean)
        .map((entry) => resolve("deplacement", entry))
        .join(" ");
    }
    return joinDelimitedLabel(
      rawItem?.attackMove || rawItem?.defendMove || "",
      "deplacement",
    );
  }

  const preparationAction = String(
    item?.preparationAction ??
      (item?.role === "movement" || item?.role === "preparation"
        ? item?.action
        : ""),
  ).trim();
  const preparationTiming =
    String(item?.preparationTiming ?? "").trim().toLowerCase() === "after"
      ? "after"
      : "before";
  const hasLinkedPreparation =
    item?.role !== "movement" &&
    item?.role !== "preparation" &&
    Boolean(preparationAction);

  if (item.mode === "note") {
    if (!item.note) return null;
    return <span><span className="note-inline">{item.note}</span></span>;
  }

  if (item.role === "attack") {
    if (item.noteOverrides) {
      return (
        <span>
          <span className="note-inline">{item.note}</span>
        </span>
      );
    }
    const actionDetails =
      Array.isArray(item.actionDetails) && !hasLinkedPreparation
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
    const filteredActionBitsFromDetails = actionBitsFromDetails.filter(
      (entry) => !isDisplacementPreparationToken(entry),
    );
    const actionBitsFallback = [
      !hasLinkedPreparation && !isDisplacementPreparationToken(item.action)
        ? resolve("action", item.action)
        : "",
      item.attackAttribute?.length
        ? item.attackAttribute
            .map((entry) => resolve("attaque_attribut", entry))
            .join(", ")
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const actionBits = filteredActionBitsFromDetails.length
      ? filteredActionBitsFromDetails
      : actionBitsFallback
        ? [actionBitsFallback]
        : [];
    const moveLabel = resolveMoveBadges(item);
    return (
      <span>
        {hasLinkedPreparation && preparationTiming === "before" ? (
          <span>
            {badge(resolve("action", preparationAction), "action", "prep")} ·{" "}
          </span>
        ) : null}
        {badge(resolve("offensive", item.offensive), "offensive", "offensive")}
        {actionBits.length ? (
          <span> {badgeList(actionBits, "action", "action")}</span>
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
        {hasLinkedPreparation && preparationTiming === "after" ? (
          <span>
            {" "}
            · {badge(resolve("action", preparationAction), "action", "prep")}
          </span>
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

  if (item.role === "movement" || item.role === "preparation") {
    if (item.noteOverrides) {
      return (
        <span>
          <span className="note-inline">{item.note}</span>
        </span>
      );
    }
    const moveLabel = resolveMoveBadges(item);
    return (
      <span>
        <span>déplacement</span>
        {moveLabel ? <span> en {badge(moveLabel, "move", "move")}</span> : null}
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
      .map((detail, detailIndex) => {
        if (detailIndex > 0) {
          return resolve("defense_attribut", detail?.defense);
        }
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
    const moveLabel = resolveMoveBadges(item);
    return (
      <span>
        {hasLinkedPreparation && preparationTiming === "before" ? (
          <span>
            {badge(resolve("action", preparationAction), "action", "prep")} ·{" "}
          </span>
        ) : null}
        {defenseBits.length ? (
          badgeList(defenseBits, "defensive", "defensive")
        ) : null}
        {moveLabel ? (
          <span> en {badge(moveLabel, "move", "move")}</span>
        ) : null}
        {hasLinkedPreparation && preparationTiming === "after" ? (
          <span>
            {" "}
            · {badge(resolve("action", preparationAction), "action", "prep")}
          </span>
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

  return null;
}
