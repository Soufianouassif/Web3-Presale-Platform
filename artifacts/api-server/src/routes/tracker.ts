import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { Connection } from "@solana/web3.js";
import { db, pool } from "@workspace/db";
import { pageVisits, walletConnections, purchases, referralCodes, referrals } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Network / RPC configuration ────────────────────────────────────────────
// SOLANA_NETWORK must be set in env ("devnet" | "mainnet").
// Defaults to "devnet" — explicitly set this to "mainnet" only for production.
const SOLANA_NETWORK    = (process.env.SOLANA_NETWORK ?? "devnet").toLowerCase();
const SOLANA_RPC        = process.env.SOLANA_RPC_URL || process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const PRESALE_PROGRAM_ID = "AUvWWYPitvKFRBYNQqQGnPD1EaNbNpXSvT4ZFpssH145";
const CONFIG_PDA         = "BnHWhbNVB3cjCq7UA1KvBoW8JGe44yspCBSXPTDocuMi";

// ── On-chain verification gate ─────────────────────────────────────────────
// On devnet: verification is skipped by default (public RPC too slow for 30s serverless timeout).
// On mainnet: verification is always required (use a fast private RPC).
// Override with REQUIRE_ONCHAIN_VERIFICATION=true/false env var.
const REQUIRE_ONCHAIN_VERIFICATION = process.env.REQUIRE_ONCHAIN_VERIFICATION !== undefined
  ? process.env.REQUIRE_ONCHAIN_VERIFICATION !== "false"
  : SOLANA_NETWORK === "mainnet"; // devnet=false, mainnet=true by default

// ── USDT mints (deterministic from network — NOT from client input) ────────
const USDT_MINT = SOLANA_NETWORK === "mainnet"
  ? (process.env.USDT_MINT ?? "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")
  : (process.env.USDT_MINT_DEVNET ?? "8PieQJ43S4PpVWQaBZp4TaHFZGoAA9FsDzYbPftVfo6X");

const USDT_DECIMALS = 6;

// ── Amount cross-check tolerance ──────────────────────────────────────────
const MISMATCH_WARN_PCT  = 0.15; // log warning if client vs server > 15%
const MISMATCH_BLOCK_PCT = 0.50; // reject if > 50% (manipulation)

const REWARD_RATE = 5.0; // 5% reward to referrer (server-side only)

logger.info(
  { SOLANA_NETWORK, SOLANA_RPC, PRESALE_PROGRAM_ID, CONFIG_PDA, USDT_MINT, REQUIRE_ONCHAIN_VERIFICATION },
  "[TRACKER] Network configuration loaded",
);

// ── Lazy Solana connection ─────────────────────────────────────────────────
let _connection: Connection | null = null;
function getConnection(): Connection {
  if (!_connection) _connection = new Connection(SOLANA_RPC, "confirmed");
  return _connection;
}

// ── SOL price cache (CoinGecko, 2-minute TTL) ─────────────────────────────
let _solPriceCache: { price: number; fetchedAt: number } = { price: 0, fetchedAt: 0 };
const SOL_PRICE_TTL_MS = 2 * 60 * 1_000;

async function fetchSolPriceUsd(): Promise<number> {
  const now = Date.now();
  if (now - _solPriceCache.fetchedAt < SOL_PRICE_TTL_MS && _solPriceCache.price > 0) {
    return _solPriceCache.price;
  }
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { signal: AbortSignal.timeout(5_000) },
    );
    if (r.ok) {
      const d = await r.json() as { solana?: { usd?: number } };
      const price = d?.solana?.usd;
      if (price && price > 0) {
        _solPriceCache = { price, fetchedAt: now };
        return price;
      }
    }
  } catch { /* keep cached value */ }

  if (_solPriceCache.price > 0) {
    logger.warn({ cachedPrice: _solPriceCache.price }, "[SOL_PRICE] CoinGecko unreachable — using cached price");
    return _solPriceCache.price;
  }

  // Hard fallback — only if CoinGecko is down AND cache is empty
  logger.warn(
    { security: true, source: "FALLBACK_$150" },
    "[SOL_PRICE] ⚠ CoinGecko unreachable and cache empty — using $150 fallback (server-defined, not client)",
  );
  return 150;
}

// ── On-chain stage token price ─────────────────────────────────────────────
// tokenPriceUsd = 0.001 / tokensPerRawUsdtScaled (matches frontend formula)
let _chainStateCache: { tokensPerRawUsdtScaled: bigint[]; fetchedAt: number } | null = null;
const CHAIN_STATE_TTL_MS = 30_000;

