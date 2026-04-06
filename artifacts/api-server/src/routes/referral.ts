import { Router } from "express";
import { db, pool } from "@workspace/db";
import { referralCodes, referrals, purchases } from "@workspace/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

const router = Router();

// ─── Solana address validation ────────────────────────────────────────────────
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
function isValidSolanaAddress(addr: string): boolean {
  return SOLANA_ADDRESS_RE.test(addr);
}

// ─── Referral code generator (base58, 8 chars) ────────────────────────────────
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

// ─── Rate limiter (in-memory, per IP, max 10 req/min for code creation) ───────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
// Clean stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/referral/code/:wallet
// Returns the referral code for a wallet (creates one if it doesn't exist).
// ─────────────────────────────────────────────────────────────────────────────
router.get("/referral/code/:wallet", async (req, res) => {
  const { wallet } = req.params;

  if (!isValidSolanaAddress(wallet)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    "unknown";

  if (!checkRateLimit(ip, 20, 60_000)) {
    res.status(429).json({ error: "Too many requests. Please wait a moment." });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.walletAddress, wallet))
      .limit(1);

    if (existing.length > 0) {
      res.json({ code: existing[0].code });
      return;
    }

    // Generate a unique code (retry up to 5 times on collision)
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
    res.json({ code });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/referral/register
// Called after a purchase is confirmed on-chain.
// Body: { referrerCode, buyerWallet, purchaseId?, amountUsd?, amountTokens? }
//
// Security:
//  1. Validate both wallets (buyer must be valid Solana address)
//  2. Resolve referrerCode → referrerWallet
//  3. Prevent self-referral (referrer === buyer)
//  4. Prevent double-referral (buyer can only be referred once)
//  5. Atomic update of reward counters
// ─────────────────────────────────────────────────────────────────────────────
router.post("/referral/register", async (req, res) => {
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

  // Sanitise code
  const code = referrerCode.trim().slice(0, 16);

  try {
    // ── 1. Resolve code → referrerWallet ─────────────────────────────────────
    const codeRow = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, code))
      .limit(1);

    if (codeRow.length === 0) {
      res.status(404).json({ error: "Invalid referral code" });
      return;
    }

    const referrerWallet = codeRow[0].walletAddress;

    // ── 2. Self-referral check ────────────────────────────────────────────────
    if (referrerWallet.toLowerCase() === buyerWallet.toLowerCase()) {
      res.status(400).json({ error: "Self-referral is not allowed" });
      return;
    }

    // ── 3. Double-referral check ──────────────────────────────────────────────
    const alreadyReferred = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(eq(referrals.referredWallet, buyerWallet))
      .limit(1);

    if (alreadyReferred.length > 0) {
      res.status(409).json({ error: "This wallet has already been referred" });
      return;
    }

    // ── 4. Calculate reward (5% of purchase tokens) ──────────────────────────
    const REWARD_RATE = 5.0;
    const rewardTokens = amountTokens
      ? ((amountTokens * REWARD_RATE) / 100).toFixed(6)
      : "0";
    const rewardUsd = amountUsd
      ? ((amountUsd * REWARD_RATE) / 100).toFixed(6)
      : "0";

    // ── 5. Atomic insert + counter update (PostgreSQL transaction) ────────────
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

    res.json({
      success: true,
      referrerWallet,
      rewardTokens,
      rewardUsd,
      rewardRate: REWARD_RATE,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    res.status(500).json({ error: message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/referral/stats/:wallet
// Returns full referral stats for a wallet.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/referral/stats/:wallet", async (req, res) => {
  const { wallet } = req.params;

  if (!isValidSolanaAddress(wallet)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  try {
    const codeRow = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.walletAddress, wallet))
      .limit(1);

    if (codeRow.length === 0) {
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

    // Pending vs paid breakdown
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

    // 5 most recent referrals
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

    res.json({
      code: row.code,
      totalReferrals: row.totalReferrals,
      totalRewardTokens: row.totalRewardTokens,
      totalRewardUsd: row.totalRewardUsd,
      pendingTokens: pending,
      paidTokens: paid,
      recentReferrals: recent,
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/referral/leaderboard
// Top 10 referrers by total reward tokens.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/referral/leaderboard", async (_req, res) => {
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

    // Mask wallet addresses for privacy (show first 4 + last 4)
    const masked = top.map(r => ({
      ...r,
      walletAddress:
        r.walletAddress.slice(0, 4) + "…" + r.walletAddress.slice(-4),
    }));

    res.json(masked);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/referral/resolve/:code
// Validates a referral code and returns the masked referrer wallet.
// Used by the frontend when a visitor lands with ?ref=CODE.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/referral/resolve/:code", async (req, res) => {
  const code = req.params.code.trim().slice(0, 16);

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
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
