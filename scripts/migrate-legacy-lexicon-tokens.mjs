#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLASSIC_V2_TREE_BUCKET_MARKERS,
} from "../backend/worker/src/db/lexicon/constants.js";
import { normalizeLexiconLabel } from "../backend/worker/src/utils/lexicon.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const dbDir = path.join(root, "db");

const args = process.argv.slice(2);
const envArg = getArgValue(args, "--env") || "local";
const apply = args.includes("--apply");
const mappingFileArg = getArgValue(args, "--mapping-file");
const reportFileArg = getArgValue(args, "--report-file");
const mappingTemplateFileArg = getArgValue(args, "--mapping-template-file");

const ENV_CONFIG = {
  local: { dbName: "escribe-dev", extraArgs: ["--local"] },
  dev: { dbName: "escribe-dev", extraArgs: [] },
  prod: { dbName: "escribe", extraArgs: ["--remote"] },
};

if (!ENV_CONFIG[envArg]) {
  console.error(`[migrate-legacy] unknown --env=${envArg}`);
  process.exit(1);
}

const envConfig = ENV_CONFIG[envArg];
const wranglerArgsBase = [
  "wrangler",
  "d1",
  "execute",
  envConfig.dbName,
  "--config",
  "backend/worker/wrangler.toml",
  ...(envArg === "prod" ? [] : ["--env", envArg]),
  ...envConfig.extraArgs,
];

const LEGACY_BUCKET_ALIASES = {
  offensive: "offensive",
  action: "action",
  defensive: "defensive",
  cible: "cible",
  target: "cible",
  deplacement: "deplacement",
  movement: "deplacement",
  deplacement_complement: "deplacement_complement",
  movement_complement: "deplacement_complement",
  "movement-complement": "deplacement_complement",
  "parade-numero": "parade-numero",
  "guard-number": "parade-numero",
  "parade-attribut": "parade-attribut",
  "guard-attribute": "parade-attribut",
  "attaque-attribut": "attaque-attribut",
  "attack-attribute": "attaque-attribut",
  "defense-attribut": "defense-attribut",
  "defense-attribute": "defense-attribut",
  attributs_defense: "defense-attribut",
  attributs_defensifs: "defense-attribut",
};

const FIELD_BUCKET_HINTS = {
  mainGuard: ["parade-numero", "cible"],
  basePosture: ["deplacement", "action"],
  preparation: ["action"],
  "preparation.target": ["cible"],
  "preparation.position": ["parade-numero"],
  "preparation.attributes[]": ["action", "attaque-attribut", "parade-attribut"],
  "preparation.position.attributes[]": ["parade-attribut", "defense-attribut"],
  attack: ["offensive"],
  "attack.target": ["cible"],
  "attack.attributes[]": ["attaque-attribut", "action"],
  defense: ["defensive"],
  "defense.position": ["parade-numero", "cible"],
  "defense.attributes[]": ["defense-attribut", "parade-attribut"],
  movement: ["deplacement"],
  "movement.attributes[]": ["deplacement_complement", "attaque-attribut", "parade-attribut"],
};

main();

