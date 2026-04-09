import { Router } from "express";
import rateLimit from "express-rate-limit";

const router = Router();

const chainLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

const SOLANA_RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const CONFIG_PDA = "BnHWhbNVB3cjCq7UA1KvBoW8JGe44yspCBSXPTDocuMi";

let solPriceCache: { price: number; fetchedAt: number } = { price: 0, fetchedAt: 0 };
let chainStateCache: { data: unknown; fetchedAt: number } | null = null;
const PRICE_TTL_MS   = 60 * 1000;        // 1 min
const CHAIN_TTL_MS   = 15 * 1000;        // 15 sec

async function fetchSolPrice(): Promise<number> {
  const now = Date.now();
  if (now - solPriceCache.fetchedAt < PRICE_TTL_MS) return solPriceCache.price;
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) throw new Error();
    const d = await r.json() as { solana?: { usd?: number } };
    const price = d?.solana?.usd;
    if (price && price > 0) {
      solPriceCache = { price, fetchedAt: now };
      return price;
    }
  } catch { /* keep cached */ }
  return solPriceCache.price;
}

async function fetchPresaleChainState() {
  const now = Date.now();
  if (chainStateCache && now - chainStateCache.fetchedAt < CHAIN_TTL_MS) {
    return chainStateCache.data;
  }

  const body = JSON.stringify({
    jsonrpc: "2.0", id: 1,
    method: "getAccountInfo",
    params: [CONFIG_PDA, { encoding: "base64" }],
  });

  const rpcRes = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  const rpcJson = await rpcRes.json() as { result?: { value?: { data?: [string, string] } } };
  const b64 = rpcJson?.result?.value?.data?.[0];
  if (!b64) throw new Error("Account not found");

  const raw = Buffer.from(b64, "base64");
  let off = 8; // skip 8-byte Anchor discriminator

  const readPk  = () => { const v = raw.slice(off, off + 32).toString("hex"); off += 32; return v; };
  const readU8  = () => { const v = raw[off]; off += 1; return v; };
  const readBool= () => readU8() !== 0;
  const readI64 = () => { const v = raw.readBigInt64LE(off); off += 8; return v.toString(); };
  const readU64 = () => { const v = raw.readBigUInt64LE(off); off += 8; return v.toString(); };

  readPk(); // authority (not needed)
  readPk(); // treasury
  readPk(); // usdt_treasury_ata
  readPk(); // usdt_mint

  const currentStage     = readU8();
  const isActive         = readBool();
  const isPaused         = readBool();
  const presaleStart     = readI64();
  const presaleEnd       = readI64();
  const claimOpensAt     = readI64();
  const totalTokensSold  = readU64();
  const totalSolRaised   = readU64();
  const totalUsdtRaised  = readU64();
  readU64(); // totalManualTokens
  const solPriceUsdE6    = readU64();

  const stages = [];
  for (let i = 0; i < 4; i++) {
    stages.push({
      tokensPerRawUsdtScaled: readU64(),
      maxTokens: readU64(),
      tokensSold: readU64(),
    });
  }
  const buyersCount = readU64();

  const data = {
    currentStage,
    isActive,
    isPaused,
    presaleStart,
    presaleEnd,
    claimOpensAt,
    totalTokensSold,
    totalSolRaised,
    totalUsdtRaised,
    solPriceUsdE6,
    buyersCount,
    stages,
  };

  chainStateCache = { data, fetchedAt: now };
  return data;
}

router.get("/sol-price", chainLimiter, async (_req, res) => {
  try {
    const price = await fetchSolPrice();
    res.json({ price, currency: "USD", updatedAt: new Date().toISOString() });
  } catch {
    res.json({ price: solPriceCache.price, currency: "USD", updatedAt: new Date().toISOString() });
  }
});

const IS_PROD = process.env.NODE_ENV === "production";

router.get("/presale/on-chain", chainLimiter, async (_req, res) => {
  try {
    const [state, solPrice] = await Promise.all([
      fetchPresaleChainState(),
      fetchSolPrice(),
    ]);
    res.json({ ...state as object, solPriceUsd: solPrice });
  } catch (err) {
    res.status(502).json({
      error: "Failed to fetch on-chain state",
      ...(IS_PROD ? {} : { detail: String(err) }),
    });
  }
});

export default router;
