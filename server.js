import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import locationsRouter from "./routes/locations.js";

// Load environment variables from .env in local/dev
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Mount feature routers on both /api and root so Vercel path stripping still hits routes
app.use(["/api", "/"], authRouter);
app.use(["/api", "/"], locationsRouter);

// Public health checks (no auth)
app.get(["/health", "/api/health"], (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), timestamp: Date.now() });
});

// Start the listener only when not on Vercel
const port = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`API listening on ${port}`));
}

export default app;