function main() {
  console.log(`[migrate-legacy] env=${envArg} apply=${apply}`);
  const lexiconRows = queryJson(`
    SELECT id, lexicon_id, parent_id, name
    FROM lexicon
    WHERE deleted_at IS NULL
  `);
  const lexicon = buildLexiconIndex(lexiconRows);
const mappingFilePath =
    resolveOptionalPath(mappingFileArg) ??
    path.join(dbDir, `migrate-legacy-lexicon-tokens-mapping-${envArg}.json`);
  const manualMappings = loadManualMappings(mappingFilePath, lexicon.byId);
  console.log(
    `[migrate-legacy] manual mappings loaded: strict=${manualMappings.strict.size} relaxed=${manualMappings.relaxed.size}`,
  );
  const sequenceRefs = queryJson(`
    SELECT id, performance_id
    FROM performance_sequences
    WHERE payload LIKE '%legacy:%'
    ORDER BY performance_id, position
  `);
  console.log(`[migrate-legacy] sequences with legacy tokens: ${sequenceRefs.length}`);

  const updates = [];
  const unmatched = [];
  let scannedTerms = 0;
  let matchedTerms = 0;
  let alreadyMappedTerms = 0;

  for (const rowRef of sequenceRefs) {
    const row = queryJson(`
      SELECT id, performance_id, payload
      FROM performance_sequences
      WHERE id = ${Number(rowRef.id)}
      LIMIT 1
    `)[0];
    if (!row) continue;
    let payload;
    try {
      payload = JSON.parse(row.payload);
    } catch {
      unmatched.push({
        performance_id: row.performance_id,
        sequence_id: row.id,
        step_id: "",
        performer_id: "",
        path: "payload",
        value: "<invalid_json>",
        reason: "invalid_json",
      });
      continue;
    }

    const state = {
      changed: false,
      performanceId: row.performance_id,
      sequenceId: row.id,
      unmatched,
      counters: {
        scannedTerms: 0,
        matchedTerms: 0,
        alreadyMappedTerms: 0,
      },
      manualMappings,
    };

    const steps = Array.isArray(payload?.steps) ? payload.steps : [];
    for (const step of steps) {
      const stepId = String(step?.id ?? "");
      const performers = step?.performers;
      if (!performers || typeof performers !== "object") continue;
      for (const [performerId, performer] of Object.entries(performers)) {
        migratePerformerTerms({
          performer,
          stepId,
          performerId,
          lexicon,
          state,
        });
      }
    }

    scannedTerms += state.counters.scannedTerms;
    matchedTerms += state.counters.matchedTerms;
    alreadyMappedTerms += state.counters.alreadyMappedTerms;

    if (!state.changed) continue;
    updates.push({
      id: row.id,
      performance_id: row.performance_id,
      payload,
    });
  }

  const sqlPath = path.join(dbDir, `migrate-legacy-lexicon-tokens-${envArg}.sql`);
  writeMigrationSql(sqlPath, updates);

  const unmatchedPath =
    resolveOptionalPath(reportFileArg) ??
    path.join(dbDir, `migrate-legacy-lexicon-tokens-unmatched-${envArg}.report.csv`);
  writeUnmatchedCsv(unmatchedPath, unmatched);
  const mappingTemplatePath =
    resolveOptionalPath(mappingTemplateFileArg) ??
    path.join(dbDir, `migrate-legacy-lexicon-tokens-mapping-${envArg}.json`);
  writeMappingTemplateJson(mappingTemplatePath, unmatched);

  console.log(`[migrate-legacy] scanned terms: ${scannedTerms}`);
  console.log(`[migrate-legacy] already mapped terms: ${alreadyMappedTerms}`);
  console.log(`[migrate-legacy] migrated terms: ${matchedTerms}`);
  console.log(`[migrate-legacy] updated sequences: ${updates.length}`);
  console.log(`[migrate-legacy] sql output: ${sqlPath}`);
  console.log(`[migrate-legacy] unmatched output: ${unmatchedPath}`);
  console.log(`[migrate-legacy] mapping template: ${mappingTemplatePath}`);

  printUnmatchedTable(unmatched);

  if (apply && updates.length > 0) {
    execWrangler([...wranglerArgsBase, "--file", sqlPath, "--json"]);
    console.log("[migrate-legacy] apply: done");
  } else if (apply) {
    console.log("[migrate-legacy] apply: nothing to update");
  } else {
    console.log("[migrate-legacy] dry-run only (pass --apply to execute SQL)");
  }
}

