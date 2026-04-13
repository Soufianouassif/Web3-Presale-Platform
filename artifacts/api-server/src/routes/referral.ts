import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db, pool } from "@workspace/db";
import { referralCodes, referrals, purchases } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function isValidSolanaAddress(addr: string): boolean {
  return SOLANA_ADDRESS_RE.test(addr);
}

// base58 code, 8 chars
const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function generateCode(): string {
  let code = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) {
    code += BASE58_CHARS[byte % BASE58_CHARS.length];
  }
  return code;
}

const codeLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

const readLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

// GET /api/referral/code/:wallet
router.get("/referral/code/:wallet", codeLimiter, async (req, res) => {
  const wallet = String(req.params.wallet);

  if (!isValidSolanaAddress(wallet)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.walletAddress, wallet))
      .limit(1);

    if (existing.length > 0) {
      logger.info({ wallet: wallet.slice(0, 8), code: existing[0].code, source: "DB" }, "[REF_CODE] Returning existing code from DB");
      res.json({ code: existing[0].code });
      return;
    }

    let code = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode();
      const collision = await db
        .select({ id: referralCodes.id })
        .from(referralCodes)
        .where(eq(referralCodes.code, candidate))
        .limit(1);
      if (collision.length === 0) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      res.status(500).json({ error: "Failed to generate unique code" });
      return;
    }

    await db.insert(referralCodes).values({ walletAddress: wallet, code });
    logger.info({ wallet: wallet.slice(0, 8), code, source: "CREATED" }, "[REF_CODE] New code inserted into DB");
    res.json({ code });
  } catch (err) {
    logger.error({ err }, "[REF_CODE] DB error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/referral/register
router.post("/referral/register", registerLimiter, async (req, res) => {
  const { referrerCode, buyerWallet, purchaseId, amountUsd, amountTokens } =
    req.body as {
      referrerCode?: string;
      buyerWallet?: string;
      purchaseId?: number;
      amountUsd?: number;
      amountTokens?: number;
    };

  if (!referrerCode || !buyerWallet) {
    res.status(400).json({ error: "referrerCode and buyerWallet are required" });
    return;
  }

  if (!isValidSolanaAddress(buyerWallet)) {
    res.status(400).json({ error: "Invalid buyer wallet address" });
    return;
  }

  const code = referrerCode.trim().slice(0, 16);

  if (!purchaseId || !Number.isInteger(purchaseId) || purchaseId <= 0) {
    res.status(400).json({ error: "Valid purchaseId is required" });
    return;
  }

  logger.info(
    { code, buyer: buyerWallet.slice(0, 8), purchaseId, amountUsd, amountTokens },
    "[REF_REGISTER] Processing referral registration",
  );

  try {
    const purchaseRow = await db
      .select({ id: purchases.id, walletAddress: purchases.walletAddress })
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1);

    if (purchaseRow.length === 0) {
      logger.warn({ purchaseId, buyer: buyerWallet.slice(0, 8) }, "[REF_REGISTER] Purchase not found in DB");
      res.status(400).json({ error: "Purchase not found" });
      return;
    }

    if (purchaseRow[0].walletAddress.toLowerCase() !== buyerWallet.toLowerCase()) {
      logger.warn({ purchaseId, buyer: buyerWallet.slice(0, 8) }, "[REF_REGISTER] Purchase wallet mismatch");
      res.status(400).json({ error: "Purchase does not belong to this wallet" });
      return;
    }

    const codeRow = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, code))
      .limit(1);

    if (codeRow.length === 0) {
      logger.warn({ code }, "[REF_REGISTER] Invalid referral code — not found in DB");
      res.status(404).json({ error: "Invalid referral code" });
      return;
    }

    const referrerWallet = codeRow[0].walletAddress;

    if (referrerWallet.toLowerCase() === buyerWallet.toLowerCase()) {
      logger.warn({ code, wallet: referrerWallet.slice(0, 8) }, "[REF_REGISTER] Blocked self-referral");
      res.status(400).json({ error: "Self-referral is not allowed" });
      return;
    }

    const alreadyReferred = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(eq(referrals.referredWallet, buyerWallet))
      .limit(1);

    if (alreadyReferred.length > 0) {
      logger.warn({ buyer: buyerWallet.slice(0, 8) }, "[REF_REGISTER] Blocked double-referral — wallet already referred");
      res.status(409).json({ error: "This wallet has already been referred" });
      return;
    }

    const REWARD_RATE = 5.0;
    const rewardTokens = amountTokens
      ? ((amountTokens * REWARD_RATE) / 100).toFixed(6)
      : "0";
    const rewardUsd = amountUsd
      ? ((amountUsd * REWARD_RATE) / 100).toFixed(6)
      : "0";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO referrals
           (referrer_wallet, referred_wallet, purchase_id, reward_rate, reward_tokens, reward_usd, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [referrerWallet, buyerWallet, purchaseId ?? null, REWARD_RATE, rewardTokens, rewardUsd],
      );

      await client.query(
        `UPDATE referral_codes
         SET total_referrals     = total_referrals + 1,
             total_reward_tokens = total_reward_tokens + $1,
             total_reward_usd    = total_reward_usd    + $2
         WHERE wallet_address = $3`,
        [rewardTokens, rewardUsd, referrerWallet],
      );

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    logger.info(
      {
        code,
        referrer: referrerWallet.slice(0, 8),
        buyer: buyerWallet.slice(0, 8),
        rewardTokens,
        rewardUsd,
        source: "DB_WRITE",
      },
      "[REF_REGISTER] Referral saved to DB",
    );

    res.json({
      success: true,
      referrerWallet,
      rewardTokens,
      rewardUsd,
      rewardRate: REWARD_RATE,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    logger.error({ err, code, buyer: buyerWallet.slice(0, 8) }, "[REF_REGISTER] DB error");
    res.status(500).json({ error: message });
  }
});

// GET /api/referral/stats/:wallet
router.get("/referral/stats/:wallet", readLimiter, async (req, res) => {
  const wallet = String(req.params.wallet);

  if (!isValidSolanaAddress(wallet)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  logger.info({ wallet: wallet.slice(0, 8) }, "[REF_STATS] Querying referral stats from DB");

  try {
    const codeRow = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.walletAddress, wallet))
      .limit(1);

    if (codeRow.length === 0) {
      logger.info({ wallet: wallet.slice(0, 8) }, "[REF_STATS] No referral code found");
      res.json({
        code: null,
        totalReferrals: 0,
        totalRewardTokens: "0",
        totalRewardUsd: "0",
        pendingTokens: "0",
        paidTokens: "0",
        recentReferrals: [],
      });
      return;
    }

    const row = codeRow[0];

    const breakdown = await db
      .select({
        status: referrals.status,
        sumTokens: sql<string>`sum(reward_tokens)`,
      })
      .from(referrals)
      .where(eq(referrals.referrerWallet, wallet))
      .groupBy(referrals.status);

    const pending =
      breakdown.find(b => b.status === "pending")?.sumTokens ?? "0";
    const paid =
      breakdown.find(b => b.status === "paid")?.sumTokens ?? "0";

    const recent = await db
      .select({
        referredWallet: referrals.referredWallet,
        rewardTokens: referrals.rewardTokens,
        status: referrals.status,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .where(eq(referrals.referrerWallet, wallet))
      .orderBy(desc(referrals.createdAt))
      .limit(5);

    logger.info(
      {
        wallet: wallet.slice(0, 8),
        code: row.code,
        totalReferrals: row.totalReferrals,
        pendingTokens: pending,
        paidTokens: paid,
        recentCount: recent.length,
        source: "DB_READ",
      },
      "[REF_STATS] Stats returned from DB",
    );

    res.json({
      code: row.code,
      totalReferrals: row.totalReferrals,
      totalRewardTokens: row.totalRewardTokens,
      totalRewardUsd: row.totalRewardUsd,
      pendingTokens: pending,
      paidTokens: paid,
      recentReferrals: recent,
    });
  } catch (err) {
    logger.error({ err, wallet: wallet.slice(0, 8) }, "[REF_STATS] DB error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/referral/leaderboard
router.get("/referral/leaderboard", readLimiter, async (_req, res) => {
  logger.info({}, "[REF_LEADERBOARD] Querying top referrers from DB");

  try {
    const top = await db
      .select({
        walletAddress: referralCodes.walletAddress,
        totalReferrals: referralCodes.totalReferrals,
        totalRewardTokens: referralCodes.totalRewardTokens,
      })
      .from(referralCodes)
      .where(sql`total_referrals > 0`)
      .orderBy(desc(referralCodes.totalRewardTokens))
      .limit(10);

    const masked = top.map(r => ({
      ...r,
      walletAddress:
        r.walletAddress.slice(0, 4) + "…" + r.walletAddress.slice(-4),
    }));

    logger.info({ count: masked.length, source: "DB_READ" }, "[REF_LEADERBOARD] Returned from DB");
    res.json(masked);
  } catch (err) {
    logger.error({ err }, "[REF_LEADERBOARD] DB error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/referral/resolve/:code
router.get("/referral/resolve/:code", readLimiter, async (req, res) => {
  const code = String(req.params.code).trim().slice(0, 16);

  try {
    const row = await db
      .select({ walletAddress: referralCodes.walletAddress })
      .from(referralCodes)
      .where(eq(referralCodes.code, code))
      .limit(1);

    if (row.length === 0) {
      res.status(404).json({ valid: false });
      return;
    }

    const w = row[0].walletAddress;
    res.json({
      valid: true,
      referrerMasked: w.slice(0, 4) + "…" + w.slice(-4),
    });
  } catch (err) {
    logger.error({ err, code }, "[REF_RESOLVE] DB error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
