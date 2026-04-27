import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { presaleConfig } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/env-check", (_req, res) => {
  res.json({
    NODE_ENV:            process.env.NODE_ENV ?? "NOT SET",
    DATABASE_URL:        process.env.DATABASE_URL        ? "SET ✓" : "MISSING ✗",
    NEON_DATABASE_URL:   process.env.NEON_DATABASE_URL   ? "SET ✓" : "MISSING ✗",
    SESSION_SECRET:      process.env.SESSION_SECRET      ? "SET ✓" : "MISSING ✗",
    GOOGLE_CLIENT_ID:    process.env.GOOGLE_CLIENT_ID    ? "SET ✓" : "MISSING ✗",
    GOOGLE_CLIENT_SECRET:process.env.GOOGLE_CLIENT_SECRET? "SET ✓" : "MISSING ✗",
    ADMIN_EMAILS:        process.env.ADMIN_EMAILS        ? "SET ✓" : "MISSING ✗",
    ADMIN_KEYPAIR_JSON:  process.env.ADMIN_KEYPAIR_JSON  ? "SET ✓" : "MISSING ✗",
  });
});

// ── DB keep-alive: called by Vercel Cron to prevent Neon from suspending ──────
router.get("/db-ping", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers["authorization"];

  if (secret && auth !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    await db.execute(sql`SELECT 1`);
    logger.info("DB_PING: Neon keep-alive OK");
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "DB_PING: failed");
    res.status(503).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/presale/config", async (_req, res) => {
  try {
    const [config] = await db
      .select({
        isActive: presaleConfig.isActive,
        claimEnabled: presaleConfig.claimEnabled,
        stakingEnabled: presaleConfig.stakingEnabled,
        currentStage: presaleConfig.currentStage,
      })
      .from(presaleConfig)
      .where(eq(presaleConfig.id, 1))
      .limit(1);
    res.json(config ?? { isActive: true, claimEnabled: false, stakingEnabled: false, currentStage: 1 });
  } catch {
    res.json({ isActive: true, claimEnabled: false, stakingEnabled: false, currentStage: 1 });
  }
});

// ── Presale version — monotonic signal for frontend to detect resets ──────────
router.get("/presale/version", async (_req, res) => {
  try {
    const [row] = await db
      .select({ updatedAt: presaleConfig.updatedAt })
      .from(presaleConfig)
      .where(eq(presaleConfig.id, 1))
      .limit(1);
    res.json({ version: row?.updatedAt?.toISOString() ?? null });
  } catch {
    res.json({ version: null });
  }
});

export default router;
