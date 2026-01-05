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

// When running locally, start the listener. On Vercel we just export the app.
// Allow forcing a listener even if VERCEL is present via FORCE_LISTEN=true.
const port = process.env.PORT || 3000;
if (!process.env.VERCEL || process.env.FORCE_LISTEN === "true") {
  app.listen(port, () => console.log(`API listening on ${port}`));
}

export default app;
