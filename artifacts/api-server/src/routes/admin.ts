import { Router } from "express";
import { db } from "@workspace/db";
import { pageVisits, walletConnections, purchases, presaleConfig, adminUsers } from "@workspace/db/schema";
import { desc, sql, eq, count } from "drizzle-orm";
import { requireAdminAuth } from "../middleware/admin-auth.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/admin/stats", async (_req, res) => {
  try {
    const [totalVisits] = await db.select({ count: count() }).from(pageVisits);
    const [uniqueVisitors] = await db
      .select({ count: sql<number>`count(distinct ${pageVisits.visitorId})` })
      .from(pageVisits)
      .where(sql`${pageVisits.visitorId} is not null`);
    const [totalWallets] = await db.select({ count: count() }).from(walletConnections);
    const [uniqueWallets] = await db
      .select({ count: sql<number>`count(distinct ${walletConnections.walletAddress})` })
      .from(walletConnections);
    const [totalBuyers] = await db
      .select({ count: sql<number>`count(distinct ${purchases.walletAddress})` })
      .from(purchases);
    const [totalPurchases] = await db.select({ count: count() }).from(purchases);
    const [totalRaised] = await db
      .select({ total: sql<number>`coalesce(sum(${purchases.amountUsd}), 0)` })
      .from(purchases);

    const networkBreakdown = await db
      .select({
        network: purchases.network,
        count: count(),
        totalUsd: sql<number>`coalesce(sum(${purchases.amountUsd}), 0)`,
      })
      .from(purchases)
      .groupBy(purchases.network)
      .orderBy(desc(sql`count(*)`));

    const walletTypeBreakdown = await db
      .select({
        walletType: walletConnections.walletType,
        count: count(),
      })
      .from(walletConnections)
      .groupBy(walletConnections.walletType)
      .orderBy(desc(sql`count(*)`));

    const topPages = await db
      .select({
        page: pageVisits.page,
        count: count(),
      })
      .from(pageVisits)
      .groupBy(pageVisits.page)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const recentActivity = await db
      .select()
      .from(purchases)
      .orderBy(desc(purchases.createdAt))
      .limit(5);

    const [config] = await db.select().from(presaleConfig).where(eq(presaleConfig.id, 1)).limit(1);

    res.json({
      visits: {
        total: Number(totalVisits.count),
        unique: Number(uniqueVisitors.count),
      },
      wallets: {
        total: Number(totalWallets.count),
        unique: Number(uniqueWallets.count),
      },
      buyers: {
        unique: Number(totalBuyers.count),
        total: Number(totalPurchases.count),
      },
      revenue: {
        totalUsd: Number(totalRaised.total),
      },
      networkBreakdown: networkBreakdown.map((n) => ({
        network: n.network,
        count: Number(n.count),
        totalUsd: Number(n.totalUsd),
      })),
      walletTypeBreakdown: walletTypeBreakdown.map((w) => ({
        walletType: w.walletType,
        count: Number(w.count),
      })),
      topPages,
      recentActivity,
      presaleConfig: config ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/admin/buyers", async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);
    const offset = (page - 1) * limit;

    const buyers = await db
      .select({
        walletAddress: purchases.walletAddress,
        walletType: purchases.walletType,
        network: purchases.network,
        totalUsd: sql<number>`sum(${purchases.amountUsd})`,
        totalTokens: sql<number>`sum(${purchases.amountTokens})`,
        purchaseCount: count(),
        lastPurchase: sql<string>`max(${purchases.createdAt})`,
      })
      .from(purchases)
      .groupBy(purchases.walletAddress, purchases.walletType, purchases.network)
      .orderBy(desc(sql`sum(${purchases.amountUsd})`))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(distinct ${purchases.walletAddress})` })
      .from(purchases);

    res.json({
      buyers: buyers.map((b) => ({
        ...b,
        totalUsd: Number(b.totalUsd),
        totalTokens: Number(b.totalTokens),
        purchaseCount: Number(b.purchaseCount),
      })),
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch buyers" });
  }
});

router.get("/admin/config", async (_req, res) => {
  try {
    const [config] = await db.select().from(presaleConfig).where(eq(presaleConfig.id, 1)).limit(1);
    res.json(config ?? null);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

router.post("/admin/presale/pause", async (_req, res) => {
  try {
    await db.update(presaleConfig).set({ isActive: false, updatedAt: new Date() }).where(eq(presaleConfig.id, 1));
    res.json({ success: true, message: "Presale paused" });
  } catch {
    res.status(500).json({ error: "Failed to pause presale" });
  }
});

router.post("/admin/presale/resume", async (_req, res) => {
  try {
    await db.update(presaleConfig).set({ isActive: true, updatedAt: new Date() }).where(eq(presaleConfig.id, 1));
    res.json({ success: true, message: "Presale resumed" });
  } catch {
    res.status(500).json({ error: "Failed to resume presale" });
  }
});

router.post("/admin/presale/claim", async (req, res) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    await db.update(presaleConfig).set({ claimEnabled: enabled, updatedAt: new Date() }).where(eq(presaleConfig.id, 1));
    res.json({ success: true, message: `Claim ${enabled ? "enabled" : "disabled"}` });
  } catch {
    res.status(500).json({ error: "Failed to update claim status" });
  }
});

router.post("/admin/presale/staking", async (req, res) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    await db.update(presaleConfig).set({ stakingEnabled: enabled, updatedAt: new Date() }).where(eq(presaleConfig.id, 1));
    res.json({ success: true, message: `Staking ${enabled ? "enabled" : "disabled"}` });
  } catch {
    res.status(500).json({ error: "Failed to update staking status" });
  }
});

router.post("/admin/presale/withdraw", async (_req, res) => {
  try {
    res.json({
      success: true,
      message: "Withdrawal initiated. Please complete the transaction on-chain.",
      note: "This is a record-keeping action. Execute the actual withdrawal via your Solana/EVM wallet.",
    });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/admin/users", async (_req, res) => {
  try {
    const users = await db.select().from(adminUsers).orderBy(desc(adminUsers.lastLogin));
    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed to fetch admin users" });
  }
});

export default router;