function migratePerformerTerms({ performer, stepId, performerId, lexicon, state }) {
  if (!performer || typeof performer !== "object") return;
  migrateTermAtPath({
    owner: performer,
    key: "mainGuard",
    path: "mainGuard",
    stepId,
    performerId,
    lexicon,
    state,
  });
  migrateTermAtPath({
    owner: performer,
    key: "basePosture",
    path: "basePosture",
    stepId,
    performerId,
    lexicon,
    state,
  });

  const preparation = performer.preparation;
  if (preparation && typeof preparation === "object") {
    migrateTermAtPath({
      owner: performer,
      key: "preparation",
      path: "preparation",
      stepId,
      performerId,
      lexicon,
      state,
    });
    migrateTermAtPath({
      owner: preparation,
      key: "target",
      path: "preparation.target",
      stepId,
      performerId,
      lexicon,
      state,
    });
    migrateTermAtPath({
      owner: preparation,
      key: "position",
      path: "preparation.position",
      stepId,
      performerId,
      lexicon,
      state,
    });
    migrateTermArrayAtPath({
      owner: preparation,
      key: "attributes",
      path: "preparation.attributes[]",
      stepId,
      performerId,
      lexicon,
      state,
    });
    if (preparation.position && typeof preparation.position === "object") {
      migrateTermArrayAtPath({
        owner: preparation.position,
        key: "attributes",
        path: "preparation.position.attributes[]",
        stepId,
        performerId,
        lexicon,
        state,
      });
    }
  }

  const attack = performer.attack;
  if (attack && typeof attack === "object") {
    migrateTermAtPath({
      owner: performer,
      key: "attack",
      path: "attack",
      stepId,
      performerId,
      lexicon,
      state,
    });
    migrateTermAtPath({
      owner: attack,
      key: "target",
      path: "attack.target",
      stepId,
      performerId,
      lexicon,
      state,
    });
    migrateTermArrayAtPath({
      owner: attack,
      key: "attributes",
      path: "attack.attributes[]",
      stepId,
      performerId,
      lexicon,
      state,
    });
  }

  const defense = performer.defense;
  if (defense && typeof defense === "object") {
    migrateTermAtPath({
      owner: performer,
      key: "defense",
      path: "defense",
      stepId,
      performerId,
      lexicon,
      state,
    });
    migrateTermAtPath({
      owner: defense,
      key: "position",
      path: "defense.position",
      stepId,
      performerId,
      lexicon,
      state,
    });
    migrateTermArrayAtPath({
      owner: defense,
      key: "attributes",
      path: "defense.attributes[]",
      stepId,
      performerId,
      lexicon,
      state,
    });
    if (defense.position && typeof defense.position === "object") {
      migrateTermArrayAtPath({
        owner: defense.position,
        key: "attributes",
        path: "defense.position.attributes[]",
        stepId,
        performerId,
        lexicon,
        state,
      });
    }
  }

  const movement = performer.movement;
  if (movement && typeof movement === "object") {
    migrateTermAtPath({
      owner: performer,
      key: "movement",
      path: "movement",
      stepId,
      performerId,
      lexicon,
      state,
    });
    migrateTermArrayAtPath({
      owner: movement,
      key: "attributes",
      path: "movement.attributes[]",
      stepId,
      performerId,
      lexicon,
      state,
    });
  }
}

function migrateTermArrayAtPath({
  owner,
  key,
  path,
  stepId,
  performerId,
  lexicon,
  state,
}) {
  const list = owner?.[key];
  if (!Array.isArray(list) || list.length === 0) return;
  for (let index = 0; index < list.length; index += 1) {
    const migrated = migrateTermRef({
      term: list[index],
      path,
      stepId,
      performerId,
      lexicon,
      state,
    });
    if (migrated.changed) {
      list[index] = migrated.term;
      state.changed = true;
    }
  }
}

function migrateTermAtPath({
  owner,
  key,
  path,
  stepId,
  performerId,
  lexicon,
  state,
}) {
  const migrated = migrateTermRef({
    term: owner?.[key],
    path,
    stepId,
    performerId,
    lexicon,
    state,
  });
  if (migrated.changed) {
    owner[key] = migrated.term;
    state.changed = true;
  }
}

