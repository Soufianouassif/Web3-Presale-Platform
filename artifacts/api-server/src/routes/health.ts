import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { presaleConfig } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
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
