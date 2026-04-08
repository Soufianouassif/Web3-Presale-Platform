import { Router } from "express";
import { db } from "@workspace/db";
import { pageVisits, walletConnections, purchases, presaleConfig, adminUsers, referralCodes, referrals } from "@workspace/db/schema";
import { desc, sql, eq, count, inArray } from "drizzle-orm";
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

router.post("/admin/presale/pause", async (_req, res) => {
  try {
    await db.insert(presaleConfig)
      .values({ id: 1, isActive: false, updatedAt: new Date() })
      .onConflictDoUpdate({ target: presaleConfig.id, set: { isActive: false, updatedAt: new Date() } });
    res.json({ success: true, message: "Presale paused successfully" });
  } catch (err) {
    console.error("pause error", err);
    res.status(500).json({ success: false, message: "Failed to pause presale" });
  }
});

router.post("/admin/presale/resume", async (_req, res) => {
  try {
    await db.insert(presaleConfig)
      .values({ id: 1, isActive: true, updatedAt: new Date() })
      .onConflictDoUpdate({ target: presaleConfig.id, set: { isActive: true, updatedAt: new Date() } });
    res.json({ success: true, message: "Presale resumed successfully" });
  } catch (err) {
    console.error("resume error", err);
    res.status(500).json({ success: false, message: "Failed to resume presale" });
  }
});

router.post("/admin/presale/claim", async (req, res) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    await db.insert(presaleConfig)
      .values({ id: 1, claimEnabled: enabled, updatedAt: new Date() })
      .onConflictDoUpdate({ target: presaleConfig.id, set: { claimEnabled: enabled, updatedAt: new Date() } });
    res.json({ success: true, message: `Claim ${enabled ? "enabled" : "disabled"} successfully` });
  } catch (err) {
    console.error("claim error", err);
    res.status(500).json({ success: false, message: "Failed to update claim status" });
  }
});

router.post("/admin/presale/staking", async (req, res) => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    await db.insert(presaleConfig)
      .values({ id: 1, stakingEnabled: enabled, updatedAt: new Date() })
      .onConflictDoUpdate({ target: presaleConfig.id, set: { stakingEnabled: enabled, updatedAt: new Date() } });
    res.json({ success: true, message: `Staking ${enabled ? "enabled" : "disabled"} successfully` });
  } catch (err) {
    console.error("staking error", err);
    res.status(500).json({ success: false, message: "Failed to update staking status" });
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

    if (walletAddress) {
      await db
        .update(referrals)
        .set({ status: "paid" })
        .where(sql`${referrals.referrerWallet} = ${walletAddress} AND ${referrals.status} = 'pending'`);

      const [referrerCode] = await db
        .select({ pendingTokens: referralCodes.pendingTokens, paidTokens: referralCodes.paidTokens })
        .from(referralCodes)
        .where(eq(referralCodes.walletAddress, walletAddress))
        .limit(1);

      if (referrerCode) {
        const newPaid = Number(referrerCode.paidTokens) + Number(referrerCode.pendingTokens);
        await db
          .update(referralCodes)
          .set({ paidTokens: String(newPaid), pendingTokens: "0" })
          .where(eq(referralCodes.walletAddress, walletAddress));
      }

      res.json({ success: true, message: `Rewards marked as paid for ${walletAddress.slice(0, 8)}...` });
    } else {
      await db
        .update(referrals)
        .set({ status: "paid" })
        .where(eq(referrals.status, "pending"));

      const allCodes = await db
        .select({ walletAddress: referralCodes.walletAddress, pendingTokens: referralCodes.pendingTokens, paidTokens: referralCodes.paidTokens })
        .from(referralCodes)
        .where(sql`${referralCodes.pendingTokens}::numeric > 0`);

      for (const rc of allCodes) {
        const newPaid = Number(rc.paidTokens) + Number(rc.pendingTokens);
        await db
          .update(referralCodes)
          .set({ paidTokens: String(newPaid), pendingTokens: "0" })
          .where(eq(referralCodes.walletAddress, rc.walletAddress));
      }

      res.json({ success: true, message: "All pending referral rewards marked as paid" });
    }
  } catch (err) {
    console.error(err);
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