function migrateTermRef({
  term,
  path,
  stepId,
  performerId,
  lexicon,
  state,
}) {
  if (!term || typeof term !== "object") return { changed: false, term };
  const next = { ...term };
  const lexiconId = String(next.lexicon_id ?? "").trim();
  const rawName = String(next.name ?? "").trim();
  const { bucketHint, rawLabel } = parseLegacyName(rawName);
  const label = rawLabel || rawName;

  state.counters.scannedTerms += 1;

  const manualOverride = findManualOverride({
    performanceId: state.performanceId,
    sequenceId: state.sequenceId,
    stepId,
    performerId,
    path,
    rawName,
    label,
    manualMappings: state.manualMappings,
  });
  if (manualOverride) {
    const mappedRow = lexicon.byId.get(manualOverride);
    if (!mappedRow) {
      state.unmatched.push({
        performance_id: state.performanceId,
        sequence_id: state.sequenceId,
        step_id: stepId,
        performer_id: performerId,
        path,
        value: rawName || label,
        reason: "manual_lexicon_id_not_found",
      });
      return { changed: false, term: next };
    }
    const nextLexiconId = String(mappedRow.lexicon_id ?? "").trim();
    const nextName = String(mappedRow.name ?? "").trim();
    const changed = next.lexicon_id !== nextLexiconId || next.name !== nextName;
    next.lexicon_id = nextLexiconId;
    next.name = nextName;
    if (changed) {
      state.counters.matchedTerms += 1;
      return { changed: true, term: next };
    }
    state.counters.alreadyMappedTerms += 1;
    return { changed: false, term: next };
  }

  if (lexiconId) {
    const row = lexicon.byId.get(lexiconId);
    if (!row) {
      const fallbackLabel = rawName || lexiconId;
      const foundByLabel = findLexiconMatch({
        label: fallbackLabel,
        bucketHint,
        path,
        lexicon,
      });
      if (foundByLabel) {
        next.lexicon_id = foundByLabel.lexicon_id;
        next.name = foundByLabel.name;
        state.counters.matchedTerms += 1;
        return { changed: true, term: next };
      }
      state.unmatched.push({
        performance_id: state.performanceId,
        sequence_id: state.sequenceId,
        step_id: stepId,
        performer_id: performerId,
        path,
        value: fallbackLabel,
        reason: "lexicon_id_not_found",
      });
      return { changed: false, term: next };
    }
    const canonicalName = String(row.name ?? "").trim();
    if (canonicalName && canonicalName !== rawName) {
      next.name = canonicalName;
      state.counters.matchedTerms += 1;
      return { changed: true, term: next };
    }
    state.counters.alreadyMappedTerms += 1;
    return { changed: false, term: next };
  }

  if (!label) return { changed: false, term: next };
  const found = findLexiconMatch({
    label,
    bucketHint,
    path,
    lexicon,
  });
  if (!found) {
    state.unmatched.push({
      performance_id: state.performanceId,
      sequence_id: state.sequenceId,
      step_id: stepId,
      performer_id: performerId,
      path,
      value: rawName || label,
      reason: "no_match",
    });
    return { changed: false, term: next };
  }

  next.lexicon_id = found.lexicon_id;
  next.name = found.name;
  state.counters.matchedTerms += 1;
  return { changed: true, term: next };
}

function findLexiconMatch({ label, bucketHint, path, lexicon }) {
  const normalized = normalizeLexiconLabel(label);
  if (!normalized) return null;
  const buckets = [];
  const aliasBucket = LEGACY_BUCKET_ALIASES[bucketHint];
  if (aliasBucket) buckets.push(aliasBucket);
  for (const fieldBucket of FIELD_BUCKET_HINTS[path] ?? []) {
    if (!buckets.includes(fieldBucket)) buckets.push(fieldBucket);
  }

  for (const bucket of buckets) {
    const bucketMap = lexicon.byBucket.get(bucket);
    const exact = bucketMap?.get(normalized);
    if (exact) return exact;
  }

  return lexicon.globalByName.get(normalized) ?? null;
}

