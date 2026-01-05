import express from "express";
import cors from "cors";
import { Pool } from "pg";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false
});

// Insert location
app.post("/api/locations", async (req, res) => {
  const { device, lat, lon, ts } = req.body || {};
  if (!device || typeof lat !== "number" || typeof lon !== "number") {
    return res.status(400).json({ error: "device, lat, lon required" });
  }
  const timestamp = ts ? new Date(ts) : new Date();
  try {
    await pool.query(
      "INSERT INTO locations (device, lat, lon, ts) VALUES ($1,$2,$3,$4)",
      [device, lat, lon, timestamp]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error("insert error", e);
    res.status(500).json({ error: "db insert failed" });
  }
});

// List recent locations (optionally filter by device, limit)
app.get("/api/locations", async (req, res) => {
  const { device, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit, 10) || 50, 500);
  try {
    const result = device
      ? await pool.query(
          "SELECT device, lat, lon, ts FROM locations WHERE device=$1 ORDER BY ts DESC LIMIT $2",
          [device, lim]
        )
      : await pool.query(
          "SELECT device, lat, lon, ts FROM locations ORDER BY ts DESC LIMIT $1",
          [lim]
        );
    res.json(result.rows);
  } catch (e) {
    console.error("select error", e);
    res.status(500).json({ error: "db select failed" });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API on ${port}`);
});
