import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// [v0] Debug: Check environment variables
console.log("[v0] SUPABASE_DATABASE_URL exists:", !!process.env.SUPABASE_DATABASE_URL);
console.log("[v0] DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("[v0] All env keys:", Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("SUPABASE")).join(", "));

const connectionString = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.SUPABASE_DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
