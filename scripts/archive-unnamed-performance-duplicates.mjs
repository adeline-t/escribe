#!/usr/bin/env node
import path from "node:path";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const root = process.cwd();
const envArg = String(readFlagValue("--env") ?? "prod").trim().toLowerCase();
const apply = hasFlag("--apply");

const configPath = path.resolve(root, "backend/worker/wrangler.toml");

const TARGETS = {
  local: {
    database: "escribe-dev",
    envFlag: "local",
    locationFlag: "--local",
  },
  dev: {
    database: "escribe-dev",
    envFlag: "dev",
    locationFlag: null,
  },
  prod: {
    database: "escribe",
    envFlag: "",
    locationFlag: "--remote",
  },
};

const target = TARGETS[envArg];
if (!target) {
  console.error(
    `[cleanup-unnamed] unknown --env=${envArg} (allowed: local|dev|prod)`,
  );
  process.exit(1);
}

const DEFAULT_NAME = "combat sans nom";
const now = new Date().toISOString();

const rows = queryJson(`
  SELECT
    p.id,
    p.user_id,
    p.type,
    p.is_demo,
    TRIM(COALESCE(p.name, '')) AS name,
    COALESCE(seq.sequence_count, 0) AS sequence_count,
    COALESCE(st.step_count, 0) AS step_count,
    p.updated_at,
    p.created_at
  FROM performances p
  LEFT JOIN (
    SELECT performance_id, COUNT(*) AS sequence_count
    FROM performance_sequences
    GROUP BY performance_id
  ) seq ON seq.performance_id = p.id
  LEFT JOIN (
    SELECT s.performance_id, COUNT(ss.id) AS step_count
    FROM performance_sequences s
    LEFT JOIN sequence_steps ss ON ss.sequence_id = s.id
    GROUP BY s.performance_id
  ) st ON st.performance_id = p.id
  WHERE p.archived = 0
    AND (
      TRIM(COALESCE(p.name, '')) = ''
      OR LOWER(TRIM(COALESCE(p.name, ''))) = '${sqlQuote(DEFAULT_NAME)}'
    )
  ORDER BY p.user_id, p.type, p.is_demo, p.id
`);

const grouped = new Map();
for (const row of rows) {
  const userId = Number(row?.user_id);
  if (!Number.isFinite(userId)) continue;
  const key = `${userId}|${String(row?.type ?? "classic")}|${Number(row?.is_demo) ? 1 : 0}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push({
    id: Number(row?.id),
    user_id: userId,
    type: String(row?.type ?? "classic"),
    is_demo: Number(row?.is_demo) ? 1 : 0,
    name: String(row?.name ?? ""),
    sequence_count: Number(row?.sequence_count ?? 0),
    step_count: Number(row?.step_count ?? 0),
    updated_at: typeof row?.updated_at === "string" ? row.updated_at : "",
    created_at: typeof row?.created_at === "string" ? row.created_at : "",
  });
}

const keepers = [];
const duplicates = [];
for (const entries of grouped.values()) {
  if (!entries.length) continue;
  const sorted = [...entries].sort(sortByRichness);
  keepers.push(sorted[0]);
  if (sorted.length > 1) {
    duplicates.push(...sorted.slice(1));
  }
}

console.log(`[cleanup-unnamed] env=${envArg} apply=${apply}`);
console.log(`[cleanup-unnamed] candidates=${rows.length}`);
console.log(`[cleanup-unnamed] groups=${grouped.size}`);
console.log(`[cleanup-unnamed] keepers=${keepers.length}`);
console.log(`[cleanup-unnamed] to_archive=${duplicates.length}`);

if (duplicates.length > 0) {
  console.log("");
  console.log("[cleanup-unnamed] sample duplicates (first 30):");
  console.table(
    duplicates.slice(0, 30).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      is_demo: row.is_demo,
      sequence_count: row.sequence_count,
      step_count: row.step_count,
      updated_at: row.updated_at,
    })),
  );
}

const sqlPath = path.resolve(
  root,
  `db/archive-unnamed-performance-duplicates-${envArg}.sql`,
);

const sql = buildSql(duplicates, now);
writeFileSync(sqlPath, `${sql}\n`, "utf-8");
console.log(`[cleanup-unnamed] sql output: ${sqlPath}`);

if (!apply) {
  console.log("[cleanup-unnamed] dry-run only (use --apply to archive duplicates)");
  process.exit(0);
}

if (!duplicates.length) {
  console.log("[cleanup-unnamed] nothing to archive");
  process.exit(0);
}

execWranglerFile(sqlPath);
console.log("[cleanup-unnamed] apply done");

function sortByRichness(a, b) {
  if (b.step_count !== a.step_count) return b.step_count - a.step_count;
  if (b.sequence_count !== a.sequence_count) {
    return b.sequence_count - a.sequence_count;
  }
  const updatedDiff = toTimestamp(b.updated_at) - toTimestamp(a.updated_at);
  if (updatedDiff !== 0) return updatedDiff;
  const createdDiff = toTimestamp(b.created_at) - toTimestamp(a.created_at);
  if (createdDiff !== 0) return createdDiff;
  return b.id - a.id;
}

function toTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildSql(rowsToArchive, updatedAt) {
  if (!rowsToArchive.length) {
    return "-- No duplicate unnamed performances found.";
  }
  const lines = [
    "-- Archive duplicate unnamed performances (safe dedupe).",
    `-- Generated at ${updatedAt}`,
  ];
  for (const row of rowsToArchive) {
    lines.push(
      `UPDATE performances SET archived = 1, updated_at = '${sqlQuote(updatedAt)}' WHERE id = ${Number(row.id)} AND archived = 0;`,
    );
  }
  return lines.join("\n");
}

function queryJson(sql) {
  const parsed = execWrangler([
    ...wranglerArgsBase(),
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

function execWranglerFile(sqlFilePath) {
  const args = [
    ...wranglerArgsBase(),
    "--file",
    sqlFilePath,
    "-y",
  ];
  execFileSync("npx", args, {
    cwd: root,
    stdio: "inherit",
    maxBuffer: 1024 * 1024 * 64,
  });
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
    return JSON.parse(raw.slice(start).trim());
  }
}

function wranglerArgsBase() {
  const args = [
    "wrangler",
    "d1",
    "execute",
    target.database,
    "--config",
    configPath,
  ];
  if (target.envFlag) {
    args.push("--env", target.envFlag);
  }
  if (target.locationFlag) {
    args.push(target.locationFlag);
  }
  return args;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function readFlagValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function sqlQuote(value) {
  return String(value ?? "").replace(/'/g, "''");
}
