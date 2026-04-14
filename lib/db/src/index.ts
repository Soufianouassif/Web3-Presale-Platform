import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "";

if (!dbUrl) {
  console.error(
    "[DB] WARNING: DATABASE_URL (or NEON_DATABASE_URL) is not set. " +
    "DB queries will fail. Set it in your environment variables.",
  );
}

const needsSsl = process.env.NODE_ENV === "production" || dbUrl.includes("neon.tech");
const rejectUnauthorized =
  process.env.PG_SSL_REJECT_UNAUTHORIZED !== undefined
    ? process.env.PG_SSL_REJECT_UNAUTHORIZED === "true"
    : false;

export const pool = new Pool({
  connectionString: dbUrl || "postgresql://localhost/placeholder",
  ssl: needsSsl ? { rejectUnauthorized } : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