async function fetchStageTokenPriceUsd(stageIndex: number): Promise<number | null> {
  const now = Date.now();
  if (!_chainStateCache || now - _chainStateCache.fetchedAt > CHAIN_STATE_TTL_MS) {
    try {
      const body = JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "getAccountInfo",
        params: [CONFIG_PDA, { encoding: "base64" }],
      });
      const rpcRes = await fetch(SOLANA_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(6_000),
      });
      const rpcJson = await rpcRes.json() as { result?: { value?: { data?: [string, string] } } };
      const b64 = rpcJson?.result?.value?.data?.[0];
      if (!b64) {
        logger.warn({ CONFIG_PDA, SOLANA_NETWORK }, "[CHAIN_STATE] Config PDA returned no data");
        return null;
      }

      const raw = Buffer.from(b64, "base64");
      let off = 8;
      const readPk   = () => { off += 32; };
      const readU8   = () => { const v = raw[off]; off += 1; return v; };
      const readBool = () => readU8() !== 0;
      const readI64  = () => { off += 8; };
      const readU64  = () => { const v = raw.readBigUInt64LE(off); off += 8; return v; };

      readPk(); readPk(); readPk(); readPk(); // authority, treasury, usdt_treasury_ata, usdt_mint
      readU8(); readBool(); readBool();        // currentStage, isActive, isPaused
      readI64(); readI64(); readI64();         // presaleStart, presaleEnd, claimOpensAt
      readU64(); readU64(); readU64(); readU64(); readU64(); // totalTokensSold, totalSolRaised, totalUsdtRaised, totalManualTokens, solPriceUsdE6

      const tokensPerRawUsdtScaled: bigint[] = [];
      for (let i = 0; i < 4; i++) {
        tokensPerRawUsdtScaled.push(readU64()); // tokensPerRawUsdtScaled
        readU64(); // maxTokens
        readU64(); // tokensSold
      }

      _chainStateCache = { tokensPerRawUsdtScaled, fetchedAt: now };
      logger.info(
        { stageIndex, tokensPerRawUsdtScaled: tokensPerRawUsdtScaled.map(String), SOLANA_NETWORK },
        "[CHAIN_STATE] Presale config PDA fetched successfully",
      );
    } catch (err) {
      logger.warn({ err, SOLANA_NETWORK, CONFIG_PDA }, "[CHAIN_STATE] Failed to fetch presale config PDA");
      return null;
    }
  }

  const scaled = _chainStateCache?.tokensPerRawUsdtScaled[stageIndex];
  if (!scaled || scaled === 0n) return null;
  return 0.001 / Number(scaled);
}

// ── Input validation regexes ───────────────────────────────────────────────
const SOLANA_ADDRESS_RE    = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TX_HASH_RE           = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;
const ALLOWED_WALLET_TYPES = new Set(["phantom", "solflare", "backpack", "okx", "unknown"]);

function getIp(req: Request): string | null {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? null;
  return req.socket?.remoteAddress ?? null;
}

// ── On-chain verification result ───────────────────────────────────────────
interface OnChainAmounts {
  paymentType: "sol" | "usdt";
  solSpentLamports?: number;
  solSpentSol?: number;
  usdtSpentRaw?: number;
  usdtSpentUnits?: number;
  solPriceUsed?: number;
  estimatedUsd: number;
  estimatedTokens: number | null;
}

interface VerifyResult {
  valid: boolean;
  reason?: string;
  onChain?: OnChainAmounts;
  isTimeout?: boolean; // true = network/timeout failure (tx may be real), false = security failure
}

