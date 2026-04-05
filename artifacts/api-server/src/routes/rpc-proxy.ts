import { Router } from "express";

const router = Router();

// Strip accidental "KEY=value" format if user entered it that way
const rawRpc = process.env.SOLANA_RPC_URL ?? "";
const SOLANA_RPC = rawRpc.includes("=")
  ? rawRpc.split("=").slice(1).join("=").trim()
  : rawRpc.trim() || "https://api.mainnet-beta.solana.com";

// Health-check probe sent by web3.js Connection
router.get("/rpc", (_req, res) => {
  res.json({ status: "ok" });
});

router.post("/rpc", async (req, res) => {
  try {
    const response = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "RPC proxy error", detail: String(err) });
  }
});

export default router;
