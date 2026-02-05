import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcPath = path.join(root, "frontend", "src", "data", "lexicon.json");
const workerPath = path.join(root, "backend", "worker", "src", "lexicon.seed.json");
const sqlPath = path.join(root, "db", "lexicon.sql");
const sabreSrcPath = path.join(root, "frontend", "src", "data", "lexicon-sabre-laser.json");
const sabreWorkerPath = path.join(root, "backend", "worker", "src", "lexicon-sabre-laser.seed.json");
const sabreSqlPath = path.join(root, "db", "lexicon-sabre-laser.sql");

const mapTable = {
  offensive: "offensive",
  action: "action",
  defensive: "defensive",
  cible: "cible",
  "deplacement-attaque": "deplacement_attaque",
  "deplacement-defense": "deplacement_defense",
  "parade-numero": "parade_numero",
  "parade-attribut": "parade_attribut",
  "attaque-attribut": "attaque_attribut"
};

const sabreTable = {
  armes: "sl_armes",
  phases_choregraphie: "sl_phases_choregraphie",
  cibles: "sl_cibles",
  techniques_offensives: "sl_techniques_offensives",
  attributs_offensifs: "sl_attributs_offensifs",
  techniques_defensives: "sl_techniques_defensives",
  attributs_defensifs: "sl_attributs_defensifs",
  preparations: "sl_preparations",
  deplacements: "sl_deplacements"
};

function sqlQuote(value) {
  return value.replace(/'/g, "''");
}

const lexiconRaw = await readFile(srcPath, "utf-8");
const lexicon = JSON.parse(lexiconRaw);

await writeFile(workerPath, JSON.stringify(lexicon, null, 2) + "\n", "utf-8");

const sqlLines = [];
for (const [key, table] of Object.entries(mapTable)) {
  const items = lexicon[key] ?? [];
  sqlLines.push(`CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`);
  sqlLines.push(`DELETE FROM ${table};`);
  for (const item of items) {
    sqlLines.push(`INSERT INTO ${table} (label) VALUES ('${sqlQuote(item)}');`);
  }
  sqlLines.push("");
}

await writeFile(sqlPath, sqlLines.join("\n").trimEnd() + "\n", "utf-8");

console.log("Lexicon synced to:");
console.log(`- ${workerPath}`);
console.log(`- ${sqlPath}`);

const sabreRaw = await readFile(sabreSrcPath, "utf-8");
const sabreLexicon = JSON.parse(sabreRaw);

await writeFile(sabreWorkerPath, JSON.stringify(sabreLexicon, null, 2) + "\n", "utf-8");

const sabreLines = [];
for (const [key, table] of Object.entries(sabreTable)) {
  const items = sabreLexicon[key] ?? [];
  sabreLines.push(`CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`);
  sabreLines.push(`DELETE FROM ${table};`);
  for (const item of items) {
    sabreLines.push(`INSERT INTO ${table} (label) VALUES ('${sqlQuote(item)}');`);
  }
  sabreLines.push("");
}

await writeFile(sabreSqlPath, sabreLines.join("\n").trimEnd() + "\n", "utf-8");

console.log("Sabre-laser lexicon synced to:");
console.log(`- ${sabreWorkerPath}`);
console.log(`- ${sabreSqlPath}`);
