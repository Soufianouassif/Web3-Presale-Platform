import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── حماية نقطة نهاية المزامنة: سر مشترك + rate limit ────────────────────────
const CRON_SECRET = process.env.CRON_SECRET ?? null;
const IS_PROD = process.env.NODE_ENV === "production";

const syncLimiter = rateLimit({
  windowMs: 5 * 60 * 1_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sync requests" },
});

function isCronAuthorized(req: import("express").Request): boolean {
  // في production يجب وجود CRON_SECRET دائماً
  if (!CRON_SECRET) {
    // لا نسمح بأي طلب خارجي إذا لم يُضبط CRON_SECRET في production
    if (IS_PROD) return false;
    // في development فقط: نسمح من localhost
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? req.socket?.remoteAddress ?? "";
    return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  }
  const auth = req.headers["authorization"] ?? "";
  return auth === `Bearer ${CRON_SECRET}`;
}

const PROGRAM_ID = new PublicKey("AUvWWYPitvKFRBYNQqQGnPD1EaNbNpXSvT4ZFpssH145");
const CONFIG_PDA = new PublicKey("BnHWhbNVB3cjCq7UA1KvBoW8JGe44yspCBSXPTDocuMi");
const SOLANA_RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

async function getDiscriminator(name: string): Promise<Buffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`global:${name}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hashBuffer).slice(0, 8);
}

async function fetchSolPriceUsd(): Promise<number> {
  const r = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    { signal: AbortSignal.timeout(8_000) }
  );
  if (!r.ok) throw new Error(`CoinGecko error: ${r.status}`);
  const d = await r.json() as { solana?: { usd?: number } };
  const price = d?.solana?.usd;
  if (!price || price <= 0) throw new Error("Invalid SOL price from CoinGecko");
  return price;
}

async function syncSolPriceOnChain(priceUsd: number): Promise<string> {
  const raw = process.env.ADMIN_KEYPAIR_JSON;
  if (!raw) throw new Error("ADMIN_KEYPAIR_JSON env var not set");

  const bytes: number[] = JSON.parse(raw);
  if (!Array.isArray(bytes) || bytes.length !== 64)
    throw new Error("ADMIN_KEYPAIR_JSON must be a JSON array of 64 numbers");

  const keypair = Keypair.fromSecretKey(new Uint8Array(bytes));
  const connection = new Connection(SOLANA_RPC, "confirmed");

  const discriminator = await getDiscriminator("update_sol_price");
  const priceE6 = BigInt(Math.round(priceUsd * 1_000_000));
  const argsBuf = Buffer.alloc(8);
  argsBuf.writeBigUInt64LE(priceE6, 0);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: CONFIG_PDA,        isSigner: false, isWritable: true },
      { pubkey: keypair.publicKey, isSigner: true,  isWritable: false },
    ],
    data: Buffer.concat([discriminator, argsBuf]),
  });

  const tx = new Transaction();
  tx.feePayer = keypair.publicKey;
  tx.add(ix);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.sign(keypair);

  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  return sig;
}

let lastSyncAt: Date | null = null;
let lastPrice: number | null = null;

export async function runSolPriceSync(): Promise<void> {
  try {
    const price = await fetchSolPriceUsd();
    const sig = await syncSolPriceOnChain(price);
    lastSyncAt = new Date();
    lastPrice = price;
    logger.info({ price, sig }, "SOL price synced on-chain");
  } catch (err) {
    logger.error({ err }, "SOL price sync failed");
  }
}

router.post("/cron/sync-sol-price", syncLimiter, async (req, res) => {
  if (!isCronAuthorized(req)) {
    res.status(401).json({ ok: false, error: "Unauthorized — Bearer token required" });
    return;
  }
  if (!process.env.ADMIN_KEYPAIR_JSON) {
    res.status(503).json({ ok: false, error: "ADMIN_KEYPAIR_JSON not configured" });
    return;
  }
  try {
    const price = await fetchSolPriceUsd();
    const sig = await syncSolPriceOnChain(price);
    lastSyncAt = new Date();
    lastPrice = price;
    res.json({ ok: true, price, sig });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/cron/sync-sol-price/status", (_req, res) => {
  res.json({ lastSyncAt, lastPrice });
});

export default router;
