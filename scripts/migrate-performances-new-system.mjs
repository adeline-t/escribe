#!/usr/bin/env node

import fs from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { createSequenceModel } from "../shared/sequenceModel.js";
import {
  createStepModel,
  createStepPerformerModel,
  LEGACY_STEP_LEXICON_KEY,
  resolveStepLexiconKey,
} from "../shared/stepModel.js";

const WORKSPACE_ROOT = process.cwd();
const WRANGLER_CONFIG_PATH = "backend/worker/wrangler.toml";
const LOCAL_DB_NAME = "escribe-dev";
const DEV_DB_NAME = "escribe-dev";
const PROD_DB_NAME = "escribe";
const CHUNK_SIZE = 100;
const SEQUENCE_SCHEMA_VERSION = "2.0";
const GENERIC_ATTACK_MARKERS = new Set([
  "attaque",
  "attack",
  "preparation",
  "préparation",
]);

const CLASSIC_V2_TREE_BUCKET_MARKERS = {
  offensive: new Set(["attack_types", "attaques"]),
  action: new Set([
    "engagement",
    "blade_attacks",
    "blade_seizures",
    "no_contact",
    "compound",
    "attaques_au_fer",
    "prises_de_fer",
    "sans_contact",
    "composees",
    "preparations",
  ]),
  defensive: new Set([
    "evasions",
    "esquive",
    "esquives",
    "defensive_actions",
    "actions_defensives",
  ]),
  cible: new Set(["target_zones", "cible", "cibles", "target", "targets"]),
  deplacement: new Set([
    "basic_movements",
    "deplacement",
    "deplacements",
    "movements",
    "movement",
  ]),
  deplacement_complement: new Set([
    "movement_complements",
    "movement-complements",
    "deplacement_complement",
    "deplacement-complement",
    "deplacement_complements",
    "deplacement-complements",
    "movement_complement",
    "movement-complement",
  ]),
  "parade-numero": new Set([
    "positions",
    "position",
    "positions_de_parade",
    "parade-numero",
  ]),
  "parade-attribut": new Set([
    "position_complements",
    "position_complement",
    "parade-attribut",
  ]),
  "attaque-attribut": new Set(["attack_complements", "attaque-attribut"]),
};

