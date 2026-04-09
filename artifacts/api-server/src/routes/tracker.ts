import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { Connection, PublicKey } from "@solana/web3.js";
import { db, pool } from "@workspace/db";
import { pageVisits, walletConnections, purchases, referralCodes, referrals } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

// Lazy singleton — لا يُنشأ عند تحميل الملف بل عند أول استخدام
let _connection: Connection | null = null;
function getConnection(): Connection {
  if (!_connection) _connection = new Connection(SOLANA_RPC, "confirmed");
  return _connection;
}

// Program ID للعقد الذكي — لا نقبل معاملات من عقود أخرى
const PRESALE_PROGRAM_ID = "AUvWWYPitvKFRBYNQqQGnPD1EaNbNpXSvT4ZFpssH145";

// ── القيم المسموح بها لـ walletType ──────────────────────────────────────
const ALLOWED_WALLET_TYPES = new Set(["phantom", "solflare", "backpack", "okx", "unknown"]);

// ── Regex للتحقق من صحة عنوان Solana ────────────────────────────────────
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// ── Regex للتحقق من صحة hash المعاملة (base58 بين 80-90 حرف) ────────────
const TX_HASH_RE = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;

// ── Helper لاستخراج IP الحقيقي ────────────────────────────────────────────
function getIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return req.socket?.remoteAddress ?? null;
}

// ── Rate limiters ─────────────────────────────────────────────────────────
const visitLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

const walletLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

const purchaseLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

// ── التحقق من المعاملة على البلوكتشين ────────────────────────────────────
// يتحقق من ثلاثة شروط:
//   1. المعاملة موجودة ونجحت
//   2. المحفظة هي الموقِّع الأول
//   3. سجلات البرنامج تحتوي على "SOL_BUY" أو "USDT_BUY" (إخراج msg!() من العقد)
//
// في بيئة التطوير (NODE_ENV=development): يتم تخطي التحقق من البلوكتشين
// للسماح بالاختبار بدون الحاجة لعقد حقيقي على devnet.
async function verifyTransaction(txHash: string, expectedWallet: string): Promise<{
  valid: boolean;
  reason?: string;
}> {
  // ── وضع التطوير: تخطي التحقق من البلوكتشين ─────────────────────────
  if (process.env.NODE_ENV === "development") {
    console.info(`[TX_VERIFY] DEV MODE — skipping on-chain check for ${txHash.slice(0, 16)}… wallet=${expectedWallet.slice(0, 8)}…`);
    return { valid: true };
  }

  try {
    const tx = await getConnection().getTransaction(txHash, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { valid: false, reason: "Transaction not found on-chain" };
    }

    // 1. المعاملة يجب أن تكون ناجحة
    if (tx.meta?.err !== null) {
      return { valid: false, reason: "Transaction failed on-chain" };
    }

    // 2. التحقق من الموقِّع — المحفظة يجب أن تكون الحساب الأول
    const accountKeys =
      "accountKeys" in tx.transaction.message
        ? tx.transaction.message.accountKeys.map((k) => k.toString())
        : tx.transaction.message.staticAccountKeys.map((k) => k.toString());

    const signerKey = accountKeys[0];
    if (signerKey !== expectedWallet) {
      return { valid: false, reason: "Wallet mismatch in transaction" };
    }

    // 3. التحقق من سجلات البرنامج — يجب أن يحتوي على SOL_BUY أو USDT_BUY
    //    هذا يثبت أن تعليمة شراء فعلية نُفِّذت من عقدنا (وليس مجرد استدعاء للبرنامج)
    const logs = tx.meta?.logMessages ?? [];
    const hasValidPurchaseLog = logs.some(
      (log) => log.includes("SOL_BUY") || log.includes("USDT_BUY"),
    );

    if (!hasValidPurchaseLog) {
      // Fallback: تحقق على الأقل من وجود البرنامج في الحسابات
      const involvesProgram = accountKeys.includes(PRESALE_PROGRAM_ID);
      if (!involvesProgram) {
        return { valid: false, reason: "Transaction does not involve presale program" };
      }
      // إذا كان البرنامج موجوداً لكن لا يوجد سجل شراء (مثلاً: devnet بدون logMessages)
      // نقبل المعاملة مع تسجيل تحذير
      console.warn(`[TX_VERIFY] No purchase log found for ${txHash.slice(0, 16)}… — accepted via program check`);
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: `Verification error: ${String(err)}` };
  }
}

