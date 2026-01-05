import express from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { signToken } from "../lib/jwt.js";

const router = express.Router();

router.post("/auth/register", async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: "email, password, name required" });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id,email,name",
      [email, hash, name]
    );
    const user = result.rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "email already exists" });
    if (e.code === "ECONNREFUSED" || e.code === "ENOTFOUND") {
      console.error("DB connection error:", e.message);
      return res.status(503).json({ error: "database unavailable" });
    }
    console.error("Register error:", e);
    res.status(500).json({ error: "server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  try {
    const result = await pool.query("SELECT id,email,name,password_hash FROM users WHERE email=$1", [email]);
    if (!result.rowCount) return res.status(401).json({ error: "invalid credentials" });
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });
    res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    if (e.code === "ECONNREFUSED" || e.code === "ENOTFOUND") {
      console.error("DB connection error:", e.message);
      return res.status(503).json({ error: "database unavailable" });
    }
    console.error("Login error:", e);
    res.status(500).json({ error: "server error" });
  }
});

export default router;
