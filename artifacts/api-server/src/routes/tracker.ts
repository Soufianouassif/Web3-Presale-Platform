import { Router } from "express";
import { db, pool } from "@workspace/db";
import { pageVisits, walletConnections, purchases, referralCodes, referrals } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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
    const { walletAddress, walletType, network, amountUsd, amountTokens, txHash, stage, referralCode } =
      req.body as {
        walletAddress: string;
        walletType?: string;
        network: string;
        amountUsd: number;
        amountTokens: number;
        txHash?: string;
        stage?: number;
        referralCode?: string;
      };

    if (!walletAddress || !network) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Insert the purchase record
    const [purchase] = await db
      .insert(purchases)
      .values({
        walletAddress,
        walletType,
        network,
        amountUsd: String(amountUsd),
        amountTokens: String(amountTokens),
        txHash,
        stage: stage ?? 1,
      })
      .returning({ id: purchases.id });

    // ── Auto-register referral if a code was provided ─────────────────────────
    if (referralCode && SOLANA_ADDRESS_RE.test(walletAddress)) {
      const code = referralCode.trim().slice(0, 16);
      try {
        // Resolve code → referrerWallet
        const codeRow = await db
          .select()
          .from(referralCodes)
          .where(eq(referralCodes.code, code))
          .limit(1);

        if (codeRow.length > 0) {
          const referrerWallet = codeRow[0].walletAddress;

          // Skip self-referral or duplicate
          const isSelf = referrerWallet.toLowerCase() === walletAddress.toLowerCase();
          const alreadyReferred = isSelf
            ? [1]
            : await db
                .select({ id: referrals.id })
                .from(referrals)
                .where(eq(referrals.referredWallet, walletAddress))
                .limit(1);

          if (!isSelf && alreadyReferred.length === 0) {
            const REWARD_RATE = 5.0;
            const rewardTokens = amountTokens
              ? ((amountTokens * REWARD_RATE) / 100).toFixed(6)
              : "0";
            const rewardUsd = amountUsd
              ? ((amountUsd * REWARD_RATE) / 100).toFixed(6)
              : "0";

            // Atomic insert + counter update
            const client = await pool.connect();
            try {
              await client.query("BEGIN");
              await client.query(
                `INSERT INTO referrals
                   (referrer_wallet, referred_wallet, purchase_id, reward_rate, reward_tokens, reward_usd, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
                [referrerWallet, walletAddress, purchase?.id ?? null, REWARD_RATE, rewardTokens, rewardUsd],
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
            } catch {
              await client.query("ROLLBACK");
            } finally {
              client.release();
            }
          }
        }
      } catch {
        // Referral registration failure must NOT block the purchase response
      }
    }

    res.json({ success: true, purchaseId: purchase?.id });
  } catch {
    res.json({ success: false });
  }
});

export default router;
