import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const docDir = path.resolve("doc");
const outputFile = path.resolve("db/import-combats.sql");
const lexiconFile = path.resolve("frontend/src/data/lexicon.json");

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

const email = getArg("--email") || process.env.SUPERADMIN_EMAIL || "";
if (!email) {
  console.error("Missing --email (or SUPERADMIN_EMAIL env). Aborting.");
  process.exit(1);
}

function normalizeName(raw) {
  return (raw || "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLabel(value) {
  return (value || "").trim().toLowerCase();
}

function buildLexiconSets() {
  if (!fs.existsSync(lexiconFile)) return null;
  const data = JSON.parse(fs.readFileSync(lexiconFile, "utf-8"));
  const buildSet = (list) =>
    new Set((list || []).map((item) => normalizeLabel(item)));
  const attackMoves = buildSet(data["deplacement-attaque"]);
  const defenseMoves = buildSet(data["deplacement-defense"]);
  return {
    offensive: buildSet(data.offensive),
    action: buildSet(data.action),
    defensive: buildSet(data.defensive),
    cible: buildSet(data.cible),
    paradeNumero: buildSet(data["parade-numero"]),
    paradeAttribut: buildSet(data["parade-attribut"]),
    deplacement: new Set([...attackMoves, ...defenseMoves])
  };
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ";" && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  return content.split(/\r?\n/).map(parseCsvLine);
}

function isPhraseMarker(text) {
  const value = (text || "").trim().toLowerCase();
  if (!value) return false;
  return value.startsWith("tout:") || value.includes("phrase");
}

function findHeaderRow(rows, startIndex) {
  for (let i = startIndex + 1; i < Math.min(rows.length, startIndex + 10); i += 1) {
    const row = rows[i] || [];
    if (row.some((cell) => cell.trim().toLowerCase() === "offensive")) {
      return { headerIndex: i, namesIndex: i - 1 };
    }
  }
  return null;
}

function buildSteps(rows, startIndex, endIndex, groupStarts, groupIndices, globalParticipants, lexicon) {
  const steps = [];
  for (let i = startIndex; i < endIndex; i += 1) {
    const row = rows[i] || [];
    if (!row.length) continue;

    const hasData = groupStarts.some((start) => {
      const cols = [start, start + 1, start + 2, start + 3, start + 4, start + 5, start + 6];
      return cols.some((idx) => row[idx] && row[idx].trim());
    });
    if (!hasData) continue;

    const participants = globalParticipants.map(() => ({
      mode: "combat",
      role: "none",
      offensive: "",
      action: "",
      target: "",
      attackMove: "",
      attackAttribute: [],
      defense: "",
      paradeNumber: "",
      paradeAttribute: "",
      defendMove: "",
      chorePhase: "",
      note: "",
      noteOverrides: false
    }));

    groupStarts.forEach((start, groupIndex) => {
      const baseIndex = start;
      let offensive = (row[baseIndex] || "").trim();
      let action = (row[baseIndex + 1] || "").trim();
      let target = (row[baseIndex + 2] || "").trim();
      let defense = (row[baseIndex + 3] || "").trim();
      let position = (row[baseIndex + 4] || "").trim();
      let pvar = (row[baseIndex + 5] || "").trim();
      let deplacement = (row[baseIndex + 6] || "").trim();

      const participantIndex = groupIndices[groupIndex];
      const item = { ...participants[participantIndex] };

      const noteParts = [];

      if (lexicon) {
        if (offensive && !lexicon.offensive.has(normalizeLabel(offensive))) {
          noteParts.push(`Offensive: ${offensive}`);
          offensive = "";
        }
        if (action && !lexicon.action.has(normalizeLabel(action))) {
          noteParts.push(`Action: ${action}`);
          action = "";
        }
        if (target && !lexicon.cible.has(normalizeLabel(target))) {
          noteParts.push(`Cible: ${target}`);
          target = "";
        }
        if (defense && !lexicon.defensive.has(normalizeLabel(defense))) {
          noteParts.push(`Défensive: ${defense}`);
          defense = "";
        }
        if (position && !lexicon.paradeNumero.has(normalizeLabel(position))) {
          noteParts.push(`Position: ${position}`);
          position = "";
        }
        if (pvar && !lexicon.paradeAttribut.has(normalizeLabel(pvar))) {
          noteParts.push(`Variante: ${pvar}`);
          pvar = "";
        }
        if (deplacement && !lexicon.deplacement.has(normalizeLabel(deplacement))) {
          noteParts.push(`Déplacement: ${deplacement}`);
          deplacement = "";
        }
      }

      const hasAttack = Boolean(offensive || action || target);
      const hasDefense = Boolean(defense || position || pvar);

      if (hasAttack && !hasDefense) {
        item.role = "attack";
        item.offensive = offensive;
        item.action = action;
        item.target = target;
        item.attackMove = deplacement;
        if (noteParts.length) {
          item.note = noteParts.join(" · ");
        }
      } else if (hasDefense && !hasAttack) {
        item.role = "defense";
        item.defense = defense;
        item.paradeNumber = position;
        item.paradeAttribute = pvar;
        item.defendMove = deplacement;
        if (noteParts.length) {
          item.note = noteParts.join(" · ");
        }
      } else if (hasAttack && hasDefense) {
        item.role = "attack";
        item.offensive = offensive;
        item.action = action;
        item.target = target;
        item.attackMove = deplacement;
        const defenseBits = [defense, position, pvar].filter(Boolean).join(" ");
        const fullNote = [];
        if (defenseBits) fullNote.push(`Défense: ${defenseBits}`);
        if (noteParts.length) fullNote.push(noteParts.join(" · "));
        item.note = fullNote.join(" · ");
      } else if (deplacement) {
        item.mode = "note";
        item.role = "none";
        item.note = `Déplacement: ${deplacement}`;
      } else if (noteParts.length) {
        item.mode = "note";
        item.role = "none";
        item.note = noteParts.join(" · ");
      }

      participants[participantIndex] = item;
    });

    steps.push({
      id: crypto.randomUUID(),
      participants
    });
  }
  return steps;
}

function parseCombat(filePath) {
  const rows = readCsv(filePath);
  const lexicon = buildLexiconSets();
  const markers = [];
  rows.forEach((row, idx) => {
    if (row && row[0] && isPhraseMarker(row[0])) {
      markers.push(idx);
    }
  });
  if (markers.length === 0) {
    console.error(`No phrase markers found in ${filePath}`);
    return null;
  }

  const phrases = [];
  const participantsGlobal = [];

  markers.forEach((markerIndex, markerPos) => {
    const headerInfo = findHeaderRow(rows, markerIndex);
    if (!headerInfo) return;
    const { headerIndex, namesIndex } = headerInfo;
    const headerRow = rows[headerIndex] || [];
    const namesRow = rows[namesIndex] || [];

    const groupStarts = headerRow
      .map((cell, idx) => (cell.trim().toLowerCase() === "offensive" ? idx : -1))
      .filter((idx) => idx >= 0);
    if (groupStarts.length === 0) return;

    const groupNames = groupStarts.map((start, idx) => {
      const raw = namesRow[start] || `Combattant ${idx + 1}`;
      return normalizeName(raw) || `Combattant ${idx + 1}`;
    });

    groupNames.forEach((name) => {
      if (!participantsGlobal.includes(name)) {
        participantsGlobal.push(name);
      }
    });

    const groupIndices = groupNames.map((name) => participantsGlobal.indexOf(name));

    const nextMarker = markers[markerPos + 1] ?? rows.length;
    const steps = buildSteps(
      rows,
      headerIndex + 1,
      nextMarker,
      groupStarts,
      groupIndices,
      participantsGlobal,
      lexicon
    );

    const phraseName = (rows[markerIndex]?.[0] || `Phrase ${markerPos + 1}`).trim();
    phrases.push({
      id: crypto.randomUUID(),
      name: phraseName,
      steps
    });
  });

  const participants = participantsGlobal.map((name) => ({ name, weapon: "" }));

  return {
    name: path.basename(filePath, path.extname(filePath)),
    description: "",
    participants,
    phrases,
    type: "classic"
  };
}

function escapeSql(value) {
  return value.replace(/'/g, "''");
}

function buildSql(combats, userEmail) {
  const now = new Date().toISOString();
  const lines = [];
  lines.push("-- Auto-generated import file");
  lines.push(`-- User email: ${userEmail}`);
  lines.push("");

  combats.forEach((combat) => {
    const name = escapeSql(combat.name);
    const description = escapeSql(combat.description || "");
    const participantsJson = escapeSql(JSON.stringify(combat.participants));

    lines.push(`-- Combat: ${combat.name}`);
    lines.push(
      `DELETE FROM combat_phrases WHERE combat_id IN (SELECT id FROM combats WHERE user_id = (SELECT id FROM users WHERE email = '${escapeSql(
        userEmail
      )}') AND name = '${name}');`
    );
    lines.push(
      `DELETE FROM combat_shares WHERE combat_id IN (SELECT id FROM combats WHERE user_id = (SELECT id FROM users WHERE email = '${escapeSql(
        userEmail
      )}') AND name = '${name}');`
    );
    lines.push(
      `DELETE FROM combats WHERE user_id = (SELECT id FROM users WHERE email = '${escapeSql(
        userEmail
      )}') AND name = '${name}';`
    );
    lines.push(
      `INSERT INTO combats (user_id, name, description, participants, draft, type, created_at, updated_at, archived)
       VALUES ((SELECT id FROM users WHERE email = '${escapeSql(
         userEmail
       )}'), '${name}', '${description}', '${participantsJson}', NULL, '${combat.type}', '${now}', '${now}', 0);`
    );

    combat.phrases.forEach((phrase, index) => {
      const payload = escapeSql(JSON.stringify({
        id: phrase.id,
        name: phrase.name,
        steps: phrase.steps
      }));
      lines.push(
        `INSERT INTO combat_phrases (combat_id, position, payload, created_at)
         VALUES ((SELECT id FROM combats WHERE user_id = (SELECT id FROM users WHERE email = '${escapeSql(
           userEmail
         )}') AND name = '${name}' ORDER BY id DESC LIMIT 1), ${index}, '${payload}', '${now}');`
      );
    });

    lines.push("");
  });

  return lines.join("\n");
}

const csvFiles = fs.readdirSync(docDir).filter((file) => file.toLowerCase().endsWith(".csv"));
if (csvFiles.length === 0) {
  console.error("No CSV files found in doc/");
  process.exit(1);
}

const combats = [];
for (const file of csvFiles) {
  const combat = parseCombat(path.join(docDir, file));
  if (combat) combats.push(combat);
}

if (combats.length === 0) {
  console.error("No combats parsed.");
  process.exit(1);
}

const sql = buildSql(combats, email);
fs.writeFileSync(outputFile, sql, "utf-8");

console.log(`Generated ${outputFile}`);
combats.forEach((combat) => {
  console.log(`- ${combat.name}: ${combat.participants.length} participants, ${combat.phrases.length} phrases`);
});
console.log("Run: npx wrangler d1 execute <db> --file db/import-combats.sql --local/--remote");
