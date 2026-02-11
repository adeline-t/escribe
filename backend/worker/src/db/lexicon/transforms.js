import { normalizeLexiconLabel } from "../../utils/lexicon.js";
import {
  CLASSIC_V2_TREE_BUCKET_MARKERS,
  CLASSIC_V2_EDIT_PARENT_BY_TYPE,
  CLASSIC_V2_COMPAT_ID_ALIASES,
  CLASSIC_V2_COMPAT_ID_BY_PARENT,
  SABER_TABLE_TOKEN_PREFIX,
  SABER_USER_TABLE_TOKEN_PREFIX,
  CLASSIC_USER_TABLE_TOKEN_PREFIX,
  SABER_TYPE_PARENT_IDS,
} from "./constants.js";

export function resolveClassicV2Type(type) {
  const normalized = String(type ?? "").trim();
  if (normalized === "target") return "cible";
  if (normalized === "movement") return "deplacement";
  if (normalized === "movement_complement" || normalized === "movement-complement") {
    return "deplacement_complement";
  }
  if (normalized === "guard-number") return "parade-numero";
  if (normalized === "guard-attribute") return "parade-attribut";
  if (
    normalized === "defense-attribute" ||
    normalized === "attributs_defense" ||
    normalized === "attributs_defensifs"
  ) {
    return "defense-attribut";
  }
  if (normalized === "attack-attribute") return "attaque-attribut";
  return normalized;
}

export function normalizeClassicV2EditType(type) {
  const resolved = resolveClassicV2Type(type);
  return CLASSIC_V2_EDIT_PARENT_BY_TYPE[resolved] ? resolved : "";
}

export function parseLexiconTableToken(table) {
  if (typeof table !== "string") return null;
  if (table.startsWith(SABER_TABLE_TOKEN_PREFIX)) {
    return {
      scope: "global",
      family: "saber",
      type: table.slice(SABER_TABLE_TOKEN_PREFIX.length),
    };
  }
  if (table.startsWith(SABER_USER_TABLE_TOKEN_PREFIX)) {
    return {
      scope: "user",
      family: "saber",
      type: table.slice(SABER_USER_TABLE_TOKEN_PREFIX.length),
    };
  }
  if (table.startsWith(CLASSIC_USER_TABLE_TOKEN_PREFIX)) {
    return {
      scope: "user",
      family: "classic",
      type: table.slice(CLASSIC_USER_TABLE_TOKEN_PREFIX.length),
    };
  }
  return null;
}

export function getSaberTypeParentIds(type) {
  const normalized = String(type ?? "").trim();
  return SABER_TYPE_PARENT_IDS[normalized] ?? [normalized];
}

export function collectLeafNodesByRootLexiconIds(rows, rootLexiconIds) {
  const byId = new Map();
  const childrenById = new Map();
  const roots = new Set();
  for (const row of rows ?? []) {
    const rowId = Number(row?.id);
    if (!Number.isInteger(rowId)) continue;
    byId.set(rowId, row);
    const parentId = Number(row?.parent_id);
    if (Number.isInteger(parentId)) {
      if (!childrenById.has(parentId)) childrenById.set(parentId, []);
      childrenById.get(parentId).push(rowId);
    }
    const lexiconId = String(row?.lexicon_id ?? "").trim();
    if (rootLexiconIds.has(lexiconId)) roots.add(rowId);
  }

  const reachable = new Set();
  const stack = [...roots];
  while (stack.length) {
    const current = stack.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const childId of childrenById.get(current) ?? []) stack.push(childId);
  }

  const leaves = [];
  for (const rowId of reachable) {
    if ((childrenById.get(rowId) ?? []).length > 0) continue;
    const row = byId.get(rowId);
    if (!row) continue;
    leaves.push({
      id: Number(row.id),
      label: String(row.name ?? "").trim(),
      description:
        row?.description == null ? "" : String(row.description).trim(),
      lexicon_id: String(row.lexicon_id ?? "").trim(),
    });
  }
  leaves.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return leaves;
}

export function isRecursiveLexiconPayload(lexicon) {
  if (!lexicon || typeof lexicon !== "object" || Array.isArray(lexicon)) {
    return false;
  }
  return (
    Array.isArray(lexicon.children) ||
    Array.isArray(lexicon.categories) ||
    Array.isArray(lexicon.sous_categories) ||
    Array.isArray(lexicon.elements)
  );
}

function getRecursiveChildren(rawNode) {
  const children = [];
  if (Array.isArray(rawNode?.children)) children.push(...rawNode.children);
  if (Array.isArray(rawNode?.categories)) children.push(...rawNode.categories);
  if (Array.isArray(rawNode?.sous_categories)) {
    children.push(...rawNode.sous_categories);
  }
  if (Array.isArray(rawNode?.elements)) children.push(...rawNode.elements);
  return children;
}

