/**
 * Performer identity helpers.
 * These functions guarantee stable performer IDs across reads/writes.
 */
export function normalizeStepMode(mode) {
  return mode === "choregraphie" ? "choreography" : mode;
}

export function normalizePerformerIdentity(performer, index = 0) {
  if (typeof performer === "string") {
    return {
      id: crypto.randomUUID(),
      name: performer,
      weapon: "",
    };
  }
  const safe = performer && typeof performer === "object" ? performer : {};
  const id =
    typeof safe.id === "string" && safe.id.trim()
      ? safe.id.trim()
      : crypto.randomUUID();
  const fallbackName = String.fromCharCode(65 + (index % 26));
  const name =
    typeof safe.name === "string" && safe.name.trim() ? safe.name : fallbackName;
  const weapon = typeof safe.weapon === "string" ? safe.weapon : "";
  return { ...safe, id, name, weapon };
}

export function normalizePerformerIdentityList(performers) {
  if (!Array.isArray(performers)) return [];
  return performers.map((performer, index) =>
    normalizePerformerIdentity(performer, index),
  );
}

export function buildPerformerIdToIndexMap(performers) {
  const byId = new Map();
  for (let index = 0; index < performers.length; index += 1) {
    const id = String(performers[index]?.id ?? "").trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, index);
  }
  return byId;
}
