import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { Connection } from "@solana/web3.js";
import { db, pool } from "@workspace/db";
import { pageVisits, walletConnections, purchases, referralCodes, referrals } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

const SOLANA_NETWORK    = (process.env.SOLANA_NETWORK ?? "devnet").toLowerCase();
const SOLANA_RPC        = process.env.SOLANA_RPC_URL || process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const PRESALE_PROGRAM_ID = "AUvWWYPitvKFRBYNQqQGnPD1EaNbNpXSvT4ZFpssH145";
const CONFIG_PDA         = "BnHWhbNVB3cjCq7UA1KvBoW8JGe44yspCBSXPTDocuMi";

// skip on-chain verification on devnet by default (public RPC too slow for serverless timeouts)
const REQUIRE_ONCHAIN_VERIFICATION = process.env.REQUIRE_ONCHAIN_VERIFICATION !== undefined
  ? process.env.REQUIRE_ONCHAIN_VERIFICATION !== "false"
  : SOLANA_NETWORK === "mainnet";

const USDT_MINT = SOLANA_NETWORK === "mainnet"
  ? (process.env.USDT_MINT ?? "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")
  : (process.env.USDT_MINT_DEVNET ?? "8PieQJ43S4PpVWQaBZp4TaHFZGoAA9FsDzYbPftVfo6X");

const USDT_DECIMALS = 6;

const MISMATCH_WARN_PCT  = 0.15;
const MISMATCH_BLOCK_PCT = 0.50;

const REWARD_RATE = 5.0; // 5% to referrer

logger.info(
  { SOLANA_NETWORK, SOLANA_RPC, PRESALE_PROGRAM_ID, CONFIG_PDA, USDT_MINT, REQUIRE_ONCHAIN_VERIFICATION },
  "[TRACKER] Network configuration loaded",
);

// lazy Solana connection
let _connection: Connection | null = null;
function getConnection(): Connection {
  if (!_connection) _connection = new Connection(SOLANA_RPC, "confirmed");
  return _connection;
}

// SOL price cache, refreshed every 2 min
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

  // last resort fallback if cache is also empty
  logger.warn(
    { security: true, source: "FALLBACK_$150" },
    "[SOL_PRICE] CoinGecko unreachable and cache empty — using $150 fallback",
  );
  return 150;
}