function parseLegacyName(value) {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("legacy:")) {
    return { bucketHint: "", rawLabel: raw };
  }
  const withoutPrefix = raw.slice("legacy:".length);
  const firstSep = withoutPrefix.indexOf(":");
  if (firstSep < 0) {
    return { bucketHint: "", rawLabel: withoutPrefix };
  }
  const bucketHint = withoutPrefix.slice(0, firstSep).trim();
  const rawLabel = withoutPrefix.slice(firstSep + 1).trim();
  return { bucketHint, rawLabel };
}

function buildLexiconIndex(rows) {
  const byDbId = new Map();
  const byId = new Map();
  for (const row of rows) {
    byDbId.set(Number(row.id), row);
    byId.set(String(row.lexicon_id), row);
  }

  const byBucket = new Map();
  const globalByName = new Map();

  for (const row of rows) {
    const labelKey = normalizeLexiconLabel(row.name);
    if (labelKey && !globalByName.has(labelKey)) {
      globalByName.set(labelKey, row);
    }
    const markerIds = collectMarkerIds(row, byDbId);
    for (const [bucket, markers] of Object.entries(CLASSIC_V2_TREE_BUCKET_MARKERS)) {
      if (!intersects(markerIds, markers)) continue;
      let bucketMap = byBucket.get(bucket);
      if (!bucketMap) {
        bucketMap = new Map();
        byBucket.set(bucket, bucketMap);
      }
      if (labelKey && !bucketMap.has(labelKey)) bucketMap.set(labelKey, row);
    }
  }
  return { byId, byBucket, globalByName };
}

function collectMarkerIds(row, byDbId) {
  const out = new Set();
  let cursor = row;
  while (cursor && Number.isFinite(Number(cursor.id))) {
    const marker = normalizeLexiconLabel(cursor.lexicon_id);
    if (marker) out.add(marker);
    const parent = Number(cursor.parent_id);
    if (!Number.isFinite(parent)) break;
    cursor = byDbId.get(parent) ?? null;
  }
  return out;
}

function intersects(valuesSet, markerSet) {
  for (const marker of markerSet) {
    if (valuesSet.has(normalizeLexiconLabel(marker))) return true;
  }
  return false;
}

function writeMigrationSql(outputPath, updates) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const lines = [];
  for (const row of updates) {
    const payload = JSON.stringify(row.payload);
    lines.push(
      `UPDATE performance_sequences SET payload='${sqlQuote(payload)}' WHERE id=${Number(row.id)};`,
    );
  }
  lines.push("");
  writeFileSync(outputPath, lines.join("\n"), "utf-8");
}

function writeUnmatchedCsv(outputPath, unmatched) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const header = [
    "performance_id",
    "sequence_id",
    "step_id",
    "performer_id",
    "path",
    "value",
    "reason",
    "lexicon_id",
  ];
  const delimiter = ";";
  const lines = [header.join(delimiter)];
  for (const item of unmatched) {
    lines.push(
      [
        item.performance_id,
        item.sequence_id,
        item.step_id,
        item.performer_id,
        item.path,
        csvQuote(item.value, delimiter),
        item.reason,
        "",
      ].join(delimiter),
    );
  }
  lines.push("");
  writeFileSync(outputPath, lines.join("\n"), "utf-8");
}