// ── verifyTransaction ──────────────────────────────────────────────────────
// This function is the core security gate.
// NO bypasses. NO DEV MODE. Always verifies on-chain.
// If REQUIRE_ONCHAIN_VERIFICATION=false (CI only), it is the CALLER's responsibility to skip calling this.
async function verifyTransaction(
  txHash: string,
  expectedWallet: string,
  stageIndex: number,
  network: string,
): Promise<VerifyResult> {
  const logCtx = {
    txHash:  txHash.slice(0, 16) + "…",
    wallet:  expectedWallet.slice(0, 8) + "…",
    network: SOLANA_NETWORK,
    rpc:     SOLANA_RPC,
  };

  logger.info(logCtx, `[TX_VERIFY] Checking tx on ${SOLANA_NETWORK}`);

  try {
    // ── Retry logic: devnet RPC is slow/unreliable. Retry up to 5× with delay ──
    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY_MS = 3_000; // 3 seconds between attempts
    let tx = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      tx = await getConnection().getTransaction(txHash, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (tx) {
        if (attempt > 1) {
          logger.info({ ...logCtx, attempt }, `[TX_VERIFY] Transaction found on attempt ${attempt}`);
        }
        break;
      }

      if (attempt < MAX_ATTEMPTS) {
        logger.warn(
          { ...logCtx, attempt, nextAttemptInMs: RETRY_DELAY_MS },
          `[TX_VERIFY] Transaction not found (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying...`,
        );
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }

    if (!tx) {
      logger.warn({ ...logCtx, totalAttempts: MAX_ATTEMPTS }, `[TX_VERIFY] Transaction not found on ${SOLANA_NETWORK} after ${MAX_ATTEMPTS} attempts`);
      return { valid: false, isTimeout: true, reason: `Transaction not found on ${SOLANA_NETWORK} after ${MAX_ATTEMPTS} attempts` };
    }

    if (tx.meta?.err !== null) {
      logger.warn({ ...logCtx, txError: tx.meta?.err }, `[TX_VERIFY] Transaction FAILED on ${SOLANA_NETWORK}`);
      return { valid: false, reason: `Transaction failed on-chain: ${JSON.stringify(tx.meta?.err)}` };
    }

    logger.info({ ...logCtx, slot: tx.slot }, `[TX_VERIFY] Transaction found and succeeded on ${SOLANA_NETWORK}`);

    // ── 1. Verify signer (account[0] = fee payer = buyer) ─────────────────
    const accountKeys =
      "accountKeys" in tx.transaction.message
        ? tx.transaction.message.accountKeys.map((k) => k.toString())
        : tx.transaction.message.staticAccountKeys.map((k) => k.toString());

    const actualSigner = accountKeys[0] ?? "";
    if (actualSigner !== expectedWallet) {
      logger.warn(
        { ...logCtx, expectedSigner: expectedWallet.slice(0, 8), actualSigner: actualSigner.slice(0, 8) },
        "[TX_VERIFY] Signer MISMATCH — wallet in TX does not match request",
      );
      return {
        valid: false,
        reason: `Signer mismatch: request wallet ${expectedWallet.slice(0, 8)} ≠ tx signer ${actualSigner.slice(0, 8)}`,
      };
    }

    logger.info({ ...logCtx }, "[TX_VERIFY] Signer match ✓");

    // ── 2. Verify presale program involvement ─────────────────────────────
    const logs            = tx.meta?.logMessages ?? [];
    const hasValidLog     = logs.some((l) => l.includes("SOL_BUY") || l.includes("USDT_BUY"));
    const involvesProgram = accountKeys.includes(PRESALE_PROGRAM_ID);

    if (!involvesProgram && !hasValidLog) {
      logger.warn(
        { ...logCtx, PRESALE_PROGRAM_ID, accountKeys: accountKeys.slice(0, 5) },
        "[TX_VERIFY] Program MISMATCH — presale program not in transaction",
      );
      return { valid: false, reason: "Transaction does not involve the presale program" };
    }

    if (involvesProgram && !hasValidLog) {
      logger.warn({ ...logCtx }, "[TX_VERIFY] Program match ✓ (no SOL_BUY/USDT_BUY log — accepted via program key)");
    } else {
      logger.info({ ...logCtx, logKey: hasValidLog ? "SOL_BUY/USDT_BUY found" : "program key" }, "[TX_VERIFY] Program match ✓");
    }

    // ── 3. Extract on-chain amounts ───────────────────────────────────────
    const preBalances  = tx.meta?.preBalances  ?? [];
    const postBalances = tx.meta?.postBalances ?? [];
    const fee          = tx.meta?.fee ?? 0;
    const preTkn       = tx.meta?.preTokenBalances  ?? [];
    const postTkn      = tx.meta?.postTokenBalances ?? [];

    // Always use the server-side USDT mint (NEVER trust client-sent network field for mint selection)
    const buyerPreUsdt  = preTkn.find( (b) => b.mint === USDT_MINT && b.owner === expectedWallet);
    const buyerPostUsdt = postTkn.find((b) => b.mint === USDT_MINT && b.owner === expectedWallet);

    let onChain: OnChainAmounts;

    if (buyerPreUsdt && buyerPostUsdt) {
      // ── USDT purchase ────────────────────────────────────────────────────
      const preRaw  = BigInt(buyerPreUsdt.uiTokenAmount.amount);
      const postRaw = BigInt(buyerPostUsdt.uiTokenAmount.amount);
      const diffRaw   = preRaw > postRaw ? Number(preRaw - postRaw) : 0;
      const usdtUnits = diffRaw / 10 ** USDT_DECIMALS;

      const tokenPrice = await fetchStageTokenPriceUsd(stageIndex);

      onChain = {
        paymentType:     "usdt",
        usdtSpentRaw:    diffRaw,
        usdtSpentUnits:  usdtUnits,
        estimatedUsd:    usdtUnits,
        estimatedTokens: tokenPrice && tokenPrice > 0 ? usdtUnits / tokenPrice : null,
      };

      logger.info(
        { ...logCtx, usdtSpentUnits: usdtUnits, estimatedUsd: usdtUnits, estimatedTokens: onChain.estimatedTokens },
        "[TX_VERIFY] Extracted amounts (USDT purchase)",
      );
    } else {
      // ── SOL purchase ─────────────────────────────────────────────────────
      const preSol  = preBalances[0]  ?? 0;
      const postSol = postBalances[0] ?? 0;
      const lamportsDelta   = Math.max(0, preSol - postSol);
      const lamportsToVault = Math.max(0, lamportsDelta - fee);
      const solUnits        = lamportsToVault / 1e9;

      const solPrice   = await fetchSolPriceUsd();
      const tokenPrice = await fetchStageTokenPriceUsd(stageIndex);
      const estimatedUsd = solUnits * solPrice;

      onChain = {
        paymentType:      "sol",
        solSpentLamports: lamportsToVault,
        solSpentSol:      solUnits,
        solPriceUsed:     solPrice,
        estimatedUsd,
        estimatedTokens: tokenPrice && tokenPrice > 0 ? estimatedUsd / tokenPrice : null,
      };

      logger.info(
        {
          ...logCtx,
          solSpentSol: solUnits,
          solPriceUsed: solPrice,
          estimatedUsd,
          estimatedTokens: onChain.estimatedTokens,
          tokenPriceAvailable: tokenPrice !== null,
        },
        "[TX_VERIFY] Extracted amounts (SOL purchase)",
      );
    }

    return { valid: true, onChain };
  } catch (err) {
    logger.error(
      { err, ...logCtx },
      `[TX_VERIFY] Unexpected error during ${SOLANA_NETWORK} verification`,
    );
    return { valid: false, isTimeout: true, reason: `Verification error: ${String(err)}` };
  }
}

// ── Amount comparison (logging only — server values are authoritative) ─────
function logAmountComparison(
  label: string,
  clientValue: number,
  serverValue: number,
  txHash: string,
): void {
  if (serverValue <= 0) return;
  const pct = Math.abs(clientValue - serverValue) / serverValue;
  if (pct > MISMATCH_WARN_PCT) {
    logger.warn(
      {
        label,
        clientValue,
        serverValue,
        discrepancyPct: (pct * 100).toFixed(1) + "%",
        txHash: txHash.slice(0, 16) + "…",
        suspicious:  pct > 0.30,
        security:    pct > MISMATCH_BLOCK_PCT,
        alert:       pct > MISMATCH_BLOCK_PCT,
        alertType:   pct > MISMATCH_BLOCK_PCT ? "AMOUNT_MANIPULATION" : "AMOUNT_MISMATCH",
      },
      `[AMOUNT_MISMATCH] ${label}: client=${clientValue.toFixed(6)} server=${serverValue.toFixed(6)} diff=${(pct*100).toFixed(1)}%`,
    );
  }
}

// ── Rate limiters ──────────────────────────────────────────────────────────
const visitLimiter = rateLimit({
  windowMs: 60 * 1_000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests" },
});
const walletLimiter = rateLimit({
  windowMs: 60 * 1_000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests" },
});
const purchaseLimiter = rateLimit({
  windowMs: 60 * 1_000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests" },
});

// ── POST /track/visit ──────────────────────────────────────────────────────
router.post("/track/visit", visitLimiter, async (req: Request, res: Response) => {
  try {
    const { page = "/", visitorId, referrer } = req.body as {
      page?: string; visitorId?: string; referrer?: string;
    };
    await db.insert(pageVisits).values({
      page:      String(page).slice(0, 200),
      visitorId: visitorId ? String(visitorId).slice(0, 64) : undefined,
      ip:        getIp(req),
      userAgent: req.headers["user-agent"]?.slice(0, 300) ?? null,
      referrer:  referrer ? String(referrer).slice(0, 200) : undefined,
    });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// ── POST /track/wallet ─────────────────────────────────────────────────────
router.post("/track/wallet", walletLimiter, async (req: Request, res: Response) => {
  try {
    const { walletAddress, walletType, network = "unknown" } = req.body as {
      walletAddress: string; walletType: string; network?: string;
    };
    if (!walletAddress || !walletType) {
      res.status(400).json({ error: "Missing required fields" }); return;
    }
    if (!SOLANA_ADDRESS_RE.test(walletAddress)) {
      res.status(400).json({ error: "Invalid wallet address" }); return;
    }
    const safeWalletType = ALLOWED_WALLET_TYPES.has(walletType.toLowerCase())
      ? walletType.toLowerCase() : "unknown";

    await db.insert(walletConnections).values({
      walletAddress,
      walletType: safeWalletType,
      network:    String(network).slice(0, 20),
      ip:         getIp(req),
    });
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// ── POST /track/purchase ───────────────────────────────────────────────────
router.post("/track/purchase", purchaseLimiter, async (req: Request, res: Response) => {
  try {
    const {
      walletAddress, walletType, network,
      amountUsd: clientUsd, amountTokens: clientTokens,
      txHash, stage, referralCode,
    } = req.body as {
      walletAddress: string;
      walletType?: string;
      network: string;
      amountUsd: number;
      amountTokens: number;
      txHash?: string;
      stage?: number;
      referralCode?: string;
    };

    const ip = getIp(req);

    logger.info(
      {
        wallet:    walletAddress?.slice(0, 8) + "…",
        txHash:    txHash?.slice(0, 16) + "…",
        refCode:   referralCode ?? "none",
        clientUsd,
        clientTokens,
        stage,
        network: SOLANA_NETWORK,
        ip,
        source: "CLIENT_REQUEST",
        verificationRequired: REQUIRE_ONCHAIN_VERIFICATION,
      },
      "[PURCHASE] Incoming purchase request",
    );

    // ── Input validation ─────────────────────────────────────────────────
    if (!walletAddress || !network) {
      logger.warn({ ip }, "[PURCHASE] Rejected: missing required fields");
      res.status(400).json({ error: "Missing required fields" }); return;
    }
    if (!SOLANA_ADDRESS_RE.test(walletAddress)) {
      logger.warn({ wallet: walletAddress?.slice(0, 8), ip }, "[PURCHASE] Rejected: invalid wallet address");
      res.status(400).json({ error: "Invalid wallet address" }); return;
    }
    if (!txHash) {
      logger.warn({ ip }, "[PURCHASE] Rejected: txHash is required");
      res.status(400).json({ error: "txHash is required" }); return;
    }
    if (!TX_HASH_RE.test(txHash)) {
      logger.warn({ txHashLen: txHash.length, ip }, "[PURCHASE] Rejected: invalid txHash format");
      res.status(400).json({
        error:  "Invalid transaction hash format",
        detail: `Expected base58 string of 80-90 characters, got ${txHash.length}`,
      }); return;
    }

    // ── Replay attack guard ──────────────────────────────────────────────
    const existing = await db
      .select({ id: purchases.id })
      .from(purchases)
      .where(eq(purchases.txHash, txHash))
      .limit(1);

    if (existing.length > 0) {
      logger.warn(
        { txHash: txHash.slice(0, 16) + "…", existingId: existing[0].id, ip, security: true, alertType: "REPLAY_ATTACK" },
        "[PURCHASE] Rejected: REPLAY_ATTACK — txHash already recorded",
      );
      res.status(409).json({ error: "Transaction already recorded" }); return;
    }

    // ── Determine accepted amounts ───────────────────────────────────────
    const safeClientUsd    = Math.max(0, Number(clientUsd)    || 0);
    const safeClientTokens = Math.max(0, Number(clientTokens) || 0);

    let acceptedUsd: number;
    let acceptedTokens: number;
    let verificationSource: string;

    if (!REQUIRE_ONCHAIN_VERIFICATION) {
      // ── CI/unit-test mode only — accept client values with loud warnings ─
      acceptedUsd    = safeClientUsd;
      acceptedTokens = safeClientTokens;
      verificationSource = "CLIENT_UNVERIFIED_CI_ONLY";

      logger.warn(
        {
          wallet: walletAddress.slice(0, 8) + "…",
          txHash: txHash.slice(0, 16) + "…",
          acceptedUsd, acceptedTokens,
          security: true,
          alert: true,
          alertType: "VERIFICATION_BYPASSED",
          warning: "REQUIRE_ONCHAIN_VERIFICATION=false — client amounts accepted WITHOUT blockchain check",
        },
        "⛔ [PURCHASE] VERIFICATION BYPASSED — using client-provided amounts (CI only)",
      );
    } else {
      // ── PRODUCTION PATH: Full on-chain verification ──────────────────────
      const stageIndex = Math.max(0, Math.min(3, (stage ?? 1) - 1));
      const verification = await verifyTransaction(txHash, walletAddress, stageIndex, network);

      if (!verification.valid && verification.isTimeout) {
        // ── Devnet timeout / RPC unreachable ─────────────────────────────
        // The frontend already confirmed the tx on-chain via confirmTransaction().
        // Save with client-provided amounts and flag for admin review.
        logger.warn(
          {
            txHash:  txHash.slice(0, 16) + "…",
            reason:  verification.reason,
            ip,
            network: SOLANA_NETWORK,
            alert:   true,
            alertType: "TIMEOUT_UNVERIFIED_PURCHASE",
          },
          "[PURCHASE] ⚠ Devnet timeout — saving with client amounts for admin review",
        );

        const safeWalletType = walletType && ALLOWED_WALLET_TYPES.has(walletType.toLowerCase())
          ? walletType.toLowerCase() : "unknown";

        const [purchase] = await db
          .insert(purchases)
          .values({
            walletAddress,
            walletType:          safeWalletType,
            network:             SOLANA_NETWORK,
            amountUsd:           String(safeClientUsd),
            amountTokens:        String(safeClientTokens),
            txHash,
            stage:               stage ?? 1,
            verificationStatus:  "TIMEOUT_UNVERIFIED",
          })
          .returning({ id: purchases.id });

        logger.info(
          { purchaseId: purchase?.id, wallet: walletAddress.slice(0, 8) + "…", clientUsd: safeClientUsd },
          "[PURCHASE] ✓ Saved as TIMEOUT_UNVERIFIED — needs manual review",
        );

        if (referralCode) {
          logger.warn(
            { referralCode, purchaseId: purchase?.id },
            "[REFERRAL] Skipped for TIMEOUT_UNVERIFIED purchase — needs manual admin review",
          );
        }

        res.json({
          success:    true,
          purchaseId: purchase?.id,
          note:       "Saved pending on-chain verification",
        });
        return;
      }

      if (!verification.valid) {
        logger.warn(
          {
            txHash: txHash.slice(0, 16) + "…",
            reason: verification.reason,
            ip,
            network: SOLANA_NETWORK,
            security: true,
          },
          "[PURCHASE] Rejected: TX_VERIFICATION_FAILED",
        );
        res.status(400).json({
          error:   `Transaction verification failed on ${SOLANA_NETWORK}`,
          reason:  verification.reason,
          network: SOLANA_NETWORK,
          code:    "TX_VERIFICATION_FAILED",
        }); return;
      }

      // `verification.valid === true` guarantees onChain is populated
      if (!verification.onChain) {
        // This should NEVER happen — if it does, it's a code bug
        logger.error(
          { txHash: txHash.slice(0, 16) + "…" },
          "[PURCHASE] CRITICAL: valid=true but onChain is undefined — internal bug",
        );
        res.status(500).json({ error: "Internal verification error", code: "INTERNAL_ERROR" }); return;
      }

      const oc = verification.onChain;

      // ── Server-extracted USD must be > 0 ──────────────────────────────
      if (oc.estimatedUsd <= 0) {
        logger.warn(
          {
            txHash:       txHash.slice(0, 16) + "…",
            paymentType:  oc.paymentType,
            solSpentSol:  oc.solSpentSol,
            usdtSpentUnits: oc.usdtSpentUnits,
            ip,
          },
          "[PURCHASE] Rejected: AMOUNT_EXTRACTION_FAILED — could not determine USD from on-chain data",
        );
        res.status(400).json({
          error:  "Could not extract payment amount from transaction",
          detail: "Balance delta was zero or negative. Ensure the transaction actually transferred funds to the presale vault.",
          code:   "AMOUNT_EXTRACTION_FAILED",
        }); return;
      }

      // ── Reject if client USD is manipulated (> 50% mismatch with server) ─
      logAmountComparison("amountUsd", safeClientUsd, oc.estimatedUsd, txHash);
      const usdPct = safeClientUsd > 0 && oc.estimatedUsd > 0
        ? Math.abs(safeClientUsd - oc.estimatedUsd) / oc.estimatedUsd
        : 0;

      if (usdPct > MISMATCH_BLOCK_PCT) {
        logger.warn(
          {
            clientUsd: safeClientUsd, serverUsd: oc.estimatedUsd,
            discrepancyPct: (usdPct * 100).toFixed(1) + "%",
            txHash: txHash.slice(0, 16) + "…", ip,
            security: true, alert: true, alertType: "AMOUNT_MANIPULATION",
          },
          "[PURCHASE] Rejected: AMOUNT_MANIPULATION — client USD exceeds 50% deviation from on-chain value",
        );
        res.status(400).json({
          error:  "Amount mismatch with on-chain data",
          code:   "AMOUNT_MANIPULATION",
          detail: "The USD amount you provided differs significantly from what the transaction shows.",
        }); return;
      }

      // ── Always use server-extracted USD ───────────────────────────────
      acceptedUsd = oc.estimatedUsd;

      // ── Tokens: prefer server-computed, else store 0 (needs admin fix) ─
      logAmountComparison("amountTokens", safeClientTokens, oc.estimatedTokens ?? 0, txHash);

      if (oc.estimatedTokens !== null && oc.estimatedTokens > 0) {
        acceptedTokens     = oc.estimatedTokens;
        verificationSource = "SERVER_VERIFIED_ONCHAIN";
      } else {
        // Stage price PDA temporarily unavailable — store 0 tokens, never client value
        acceptedTokens     = 0;
        verificationSource = "SERVER_VERIFIED_ONCHAIN_TOKENS_PENDING";
        logger.warn(
          {
            txHash: txHash.slice(0, 16) + "…",
            stageIndex,
            acceptedUsd,
            clientTokens: safeClientTokens,
            note: "Stage price unavailable from PDA — acceptedTokens=0, needs admin correction. Client tokens REJECTED.",
          },
          "[PURCHASE] WARN: Stage token price unavailable — acceptedTokens set to 0 (NOT from client)",
        );
      }

      logger.info(
        {
          acceptedUsd,
          acceptedTokens,
          paymentType:  oc.paymentType,
          source:       verificationSource,
          network:      SOLANA_NETWORK,
        },
        "[PURCHASE] Accepted server-verified amounts",
      );
    }

    // ── Save purchase to DB ──────────────────────────────────────────────
    const safeWalletType = walletType && ALLOWED_WALLET_TYPES.has(walletType.toLowerCase())
      ? walletType.toLowerCase() : "unknown";

    const [purchase] = await db
      .insert(purchases)
      .values({
        walletAddress,
        walletType:   safeWalletType,
        network:      SOLANA_NETWORK, // always use server-side network, not client input
        amountUsd:    String(acceptedUsd),
        amountTokens: String(acceptedTokens),
        txHash,
        stage: stage ?? 1,
      })
      .returning({ id: purchases.id });

    logger.info(
      {
        purchaseId:    purchase?.id,
        wallet:        walletAddress.slice(0, 8) + "…",
        acceptedUsd,
        acceptedTokens,
        source:        verificationSource,
        network:       SOLANA_NETWORK,
      },
      "[PURCHASE] ✓ Saved to DB",
    );

    // ── Referral processing ──────────────────────────────────────────────
    if (referralCode) {
      const code = referralCode.trim().slice(0, 16);
      logger.info({ code, buyer: walletAddress.slice(0, 8) + "…" }, "[REFERRAL] Processing referral code");

      try {
        const codeRow = await db
          .select()
          .from(referralCodes)
          .where(eq(referralCodes.code, code))
          .limit(1);

        if (codeRow.length === 0) {
          logger.warn({ code }, "[REFERRAL] Code not found in DB — no referral created");
        } else {
          const referrerWallet = codeRow[0].walletAddress;
          logger.info({ code, referrer: referrerWallet.slice(0, 8) + "…" }, "[REFERRAL] Code resolved to referrer");

          if (referrerWallet.toLowerCase() === walletAddress.toLowerCase()) {
            logger.warn({ referrer: referrerWallet.slice(0, 8) }, "[REFERRAL] SELF_REFERRAL_BLOCKED");
          } else {
            const alreadyReferred = await db
              .select({ id: referrals.id })
              .from(referrals)
              .where(eq(referrals.referredWallet, walletAddress))
              .limit(1);

            if (alreadyReferred.length > 0) {
              logger.warn(
                { buyer: walletAddress.slice(0, 8) + "…", existingReferralId: alreadyReferred[0].id },
                "[REFERRAL] DOUBLE_REFERRAL_BLOCKED — wallet already has a referral",
              );
            } else {
              // ── Server-side reward calculation (from SERVER-VERIFIED values only) ─
              const rewardTokens = acceptedTokens > 0
                ? ((acceptedTokens * REWARD_RATE) / 100).toFixed(6)
                : "0";
              const rewardUsd = acceptedUsd > 0
                ? ((acceptedUsd * REWARD_RATE) / 100).toFixed(6)
                : "0";

              logger.info(
                {
                  referrer:   referrerWallet.slice(0, 8) + "…",
                  buyer:      walletAddress.slice(0, 8) + "…",
                  rewardTokens,
                  rewardUsd,
                  rewardRate: REWARD_RATE,
                  basedOn:    verificationSource,
                  source:     "SERVER_VERIFIED_REWARD",
                },
                "[REFERRAL] Reward calculated from server-verified amounts",
              );

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
                logger.info(
                  { referrer: referrerWallet.slice(0, 8) + "…", rewardTokens, rewardUsd },
                  "[REFERRAL] ✓ Referral reward committed to DB",
                );
              } catch (txErr) {
                await client.query("ROLLBACK");
                logger.error({ txErr }, "[REFERRAL] DB transaction ROLLBACK");
              } finally {
                client.release();
              }
            }
          }
        }
      } catch (refErr) {
        logger.error({ refErr }, "[REFERRAL] Unexpected error — purchase already saved");
      }
    } else {
      logger.info({ wallet: walletAddress.slice(0, 8) + "…" }, "[PURCHASE] No referral code provided");
    }

    res.json({ success: true, purchaseId: purchase?.id, network: SOLANA_NETWORK });
  } catch (err) {
    logger.error({ err }, "[PURCHASE] Unhandled error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── Public: user's own purchases from DB (by wallet address) ─────────────
const myPurchasesLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

router.get("/my-purchases/:wallet", myPurchasesLimiter, async (req: Request, res: Response) => {
  const { wallet } = req.params;
  if (!wallet || !SOLANA_ADDR_RE.test(wallet)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }
  try {
    const rows = await db
      .select({
        id: purchases.id,
        network: purchases.network,
        amountUsd: purchases.amountUsd,
        amountTokens: purchases.amountTokens,
        txHash: purchases.txHash,
        stage: purchases.stage,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .where(eq(purchases.walletAddress, wallet))
      .orderBy(desc(purchases.createdAt))
      .limit(50);

    return res.json({ purchases: rows });
  } catch (err) {
    logger.error({ err }, "[MY-PURCHASES] Failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Public activity feed (last 50 purchases, anonymized) ─────────────────
const activityLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

router.get("/activity", activityLimiter, async (req: Request, res: Response) => {
  try {
    const PAGE_SIZE = 20;
    const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);
    const { sql: sqlFn, count: countFn } = await import("drizzle-orm");

    const [totalRow] = await db.select({ total: countFn() }).from(purchases);
    const total = Number(totalRow?.total ?? 0);

    const rows = await db
      .select({
        id: purchases.id,
        walletAddress: purchases.walletAddress,
        network: purchases.network,
        amountUsd: purchases.amountUsd,
        amountTokens: purchases.amountTokens,
        txHash: purchases.txHash,
        stage: purchases.stage,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .orderBy(desc(purchases.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset);

    const activity = rows.map((r) => ({
      id: r.id,
      wallet: r.walletAddress.slice(0, 4) + "…" + r.walletAddress.slice(-4),
      network: r.network,
      amountUsd: r.amountUsd,
      amountTokens: r.amountTokens,
      txHash: r.txHash ?? null,
      stage: r.stage ?? 1,
      createdAt: r.createdAt,
    }));

    res.json({ activity, total, offset, hasMore: offset + PAGE_SIZE < total });
  } catch (err) {
    logger.error({ err }, "[ACTIVITY] Failed to fetch activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
