import { Router } from "express";

const router = Router();

const SOLANA_RPC = "https://api.devnet.solana.com";

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
