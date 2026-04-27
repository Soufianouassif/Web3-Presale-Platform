import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";

const router = Router();

const _rpcProxyRaw = process.env.SOLANA_RPC_URL ?? "";
const SOLANA_RPC = (_rpcProxyRaw.startsWith("http://") || _rpcProxyRaw.startsWith("https://")) ? _rpcProxyRaw : "https://api.devnet.solana.com";
const IS_PROD = process.env.NODE_ENV === "production";

const ALLOWED_ORIGINS_EXACT: string[] = [
  "https://pwifecoin.fun",
  "https://www.pwifecoin.fun",
  ...(IS_PROD ? [] : [
    "http://localhost",
    "http://localhost:80",
    "http://localhost:22793",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5000",
  ]),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
const VERCEL_PREVIEW_DOMAIN = process.env.VERCEL_PREVIEW_DOMAIN ?? null;
const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN ?? null;

function isOriginAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS_EXACT.includes(origin)) return true;
  if (VERCEL_PREVIEW_DOMAIN && origin.endsWith(`.${VERCEL_PREVIEW_DOMAIN}`)) return true;
  if (VERCEL_PREVIEW_DOMAIN && origin === `https://${VERCEL_PREVIEW_DOMAIN}`) return true;
  // Allow Replit dev domains in development
  if (!IS_PROD && origin.endsWith(".replit.dev")) return true;
  if (!IS_PROD && REPLIT_DEV_DOMAIN && origin.includes(REPLIT_DEV_DOMAIN)) return true;
  return false;
}

const READ_METHODS = new Set([
  "getAccountInfo",
  "getBalance",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getRecentBlockhash",
  "getSignatureStatuses",
  "getTokenAccountsByOwner",
  "getTokenSupply",
  "getTransaction",
  "getVersion",
]);
const TX_METHODS = new Set([
  "sendTransaction",
  "simulateTransaction",
]);
const DEV_ONLY_METHODS = new Set([
  "requestAirdrop",
]);

const ALLOWED_METHODS = new Set<string>([
  ...READ_METHODS,
  ...TX_METHODS,
  ...(!IS_PROD ? DEV_ONLY_METHODS : []),
]);

// ── Rate limiting: 60 طلب كل دقيقة لكل IP ──────────────────────────────
const rpcLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

const txLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many transaction requests, please slow down." },
});

function runLimiter(limiter: ReturnType<typeof rateLimit>, req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    limiter(req, res, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Health-check probe sent by web3.js Connection
router.get("/rpc", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

router.post("/rpc", rpcLimiter, async (req: Request, res: Response) => {
  try {
    const body = req.body as { method?: string; id?: unknown; jsonrpc?: string; params?: unknown };

    const origin = req.headers.origin;
    if (!origin || typeof origin !== "string" || !isOriginAllowed(origin)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }

    // تحقق من الطريقة المطلوبة
    if (!body.method || !ALLOWED_METHODS.has(body.method)) {
      res.status(403).json({
        error: "Method not allowed",
        method: body.method ?? "(missing)",
      });
      return;
    }

    if (TX_METHODS.has(body.method)) {
      await runLimiter(txLimiter, req, res);
      if (res.headersSent) return;
    }

    const response = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json(IS_PROD ? { error: "RPC proxy error" } : { error: "RPC proxy error", detail: String(err) });
  }
});

export default router;