const CLASSIC_V2_TABLES = {
  offensive: "nl_offensive",
  action: "nl_action",
  defensive: "nl_defensive",
  cible: "nl_target",
  deplacement: "nl_movement",
  deplacement_complement: "nl_movement_complement",
  "parade-numero": "nl_guard_number",
  "parade-attribut": "nl_guard_attribute",
  "attaque-attribut": "nl_attack_attribute",
};

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "1";
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function isTruthy(value) {
  return value === "1" || value === "true" || value === "yes";
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeLexiconLabel(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function splitDelimitedValue(value) {
  return String(value ?? "")
    .split(" · ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeLexiconTerms(terms) {
  const seen = new Set();
  const out = [];
  for (const term of terms ?? []) {
    const name = String(term?.name ?? "").trim();
    if (!name) continue;
    const key = `${term?.lexicon_id ?? "null"}|${normalizeLexiconLabel(name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      lexicon_id: term?.lexicon_id ?? null,
      name,
    });
  }
  return out;
}

function resolveLexiconTerm(index, buckets, value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return null;
  for (const bucket of buckets ?? []) {
    const resolved = resolveReference(index, bucket, rawValue);
    if (resolved) {
      return {
        lexicon_id: resolved.lexicon_id ?? null,
        name: String(resolved.name ?? rawValue),
      };
    }
  }
  return {
    lexicon_id: null,
    name: rawValue,
  };
}

function resolveDelimitedLexiconTerms(index, buckets, value) {
  return dedupeLexiconTerms(
    splitDelimitedValue(value)
      .map((token) => resolveLexiconTerm(index, buckets, token))
      .filter(Boolean),
  );
}

function isGenericAttackLabel(value) {
  return GENERIC_ATTACK_MARKERS.has(normalizeLexiconLabel(value));
}

function normalizePerformerIdentity(performer, index) {
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
    typeof safe.name === "string" && safe.name.trim()
      ? safe.name
      : fallbackName;
  const weapon = typeof safe.weapon === "string" ? safe.weapon : "";
  return { ...safe, id, name, weapon };
}

function normalizePerformerIdentityList(performers) {
  if (!Array.isArray(performers)) return [];
  return performers.map((performer, index) =>
    normalizePerformerIdentity(performer, index),
  );
}

function legacyPerformerToStoragePerformer(performer, lexiconReferenceIndex) {
  const safe = performer && typeof performer === "object" ? performer : {};
  const mode = safe.mode === "choregraphie" ? "choreography" : safe.mode || "combat";

  const actionDetails = Array.isArray(safe.actionDetails) ? safe.actionDetails : [];
  const defenseDetails = Array.isArray(safe.defenseDetails)
    ? safe.defenseDetails
    : [];

  const attackName =
    String(safe.offensive ?? "").trim() &&
    !isGenericAttackLabel(safe.offensive)
      ? String(safe.offensive).trim()
      : "";
  const preparationName = String(safe.action ?? "").trim();
  const hasPreparation =
    safe.role === "preparation" || Boolean(preparationName) || mode === "note"
      ? Boolean(preparationName)
      : false;
  const hasAttack = Boolean(attackName);

  const prepAttributes = dedupeLexiconTerms(
    [
      ...actionDetails.map((detail) =>
        resolveLexiconTerm(
          lexiconReferenceIndex,
          ["action", "attaque-attribut", "parade-attribut"],
          detail?.attribute,
        ),
      ),
      ...Array.isArray(safe.attackAttribute)
        ? safe.attackAttribute.map((value) =>
            resolveLexiconTerm(
              lexiconReferenceIndex,
              ["attaque-attribut", "parade-attribut", "action"],
              value,
            ),
          )
        : [],
    ].filter(Boolean),
  );

  const attackAttributes = dedupeLexiconTerms(
    [
      ...Array.isArray(safe.attackAttribute)
        ? safe.attackAttribute.map((value) =>
            resolveLexiconTerm(
              lexiconReferenceIndex,
              ["attaque-attribut", "action", "deplacement_complement"],
              value,
            ),
          )
        : [],
      ...actionDetails.flatMap((detail) => [
        resolveLexiconTerm(
          lexiconReferenceIndex,
          ["attaque-attribut", "action"],
          detail?.action,
        ),
        resolveLexiconTerm(
          lexiconReferenceIndex,
          ["attaque-attribut", "parade-attribut", "action"],
          detail?.attribute,
        ),
      ]),
    ].filter(Boolean),
  );

  const defenseName = String(safe.defense ?? "").trim()
    ? String(safe.defense).trim()
    : String(defenseDetails[0]?.defense ?? "").trim();
  const hasDefense = Boolean(defenseName);
  const positionName = String(safe.paradeNumber ?? "").trim()
    ? String(safe.paradeNumber).trim()
    : String(defenseDetails[0]?.position ?? "").trim();
  const positionAttributes = dedupeLexiconTerms(
    [
      ...resolveDelimitedLexiconTerms(
        lexiconReferenceIndex,
        ["parade-attribut", "deplacement_complement", "attaque-attribut"],
        safe.paradeAttribute,
      ),
      ...resolveDelimitedLexiconTerms(
        lexiconReferenceIndex,
        ["parade-attribut", "deplacement_complement", "attaque-attribut"],
        defenseDetails[0]?.attribute,
      ),
    ].filter(Boolean),
  );

  const defenseAttributes = dedupeLexiconTerms(
    defenseDetails
      .slice(1)
      .flatMap((detail) => [
        resolveLexiconTerm(
          lexiconReferenceIndex,
          ["defensive", "action", "parade-attribut"],
          detail?.defense,
        ),
        ...resolveDelimitedLexiconTerms(
          lexiconReferenceIndex,
          ["parade-attribut", "deplacement_complement", "attaque-attribut"],
          detail?.attribute,
        ),
      ])
      .filter(Boolean),
  );

  const attackMoveTokens = splitDelimitedValue(safe.attackMove);
  const defendMoveTokens = splitDelimitedValue(safe.defendMove);
  const movementBaseName =
    attackMoveTokens[0] ?? defendMoveTokens[0] ?? "";
  const movementAttributes = dedupeLexiconTerms(
    [
      ...(attackMoveTokens.length > 1
        ? attackMoveTokens.slice(1).map((token) =>
            resolveLexiconTerm(
              lexiconReferenceIndex,
              ["deplacement_complement", "parade-attribut", "attaque-attribut"],
              token,
            ),
          )
        : []),
      ...(defendMoveTokens.length > 1
        ? defendMoveTokens.slice(1).map((token) =>
            resolveLexiconTerm(
              lexiconReferenceIndex,
              ["deplacement_complement", "parade-attribut", "attaque-attribut"],
              token,
            ),
          )
        : []),
      attackMoveTokens[0] && defendMoveTokens[0] && attackMoveTokens[0] !== defendMoveTokens[0]
        ? resolveLexiconTerm(
            lexiconReferenceIndex,
            ["deplacement", "deplacement_complement"],
            defendMoveTokens[0],
          )
        : null,
    ].filter(Boolean),
  );

  const preparation = hasPreparation
    ? {
        ...resolveLexiconTerm(lexiconReferenceIndex, ["action"], preparationName),
        attributes: prepAttributes,
      }
    : null;

  const attack = hasAttack
    ? {
        ...resolveLexiconTerm(
          lexiconReferenceIndex,
          ["offensive", "action", "attaque-attribut"],
          attackName,
        ),
        target: resolveLexiconTerm(
          lexiconReferenceIndex,
          ["cible"],
          safe.target,
        ),
        attributes: attackAttributes,
      }
    : null;

  const defense = hasDefense
    ? {
        ...resolveLexiconTerm(
          lexiconReferenceIndex,
          ["defensive", "action"],
          defenseName,
        ),
        position: positionName
          ? {
              ...resolveLexiconTerm(
                lexiconReferenceIndex,
                ["parade-numero"],
                positionName,
              ),
              attributes: positionAttributes,
            }
          : null,
        attributes: defenseAttributes,
      }
    : null;

  const movement = movementBaseName
    ? {
        ...resolveLexiconTerm(
          lexiconReferenceIndex,
          ["deplacement", "deplacement_complement"],
          movementBaseName,
        ),
        attributes: movementAttributes,
      }
    : null;

  return {
    mode,
    preparation,
    attack,
    defense,
    movement,
    note: typeof safe.note === "string" ? safe.note : "",
  };
}

function sqlQuote(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function parseWranglerJson(output) {
  const trimmed = String(output ?? "").trim();
  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart < 0 || arrayEnd <= arrayStart) {
    throw new Error(`Unexpected Wrangler JSON output:\n${trimmed}`);
  }
  return JSON.parse(trimmed.slice(arrayStart, arrayEnd + 1));
}

function getD1Target(mode) {
  if (mode === "dev") {
    return { database: DEV_DB_NAME, envArg: "--env=dev", local: false };
  }
  if (mode === "prod") {
    return { database: PROD_DB_NAME, envArg: null, local: false };
  }
  return { database: LOCAL_DB_NAME, envArg: "--env=local", local: true };
}

function runD1Execute({ mode, command = null, file = null, expectJson = false }) {
  const target = getD1Target(mode);
  const args = [
    "wrangler",
    "d1",
    "execute",
    target.database,
    "--config",
    WRANGLER_CONFIG_PATH,
  ];

  if (target.envArg) args.push(target.envArg);
  if (mode === "prod") args.push("--remote");
  if (target.local) args.push("--local");
  if (command) args.push("--command", command);
  if (file) args.push("--file", file);
  if (expectJson) args.push("--json");

  return execFileSync("npx", args, {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  });
}

function queryRows(mode, sql) {
  const output = runD1Execute({ mode, command: sql, expectJson: true });
  const parsed = parseWranglerJson(output);
  return ensureArray(parsed?.[0]?.results);
}

function buildClassicV2BucketsFromRecursiveRows(rows) {
  const byId = new Map();
  const hasChildren = new Set();
  for (const row of rows ?? []) {
    if (!row?.id) continue;
    byId.set(Number(row.id), row);
    if (row.parent_id != null) hasChildren.add(Number(row.parent_id));
  }

  const buckets = {
    offensive: [],
    action: [],
    defensive: [],
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
    if (!row?.id || hasChildren.has(Number(row.id))) continue;
    const name = String(row?.name ?? "").trim();
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
    const seen = seenByBucket.get(targetBucket);
    if (!normalizedName || seen?.has(normalizedName)) continue;
    seen?.add(normalizedName);

    buckets[targetBucket].push({
      lexicon_id: String(row.lexicon_id ?? ""),
      name,
    });
  }

  return buckets;
}

function buildLegacyBuckets(legacyLexicon) {
  const buckets = {
    offensive: [],
    action: [],
    defensive: [],
    cible: [],
    deplacement: [],
    deplacement_complement: [],
    "parade-numero": [],
    "parade-attribut": [],
    "attaque-attribut": [],
  };
  for (const bucket of Object.keys(buckets)) {
    const list = ensureArray(legacyLexicon?.[bucket]);
    for (const label of list) {
      const name = String(label ?? "").trim();
      const normalized = normalizeLexiconLabel(name);
      if (!name || !normalized) continue;
      buckets[bucket].push({
        lexicon_id: `legacy:${bucket}:${normalized}`,
        name,
      });
    }
  }
  return buckets;
}

function mergeBuckets(primary, secondary) {
  const merged = {};
  const allBuckets = new Set([
    ...Object.keys(primary ?? {}),
    ...Object.keys(secondary ?? {}),
  ]);
  for (const bucket of allBuckets) {
    const out = [];
    const seen = new Set();
    for (const entries of [primary?.[bucket] ?? [], secondary?.[bucket] ?? []]) {
      for (const entry of entries) {
        const name = String(entry?.name ?? "").trim();
        const normalized = normalizeLexiconLabel(name);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        out.push({
          lexicon_id: entry?.lexicon_id ?? null,
          name,
        });
      }
    }
    merged[bucket] = out;
  }
  return merged;
}

function buildLexiconReferenceIndexFromBuckets(bucketEntries) {
  const referencesByBucket = new Map();
  const referencesByLexiconId = new Map();
  for (const [bucket, entries] of Object.entries(bucketEntries)) {
    const bucketMap = new Map();
    for (const entry of entries ?? []) {
      const normalized = normalizeLexiconLabel(entry?.name);
      if (!normalized || bucketMap.has(normalized)) continue;
      const reference = {
        lexicon_id: entry?.lexicon_id ?? null,
        name: String(entry?.name ?? "").trim(),
      };
      bucketMap.set(normalized, reference);
      const lexiconId = String(reference.lexicon_id ?? "").trim();
      if (lexiconId && !referencesByLexiconId.has(lexiconId)) {
        referencesByLexiconId.set(lexiconId, reference);
      }
    }
    referencesByBucket.set(bucket, bucketMap);
  }
  return { referencesByBucket, referencesByLexiconId };
}

function resolveReference(index, bucket, name) {
  if (!index || !bucket) return null;
  const lexiconId = String(name ?? "").trim();
  if (lexiconId && index.referencesByLexiconId?.has(lexiconId)) {
    return index.referencesByLexiconId.get(lexiconId);
  }
  const normalized = normalizeLexiconLabel(name);
  if (!normalized) return null;
  const bucketMap = index.referencesByBucket.get(bucket);
  return bucketMap?.get(normalized) ?? null;
}

function createRefDedupeKey(ref) {
  return `${ref.field}|${ref.lexicon_id ?? "null"}|${normalizeLexiconLabel(ref.name)}`;
}

function addLexiconReference(refState, index, field, buckets, value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return;

  let resolved = null;
  for (const bucket of buckets ?? []) {
    resolved = resolveReference(index, bucket, rawValue);
    if (resolved) break;
  }
  const persistedName = String(resolved?.name ?? rawValue).trim();
  if (!persistedName) return;

  const ref = {
    field,
    lexicon_id: resolved?.lexicon_id ?? null,
    name: persistedName,
  };
  const dedupeKey = createRefDedupeKey(ref);
  if (refState.seen.has(dedupeKey)) return;
  refState.seen.add(dedupeKey);
  refState.list.push(ref);
}

function addDelimitedLexiconReferences(refState, index, field, buckets, value) {
  for (const token of splitDelimitedValue(value)) {
    addLexiconReference(refState, index, field, buckets, token);
  }
}

function normalizeExistingRefs(existingRefs) {
  const list = [];
  const seen = new Set();
  for (const item of ensureArray(existingRefs)) {
    const ref = {
      field: String(item?.field ?? "").trim(),
      lexicon_id:
        item?.lexicon_id != null && String(item.lexicon_id).trim()
          ? String(item.lexicon_id).trim()
          : null,
      name: String(item?.name ?? "").trim(),
    };
    if (!ref.field || !ref.name) continue;
    const dedupeKey = createRefDedupeKey(ref);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    list.push(ref);
  }
  return { list, seen };
}

function addPerformerLexiconRefs(performer, index) {
  if (!performer || typeof performer !== "object") return performer;
  const refState = normalizeExistingRefs(performer.lexiconRefs);

  addLexiconReference(refState, index, "offensive", ["offensive"], performer.offensive);
  addLexiconReference(refState, index, "action", ["action", "offensive"], performer.action);
  addLexiconReference(refState, index, "target", ["cible"], performer.target);
  addDelimitedLexiconReferences(
    refState,
    index,
    "attackMove",
    ["deplacement", "deplacement_complement"],
    performer.attackMove,
  );

  for (const attribute of ensureArray(performer.attackAttribute)) {
    addLexiconReference(
      refState,
      index,
      "attackAttribute",
      ["attaque-attribut", "deplacement_complement", "parade-attribut"],
      attribute,
    );
  }

  addLexiconReference(refState, index, "defense", ["defensive"], performer.defense);
  addLexiconReference(
    refState,
    index,
    "paradeNumber",
    ["parade-numero"],
    performer.paradeNumber,
  );
  addDelimitedLexiconReferences(
    refState,
    index,
    "paradeAttribute",
    ["parade-attribut"],
    performer.paradeAttribute,
  );
  addDelimitedLexiconReferences(
    refState,
    index,
    "defendMove",
    ["deplacement", "deplacement_complement"],
    performer.defendMove,
  );

  for (const actionDetail of ensureArray(performer.actionDetails)) {
    addLexiconReference(
      refState,
      index,
      "actionDetails.action",
      ["action", "offensive"],
      actionDetail?.action,
    );
    addLexiconReference(
      refState,
      index,
      "actionDetails.attribute",
      ["attaque-attribut", "parade-numero", "parade-attribut"],
      actionDetail?.attribute,
    );
  }

  for (const defenseDetail of ensureArray(performer.defenseDetails)) {
    const defenseName = String(defenseDetail?.defense ?? "").trim();
    if (normalizeLexiconLabel(defenseName) !== "parade") {
      addLexiconReference(
        refState,
        index,
        "defenseDetails.defense",
        ["defensive"],
        defenseName,
      );
    }
    addLexiconReference(
      refState,
      index,
      "defenseDetails.position",
      ["parade-numero"],
      defenseDetail?.position,
    );
    addDelimitedLexiconReferences(
      refState,
      index,
      "defenseDetails.attribute",
      ["parade-attribut"],
      defenseDetail?.attribute,
    );
  }

  return {
    ...performer,
    lexiconRefs: refState.list,
  };
}

function safeJsonParse(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function migrateStep(step, performerCount, lexiconReferenceIndex) {
  const stepModel = createStepModel(step, {
    fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
    performerCount,
  });
  const lexiconKey = resolveStepLexiconKey(stepModel.lexicon, {
    fallbackLexicon: LEGACY_STEP_LEXICON_KEY,
  });
  if (lexiconKey !== "classic-v2" || !lexiconReferenceIndex) {
    return stepModel;
  }
  const performers = ensureArray(stepModel.performers).map((performer) =>
    addPerformerLexiconRefs(performer, lexiconReferenceIndex),
  );
  return {
    ...stepModel,
    performers,
    participants: performers,
  };
}

function buildSequenceLexiconKey(stepModels, payload) {
  const metadataLexicon =
    typeof payload?.metadata?.lexicon === "string" &&
    payload.metadata.lexicon.trim()
      ? payload.metadata.lexicon.trim()
      : "";
  if (metadataLexicon) return metadataLexicon;

  const firstStepLexicon =
    typeof stepModels?.[0]?.lexicon === "string" && stepModels[0].lexicon.trim()
      ? stepModels[0].lexicon.trim()
      : LEGACY_STEP_LEXICON_KEY;
  return firstStepLexicon;
}

function isStorageSequencePayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (!Array.isArray(payload.steps)) return false;
  if (!payload?.metadata || typeof payload.metadata !== "object") return false;
  return payload.steps.some(
    (step) =>
      step?.performers &&
      !Array.isArray(step.performers) &&
      typeof step.performers === "object",
  );
}

function buildStorageSequencePayload(
  payload,
  position,
  performers,
  stepModels,
  lexiconReferenceIndex,
) {
  const performerOrder = performers.map((performer) => performer.id);
  const hiddenIndexes = Array.isArray(payload?.hiddenPerformerIndexes)
    ? payload.hiddenPerformerIndexes
    : Array.isArray(payload?.hiddenParticipantIndexes)
      ? payload.hiddenParticipantIndexes
      : [];
  const hiddenPerformers = hiddenIndexes
    .map((index) => performers[index]?.id ?? null)
    .filter(Boolean);
  const lexiconKey = buildSequenceLexiconKey(stepModels, payload);
  const steps = stepModels.map((stepModel) => {
    const stepPerformers = {};
    for (let index = 0; index < performerOrder.length; index += 1) {
      const performerId = performerOrder[index];
      stepPerformers[performerId] = legacyPerformerToStoragePerformer(
        stepModel.performers[index] ?? {},
        lexiconReferenceIndex,
      );
    }
    return {
      id: stepModel.id,
      performers: stepPerformers,
    };
  });

  return {
    id:
      typeof payload?.id === "string" && payload.id.trim()
        ? payload.id
        : crypto.randomUUID(),
    name:
      typeof payload?.name === "string" && payload.name.trim()
        ? payload.name
        : `Phrase ${Number(position) + 1}`,
    metadata: {
      schemaVersion: SEQUENCE_SCHEMA_VERSION,
      lexicon: lexiconKey,
      performerOrder,
      hiddenPerformers,
    },
    steps,
  };
}

function migrateSequencePayload(
  payload,
  position,
  performers,
  lexiconReferenceIndex,
) {
  if (!payload || typeof payload !== "object") return payload;
  if (isStorageSequencePayload(payload)) return payload;

  let performerList = Array.isArray(performers) ? performers : [];

  const stepSource = Array.isArray(payload.steps)
    ? payload.steps
    : Array.isArray(payload.performers) || Array.isArray(payload.participants)
      ? [payload]
      : [];

  if (!stepSource.length) return payload;

  if (!performerList.length) {
    const fallbackCount = stepSource.reduce((max, step) => {
      const list = Array.isArray(step?.performers)
        ? step.performers
        : Array.isArray(step?.participants)
          ? step.participants
          : [];
      return Math.max(max, list.length);
    }, 0);
    performerList = normalizePerformerIdentityList(
      Array.from({ length: fallbackCount }, (_, index) => ({
        name: String.fromCharCode(65 + (index % 26)),
      })),
    );
  }
  const performerCount = performerList.length;

  const steps = stepSource.map((step) =>
    migrateStep(step, performerCount, lexiconReferenceIndex),
  );

  const sequenceModel = createSequenceModel({
    id: payload.id,
    name: payload.name,
    index: Number(position) || 0,
    hiddenPerformerIndexes:
      payload.hiddenPerformerIndexes ?? payload.hiddenParticipantIndexes,
    performerCount,
    steps,
    stepFallbackLexicon: LEGACY_STEP_LEXICON_KEY,
  });

  return buildStorageSequencePayload(
    payload,
    position,
    performerList,
    sequenceModel.steps,
    lexiconReferenceIndex,
  );
}

function migrateFormDraft(formDraft, lexiconReferenceIndex) {
  if (!Array.isArray(formDraft)) return formDraft;
  return formDraft.map((entry) => {
    const performer = createStepPerformerModel(entry);
    if (!lexiconReferenceIndex) return performer;
    return addPerformerLexiconRefs(performer, lexiconReferenceIndex);
  });
}

async function buildClassicV2ReferenceIndex(mode) {
  const recursiveRows = queryRows(
    mode,
    "SELECT id, lexicon_id, parent_id, name FROM lexicon ORDER BY id",
  );
  const recursiveBuckets = recursiveRows.length
    ? buildClassicV2BucketsFromRecursiveRows(recursiveRows)
    : null;

  const legacyLexicon = {};
  for (const [key, table] of Object.entries(CLASSIC_V2_TABLES)) {
    const rows = queryRows(mode, `SELECT label FROM ${table} ORDER BY label`);
    legacyLexicon[key] = rows.map((row) => String(row?.label ?? "").trim()).filter(Boolean);
  }
  const legacyBuckets = buildLegacyBuckets(legacyLexicon);
  const mergedBuckets = recursiveBuckets
    ? mergeBuckets(recursiveBuckets, legacyBuckets)
    : legacyBuckets;
  return buildLexiconReferenceIndexFromBuckets(mergedBuckets);
}

function buildUpdateStatements(sequenceUpdates, performanceUpdates) {
  const statements = [];

  for (const update of sequenceUpdates) {
    statements.push(
      `UPDATE performance_sequences SET payload = '${sqlQuote(update.payloadJson)}' WHERE id = ${Number(update.id)};`,
    );
  }
  for (const update of performanceUpdates) {
    statements.push(
      `UPDATE performances SET form_draft = ${update.formDraftJson === null ? "NULL" : `'${sqlQuote(update.formDraftJson)}'`}, participants = ${update.participantsJson === null ? "NULL" : `'${sqlQuote(update.participantsJson)}'`} WHERE id = ${Number(update.id)};`,
    );
  }

  return statements;
}

async function applyStatementsInChunks(mode, statements) {
  if (!statements.length) return;
  const tempDir = path.join(WORKSPACE_ROOT, "db", ".tmp-performance-migration");
  await mkdir(tempDir, { recursive: true });

  const chunkCount = Math.ceil(statements.length / CHUNK_SIZE);
  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = statements.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
    const filePath = path.join(
      tempDir,
      `chunk-${String(index + 1).padStart(3, "0")}.sql`,
    );
    await writeFile(filePath, `${chunk.join("\n")}\n`, "utf8");
    // eslint-disable-next-line no-console
    console.log(
      `[migration] apply chunk ${index + 1}/${chunkCount} (${chunk.length} statements)`,
    );
    runD1Execute({ mode, file: filePath, expectJson: false });
    await rm(filePath, { force: true });
  }

  await rm(tempDir, { recursive: true, force: true });
}

function findLocalDatabaseFile() {
  const d1Dir = path.join(
    WORKSPACE_ROOT,
    "backend",
    "worker",
    ".wrangler",
    "state",
    "v3",
    "d1",
    "miniflare-D1DatabaseObject",
  );
  if (!fs.existsSync(d1Dir)) return null;
  const entries = fs
    .readdirSync(d1Dir)
    .filter((name) => name.endsWith(".sqlite"))
    .map((name) => path.join(d1Dir, name));
  let selected = null;
  let maxPerformances = -1;
  for (const filePath of entries) {
    try {
      const db = new DatabaseSync(filePath, { readOnly: true });
      const hasTable = db
        .prepare(
          "SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='performances' LIMIT 1",
        )
        .get();
      if (!hasTable?.ok) {
        db.close();
        continue;
      }
      const row = db.prepare("SELECT COUNT(*) AS count FROM performances").get();
      db.close();
      const count = Number(row?.count ?? 0);
      if (count > maxPerformances) {
        maxPerformances = count;
        selected = filePath;
      }
    } catch {
      // Ignore unreadable files.
    }
  }
  return selected;
}

function applyUpdatesLocalWithSqlite(sequenceUpdates, performanceUpdates) {
  const databaseFile = findLocalDatabaseFile();
  if (!databaseFile) {
    throw new Error(
      "Local D1 sqlite file not found. Start local DB once with wrangler, then retry.",
    );
  }

  const db = new DatabaseSync(databaseFile);
  try {
    db.exec("BEGIN");
    const sequenceStmt = db.prepare(
      "UPDATE performance_sequences SET payload = ?1 WHERE id = ?2",
    );
    for (const update of sequenceUpdates) {
      sequenceStmt.run(update.payloadJson, Number(update.id));
    }
    const performanceStmt = db.prepare(
      "UPDATE performances SET form_draft = ?1, participants = ?2 WHERE id = ?3",
    );
    for (const update of performanceUpdates) {
      performanceStmt.run(
        update.formDraftJson,
        update.participantsJson,
        Number(update.id),
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.env ?? "local";
  if (!["local", "dev", "prod"].includes(mode)) {
    throw new Error(`Unknown env '${mode}'. Use --env local|dev|prod`);
  }

  const dryRun = isTruthy(args["dry-run"]);
  const apply = args["apply"] ? isTruthy(args.apply) : true;
  const targetPerformanceId = args["performance-id"]
    ? Number(args["performance-id"])
    : null;
  const sqlOutputPath = path.resolve(
    WORKSPACE_ROOT,
    args.output ?? `db/migrate-performances-new-system-${mode}.sql`,
  );

  // eslint-disable-next-line no-console
  console.log(`[migration] env=${mode} dryRun=${dryRun} apply=${apply}`);

  const lexiconReferenceIndex = await buildClassicV2ReferenceIndex(mode);
  const performanceRows = queryRows(
    mode,
    "SELECT id, type, participants, form_draft FROM performances ORDER BY id",
  );
  const sequenceRows = queryRows(
    mode,
    "SELECT id, performance_id, position, payload FROM performance_sequences ORDER BY performance_id, position, id",
  );

  const performanceById = new Map();
  for (const row of performanceRows) {
    const performersRaw = safeJsonParse(row?.participants);
    const performers = normalizePerformerIdentityList(
      Array.isArray(performersRaw) ? performersRaw : [],
    );
    const performerCount = performers.length;
    const participantsJson = JSON.stringify(performers);
    performanceById.set(Number(row.id), {
      id: Number(row.id),
      type: String(row?.type ?? "classic"),
      performerCount,
      performers,
      participantsRaw: typeof row?.participants === "string" ? row.participants : null,
      participantsJson,
      formDraftRaw: row?.form_draft ?? null,
    });
  }

  const sequenceUpdates = [];
  for (const row of sequenceRows) {
    const sequenceId = Number(row?.id);
    const performanceId = Number(row?.performance_id);
    if (targetPerformanceId && performanceId !== targetPerformanceId) continue;

    const performance = performanceById.get(performanceId);
    const payload = safeJsonParse(row?.payload);
    if (!payload) continue;

    const nextPayload = migrateSequencePayload(
      payload,
      Number(row?.position) || 0,
      performance?.performers ?? [],
      lexiconReferenceIndex,
    );
    const nextPayloadJson = JSON.stringify(nextPayload);
    if (nextPayloadJson === String(row?.payload ?? "")) continue;

    sequenceUpdates.push({
      id: sequenceId,
      payloadJson: nextPayloadJson,
    });
  }

  const performanceUpdates = [];
  for (const performance of performanceById.values()) {
    if (targetPerformanceId && performance.id !== targetPerformanceId) continue;

    const formDraft = safeJsonParse(performance.formDraftRaw);
    const nextFormDraftJson =
      formDraft == null
        ? null
        : JSON.stringify(
            migrateFormDraft(
              formDraft,
              performance.type === "classic" ? lexiconReferenceIndex : null,
            ),
          );
    const shouldUpdateFormDraft =
      nextFormDraftJson !== String(performance.formDraftRaw ?? "");
    const shouldUpdateParticipants =
      performance.participantsJson !== String(performance.participantsRaw ?? "");
    if (!shouldUpdateFormDraft && !shouldUpdateParticipants) continue;
    performanceUpdates.push({
      id: performance.id,
      formDraftJson: shouldUpdateFormDraft
        ? nextFormDraftJson
        : performance.formDraftRaw,
      participantsJson: shouldUpdateParticipants
        ? performance.participantsJson
        : performance.participantsRaw,
    });
  }

  const statements = buildUpdateStatements(sequenceUpdates, performanceUpdates);
  const sqlContent = statements.length
    ? `${statements.join("\n")}\n`
    : "-- no updates required\n";
  await writeFile(sqlOutputPath, sqlContent, "utf8");

  // eslint-disable-next-line no-console
  console.log(`[migration] performances scanned: ${performanceRows.length}`);
  // eslint-disable-next-line no-console
  console.log(`[migration] sequences scanned: ${sequenceRows.length}`);
  // eslint-disable-next-line no-console
  console.log(`[migration] sequence updates: ${sequenceUpdates.length}`);
  // eslint-disable-next-line no-console
  console.log(`[migration] performance updates: ${performanceUpdates.length}`);
  // eslint-disable-next-line no-console
  console.log(`[migration] sql output: ${sqlOutputPath}`);

  if (!statements.length || dryRun || !apply) {
    // eslint-disable-next-line no-console
    console.log("[migration] no apply phase");
    return;
  }

  if (mode === "local") {
    applyUpdatesLocalWithSqlite(sequenceUpdates, performanceUpdates);
  } else {
    await applyStatementsInChunks(mode, statements);
  }
  // eslint-disable-next-line no-console
  console.log("[migration] completed");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[migration] failed", error);
  process.exitCode = 1;
});
