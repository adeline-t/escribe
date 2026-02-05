import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { webcrypto as crypto } from "node:crypto";

const exec = promisify(execFile);

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] || null;
};

const email = getArg("--email") || process.env.ADMIN_EMAIL || "";
const role = getArg("--role") || "admin";
const password = getArg("--password") || "";

if (!email) {
  console.error("Email requis. Ex: --email admin@domaine.tld");
  process.exit(1);
}

if (!password) {
  console.error("Mot de passe requis. Ex: --password " + "'" + "motdepasse'" + "");
  process.exit(1);
}

if (!['admin', 'superadmin'].includes(role)) {
  console.error("Role invalide. Utiliser 'admin' ou 'superadmin'.");
  process.exit(1);
}

const encoder = new TextEncoder();
const PBKDF2_ITERATIONS = 80000;

function toBase64(buffer) {
  return Buffer.from(buffer).toString("base64");
}

async function hashPassword(passwordValue) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(passwordValue), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    key,
    256
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

const passwordHash = await hashPassword(password);
const now = new Date().toISOString();

const safeEmail = email.replace(/'/g, "''");
const safeHash = passwordHash.replace(/'/g, "''");
const sql = `INSERT INTO users (email, password_hash, role, force_reset, created_at, updated_at)
VALUES ('${safeEmail}', '${safeHash}', '${role}', 1, '${now}', '${now}')
ON CONFLICT(email) DO UPDATE SET
  password_hash = excluded.password_hash,
  role = excluded.role,
  force_reset = 1,
  updated_at = excluded.updated_at;`;

try {
  const { stdout } = await exec("npx", [
    "wrangler",
    "d1",
    "execute",
    "escribe",
    "--remote",
    "--command",
    sql
  ]);
  console.log("Commande exécutée. Si l'utilisateur existait déjà, aucun changement.");
  if (stdout) console.log(stdout.trim());
} catch (error) {
  console.error("Erreur lors de la création de l'utilisateur.");
  if (error?.stdout) console.error(error.stdout);
  if (error?.stderr) console.error(error.stderr);
  process.exit(1);
}
