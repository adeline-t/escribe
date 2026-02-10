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

function buildInsertStatement(node, parentLexiconId = null) {
  const lexiconId = getNodeId(node);
  const name = getNodeName(node);
  const description = getNodeDescription(node);
  if (!lexiconId || !name) return null;

  const parentExpr = parentLexiconId
    ? `(SELECT id FROM lexicon WHERE lexicon_id='${sqlQuote(parentLexiconId)}' LIMIT 1)`
    : "NULL";
  const descriptionExpr = description ? `'${sqlQuote(description)}'` : "NULL";

  return `INSERT INTO lexicon (lexicon_id, parent_id, name, description) VALUES ('${sqlQuote(
    lexiconId,
  )}', ${parentExpr}, '${sqlQuote(name)}', ${descriptionExpr});`;
}

const raw = await readFile(srcPath, "utf-8");
const seed = JSON.parse(raw);
const normalizedRoot = normalizeRoot(seed);

const sqlLines = [
  "CREATE TABLE IF NOT EXISTS lexicon (",
  "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
  "  lexicon_id TEXT NOT NULL UNIQUE,",
  "  parent_id INTEGER,",
  "  name TEXT NOT NULL,",
  "  description TEXT,",
  "  FOREIGN KEY(parent_id) REFERENCES lexicon(id)",
  ");",
  "",
  "DELETE FROM lexicon;",
  "",
];

const rootInsert = buildInsertStatement(normalizedRoot, null);
if (!rootInsert) {
  throw new Error("Invalid recursive lexicon root: missing id or name.");
}
sqlLines.push(rootInsert);

function visit(node, parentLexiconId) {
  for (const child of getNodeChildren(node)) {
    const statement = buildInsertStatement(child, parentLexiconId);
    if (statement) sqlLines.push(statement);
    const childId = getNodeId(child);
    if (childId) visit(child, childId);
  }
}

visit(normalizedRoot, normalizedRoot.id);

await writeFile(sqlPath, `${sqlLines.join("\n")}\n`, "utf-8");
console.log("Recursive lexicon synced to:");
console.log(`- ${sqlPath}`);