// token price from on-chain presale config PDA (30s cache)
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

      readPk(); readPk(); readPk(); readPk();
      readU8(); readBool(); readBool();
      readI64(); readI64(); readI64();
      readU64(); readU64(); readU64(); readU64(); readU64();

      const tokensPerRawUsdtScaled: bigint[] = [];
      for (let i = 0; i < 4; i++) {
        tokensPerRawUsdtScaled.push(readU64());
        readU64();
        readU64();
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

const SOLANA_ADDRESS_RE    = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TX_HASH_RE           = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;
const ALLOWED_WALLET_TYPES = new Set(["phantom", "solflare", "backpack", "okx", "unknown"]);

function getIp(req: Request): string | null {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]?.trim() ?? null;
  return req.socket?.remoteAddress ?? null;
}

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
  isTimeout?: boolean;
}

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
    // devnet RPCs are slow, retry up to 5x
    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY_MS = 3_000;
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

    // account[0] = fee payer = buyer
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

    const preBalances  = tx.meta?.preBalances  ?? [];
    const postBalances = tx.meta?.postBalances ?? [];
    const fee          = tx.meta?.fee ?? 0;
    const preTkn       = tx.meta?.preTokenBalances  ?? [];
    const postTkn      = tx.meta?.postTokenBalances ?? [];

    // use server-side USDT mint, never trust client
    const buyerPreUsdt  = preTkn.find( (b) => b.mint === USDT_MINT && b.owner === expectedWallet);
    const buyerPostUsdt = postTkn.find((b) => b.mint === USDT_MINT && b.owner === expectedWallet);

    let onChain: OnChainAmounts;

    if (buyerPreUsdt && buyerPostUsdt) {
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

// log discrepancies between client and server amounts (server values are authoritative)
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

    // prevent replay attacks
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

    const safeClientUsd    = Math.max(0, Number(clientUsd)    || 0);
    const safeClientTokens = Math.max(0, Number(clientTokens) || 0);

    let acceptedUsd: number;
    let acceptedTokens: number;
    let verificationSource: string;

    if (!REQUIRE_ONCHAIN_VERIFICATION) {
      // CI/test mode only — not for production
      acceptedUsd    = safeClientUsd;
      acceptedTokens = safeClientTokens;
      verificationSource = "CLIENT_UNVERIFIED_CI_ONLY";

      logger.warn(
        {
          wallet: walletAddress.slice(0, 8) + "…",
          txHash: txHash.slice(0, 16) + "…",
          safeClientUsd,
          safeClientTokens,
          REQUIRE_ONCHAIN_VERIFICATION,
          security: true,
          alertType: "CI_UNVERIFIED_PURCHASE",
        },
        "[PURCHASE] ⚠ ONCHAIN VERIFICATION DISABLED — accepting client values (CI/test only)",
      );
    } else {
      const stageIndex = typeof stage === "number" && stage >= 0 && stage <= 3 ? stage : 0;
      const verifyResult = await verifyTransaction(txHash, walletAddress, stageIndex, network);

      if (!verifyResult.valid) {
        if (verifyResult.isTimeout) {
          logger.warn(
            { txHash: txHash.slice(0, 16) + "…", wallet: walletAddress.slice(0, 8) + "…", reason: verifyResult.reason, ip },
            "[PURCHASE] Verification timeout — storing with timeout flag",
          );
          acceptedUsd    = safeClientUsd;
          acceptedTokens = safeClientTokens;
          verificationSource = "CLIENT_TIMEOUT_FALLBACK";
        } else {
          logger.warn(
            {
              txHash: txHash.slice(0, 16) + "…",
              wallet: walletAddress.slice(0, 8) + "…",
              reason: verifyResult.reason,
              ip,
              security: true,
              alertType: "TX_VERIFICATION_FAILED",
            },
            "[PURCHASE] Rejected: transaction verification FAILED",
          );
          res.status(400).json({ error: `Transaction verification failed: ${verifyResult.reason}` }); return;
        }
      } else {
        const oc = verifyResult.onChain!;
        acceptedUsd    = oc.estimatedUsd;
        acceptedTokens = oc.estimatedTokens ?? safeClientTokens;
        verificationSource = "ONCHAIN_VERIFIED";

        logAmountComparison("amountUsd",    safeClientUsd,    acceptedUsd,    txHash);
        logAmountComparison("amountTokens", safeClientTokens, acceptedTokens, txHash);

        const pctUsd = acceptedUsd > 0 ? Math.abs(safeClientUsd - acceptedUsd) / acceptedUsd : 0;
        if (pctUsd > MISMATCH_BLOCK_PCT) {
          logger.warn(
            {
              txHash: txHash.slice(0, 16) + "…",
              wallet: walletAddress.slice(0, 8) + "…",
              clientUsd: safeClientUsd,
              serverUsd: acceptedUsd,
              discrepancyPct: (pctUsd * 100).toFixed(1) + "%",
              ip,
              security: true,
              alertType: "AMOUNT_MANIPULATION_BLOCKED",
            },
            "[PURCHASE] Rejected: amount manipulation detected",
          );
          res.status(400).json({ error: "Amount manipulation detected" }); return;
        }
      }
    }

    const safeWalletType = ALLOWED_WALLET_TYPES.has((walletType ?? "").toLowerCase())
      ? (walletType ?? "unknown").toLowerCase() : "unknown";

    const [inserted] = await db.insert(purchases).values({
      walletAddress,
      walletType:    safeWalletType,
      network:       String(network).slice(0, 20),
      amountUsd:     String(acceptedUsd),
      amountTokens:  String(acceptedTokens),
      txHash,
      stage:         typeof stage === "number" ? stage : null,
      referralCode:  referralCode ? String(referralCode).slice(0, 16) : null,
      verificationSource,
      ip,
    }).returning({ id: purchases.id });

    logger.info(
      {
        purchaseId: inserted.id,
        wallet: walletAddress.slice(0, 8) + "…",
        txHash: txHash.slice(0, 16) + "…",
        acceptedUsd,
        acceptedTokens,
        verificationSource,
        source: "DB_WRITE",
      },
      "[PURCHASE] ✓ Purchase saved to DB",
    );

    // handle referral if code provided
    if (referralCode) {
      try {
        const codeRow = await db
          .select({ walletAddress: referralCodes.walletAddress })
          .from(referralCodes)
          .where(eq(referralCodes.code, referralCode.trim().slice(0, 16)))
          .limit(1);

        if (codeRow.length > 0) {
          const referrerWallet = codeRow[0].walletAddress;
          if (referrerWallet.toLowerCase() !== walletAddress.toLowerCase()) {
            const alreadyReferred = await db
              .select({ id: referrals.id })
              .from(referrals)
              .where(eq(referrals.referredWallet, walletAddress))
              .limit(1);

            if (alreadyReferred.length === 0) {
              const rewardTokens = acceptedTokens > 0 ? ((acceptedTokens * REWARD_RATE) / 100).toFixed(6) : "0";
              const rewardUsd    = acceptedUsd    > 0 ? ((acceptedUsd    * REWARD_RATE) / 100).toFixed(6) : "0";

              const client = await pool.connect();
              try {
                await client.query("BEGIN");
                await client.query(
                  `INSERT INTO referrals (referrer_wallet, referred_wallet, purchase_id, reward_rate, reward_tokens, reward_usd, status)
                   VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
                  [referrerWallet, walletAddress, inserted.id, REWARD_RATE, rewardTokens, rewardUsd],
                );
                await client.query(
                  `UPDATE referral_codes
                   SET total_referrals = total_referrals + 1,
                       total_reward_tokens = total_reward_tokens + $1,
                       total_reward_usd = total_reward_usd + $2
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
                { code: referralCode, referrer: referrerWallet.slice(0, 8), buyer: walletAddress.slice(0, 8), rewardTokens, rewardUsd },
                "[PURCHASE] Referral reward recorded",
              );
            }
          }
        }
      } catch (refErr) {
        // don't fail the purchase if referral recording fails
        logger.warn({ refErr, referralCode }, "[PURCHASE] Referral processing failed (non-fatal)");
      }
    }

    res.json({
      success: true,
      purchaseId: inserted.id,
      acceptedUsd,
      acceptedTokens,
      verificationSource,
    });
  } catch (err) {
    logger.error({ err }, "[PURCHASE] Unexpected error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/track/stats", async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(
      `SELECT
        (SELECT COALESCE(SUM(amount_usd::numeric), 0) FROM purchases) as total_raised_usd,
        (SELECT COALESCE(SUM(amount_tokens::numeric), 0) FROM purchases) as total_tokens_sold,
        (SELECT COUNT(DISTINCT wallet_address) FROM purchases) as unique_buyers,
        (SELECT COUNT(*) FROM purchases) as total_purchases`
    );
    res.json(result.rows[0] ?? {});
  } catch (err) {
    logger.error({ err }, "[STATS] Failed to fetch stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/track/recent", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        walletAddress: purchases.walletAddress,
        amountUsd:     purchases.amountUsd,
        amountTokens:  purchases.amountTokens,
        network:       purchases.network,
        createdAt:     purchases.createdAt,
      })
      .from(purchases)
      .orderBy(desc(purchases.createdAt))
      .limit(10);

    res.json(rows.map((r) => ({
      ...r,
      walletAddress: r.walletAddress.slice(0, 4) + "…" + r.walletAddress.slice(-4),
    })));
  } catch (err) {
    logger.error({ err }, "[RECENT] Failed to fetch recent purchases");
    res.status(500).json({ error: "Failed to fetch recent purchases" });
  }
});

export default router;
