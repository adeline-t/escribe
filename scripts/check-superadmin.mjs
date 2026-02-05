import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] || null;
};

const envName = getArg("--env") || process.env.ENV || "prod";
const envMap = {
  local: { db: "escribe-dev", email: "admin@escribe.local", remote: false },
  dev: { db: "escribe-dev", email: "admin@escribe.dev", remote: true },
  prod: { db: "escribe", email: "admin@escribe.prod", remote: true }
};

if (!envMap[envName]) {
  console.error("Env invalide. Utiliser: local | dev | prod.");
  process.exit(1);
}

const { db, email, remote } = envMap[envName];
const command = `SELECT id, email, role, force_reset FROM users WHERE email='${email.replace(/'/g, "''")}';`;

try {
  const execArgs = [
    "wrangler",
    "d1",
    "execute",
    db,
    "--json",
    "--command",
    command
  ];

  if (remote) execArgs.splice(4, 0, "--remote");

  const { stdout } = await exec("npx", execArgs);

  const parsed = JSON.parse(stdout);
  const results = parsed?.[0]?.results ?? [];

  if (!results.length) {
    console.log(`Aucun superadmin trouvé pour ${email} (${envName}).`);
    process.exit(1);
  }

  console.log("Superadmin trouvé:");
  for (const row of results) {
    console.log(`- id: ${row.id}, email: ${row.email}, role: ${row.role}, force_reset: ${row.force_reset}`);
  }
} catch (error) {
  console.error("Erreur lors de la vérification du superadmin.");
  if (error?.stdout) {
    console.error(error.stdout);
  }
  if (error?.stderr) {
    console.error(error.stderr);
  }
  process.exit(1);
}
