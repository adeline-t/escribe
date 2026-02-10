/**
 * Returns true when a performer step contains meaningful user content.
 * This is the shared truth for add-step validation and visibility logic.
 */
export function hasPerformerStepContent(item) {
  if (!item || typeof item !== "object") return false;
  const mode = String(item.mode ?? "combat").trim().toLowerCase();
  const role = String(item.role ?? "").trim().toLowerCase();
  const note = String(item.note ?? "").trim();

  if (mode === "note") return Boolean(note);
  if (note) return true;

  const hasMoveDetails =
    Array.isArray(item.moveDetails) && item.moveDetails.length > 0;
  const hasActionDetails = Array.isArray(item.actionDetails)
    ? item.actionDetails.some((detail) => detail?.action || detail?.attribute)
    : false;
  const hasDefenseDetails = Array.isArray(item.defenseDetails)
    ? item.defenseDetails.some(
        (detail) => detail?.defense || detail?.position || detail?.attribute,
      )
    : false;
  const hasAttackAttributes =
    Array.isArray(item.attackAttribute) && item.attackAttribute.length > 0;

  if (role === "movement" || role === "preparation") {
    return Boolean(
      item.move ||
        hasMoveDetails ||
        item.attackMove ||
        item.defendMove ||
        item.preparationAction,
    );
  }

  if (role === "defense") {
    return Boolean(
      item.preparationAction ||
        item.defense ||
        item.defensive ||
        item.paradeNumber ||
        item.paradeAttribute ||
        item.defendMove ||
        item.move ||
        hasMoveDetails ||
        hasDefenseDetails,
    );
  }

  // Default combat role is attack-like.
  return Boolean(
    item.preparationAction ||
      item.offensive ||
      item.action ||
      item.target ||
      item.attackMove ||
      item.move ||
      hasMoveDetails ||
      hasAttackAttributes ||
      hasActionDetails,
  );
}
