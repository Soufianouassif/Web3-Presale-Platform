import { Router } from "express";
import { db } from "@workspace/db";
import { pageVisits, walletConnections, purchases } from "@workspace/db/schema";

const router = Router();

router.post("/track/visit", async (req, res) => {
  try {
    const { page = "/", visitorId, referrer } = req.body as { page?: string; visitorId?: string; referrer?: string };
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? null;
    const userAgent = req.headers["user-agent"] ?? null;

    await db.insert(pageVisits).values({ page, visitorId, ip, userAgent, referrer });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

router.post("/track/wallet", async (req, res) => {
  try {
    const { walletAddress, walletType, network = "unknown" } = req.body as {
      walletAddress: string;
      walletType: string;
      network?: string;
    };

    if (!walletAddress || !walletType) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? null;
    await db.insert(walletConnections).values({ walletAddress, walletType, network, ip });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

router.post("/track/purchase", async (req, res) => {
  try {
    const { walletAddress, walletType, network, amountUsd, amountTokens, txHash, stage } = req.body as {
      walletAddress: string;
      walletType?: string;
      network: string;
      amountUsd: number;
      amountTokens: number;
      txHash?: string;
      stage?: number;
    };

    if (!walletAddress || !network) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    await db.insert(purchases).values({
      walletAddress,
      walletType,
      network,
      amountUsd: String(amountUsd),
      amountTokens: String(amountTokens),
      txHash,
      stage: stage ?? 1,
    });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

export default router;
