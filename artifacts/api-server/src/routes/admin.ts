import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { pageVisits, walletConnections, purchases, presaleConfig, adminUsers, referralCodes, referrals } from "@workspace/db/schema";
import { desc, sql, eq, count } from "drizzle-orm";
import { requireAdminAuth } from "../middleware/admin-auth.js";
import { logger } from "../lib/logger.js";

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// ── Rate limiter for all admin routes (30 requests / 5 minutes) ───────────
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests, slow down" },
});

// ── Audit log helper ──────────────────────────────────────────────────────
function auditLog(
  req: import("express").Request,
  action: string,
  details?: Record<string, unknown>,
) {
  const userId = req.session?.userId ?? "unknown";
  const userEmail = req.session?.userEmail ?? "unknown";
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    ?? req.socket?.remoteAddress ?? "unknown";
  logger.info({ audit: true, action, userId, userEmail, ip, ...details }, `ADMIN_ACTION: ${action}`);
}

const router = Router();

router.use(requireAdminAuth);
router.use(adminLimiter);

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

    const [totalReferrers] = await db.select({ count: count() }).from(referralCodes).where(sql`${referralCodes.totalReferrals} > 0`);
    const [totalReferrals] = await db.select({ count: count() }).from(referrals);
    const [pendingRewards] = await db
      .select({ total: sql<number>`coalesce(sum(${referrals.rewardTokens}), 0)` })
      .from(referrals)
      .where(eq(referrals.status, "pending"));
    const [paidRewards] = await db
      .select({ total: sql<number>`coalesce(sum(${referrals.rewardTokens}), 0)` })
      .from(referrals)
      .where(eq(referrals.status, "paid"));

    const topReferrers = await db
      .select({
        walletAddress: referralCodes.walletAddress,
        code: referralCodes.code,
        totalReferrals: referralCodes.totalReferrals,
        totalRewardTokens: referralCodes.totalRewardTokens,
        totalRewardUsd: referralCodes.totalRewardUsd,
      })
      .from(referralCodes)
      .where(sql`${referralCodes.totalReferrals} > 0`)
      .orderBy(desc(referralCodes.totalRewardTokens))
      .limit(10);

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
      referrals: {
        totalReferrers: Number(totalReferrers.count),
        totalReferrals: Number(totalReferrals.count),
        pendingRewardTokens: Number(pendingRewards.total),
        paidRewardTokens: Number(paidRewards.total),
        topReferrers: topReferrers.map((r) => ({
          walletAddress: r.walletAddress,
          code: r.code,
          totalReferrals: Number(r.totalReferrals),
          totalRewardTokens: Number(r.totalRewardTokens),
          totalRewardUsd: Number(r.totalRewardUsd),
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/admin/buyers", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50) || 50));
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

router.post("/admin/presale/pause", async (req, res) => {
  try {
    await db.insert(presaleConfig)
      .values({ id: 1, isActive: false, updatedAt: new Date() })
      .onConflictDoUpdate({ target: presaleConfig.id, set: { isActive: false, updatedAt: new Date() } });
    auditLog(req, "presale.pause");
    res.json({ success: true, message: "Presale paused successfully" });
  } catch (err) {
    logger.error({ err }, "presale pause error");
    res.status(500).json({ success: false, message: "Failed to pause presale" });
  }
});

router.post("/admin/presale/resume", async (req, res) => {
  try {
    await db.insert(presaleConfig)
      .values({ id: 1, isActive: true, updatedAt: new Date() })
      .onConflictDoUpdate({ target: presaleConfig.id, set: { isActive: true, updatedAt: new Date() } });
    auditLog(req, "presale.resume");
    res.json({ success: true, message: "Presale resumed successfully" });
  } catch (err) {
    logger.error({ err }, "presale resume error");
    res.status(500).json({ success: false, message: "Failed to resume presale" });
  }
});

router.post("/admin/presale/claim", async (req, res) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    if (typeof enabled !== "boolean") {
      res.status(400).json({ success: false, message: "enabled must be a boolean" });
      return;
    }
    await db.insert(presaleConfig)
      .values({ id: 1, claimEnabled: enabled, updatedAt: new Date() })
      .onConflictDoUpdate({ target: presaleConfig.id, set: { claimEnabled: enabled, updatedAt: new Date() } });
    auditLog(req, "presale.claim_toggle", { enabled });
    res.json({ success: true, message: `Claim ${enabled ? "enabled" : "disabled"} successfully` });
  } catch (err) {
    logger.error({ err }, "presale claim error");
    res.status(500).json({ success: false, message: "Failed to update claim status" });
  }
});

router.post("/admin/presale/staking", async (req, res) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    if (typeof enabled !== "boolean") {
      res.status(400).json({ success: false, message: "enabled must be a boolean" });
      return;
    }
    await db.insert(presaleConfig)
      .values({ id: 1, stakingEnabled: enabled, updatedAt: new Date() })
      .onConflictDoUpdate({ target: presaleConfig.id, set: { stakingEnabled: enabled, updatedAt: new Date() } });
    auditLog(req, "presale.staking_toggle", { enabled });
    res.json({ success: true, message: `Staking ${enabled ? "enabled" : "disabled"} successfully` });
  } catch (err) {
    logger.error({ err }, "presale staking error");
    res.status(500).json({ success: false, message: "Failed to update staking status" });
  }
});

