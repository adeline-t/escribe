import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const certPath = process.env.DB_CA_CERT_PATH
  ? path.resolve(process.env.DB_CA_CERT_PATH)
  : null;
const ssl = certPath
  ? { ca: fs.readFileSync(certPath, "utf8"), rejectUnauthorized: true }
  : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl
});

try {
  const result = await pool.query("SELECT 1 AS ok");
  console.log("DB connection ok:", result.rows[0]);
  await pool.end();
  process.exit(0);
} catch (error) {
  console.error("DB connection failed:", error);
  await pool.end();
  process.exit(1);
}
