/**
 * Lexicon token normalization and hydration helpers.
 * Shared by DB serialization/deserialization paths.
 */
export function splitDelimitedValue(value) {
  return String(value ?? "")
    .split(" · ")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeLexiconLabel(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function hasStorageTerm(term) {
  if (!term || typeof term !== "object") return false;
  const name = String(term.name ?? "").trim();
  const lexiconId = String(term.lexicon_id ?? "").trim();
  if (name || lexiconId) return true;
  return false;
}

function resolveStorageTermName(term, lexiconNameById = null) {
  if (!term || typeof term !== "object") return "";
  const lexiconId = String(term.lexicon_id ?? "").trim();
  const storedName = String(term.name ?? "").trim();
  if (lexiconId && lexiconNameById?.has(lexiconId)) {
    const resolved = String(lexiconNameById.get(lexiconId) ?? "").trim();
    if (resolved) return resolved;
  }
  return storedName;
}

export function resolveStorageTermRef(term, lexiconNameById = null) {
  if (!term || typeof term !== "object") return null;
  const lexiconId = String(term.lexicon_id ?? "").trim();
  const name = resolveStorageTermName(term, lexiconNameById);
  if (!lexiconId && !name) return null;
  return { lexicon_id: lexiconId || null, name };
}

export function resolveStorageTermRefs(termList, lexiconNameById = null) {
  if (!Array.isArray(termList)) return [];
  const out = [];
  const seen = new Set();
  for (const term of termList) {
    const ref = resolveStorageTermRef(term, lexiconNameById);
    if (!ref) continue;
    const key = `${ref.lexicon_id ?? "null"}|${normalizeLexiconLabel(ref.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

export function buildStepLexiconFieldLookup(lexiconRefs, lexiconNameById) {
  const byField = new Map();
  if (!Array.isArray(lexiconRefs)) return byField;
  for (const ref of lexiconRefs) {
    const field = String(ref?.field ?? "").trim();
    if (!field) continue;
    const storedName = String(ref?.name ?? "").trim();
    const resolvedById = ref?.lexicon_id
      ? String(lexiconNameById?.get(ref.lexicon_id) ?? "").trim()
      : "";
    const resolvedName = resolvedById || storedName;
    if (!resolvedName) continue;
    let fieldMap = byField.get(field);
    if (!fieldMap) {
      fieldMap = new Map();
      byField.set(field, fieldMap);
    }
    const keys = [
      normalizeLexiconLabel(storedName),
      normalizeLexiconLabel(resolvedName),
    ].filter(Boolean);
    for (const key of keys) {
      if (!fieldMap.has(key)) fieldMap.set(key, resolvedName);
    }
  }
  return byField;
}

export function resolveLexiconToken(fieldLookup, field, value) {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;
  const key = normalizeLexiconLabel(raw);
  const fieldMap = fieldLookup.get(field);
  if (!fieldMap || !fieldMap.has(key)) return raw;
  return fieldMap.get(key) ?? raw;
}

export function resolveDelimitedLexiconTokens(fieldLookup, field, value) {
  const tokens = splitDelimitedValue(value);
  if (!tokens.length) return String(value ?? "").trim();
  return tokens
    .map((token) => resolveLexiconToken(fieldLookup, field, token))
    .join(" · ");
}

export function resolveLexiconArray(fieldLookup, field, values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => resolveLexiconToken(fieldLookup, field, value));
}
