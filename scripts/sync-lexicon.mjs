import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const srcPath = path.join(root, "frontend", "src", "data", "lexicon.json");
const newSrcPath = path.join(root, "frontend", "src", "data", "new-lexicon.json");
const workerPath = path.join(root, "backend", "worker", "src", "lexicon.seed.json");
const newWorkerPath = path.join(root, "backend", "worker", "src", "lexicon-new.seed.json");
const sqlPath = path.join(root, "db", "lexicon.sql");
const newSqlPath = path.join(root, "db", "lexicon-new.sql");
const sabreSrcPath = path.join(root, "frontend", "src", "data", "lexicon-sabre-laser.json");
const sabreWorkerPath = path.join(root, "backend", "worker", "src", "lexicon-sabre-laser.seed.json");
const sabreSqlPath = path.join(root, "db", "lexicon-sabre-laser.sql");

const mapTable = {
  offensive: "offensive",
  action: "action",
  defensive: "defensive",
  cible: "cible",
  deplacement: "deplacement",
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

const newTable = {
  offensive: "nl_offensive",
  action: "nl_action",
  defensive: "nl_defensive",
  cible: "nl_cible",
  deplacement: "nl_deplacement",
  deplacement_complement: "nl_deplacement_complement",
  "parade-numero": "nl_parade_numero",
  "parade-attribut": "nl_parade_attribut",
  "attaque-attribut": "nl_attaque_attribut"
};

function sqlQuote(value) {
  return value.replace(/'/g, "''");
}

function mergeUnique(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      if (!value || typeof value !== "string") continue;
      if (seen.has(value)) continue;
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

function normalizeNewLexicon(data) {
  const actions = data?.actions_escrime ?? {};
  const offensives = actions.actions_offensives ?? {};
  const defensives = actions.actions_defensives ?? {};
  const preparations = actions.preparations ?? {};
  const mouvement = data?.mouvement ?? {};

  const action = mergeUnique(
    preparations.engagement,
    preparations.attaques_au_fer,
    preparations.prises_de_fer,
    preparations.sans_contact,
    preparations.composees
  );

  const deplacementBase = mergeUnique(mouvement.deplacement);
  const deplacementComplement = mergeUnique(mouvement.deplacement_complement);
  const deplacement = mergeUnique(deplacementBase, deplacementComplement);

  return {
    offensive: mergeUnique(offensives.attaques),
    action,
    defensive: mergeUnique(defensives.esquive),
    cible: mergeUnique(mouvement.cible),
    deplacement,
    deplacement_complement: deplacementComplement,
    "parade-numero": mergeUnique(mouvement.position),
    "parade-attribut": mergeUnique(mouvement.position_complements),
    "attaque-attribut": mergeUnique(offensives.complements)
  };
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

const newRaw = await readFile(newSrcPath, "utf-8");
const newLexicon = normalizeNewLexicon(JSON.parse(newRaw));

await writeFile(newWorkerPath, JSON.stringify(newLexicon, null, 2) + "\n", "utf-8");

const newLines = [];
for (const [key, table] of Object.entries(newTable)) {
  const items = newLexicon[key] ?? [];
  newLines.push(`CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL);`);
  newLines.push(`DELETE FROM ${table};`);
  for (const item of items) {
    newLines.push(`INSERT INTO ${table} (label) VALUES ('${sqlQuote(item)}');`);
  }
  newLines.push("");
}

await writeFile(newSqlPath, newLines.join("\n").trimEnd() + "\n", "utf-8");

console.log("New lexicon synced to:");
console.log(`- ${newWorkerPath}`);
console.log(`- ${newSqlPath}`);

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
