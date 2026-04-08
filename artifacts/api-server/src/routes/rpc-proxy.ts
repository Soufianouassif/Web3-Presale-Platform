import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";

const router = Router();

const SOLANA_RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

// ── الطرق المسموح بها فقط (قراءة فقط + إرسال معاملات) ──────────────────
const ALLOWED_METHODS = new Set([
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
  "requestAirdrop",
  "sendTransaction",
  "simulateTransaction",
]);

// ── Rate limiting: 60 طلب كل دقيقة لكل IP ──────────────────────────────
const rpcLimiter = rateLimit({
  windowMs: 60 * 1_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

// Health-check probe sent by web3.js Connection
router.get("/rpc", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

router.post("/rpc", rpcLimiter, async (req: Request, res: Response) => {
  try {
    const body = req.body as { method?: string; id?: unknown; jsonrpc?: string; params?: unknown };

    // تحقق من الطريقة المطلوبة
    if (!body.method || !ALLOWED_METHODS.has(body.method)) {
      res.status(403).json({
        error: "Method not allowed",
        method: body.method ?? "(missing)",
      });
      return;
    }

    const response = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "RPC proxy error", detail: String(err) });
  }
});

export default router;
