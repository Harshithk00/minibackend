import { verifyToken } from "../lib/jwt.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing token" });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
}

export default requireAuth;
