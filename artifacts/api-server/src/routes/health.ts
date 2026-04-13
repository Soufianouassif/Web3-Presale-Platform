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

export default router;
