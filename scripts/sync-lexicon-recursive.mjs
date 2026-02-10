import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcPath = path.join(
  root,
  "backend",
  "worker",
  "src",
  "lexicon-recursive.seed.json",
);
const sqlPath = path.join(root, "db", "lexicon-recursive.sql");

function sqlQuote(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function getNodeId(node) {
  return String(node?.id ?? node?.lexicon_id ?? "").trim();
}

function getNodeName(node) {
  return String(node?.name ?? node?.nom ?? node?.title ?? node?.titre ?? "").trim();
}

function getNodeDescription(node) {
  return String(node?.description ?? "").trim();
}

function getNodeChildren(node) {
  const children = [];
  if (Array.isArray(node?.children)) children.push(...node.children);
  if (Array.isArray(node?.categories)) children.push(...node.categories);
  if (Array.isArray(node?.sous_categories)) children.push(...node.sous_categories);
  if (Array.isArray(node?.elements)) children.push(...node.elements);
  return children;
}

function normalizeRoot(seed) {
  const rootId = getNodeId(seed) || "classic_v2_root";
  const rootName = getNodeName(seed) || "Escrime historique française - Lexique complet";
  const rootDescription = getNodeDescription(seed);
  const rootChildren = getNodeChildren(seed);
  return {
    id: rootId,
    name: rootName,
    description: rootDescription,
    children: rootChildren,
  };
}

function flattenTree(node, parentLexiconId = null, out = []) {
  const lexiconId = getNodeId(node);
  const name = getNodeName(node);
  const description = getNodeDescription(node);
  if (lexiconId && name) {
    out.push({
      lexiconId,
      parentLexiconId,
      name,
      description,
    });
  }
  for (const child of getNodeChildren(node)) {
    flattenTree(child, lexiconId, out);
  }
  return out;
}

const raw = await readFile(srcPath, "utf-8");
const seed = JSON.parse(raw);
const normalizedRoot = normalizeRoot(seed);
const entries = flattenTree(normalizedRoot, null, []);

const sqlLines = [
  "CREATE TABLE IF NOT EXISTS lexicon (",
  "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
  "  lexicon_id TEXT NOT NULL UNIQUE,",
  "  parent_id INTEGER,",
  "  name TEXT NOT NULL,",
  "  description TEXT,",
  "  deleted_at TEXT,",
  "  source TEXT NOT NULL DEFAULT 'seed',",
  "  FOREIGN KEY(parent_id) REFERENCES lexicon(id)",
  ");",
  "",
];

if (!entries.length) {
  throw new Error("Invalid recursive lexicon seed: empty tree.");
}

for (const entry of entries) {
  const descriptionValue = entry.description
    ? `'${sqlQuote(entry.description)}'`
    : "NULL";
  const parentJoinCondition = entry.parentLexiconId
    ? `p.lexicon_id = '${sqlQuote(entry.parentLexiconId)}'`
    : "1 = 0";
  sqlLines.push(
    "INSERT INTO lexicon (lexicon_id, parent_id, name, description, deleted_at, source)",
    "SELECT",
    `  '${sqlQuote(entry.lexiconId)}',`,
    "  p.id,",
    `  '${sqlQuote(entry.name)}',`,
    `  ${descriptionValue},`,
    "  NULL,",
    "  'seed'",
    "FROM (SELECT 1) AS _",
    `LEFT JOIN lexicon p ON ${parentJoinCondition}`,
    "ON CONFLICT(lexicon_id) DO UPDATE SET",
    "  parent_id = excluded.parent_id,",
    "  name = excluded.name,",
    "  description = excluded.description,",
    "  deleted_at = NULL,",
    "  source = 'seed';",
    "",
  );
}

const seedIdList = entries.map((entry) => `'${sqlQuote(entry.lexiconId)}'`).join(", ");
sqlLines.push(
  "UPDATE lexicon",
  "SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)",
  "WHERE source = 'seed'",
  "  AND deleted_at IS NULL",
  `  AND lexicon_id NOT IN (${seedIdList});`,
);

sqlLines.push(
  "",
  "CREATE TABLE IF NOT EXISTS lexicon_cache_revision (",
  "  lexicon_key TEXT PRIMARY KEY,",
  "  revision INTEGER NOT NULL DEFAULT 0,",
  "  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
  ");",
  "",
  "INSERT INTO lexicon_cache_revision (lexicon_key, revision, updated_at)",
  "VALUES ('classic-v2', 1, CURRENT_TIMESTAMP)",
  "ON CONFLICT(lexicon_key) DO UPDATE SET",
  "  revision = revision + 1,",
  "  updated_at = CURRENT_TIMESTAMP;",
);

await writeFile(sqlPath, `${sqlLines.join("\n")}\n`, "utf-8");
console.log("Recursive lexicon synced to:");
console.log(`- ${sqlPath}`);
