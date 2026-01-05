import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const TOKEN_TTL = "7d";

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
}

app.post("/api/auth/register", async (req, res) => {
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
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
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
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.post("/api/locations", requireAuth, async (req, res) => {
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
    console.error(e);
    res.status(500).json({ error: "db insert failed" });
  }
});

app.get("/api/locations", requireAuth, async (req, res) => {
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
    console.error(e);
    res.status(500).json({ error: "db select failed" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), timestamp: Date.now() });
});

const port = process.env.PORT;
app.listen(port, () => console.log(`API listening on ${port}`));
