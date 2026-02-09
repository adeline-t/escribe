export const DEFAULT_COMBAT_NAME = "Combat sans nom";
export const DEFAULT_COMBAT_DESCRIPTION = "";
export const DEFAULT_COMBAT_TYPE = "classic";
export const DEFAULT_COMBAT_SHARE_ROLE = "read";
export const OWNER_COMBAT_SHARE_ROLE = "owner";

export const DEFAULT_COMBAT_PARTICIPANTS = [
  { name: "A", weapon: "" },
  { name: "B", weapon: "" },
];

export function createParticipantIdentity(overrides = {}) {
  return {
    name: typeof overrides?.name === "string" ? overrides.name : "",
    weapon: typeof overrides?.weapon === "string" ? overrides.weapon : "",
  };
}

export function createDefaultParticipants() {
  return DEFAULT_COMBAT_PARTICIPANTS.map((participant) =>
    createParticipantIdentity(participant),
  );
}

export function normalizeCombatType(type) {
  return type === "sabre-laser" ? "sabre-laser" : DEFAULT_COMBAT_TYPE;
}

export function normalizeCombatShareRole(role) {
  if (typeof role === "string" && role.trim()) return role;
  return DEFAULT_COMBAT_SHARE_ROLE;
}

export function normalizeHiddenParticipantIndexes(raw, participantCount) {
  const max = Math.max(0, Number(participantCount) || 0);
  if (!Array.isArray(raw) || max <= 0) return [];
  const out = [];
  const seen = new Set();
  for (const value of raw) {
    const index = Number(value);
    if (!Number.isInteger(index)) continue;
    if (index < 0 || index >= max) continue;
    if (seen.has(index)) continue;
    seen.add(index);
    out.push(index);
  }
  return out.sort((a, b) => a - b);
}
