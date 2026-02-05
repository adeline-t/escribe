import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;
const origin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin }));
app.use(express.json({ limit: "1mb" }));

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


app.get("/api/state", async (req, res) => {
  try {
    const result = await pool.query("SELECT state FROM app_state WHERE id = 1");
    const state = result.rows[0]?.state ?? null;
    res.json({ state });
  } catch (error) {
    console.error("Failed to load state", error);
    res.status(500).json({ error: "failed_to_load" });
  }
});

app.post("/api/state", async (req, res) => {
  try {
    const { state } = req.body ?? {};
    if (!state || typeof state !== "object") {
      return res.status(400).json({ error: "invalid_state" });
    }

    await pool.query(
      `
        INSERT INTO app_state (id, state, updated_at)
        VALUES (1, $1, now())
        ON CONFLICT (id)
        DO UPDATE SET state = EXCLUDED.state, updated_at = now();
      `,
      [state]
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error("Failed to save state", error);
    return res.status(500).json({ error: "failed_to_save" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
