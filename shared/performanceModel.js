export const DEFAULT_PERFORMANCE_NAME = "Combat sans nom";
export const DEFAULT_PERFORMANCE_DESCRIPTION = "";
export const DEFAULT_PERFORMANCE_TYPE = "classic";
export const DEFAULT_PERFORMANCE_SHARE_ROLE = "read";
export const OWNER_PERFORMANCE_SHARE_ROLE = "owner";

export const DEFAULT_PERFORMANCE_PERFORMERS = [
  { name: "A", weapon: "" },
  { name: "B", weapon: "" },
];

export function createPerformerIdentity(overrides = {}) {
  return {
    name: typeof overrides?.name === "string" ? overrides.name : "",
    weapon: typeof overrides?.weapon === "string" ? overrides.weapon : "",
  };
}

export function createDefaultPerformancePerformers() {
  return DEFAULT_PERFORMANCE_PERFORMERS.map((performer) =>
    createPerformerIdentity(performer),
  );
}

export function normalizePerformanceType(type) {
  return type === "sabre-laser" ? "sabre-laser" : DEFAULT_PERFORMANCE_TYPE;
}

export function normalizePerformanceShareRole(role) {
  if (typeof role === "string" && role.trim()) return role;
  return DEFAULT_PERFORMANCE_SHARE_ROLE;
}

export function normalizeHiddenPerformerIndexes(raw, performerCount) {
  const max = Math.max(0, Number(performerCount) || 0);
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

// Legacy aliases kept while the codebase is migrated.
export const DEFAULT_PERFORMANCE_PARTICIPANTS = DEFAULT_PERFORMANCE_PERFORMERS;
export const createParticipantIdentity = createPerformerIdentity;
export const createDefaultPerformanceParticipants =
  createDefaultPerformancePerformers;
export const normalizeHiddenParticipantIndexes = normalizeHiddenPerformerIndexes;
