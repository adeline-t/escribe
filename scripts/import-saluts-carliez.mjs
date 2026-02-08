import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const pdfPath = path.resolve("doc/Saluts-CARLIEZ.pdf");
const outputFile = path.resolve("db/import-saluts-carliez.sql");
const vocabOutputFile = path.resolve("doc/saluts-carliez-vocab-manquant.txt");
const lexiconFile = path.resolve("db/lexicon.sql");

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

if (!fs.existsSync(pdfPath)) {
  console.error(`PDF not found at ${pdfPath}`);
  process.exit(1);
}

function extractText() {
  const python = path.resolve(".venv/bin/python");
  if (!fs.existsSync(python)) {
    console.error("Missing .venv/bin/python. Create a venv and install pypdf.");
    process.exit(1);
  }
  const script = [
    "from pathlib import Path",
    "from pypdf import PdfReader",
    "import re",
    "pdf = Path(r'" + pdfPath.replace(/'/g, "\\'") + "')",
    "text = ''",
    "reader = PdfReader(str(pdf))",
    "",
    "for page in reader.pages:",
    "    t = page.extract_text() or ''",
    "    text += '\\n' + t",
    "",
    "text = text.replace('\\r', '\\n')",
    "text = re.sub(r'\\n+', '\\n', text)",
    "print(text)",
  ].join("\n");
  return execFileSync(python, ["-c", script], { encoding: "utf-8" });
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

function extractLexiconLabels() {
  if (!fs.existsSync(lexiconFile)) return [];
  const raw = fs.readFileSync(lexiconFile, "utf-8");
  const labels = [];
  const regex = /INSERT INTO [^(]+\\(label\\) VALUES \\('([^']*)'\\);/g;
  let match;
  while ((match = regex.exec(raw))) {
    labels.push(match[1]);
  }
  return labels;
}

function splitSaluts(text) {
  let chunk = text;
  const match = chunk.match(/SALUTS D[’']?EPOQUE/i);
  if (match) {
    chunk = chunk.slice(match.index);
  }
  const lines = chunk
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks = [];
  const prelude = [];
  let current = null;
  for (const line of lines) {
    if (/^Salut\b/i.test(line)) {
      if (!current && prelude.length) {
        blocks.push({ title: "", lines: prelude.slice() });
        prelude.length = 0;
      }
      if (current) blocks.push(current);
      current = { title: line, lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      prelude.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function mergeContinuation(lines) {
  const merged = [];
  const isNew = (line) => /^([0-9]+\/?[0-9]*-)|^[ab]\)/i.test(line);

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

  return merged.map(normalizeWhitespace);
}

function parseSaluts(text) {
  const blocks = splitSaluts(text);
  const saluts = [];
  const hasStepLike = (line) => /^([0-9]+\/?[0-9]*-)|^[ab]\)/i.test(line);

  for (const block of blocks) {
    const titleLine = normalizeWhitespace(block.title || "");
    const titleMatch = titleLine.match(
      /^(Salut\s+[^:]+)(?:\s*:\s*(\d+\s*temps))?/i,
    );
    const baseName = titleMatch
      ? normalizeWhitespace(titleMatch[1])
      : titleLine;
    const temps = titleMatch?.[2] ? titleMatch[2].trim() : "";
    const name = temps ? `${baseName} (${temps})` : baseName;

    const cleaned = block.lines
      .filter((line) => !/^SALUTS D/i.test(line))
      .filter((line) => (!/^a\)/i.test(line) ? true : true))
      .filter((line) => (!/^b\)/i.test(line) ? true : true));

    const merged = mergeContinuation(cleaned);
    const steps = merged
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/\s*;\s*$/, "").trim())
      .map((line) => {
        const normalized = line.replace(/^a\)\s*/i, "").trim();
        if (/^Position générale/i.test(normalized)) {
          return `Note — ${normalized.replace(/\s*:\s*/g, " : ")}`;
        }
        return line;
      });

    if (steps.length) {
      if (!name) {
        const hasSteps = steps.some((line) => hasStepLike(line));
        if (!hasSteps) {
          continue;
        }
      }
      saluts.push({ name, steps });
    }
  }

  return saluts;
}

function buildMissingVocabulary(saluts) {
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
    "note",
  ]);

  const missing = new Set();
  for (const salut of saluts) {
    for (const step of salut.steps) {
      const normalized = normalizeToken(step);
      if (!normalized) continue;
      for (const word of normalized.split(" ")) {
        if (!word || word.length < 3) continue;
        if (word.endsWith("-") || word.startsWith("-")) continue;
        if (/\d/.test(word)) continue;
        if (stop.has(word)) continue;
        if (lexiconWords.has(word)) continue;
        missing.add(word);
      }
    }
  }
  return Array.from(missing).sort((a, b) => a.localeCompare(b));
}

function buildSql(saluts) {
  const now = new Date().toISOString();
  const lines = [];
  for (const salut of saluts) {
    const participants = JSON.stringify([{ name: "A", weapon: "" }]);
    const phrase = {
      id: crypto.randomUUID(),
      name: "Phrase 1",
      steps: salut.steps.map((step) => ({
        id: crypto.randomUUID(),
        participants: [
          {
            mode: "note",
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
            note: step,
            noteOverrides: true,
          },
        ],
      })),
    };
    const payload = JSON.stringify(phrase).replace(/'/g, "''");
    const name = salut.name.replace(/'/g, "''");
    const description = "Saluts - source Maître CARLIEZ".replace(/'/g, "''");
    lines.push(
      `INSERT INTO combats (user_id, name, description, participants, draft, type, created_at, updated_at, archived) VALUES ((SELECT id FROM users WHERE email = '${email}'), '${name}', '${description}', '${participants}', NULL, 'classic', '${now}', '${now}', 0);`,
    );
    lines.push(
      `INSERT INTO combat_phrases (combat_id, position, payload, created_at) VALUES (last_insert_rowid(), 0, '${payload}', '${now}');`,
    );
  }
  return lines.join("\n");
}

const raw = extractText();
const saluts = parseSaluts(raw);
if (!saluts.length) {
  console.error("No saluts found in PDF.");
  process.exit(1);
}

fs.writeFileSync(outputFile, buildSql(saluts), "utf-8");
const missing = buildMissingVocabulary(saluts);
const vocabText = [
  "Vocabulaire manquant (Saluts - CARLIEZ)",
  `Total: ${missing.length}`,
  "",
  ...missing,
].join("\n");
fs.writeFileSync(vocabOutputFile, vocabText, "utf-8");
console.log(`Generated ${saluts.length} saluts -> ${outputFile}`);
console.log(`Missing vocabulary -> ${vocabOutputFile}`);