export function normalizeRecursiveLexiconSeed(seed, { applyClassicCompat = true } = {}) {
  if (!seed || typeof seed !== "object") return null;
  const usedIds = new Set();
  let autoIndex = 0;

  function getUniqueLexiconId(baseId) {
    let candidate = baseId || `lexicon_auto_${(autoIndex += 1)}`;
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
    let suffix = 2;
    while (usedIds.has(`${candidate}_${suffix}`)) {
      suffix += 1;
    }
    const uniqueId = `${candidate}_${suffix}`;
    usedIds.add(uniqueId);
    return uniqueId;
  }

  function resolveCompatLexiconId(rawId, parentLexiconId) {
    const normalizedRaw = String(rawId ?? "").trim();
    if (!normalizedRaw) return normalizedRaw;

    const parentOverrides = applyClassicCompat && parentLexiconId
      ? CLASSIC_V2_COMPAT_ID_BY_PARENT[parentLexiconId] ?? null
      : null;
    if (parentOverrides && parentOverrides[normalizedRaw]) {
      return parentOverrides[normalizedRaw];
    }

    if (!applyClassicCompat) return normalizedRaw;
    return CLASSIC_V2_COMPAT_ID_ALIASES[normalizedRaw] ?? normalizedRaw;
  }

  function visit(rawNode, fallbackId, parentLexiconId = null) {
    const rawId = String(rawNode?.id ?? fallbackId ?? "").trim();
    const compatId = resolveCompatLexiconId(rawId, parentLexiconId);
    const lexiconId = getUniqueLexiconId(compatId || `lexicon_auto_${autoIndex + 1}`);
    const rawName =
      rawNode?.name ??
      rawNode?.nom ??
      rawNode?.title ??
      rawNode?.titre ??
      lexiconId;
    const name = String(rawName ?? "").trim() || lexiconId;
    const rawDescription = rawNode?.description ?? rawNode?.description_fr ?? "";
    const description = String(rawDescription ?? "").trim();
    const children = getRecursiveChildren(rawNode).map((child, index) =>
      visit(child, `${lexiconId}_${index + 1}`, lexiconId),
    );
    return { lexiconId, name, description, children };
  }

  const fallbackRootId = applyClassicCompat ? "classic_v2_root" : "light_saber_root";
  return visit(seed, fallbackRootId, null);
}

export function buildClassicV2LexiconBucketsFromRecursiveRows(rows) {
  const byId = new Map();
  const hasChildren = new Set();
  for (const row of rows ?? []) {
    if (!row?.id) continue;
    byId.set(row.id, row);
    if (row.parent_id != null) hasChildren.add(row.parent_id);
  }

  const buckets = {
    offensive: [],
    action: [],
    defensive: [],
    "defense-attribut": [],
    cible: [],
    deplacement: [],
    deplacement_complement: [],
    "parade-numero": [],
    "parade-attribut": [],
    "attaque-attribut": [],
  };
  const seenByBucket = new Map(
    Object.keys(buckets).map((bucket) => [bucket, new Set()]),
  );

  for (const row of rows ?? []) {
    if (!row?.id || hasChildren.has(row.id)) continue;
    const name = String(row.name ?? "").trim();
    if (!name) continue;

    const ancestorIds = [];
    let cursor = row;
    while (cursor) {
      ancestorIds.push(String(cursor.lexicon_id ?? ""));
      cursor =
        cursor.parent_id != null ? byId.get(Number(cursor.parent_id)) ?? null : null;
    }

    let targetBucket = null;
    for (const [bucket, markers] of Object.entries(
      CLASSIC_V2_TREE_BUCKET_MARKERS,
    )) {
      if (ancestorIds.some((ancestorId) => markers.has(ancestorId))) {
        targetBucket = bucket;
        break;
      }
    }
    if (!targetBucket) continue;

    const normalizedName = normalizeLexiconLabel(name);
    const bucketSeen = seenByBucket.get(targetBucket);
    if (bucketSeen?.has(normalizedName)) continue;
    bucketSeen?.add(normalizedName);

    buckets[targetBucket].push({
      lexicon_id: String(row.lexicon_id ?? ""),
      name,
      description: row?.description == null ? "" : String(row.description).trim(),
    });
  }

  return buckets;
}

export function buildRecursiveLexiconFromRows(rows) {
  const byNumericId = new Map();
  for (const row of rows ?? []) {
    const numericId = Number(row?.id);
    if (!Number.isInteger(numericId)) continue;
    byNumericId.set(numericId, {
      id: String(row?.lexicon_id ?? "").trim() || `lexicon_${numericId}`,
      nom: String(row?.name ?? "").trim(),
      description: row?.description == null ? "" : String(row.description),
      children: [],
    });
  }

  const roots = [];
  for (const row of rows ?? []) {
    const numericId = Number(row?.id);
    const node = byNumericId.get(numericId);
    if (!node) continue;
    const parentNumericId = Number(row?.parent_id);
    if (Number.isInteger(parentNumericId) && byNumericId.has(parentNumericId)) {
      byNumericId.get(parentNumericId).children.push(node);
      continue;
    }
    roots.push(node);
  }

  if (roots.length === 1) return roots[0];
  return {
    id: "classic_v2_root",
    nom: "Escrime historique française - Lexique complet",
    description: "",
    children: roots,
  };
}

export function buildClassicV2LexiconReferenceIndexFromBuckets(bucketEntries) {
  const referencesByBucket = new Map();
  const referencesByLexiconId = new Map();
  for (const [bucket, entries] of Object.entries(bucketEntries)) {
    const bucketMap = new Map();
    for (const entry of entries ?? []) {
      const normalizedName = normalizeLexiconLabel(entry?.name);
      if (!normalizedName || bucketMap.has(normalizedName)) continue;
      const reference = {
        lexicon_id: entry.lexicon_id ?? null,
        name: entry.name ?? "",
      };
      bucketMap.set(normalizedName, reference);
      const lexiconId = String(reference.lexicon_id ?? "").trim();
      if (lexiconId && !referencesByLexiconId.has(lexiconId)) {
        referencesByLexiconId.set(lexiconId, reference);
      }
    }
    referencesByBucket.set(bucket, bucketMap);
  }
  return { referencesByBucket, referencesByLexiconId };
}