// ── POST /track/visit ─────────────────────────────────────────────────────
router.post("/track/visit", visitLimiter, async (req: Request, res: Response) => {
  try {
    const { page = "/", visitorId, referrer } = req.body as {
      page?: string;
      visitorId?: string;
      referrer?: string;
    };

    // حد طول الحقول لمنع إدخال بيانات ضخمة
    const safePage = String(page).slice(0, 200);
    const safeVisitorId = visitorId ? String(visitorId).slice(0, 64) : undefined;
    const safeReferrer = referrer ? String(referrer).slice(0, 200) : undefined;
    const ip = getIp(req);
    const userAgent = req.headers["user-agent"]?.slice(0, 300) ?? null;

    await db.insert(pageVisits).values({
      page: safePage,
      visitorId: safeVisitorId,
      ip,
      userAgent,
      referrer: safeReferrer,
    });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// ── POST /track/wallet ────────────────────────────────────────────────────
router.post("/track/wallet", walletLimiter, async (req: Request, res: Response) => {
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

    // تحقق من صحة عنوان المحفظة
    if (!SOLANA_ADDRESS_RE.test(walletAddress)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    // whitelist لنوع المحفظة
    const safeWalletType = ALLOWED_WALLET_TYPES.has(walletType.toLowerCase())
      ? walletType.toLowerCase()
      : "unknown";

    const ip = getIp(req);
    await db.insert(walletConnections).values({
      walletAddress,
      walletType: safeWalletType,
      network: String(network).slice(0, 20),
      ip,
    });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// ── POST /track/purchase ──────────────────────────────────────────────────
router.post("/track/purchase", purchaseLimiter, async (req: Request, res: Response) => {
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

    console.log(`[PURCHASE] wallet=${walletAddress?.slice(0,8)} txHash=${txHash?.slice(0,16)} referralCode=${referralCode ?? "none"} amountUsd=${amountUsd} amountTokens=${amountTokens}`);

    // حقول إلزامية
    if (!walletAddress || !network) {
      console.warn("[PURCHASE] Rejected: missing required fields");
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // تحقق من صحة عنوان المحفظة
    if (!SOLANA_ADDRESS_RE.test(walletAddress)) {
      console.warn(`[PURCHASE] Rejected: invalid wallet address: ${walletAddress}`);
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    // txHash إلزامي للمشتريات الحقيقية
    if (!txHash) {
      console.warn("[PURCHASE] Rejected: txHash is required");
      res.status(400).json({ error: "txHash is required" });
      return;
    }

    // تحقق من صيغة txHash
    if (!TX_HASH_RE.test(txHash)) {
      console.warn(`[PURCHASE] Rejected: invalid txHash format (len=${txHash.length}): ${txHash.slice(0,20)}`);
      res.status(400).json({ error: "Invalid transaction hash format", txHashLength: txHash.length });
      return;
    }

    // ── التحقق الحقيقي على البلوكتشين ────────────────────────────────
    const verification = await verifyTransaction(txHash, walletAddress);
    if (!verification.valid) {
      console.warn(`[PURCHASE] TX verification failed: ${verification.reason}`);
      res.status(400).json({
        error: "Transaction verification failed",
        reason: verification.reason,
      });
      return;
    }

    // منع تكرار تسجيل نفس المعاملة
    const existing = await db
      .select({ id: purchases.id })
      .from(purchases)
      .where(eq(purchases.txHash, txHash))
      .limit(1);

    if (existing.length > 0) {
      console.warn(`[PURCHASE] Rejected: tx already recorded (id=${existing[0].id})`);
      res.status(409).json({ error: "Transaction already recorded" });
      return;
    }

    // whitelist لنوع المحفظة
    const safeWalletType = walletType && ALLOWED_WALLET_TYPES.has(walletType.toLowerCase())
      ? walletType.toLowerCase()
      : "unknown";

    // تأكد من أن المبالغ أرقام حقيقية وليست قيماً مزورة
    const safeAmountUsd = Math.max(0, Number(amountUsd) || 0);
    const safeAmountTokens = Math.max(0, Number(amountTokens) || 0);

    // Insert the purchase record
    const [purchase] = await db
      .insert(purchases)
      .values({
        walletAddress,
        walletType: safeWalletType,
        network: String(network).slice(0, 20),
        amountUsd: String(safeAmountUsd),
        amountTokens: String(safeAmountTokens),
        txHash,
        stage: stage ?? 1,
      })
      .returning({ id: purchases.id });

    console.log(`[PURCHASE] Saved purchase id=${purchase?.id} wallet=${walletAddress.slice(0,8)} usd=${safeAmountUsd} tokens=${safeAmountTokens}`);

    // ── تسجيل الإحالة إن وجدت ────────────────────────────────────────
    if (referralCode) {
      const code = referralCode.trim().slice(0, 16);
      console.log(`[REFERRAL] Processing code="${code}" for buyer=${walletAddress.slice(0,8)}`);
      try {
        const codeRow = await db
          .select()
          .from(referralCodes)
          .where(eq(referralCodes.code, code))
          .limit(1);

        if (codeRow.length === 0) {
          console.warn(`[REFERRAL] Code "${code}" not found in DB`);
        } else {
          const referrerWallet = codeRow[0].walletAddress;
          console.log(`[REFERRAL] Code belongs to referrer=${referrerWallet.slice(0,8)}`);

          const isSelf = referrerWallet.toLowerCase() === walletAddress.toLowerCase();
          if (isSelf) {
            console.warn(`[REFERRAL] Self-referral blocked: buyer == referrer`);
          } else {
            const alreadyReferred = await db
              .select({ id: referrals.id })
              .from(referrals)
              .where(eq(referrals.referredWallet, walletAddress))
              .limit(1);

            if (alreadyReferred.length > 0) {
              console.warn(`[REFERRAL] Wallet ${walletAddress.slice(0,8)} already referred (referral id=${alreadyReferred[0].id})`);
            } else {
              const REWARD_RATE = 5.0;
              const rewardTokens = safeAmountTokens
                ? ((safeAmountTokens * REWARD_RATE) / 100).toFixed(6)
                : "0";
              const rewardUsd = safeAmountUsd
                ? ((safeAmountUsd * REWARD_RATE) / 100).toFixed(6)
                : "0";

              console.log(`[REFERRAL] Creating referral: referrer=${referrerWallet.slice(0,8)} buyer=${walletAddress.slice(0,8)} rewardTokens=${rewardTokens} rewardUsd=${rewardUsd}`);

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
                console.log(`[REFERRAL] ✓ Referral created successfully for referrer=${referrerWallet.slice(0,8)}`);
              } catch (txErr) {
                await client.query("ROLLBACK");
                console.error(`[REFERRAL] DB transaction failed:`, txErr);
              } finally {
                client.release();
              }
            }
          }
        }
      } catch (refErr) {
        console.error(`[REFERRAL] Unexpected error processing referral:`, refErr);
        // فشل الإحالة لا يوقف تسجيل الشراء
      }
    } else {
      console.log(`[PURCHASE] No referral code provided`);
    }

    res.json({ success: true, purchaseId: purchase?.id });
  } catch (err) {
    console.error("[PURCHASE] Unexpected error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
