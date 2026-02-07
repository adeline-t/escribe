import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const sourceFile = path.resolve("doc/enchainements-carliez.txt");
const outputFile = path.resolve("db/import-enchainements-carliez.sql");
const vocabOutputFile = path.resolve("doc/enchainements-carliez-vocab-manquant.txt");
const lexiconFile = path.resolve("db/lexicon.sql");
const lexiconJsonFile = path.resolve("frontend/src/data/lexicon.json");

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

if (!fs.existsSync(sourceFile)) {
  console.error(`Source not found at ${sourceFile}`);
  process.exit(1);
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeToken(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9'’ -]/g, " ")
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function loadLexicon() {
  if (!fs.existsSync(lexiconJsonFile)) return null;
  return JSON.parse(fs.readFileSync(lexiconJsonFile, "utf-8"));
}

function buildMatcher(list = []) {
  const sorted = [...list].sort((a, b) => b.length - a.length);
  const normalized = sorted.map((item) => [item, normalizeToken(item)]);
  return (text) => {
    const hay = normalizeToken(text);
    for (const [label, needle] of normalized) {
      if (!needle) continue;
      if (hay.includes(needle)) return label;
    }
    return "";
  };
}

function parseParticipant(text, role, lexicon) {
  if (!text) {
    return {
      mode: "note",
      role,
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
      noteOverrides: true
    };
  }

  const trimmed = normalizeWhitespace(text.replace(/^-\s*/, ""));
  if (!trimmed || trimmed === "-") {
    return {
      mode: "note",
      role,
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
      noteOverrides: true
    };
  }

  const noteChunks = [];
  const noteMatch = trimmed.match(/note\s*:\s*(.*)/i);
  if (noteMatch) {
    noteChunks.push(noteMatch[1].trim());
  }
  const cleaned = trimmed.replace(/note\s*:\s*[^-]+/gi, "").trim();
  const tokenSource = cleaned || trimmed;
  const matchOffensive = buildMatcher(lexicon.offensive || []);
  const matchAction = buildMatcher(lexicon.action || []);
  const matchTarget = buildMatcher(lexicon.cible || []);
  const matchAttackMove = buildMatcher(lexicon["deplacement-attaque"] || []);
  const matchDefenseMove = buildMatcher(lexicon["deplacement-defense"] || []);
  const matchDefense = buildMatcher(lexicon.defensive || []);
  const matchAttackAttr = buildMatcher(lexicon["attaque-attribut"] || []);

  let offensive = role === "attack" ? matchOffensive(tokenSource) : "";
  let action = role === "attack" ? matchAction(tokenSource) : "";
  let target = role === "attack" ? matchTarget(tokenSource) : "";
  let attackMove = role === "attack" ? matchAttackMove(tokenSource) : "";
  let attackAttribute = role === "attack" ? [matchAttackAttr(tokenSource)].filter(Boolean) : [];

  let defense = role === "defense" ? matchDefense(tokenSource) : "";
  let paradeNumber = "";
  let paradeAttribute = "";
  const defenseMove = role === "defense" ? matchDefenseMove(tokenSource) : "";

  if (role === "defense") {
    const paradeMatch = tokenSource.match(/parade[s]?\s*(?:de\s*)?(\d)/i);
    const contreMatch = tokenSource.match(/contre\s*de\s*(\d)/i);
    if (paradeMatch) paradeNumber = paradeMatch[1];
    if (!paradeNumber && contreMatch) paradeNumber = contreMatch[1];
    if (!defense && /parade/i.test(tokenSource)) defense = "parade";
    if (!defense && /esquive/i.test(tokenSource)) {
      if (/arrière|arriere/i.test(tokenSource)) defense = "esquive arrière";
      else if (/basse/i.test(tokenSource)) defense = "esquive basse";
      else if (/saut/i.test(tokenSource)) defense = "esquive en sautant";
      else if (/côté|cote|latéral|lateral/i.test(tokenSource)) defense = "esquive latérale intérieure";
    }
    if (/haute|haut/i.test(tokenSource)) paradeAttribute = "haut";
    if (/basse|bas/i.test(tokenSource)) paradeAttribute = "bas";
  }

  if (role === "none") {
    if (/attaque/i.test(tokenSource)) role = "attack";
    if (/parade|esquive|riposte/i.test(tokenSource)) role = "defense";
    if (role === "attack") {
      offensive = matchOffensive(tokenSource);
      action = matchAction(tokenSource);
      target = matchTarget(tokenSource);
      attackMove = matchAttackMove(tokenSource);
      attackAttribute = [matchAttackAttr(tokenSource)].filter(Boolean);
    }
    if (role === "defense") {
      defense = matchDefense(tokenSource);
      const paradeMatch = tokenSource.match(/parade[s]?\s*(?:de\s*)?(\d)/i);
      if (paradeMatch) paradeNumber = paradeMatch[1];
      if (!defense && /parade/i.test(tokenSource)) defense = "parade";
    }
  }

  const hasStructured =
    offensive ||
    action ||
    target ||
    attackMove ||
    attackAttribute.length ||
    defense ||
    paradeNumber ||
    paradeAttribute ||
    defenseMove;

  return {
    mode: "note",
    role,
    offensive,
    action,
    target,
    attackMove,
    attackAttribute,
    defense,
    paradeNumber,
    paradeAttribute,
    defendMove: defenseMove,
    chorePhase: "",
    note: noteChunks.length ? noteChunks.join(" · ") : trimmed,
    noteOverrides: !hasStructured
  };
}

function extractLexiconLabels() {
  if (!fs.existsSync(lexiconFile)) return [];
  const raw = fs.readFileSync(lexiconFile, "utf-8");
  const labels = [];
  const regex = /INSERT INTO [^(]+\(label\) VALUES \('([^']*)'\);/g;
  let match;
  while ((match = regex.exec(raw))) {
    labels.push(match[1]);
  }
  return labels;
}

function splitSections(text) {
  const lines = text.split("\n");
  const sections = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const headerMatch = line.match(/^#{0,3}\s*(Premier|Second|Troisi[eè]me|Quatri[eè]me|Cinqui[eè]me)\s+encha[iî]nement\s*:?/i);
    if (headerMatch) {
      if (current) sections.push(current);
      current = { title: headerMatch[1] ? `${headerMatch[1]} enchaînement` : headerMatch[0].replace(/\s*:/, ""), lines: [] };
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) continue;
    if (/^Voici tous les combats/i.test(line)) continue;
    if (!current) {
      current = { title: "Enchaînement", lines: [] };
    }
    current.lines.push(line);
  }
  if (current) sections.push(current);
  return sections;
}

function mergeContinuation(lines) {
  const merged = [];
  const isNew = (line) =>
    /^\d+\s*[-–]/.test(line) ||
    /^\d+\s*\//.test(line) ||
    /^\*{0,2}\d+\*{0,2}\s*[-–]/.test(line);
  for (const line of lines) {
    if (!line) continue;
    if (isNew(line)) {
      merged.push(line);
    } else if (merged.length) {
      merged[merged.length - 1] += " " + line;
    } else {
      merged.push(line);
    }
  }
  return merged.map((line) => normalizeWhitespace(line));
}

function splitArrow(line) {
  const arrowMatch = line.match(/(.*?)(<-+|<------|<------|<---------|<--------|<-------|<------|<-----|<----|<---|<--|<-)\s*(.*)/);
  const rightMatch = line.match(/(.*?)(-+>|----->|------->|--------->|---------->|----->|---->|-->|->)\s*(.*)/);

  if (rightMatch) {
    return { left: rightMatch[1].trim(), arrow: "right", right: rightMatch[3].trim() };
  }
  if (arrowMatch) {
    return { left: arrowMatch[1].trim(), arrow: "left", right: arrowMatch[3].trim() };
  }
  return { left: line.trim(), arrow: null, right: "" };
}

function parseStructuredLine(line) {
  const cleaned = line.replace(/^\*{1,2}\s*\d+\s*\*{1,2}\s*-\s*/, "").trim();
  const parts = cleaned.split(" / ").map((part) => part.trim());
  if (parts.length >= 4 && /^A$/i.test(parts[0]) && /^B$/i.test(parts[2])) {
    return { a: parts[1], b: parts[3] };
  }
  return { a: cleaned, b: "" };
}

function parseSteps(lines) {
  const merged = mergeContinuation(lines);
  const steps = [];

  for (const line of merged) {
    if (/^\*{0,2}\d+\*{0,2}\s*[-–]/.test(line)) {
      const parsed = parseStructuredLine(line);
      steps.push({ a: parsed.a, b: parsed.b, roleA: "none", roleB: "none" });
      continue;
    }

    const { left, arrow, right } = splitArrow(line);
    if (arrow === "right") {
      steps.push({ a: left, b: right, roleA: "attack", roleB: "defense" });
    } else if (arrow === "left") {
      steps.push({ a: right, b: left, roleA: "defense", roleB: "attack" });
    } else {
      steps.push({ a: left, b: "", roleA: "none", roleB: "none" });
    }
  }

  return steps.filter((step) => step.a || step.b);
}

function buildCombats(text) {
  const sections = splitSections(text);
  return sections.map((section) => {
    const steps = parseSteps(section.lines);
    return {
      name: section.title,
      steps
    };
  });
}

function buildSql(combats) {
  const now = new Date().toISOString();
  const lines = [];
  const lexicon = loadLexicon() || {};

  for (const combat of combats) {
    const participants = JSON.stringify([
      { name: "A", weapon: "" },
      { name: "B", weapon: "" }
    ]);

    const phrase = {
      id: crypto.randomUUID(),
      name: "Phrase 1",
      steps: combat.steps.map((step) => {
        const participantA = parseParticipant(step.a, step.roleA, lexicon);
        const participantB = parseParticipant(step.b, step.roleB, lexicon);
        return {
          id: crypto.randomUUID(),
          participants: [participantA, participantB]
        };
      })
    };

    const payload = JSON.stringify(phrase).replace(/'/g, "''");
    const name = combat.name.replace(/'/g, "''");
    const description = "Enchaînements - source CARLIEZ".replace(/'/g, "''");

    lines.push(
      `INSERT INTO combats (user_id, name, description, participants, draft, type, created_at, updated_at, archived) VALUES ((SELECT id FROM users WHERE email = '${email}'), '${name}', '${description}', '${participants}', NULL, 'classic', '${now}', '${now}', 0);`
    );
    lines.push(
      `INSERT INTO combat_phrases (combat_id, position, payload, created_at) VALUES (last_insert_rowid(), 0, '${payload}', '${now}');`
    );
  }

  return lines.join("\n");
}

function buildMissingVocabulary(combats) {
  const labels = extractLexiconLabels();
  const lexiconWords = new Set();
  for (const label of labels) {
    const normalized = normalizeToken(label);
    if (!normalized) continue;
    for (const word of normalized.split(" ")) {
      if (word.length > 1) lexiconWords.add(word);
    }
  }

  const stop = new Set([
    "a",
    "au",
    "aux",
    "avec",
    "avant",
    "apres",
    "arriere",
    "arme",
    "armes",
    "bras",
    "de",
    "des",
    "du",
    "en",
    "et",
    "la",
    "le",
    "les",
    "l",
    "main",
    "mains",
    "non",
    "par",
    "pied",
    "pieds",
    "pointe",
    "puis",
    "sur",
    "un",
    "une",
    "vers",
    "note"
  ]);

  const missing = new Set();
  for (const combat of combats) {
    for (const step of combat.steps) {
      const combined = [step.a, step.b].filter(Boolean).join(" ");
      const normalized = normalizeToken(combined);
      if (!normalized) continue;
      for (const word of normalized.split(" ")) {
        if (!word || word.length < 3) continue;
        if (/\d/.test(word)) continue;
        if (word.endsWith("-") || word.startsWith("-")) continue;
        if (stop.has(word)) continue;
        if (lexiconWords.has(word)) continue;
        missing.add(word);
      }
    }
  }

  return Array.from(missing).sort((a, b) => a.localeCompare(b));
}

const raw = fs.readFileSync(sourceFile, "utf-8");
const combats = buildCombats(raw);
if (!combats.length) {
  console.error("No enchaînements found.");
  process.exit(1);
}

fs.writeFileSync(outputFile, buildSql(combats), "utf-8");
const missing = buildMissingVocabulary(combats);
const vocabText = [
  "Vocabulaire manquant (Enchaînements - CARLIEZ)",
  `Total: ${missing.length}`,
  "",
  ...missing
].join("\n");
fs.writeFileSync(vocabOutputFile, vocabText, "utf-8");

console.log(`Generated ${combats.length} combats -> ${outputFile}`);
console.log(`Missing vocabulary -> ${vocabOutputFile}`);
