import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.post("/locations", requireAuth, async (req, res) => {
  const { device, lat, lon, ts } = req.body || {};
  if (!device || typeof lat !== "number" || typeof lon !== "number") {
    return res.status(400).json({ error: "device, lat, lon required" });
  }
  const when = ts ? new Date(ts) : new Date();
  try {
    await pool.query(
      "INSERT INTO locations (user_id, device, lat, lon, ts) VALUES ($1,$2,$3,$4,$5)",
      [req.user.sub, device, lat, lon, when]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === "ECONNREFUSED" || e.code === "ENOTFOUND") {
      console.error("DB connection error:", e.message);
      return res.status(503).json({ error: "database unavailable" });
    }
    console.error("Insert location error:", e);
    res.status(500).json({ error: "db insert failed" });
  }
});

router.get("/locations", requireAuth, async (req, res) => {
  const { device, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit, 10) || 50, 500);
  try {
    const result = device
      ? await pool.query(
          "SELECT device, lat, lon, ts FROM locations WHERE user_id=$1 AND device=$2 ORDER BY ts DESC LIMIT $3",
          [req.user.sub, device, lim]
        )
      : await pool.query(
          "SELECT device, lat, lon, ts FROM locations WHERE user_id=$1 ORDER BY ts DESC LIMIT $2",
          [req.user.sub, lim]
        );
    res.json(result.rows);
  } catch (e) {
    if (e.code === "ECONNREFUSED" || e.code === "ENOTFOUND") {
      console.error("DB connection error:", e.message);
      return res.status(503).json({ error: "database unavailable" });
    }
    console.error("Get locations error:", e);
    res.status(500).json({ error: "db select failed" });
  }
});

export default router;
