import "dotenv/config";
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: {
    ca: process.env.PG_CA_CERT,
    rejectUnauthorized: true
  }
});


// Visibility is good — keep this
pool.on("connect", () => {
  console.log("DB pool connected (SSL verified)");
});

pool.on("error", (err) => {
  console.error("DB pool error:", err);
});

(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("DB connectivity check succeeded");
  } catch (err) {
    console.error("DB connectivity check FAILED:", err);
    process.exit(1);
  }
})();