router.post("/admin/presale/withdraw", async (req, res) => {
  auditLog(req, "presale.withdraw_initiated");
  res.json({
    success: true,
    message: "Withdrawal initiated. Please complete the transaction on-chain.",
    note: "This is a record-keeping action. Execute the actual withdrawal via your Solana/EVM wallet.",
  });
});

router.get("/admin/referrals", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50) || 50));
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string | undefined;

    const whereClause = statusFilter && ["pending", "paid"].includes(statusFilter)
      ? eq(referrals.status, statusFilter)
      : undefined;

    const rows = whereClause
      ? await db
          .select({
            id: referrals.id,
            referrerWallet: referrals.referrerWallet,
            referredWallet: referrals.referredWallet,
            rewardTokens: referrals.rewardTokens,
            rewardUsd: referrals.rewardUsd,
            status: referrals.status,
            createdAt: referrals.createdAt,
          })
          .from(referrals)
          .where(whereClause)
          .orderBy(desc(referrals.createdAt))
          .limit(limit)
          .offset(offset)
      : await db
          .select({
            id: referrals.id,
            referrerWallet: referrals.referrerWallet,
            referredWallet: referrals.referredWallet,
            rewardTokens: referrals.rewardTokens,
            rewardUsd: referrals.rewardUsd,
            status: referrals.status,
            createdAt: referrals.createdAt,
          })
          .from(referrals)
          .orderBy(desc(referrals.createdAt))
          .limit(limit)
          .offset(offset);

    const [{ total }] = whereClause
      ? await db.select({ total: count() }).from(referrals).where(whereClause)
      : await db.select({ total: count() }).from(referrals);

    res.json({
      referrals: rows.map((r) => ({
        ...r,
        rewardTokens: Number(r.rewardTokens),
        rewardUsd: Number(r.rewardUsd),
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
    res.status(500).json({ error: "Failed to fetch referrals" });
  }
});

router.post("/admin/referrals/mark-paid", async (req, res) => {
  try {
    const { walletAddress } = req.body as { walletAddress?: string };

    // التحقق من صحة عنوان المحفظة إن وُجد
    if (walletAddress !== undefined && !SOLANA_ADDRESS_RE.test(walletAddress)) {
      res.status(400).json({ error: "Invalid wallet address format" });
      return;
    }

    if (walletAddress) {
      auditLog(req, "referral.mark_paid_single", { walletAddress: walletAddress.slice(0, 8) + "..." });
      const result = await db
        .update(referrals)
        .set({ status: "paid" })
        .where(sql`${referrals.referrerWallet} = ${walletAddress} AND ${referrals.status} = 'pending'`)
        .returning({ id: referrals.id });

      res.json({ success: true, message: `Rewards marked as paid for ${walletAddress.slice(0, 8)}...`, updated: result.length });
    } else {
      const result = await db
        .update(referrals)
        .set({ status: "paid" })
        .where(eq(referrals.status, "pending"))
        .returning({ id: referrals.id });

      auditLog(req as import("express").Request, "referral.mark_paid_all", { count: result.length });
      res.json({ success: true, message: "All pending referral rewards marked as paid", updated: result.length });
    }
  } catch (err) {
    logger.error({ err }, "mark-paid error");
    res.status(500).json({ error: "Failed to mark referrals as paid" });
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