function writeMappingTemplateJson(outputPath, unmatched) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const grouped = new Map();
  for (const item of unmatched) {
    const value = String(item?.value ?? "").trim();
    const pathValue = String(item?.path ?? "").trim();
    if (!pathValue || !value) continue;
    const key = `${pathValue}|${normalizeLexiconLabel(value)}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        path: pathValue,
        value,
        count: 0,
        examples: [
          {
            performance_id: item?.performance_id ?? "",
            sequence_id: item?.sequence_id ?? "",
            step_id: item?.step_id ?? "",
            performer_id: item?.performer_id ?? "",
          },
        ],
      });
    }
    const current = grouped.get(key);
    current.count += 1;
    if (current.examples.length < 3) {
      const signature = `${item?.performance_id}|${item?.sequence_id}|${item?.step_id}|${item?.performer_id}`;
      const alreadyListed = current.examples.some(
        (example) =>
          `${example.performance_id}|${example.sequence_id}|${example.step_id}|${example.performer_id}` ===
          signature,
      );
      if (!alreadyListed) {
        current.examples.push({
          performance_id: item?.performance_id ?? "",
          sequence_id: item?.sequence_id ?? "",
          step_id: item?.step_id ?? "",
          performer_id: item?.performer_id ?? "",
        });
      }
    }
  }
  const entries = [...grouped.values()]
    .sort((a, b) => b.count - a.count)
    .map((entry) => ({
      path: entry.path,
      value: entry.value,
      lexicon_id: "",
      count: entry.count,
      examples: entry.examples,
    }));
  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    instructions:
      "Fill lexicon_id for each entry. Optional strict scoping can be set with performance_id/sequence_id/step_id/performer_id.",
    entries,
  };
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8");
}

function printUnmatchedTable(unmatched) {
  const summary = new Map();
  for (const row of unmatched) {
    const key = `${row.path}|${row.value}|${row.reason}`;
    if (!summary.has(key)) {
      summary.set(key, {
        path: row.path,
        value: row.value,
        reason: row.reason,
        count: 0,
      });
    }
    summary.get(key).count += 1;
  }
  const rows = [...summary.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);
  console.log("");
  console.log("[migrate-legacy] unmatched terms (top 100):");
  console.table(rows);
}

function queryJson(sql) {
  const parsed = execWrangler([
    ...wranglerArgsBase,
    "--command",
    sql.replace(/\s+/g, " ").trim(),
    "--json",
  ]);
  return parsed?.[0]?.results ?? [];
}

function execWrangler(args) {
  const stdout = execFileSync("npx", args, {
    cwd: root,
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 64,
    stdio: ["ignore", "pipe", "inherit"],
  });
  return parseWranglerJsonOutput(stdout);
}

function parseWranglerJsonOutput(stdout) {
  const raw = String(stdout ?? "").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const startArray = raw.indexOf("[");
    const startObject = raw.indexOf("{");
    let start = -1;
    if (startArray >= 0 && startObject >= 0) {
      start = Math.min(startArray, startObject);
    } else if (startArray >= 0) {
      start = startArray;
    } else if (startObject >= 0) {
      start = startObject;
    }
    if (start < 0) {
      throw new Error(`Wrangler did not return JSON output:\n${raw}`);
    }
    const jsonCandidate = raw.slice(start).trim();
    return JSON.parse(jsonCandidate);
  }
}

function getArgValue(argv, name) {
  const index = argv.findIndex((entry) => entry === name);
  if (index < 0) return "";
  return String(argv[index + 1] ?? "");
}

function sqlQuote(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function csvQuote(value, delimiter = ",") {
  const raw = String(value ?? "");
  if (
    !raw.includes(delimiter) &&
    !raw.includes("\"") &&
    !raw.includes("\n")
  ) {
    return raw;
  }
  return `"${raw.replace(/"/g, "\"\"")}"`;
}

function resolveOptionalPath(value) {
  if (!value) return null;
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function loadManualMappings(csvPath, lexiconById) {
  if (String(csvPath).toLowerCase().endsWith(".json")) {
    return loadManualMappingsFromJson(csvPath, lexiconById);
  }
  const strict = new Map();
  const relaxed = new Map();
  if (!existsSync(csvPath)) return { strict, relaxed };
  const raw = readFileSync(csvPath, "utf-8").trim();
  if (!raw) return { strict, relaxed };
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { strict, relaxed };
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = parseCsvLine(lines[0], delimiter).map((entry) => entry.trim());
  const indexByHeader = new Map(headers.map((header, index) => [header, index]));
  const hasDetailedHeaders = [
    "performance_id",
    "sequence_id",
    "step_id",
    "performer_id",
    "path",
    "value",
    "lexicon_id",
  ].every((header) => indexByHeader.has(header));
  const hasRelaxedHeaders = ["path", "value", "lexicon_id"].every((header) =>
    indexByHeader.has(header),
  );
  if (!hasDetailedHeaders && !hasRelaxedHeaders) return { strict, relaxed };

  for (let index = 1; index < lines.length; index += 1) {
    const columns = parseCsvLine(lines[index], delimiter);
    const lexiconId = String(columns[indexByHeader.get("lexicon_id")] ?? "").trim();
    if (!lexiconId) continue;
    if (!lexiconById.has(lexiconId)) continue;
    const pathValue = String(columns[indexByHeader.get("path")] ?? "").trim();
    const value = String(columns[indexByHeader.get("value")] ?? "").trim();
    const normalizedValue = normalizeLexiconLabel(value);
    if (!pathValue || !normalizedValue) continue;
    const relaxedKey = `${pathValue}|${normalizedValue}`;
    relaxed.set(relaxedKey, lexiconId);
    if (hasDetailedHeaders) {
      const performanceId = String(columns[indexByHeader.get("performance_id")] ?? "").trim();
      const sequenceId = String(columns[indexByHeader.get("sequence_id")] ?? "").trim();
      const stepId = String(columns[indexByHeader.get("step_id")] ?? "").trim();
      const performerId = String(columns[indexByHeader.get("performer_id")] ?? "").trim();
      const strictKey = [
        performanceId,
        sequenceId,
        stepId,
        performerId,
        pathValue,
        normalizedValue,
      ].join("|");
      strict.set(strictKey, lexiconId);
    }
  }
  return { strict, relaxed };
}

function loadManualMappingsFromJson(filePath, lexiconById) {
  const strict = new Map();
  const relaxed = new Map();
  if (!existsSync(filePath)) return { strict, relaxed };
  let parsed = null;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return { strict, relaxed };
  }
  const entries = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.entries)
      ? parsed.entries
      : [];
  for (const entry of entries) {
    const lexiconId = String(entry?.lexicon_id ?? "").trim();
    if (!lexiconId) continue;
    if (!lexiconById.has(lexiconId)) continue;
    const pathValue = String(entry?.path ?? "").trim();
    const value = String(entry?.value ?? "").trim();
    const normalizedValue = normalizeLexiconLabel(value);
    if (!pathValue || !normalizedValue) continue;
    relaxed.set(`${pathValue}|${normalizedValue}`, lexiconId);

    const hasStrictScope =
      String(entry?.performance_id ?? "").trim() ||
      String(entry?.sequence_id ?? "").trim() ||
      String(entry?.step_id ?? "").trim() ||
      String(entry?.performer_id ?? "").trim();
    if (hasStrictScope) {
      const strictKey = [
        String(entry?.performance_id ?? "").trim(),
        String(entry?.sequence_id ?? "").trim(),
        String(entry?.step_id ?? "").trim(),
        String(entry?.performer_id ?? "").trim(),
        pathValue,
        normalizedValue,
      ].join("|");
      strict.set(strictKey, lexiconId);
    }
  }
  return { strict, relaxed };
}

function findManualOverride({
  performanceId,
  sequenceId,
  stepId,
  performerId,
  path,
  rawName,
  label,
  manualMappings,
}) {
  if (!manualMappings) return "";
  const candidates = [rawName, label];
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeLexiconLabel(candidate);
    if (!normalizedCandidate) continue;
    const strictKey = [
      String(performanceId),
      String(sequenceId),
      String(stepId),
      String(performerId),
      String(path),
      normalizedCandidate,
    ].join("|");
    const strictMatch = manualMappings.strict.get(strictKey);
    if (strictMatch) return strictMatch;
    const relaxedMatch = manualMappings.relaxed.get(
      `${String(path)}|${normalizedCandidate}`,
    );
    if (relaxedMatch) return relaxedMatch;
  }
  return "";
}

function parseCsvLine(line, delimiter) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      const next = line[index + 1];
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && char === delimiter) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current);
  return out;
}
