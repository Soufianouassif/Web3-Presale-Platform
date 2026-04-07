import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { adminApi, type AdminStats } from "@/lib/admin-api";
import { withdrawSol, withdrawSolWithKeypair, updateSolPrice, connection, SOL_VAULT_PDA, fetchPresaleState, stageTokenPriceUsd, type PresaleState } from "@/lib/presale-contract";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// Token amounts are stored as whole tokens (no decimals) — values reach trillions
function fmtTokens(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000)     return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)         return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)             return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function StatCard({ title, value, sub, color = "green" }: { title: string; value: string | number; sub?: string; color?: "green" | "blue" | "purple" | "yellow" }) {
  const colors = {
    green: "from-[#39ff14]/10 to-[#39ff14]/5 border-[#39ff14]/20 text-[#39ff14]",
    blue: "from-[#00d4ff]/10 to-[#00d4ff]/5 border-[#00d4ff]/20 text-[#00d4ff]",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400",
    yellow: "from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 text-yellow-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-6`}>
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className={`text-3xl font-bold`}>{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  variant = "default",
  disabled = false,
  loading = false,
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "success" | "warning";
  disabled?: boolean;
  loading?: boolean;
}) {
  const variants = {
    default: "bg-white/10 hover:bg-white/20 border-white/20",
    danger: "bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-300",
    success: "bg-[#39ff14]/20 hover:bg-[#39ff14]/30 border-[#39ff14]/40 text-[#39ff14]",
    warning: "bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/40 text-yellow-300",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-5 py-3 rounded-xl border text-sm font-medium transition-all ${variants[variant]} disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2`}
    >
      {loading && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
      {label}
    </button>
  );
}

// ─── Withdraw Panel ──────────────────────────────────────────────────────────
type WithdrawStep = "idle" | "connecting" | "signing" | "confirming" | "success" | "error";

// The exact authority registered in the Config PDA on-chain
// Verified by reading account bytes: hex 53a0aa403c121009d543c6840b4a86e05c2b018a2fe2e89027757abc9271471b
const PRESALE_AUTHORITY = "6dSw3tPGZtiykZXoSx4uPb6jPc95WAV39fHbN1QG7Aci";

type WithdrawMethod = "file" | "phantom" | "solflare";

function WithdrawPanel() {
  const [vaultSol, setVaultSol]     = useState<number | null>(null);
  const [method, setMethod]         = useState<WithdrawMethod>("file");
  const [walletAddr, setWalletAddr] = useState<string>("");
  const [keypairBytes, setKeypairBytes] = useState<number[] | null>(null);
  const [fileAddr, setFileAddr]     = useState<string>("");
  const [step, setStep]             = useState<WithdrawStep>("idle");
  const [txSig, setTxSig]           = useState("");
  const [withdrawn, setWithdrawn]   = useState<string>("");
  const [errMsg, setErrMsg]         = useState("");

  // Fetch vault balance
  useEffect(() => {
    connection.getBalance(SOL_VAULT_PDA)
      .then(lamps => setVaultSol(lamps / 1e9))
      .catch(() => setVaultSol(null));
  }, []);

  // ── Keypair file handler ────────────────────────────────────
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const bytes: number[] = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(bytes) || bytes.length !== 64) {
          setErrMsg("Invalid keypair file — expected a JSON array of 64 numbers.");
          setStep("error");
          return;
        }
        // Derive public key from last 32 bytes (ed25519 pubkey is bytes [32..64])
        // We'll let the contract derive it; just validate address via bs58 math
        setKeypairBytes(bytes);
        // Rough address preview using last 32 bytes as pubkey
        const pubBytes = new Uint8Array(bytes.slice(32));
        const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        let n = BigInt("0x" + Array.from(pubBytes).map(b => b.toString(16).padStart(2,"0")).join(""));
        let addr = "";
        while (n > 0n) { const r = n % 58n; n = n / 58n; addr = ALPHA[Number(r)] + addr; }
        setFileAddr(addr);
        setStep("idle");
        setErrMsg("");
      } catch {
        setErrMsg("Could not parse the file. Make sure it's the keypair JSON from Solana Playground.");
        setStep("error");
      }
    };
    reader.readAsText(file);
  }

  // ── Phantom/Solflare connect ────────────────────────────────
  async function connectWallet() {
    setStep("connecting");
    try {
      const provider = method === "phantom"
        ? (window as any).phantom?.solana
        : (window as any).solflare;
      if (!provider) throw new Error(`${method} wallet extension not found. Install it first.`);
      const resp = await provider.connect();
      const addr = resp.publicKey?.toString() ?? provider.publicKey?.toString();
      if (!addr) throw new Error("No public key returned");
      setWalletAddr(addr);
      setStep("idle");
    } catch (e: any) {
      setErrMsg(e.message ?? "Connection failed");
      setStep("error");
    }
  }

  // ── Execute withdrawal ──────────────────────────────────────
  async function doWithdraw() {
    setStep("signing");
    setErrMsg("");
    try {
      let result: { signature: string; withdrawnLamports: bigint };

      if (method === "file") {
        if (!keypairBytes) return;
        result = await withdrawSolWithKeypair(keypairBytes, () => setStep("confirming"));
      } else {
        if (!walletAddr) return;
        if (walletAddr !== PRESALE_AUTHORITY) {
          setErrMsg(
            `Wrong wallet connected.\nRequired: ${PRESALE_AUTHORITY.slice(0,8)}…${PRESALE_AUTHORITY.slice(-6)}\nConnected: ${walletAddr.slice(0,8)}…${walletAddr.slice(-6)}`
          );
          setStep("error");
          return;
        }
        result = await withdrawSol(walletAddr, method, () => setStep("confirming"));
      }

      setTxSig(result.signature);
      setWithdrawn((Number(result.withdrawnLamports) / 1e9).toFixed(4));
      setStep("success");
      connection.getBalance(SOL_VAULT_PDA).then(l => setVaultSol(l / 1e9)).catch(() => {});
    } catch (e: any) {
      const msg: string = e.message ?? String(e);
      setErrMsg(
        msg.includes("6009") || msg.toLowerCase().includes("unauthorized")
          ? `Authorization failed on-chain (error 6009).\nThe keypair file does not match the presale authority.\nMake sure you're using the exact keypair file from when the contract was deployed.`
          : msg.length > 250 ? msg.slice(0, 250) + "…" : msg
      );
      setStep("error");
    }
  }

  const spinning = (
    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">Vault Funds</p>

      {/* Vault balance */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <p className="text-xs text-yellow-300/70 mb-1">SOL Vault Balance</p>
        <p className="text-2xl font-bold text-yellow-300">
          {vaultSol === null ? "Loading…" : `${vaultSol.toFixed(4)} SOL`}
        </p>
      </div>

      {/* Faucet hint */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-300">
        <p>⚠️ The authority wallet needs ~0.001 SOL for fees.</p>
        <a href="https://faucet.solana.com/" target="_blank" rel="noopener noreferrer"
           className="underline text-blue-200 hover:text-white">
          faucet.solana.com
        </a>
        <span className="text-blue-300/60 mx-1">→ paste:</span>
        <span className="font-mono text-yellow-300 select-all break-all">{PRESALE_AUTHORITY}</span>
      </div>

      {/* Method tabs */}
      {step !== "success" && (
        <div className="flex gap-2 flex-wrap">
          {([
            { id: "file",     label: "📂 Solana Playground File" },
            { id: "phantom",  label: "👻 Phantom" },
            { id: "solflare", label: "🌞 Solflare" },
          ] as { id: WithdrawMethod; label: string }[]).map(m => (
            <button key={m.id} onClick={() => { setMethod(m.id); setStep("idle"); setErrMsg(""); setKeypairBytes(null); setWalletAddr(""); setFileAddr(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${method === m.id ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-200" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}>
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Solana Playground file method ── */}
      {method === "file" && step === "idle" && !keypairBytes && (
        <div className="space-y-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-300 space-y-2">
            <p className="font-semibold text-white">كيفية تصدير ملف المحفظة من Solana Playground:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-400">
              <li>افتح <a href="https://beta.solpg.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">beta.solpg.io</a></li>
              <li>اضغط على أيقونة المحفظة (أسفل يسار الشاشة)</li>
              <li>اضغط <strong className="text-white">"Export Keypair"</strong></li>
              <li>احفظ الملف على جهازك</li>
              <li>ارفعه هنا ↓</li>
            </ol>
          </div>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-yellow-500/40 rounded-xl p-6 text-center hover:border-yellow-500/70 transition-colors">
              <p className="text-yellow-300 text-sm font-medium">📁 اختر ملف keypair.json</p>
              <p className="text-gray-500 text-xs mt-1">الملف من Solana Playground — مصفوفة JSON بـ 64 رقماً</p>
            </div>
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      )}

      {method === "file" && step === "idle" && keypairBytes && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-xs">
            <p className="text-green-400 font-semibold">✅ Keypair file loaded</p>
            <p className="text-gray-400 mt-1 break-all">Address: <span className="font-mono text-green-300">{fileAddr.slice(0,10)}…{fileAddr.slice(-8)}</span></p>
            <p className="text-gray-500 mt-1">The address will be verified on-chain during the transaction.</p>
          </div>
          <ControlButton label="💸 Withdraw All SOL" variant="warning" onClick={doWithdraw} />
          <button onClick={() => { setKeypairBytes(null); setFileAddr(""); }}
            className="text-xs text-gray-500 underline">
            Use a different file
          </button>
        </div>
      )}

      {/* ── Phantom / Solflare method ── */}
      {(method === "phantom" || method === "solflare") && step === "idle" && !walletAddr && (
        <ControlButton label={`🔌 Connect ${method === "phantom" ? "Phantom" : "Solflare"}`}
          variant="warning" onClick={connectWallet} />
      )}

      {(method === "phantom" || method === "solflare") && step === "idle" && walletAddr && (
        <div className="space-y-2">
          {walletAddr === PRESALE_AUTHORITY ? (
            <p className="text-xs text-green-400">✅ Correct authority wallet: <span className="font-mono">{walletAddr.slice(0,8)}…{walletAddr.slice(-6)}</span></p>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs space-y-1">
              <p className="text-red-400 font-semibold">⛔ Wrong wallet</p>
              <p className="text-gray-400">Connected: <span className="font-mono text-red-300">{walletAddr.slice(0,8)}…{walletAddr.slice(-6)}</span></p>
              <p className="text-gray-400">Required: <span className="font-mono text-yellow-300">{PRESALE_AUTHORITY.slice(0,8)}…{PRESALE_AUTHORITY.slice(-6)}</span></p>
              <button onClick={() => setWalletAddr("")} className="text-blue-400 underline">Disconnect</button>
            </div>
          )}
          {walletAddr === PRESALE_AUTHORITY && (
            <ControlButton label="💸 Withdraw All SOL" variant="warning" onClick={doWithdraw} />
          )}
        </div>
      )}

      {/* ── Shared status states ── */}
      {step === "connecting" && <div className="flex items-center gap-2 text-sm text-gray-400">{spinning} Connecting wallet…</div>}
      {step === "signing"    && <div className="flex items-center gap-2 text-sm text-yellow-300">{spinning} Signing transaction…</div>}
      {step === "confirming" && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-blue-300">{spinning} Waiting for on-chain confirmation…</div>
          <p className="text-xs text-gray-500">قد يستغرق 30–60 ثانية. لا تغلق الصفحة.</p>
        </div>
      )}

      {step === "success" && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <p className="text-green-400 font-semibold mb-1">✅ تم السحب بنجاح!</p>
          <p className="text-sm text-gray-300">المبلغ: <span className="text-white font-bold">{withdrawn} SOL</span></p>
          <a href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
             className="text-xs text-blue-400 underline mt-2 block">
            عرض على Explorer ↗
          </a>
        </div>
      )}

      {step === "error" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <p className="text-red-400 font-semibold text-sm mb-1">❌ فشل</p>
          <p className="text-xs text-red-300 whitespace-pre-wrap">{errMsg}</p>
          <button onClick={() => { setStep("idle"); setErrMsg(""); }} className="mt-2 text-xs underline text-red-400">حاول مجدداً</button>
        </div>
      )}
    </div>
  );
}

function NetworkBar({ network, count, totalUsd, maxCount }: { network: string; count: number; totalUsd: number; maxCount: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const networkColors: Record<string, string> = {
    solana: "bg-purple-500",
    ethereum: "bg-blue-500",
    bsc: "bg-yellow-500",
    polygon: "bg-violet-500",
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-white capitalize">{network}</span>
        <span className="text-gray-400">{count} txns · ${totalUsd.toFixed(0)}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${networkColors[network.toLowerCase()] ?? "bg-gray-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { loading, authenticated, user, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [chainData, setChainData] = useState<PresaleState | null>(null);
  const [vaultBalance, setVaultBalance] = useState<number | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainLastUpdated, setChainLastUpdated] = useState<Date | null>(null);
  const [livesolPrice, setLiveSolPrice] = useState<number | null>(null);
  const [syncSolLoading, setSyncSolLoading] = useState(false);
  const [syncSolWallet, setSyncSolWallet] = useState<string>("");

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (!loading && !authenticated) setLocation("/admin");
  }, [loading, authenticated, setLocation]);

  const fetchStats = useCallback(() => {
    if (!authenticated) return;
    setDataLoading(true);
    adminApi.getStats().then((data) => {
      setStats(data);
      setDataLoading(false);
    }).catch(() => setDataLoading(false));
  }, [authenticated]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── On-chain live data ───────────────────────────────────────────────────
  const refreshChainData = useCallback(async () => {
    setChainLoading(true);
    try {
      const [d, lamports] = await Promise.all([
        fetchPresaleState(),
        connection.getBalance(SOL_VAULT_PDA).catch(() => null),
      ]);
      if (d) setChainData(d);
      if (lamports !== null) setVaultBalance(lamports / 1e9);
      setChainLastUpdated(new Date());
    } catch { /* ignore */ }
    finally { setChainLoading(false); }
  }, []);

  useEffect(() => {
    refreshChainData();
    const interval = setInterval(refreshChainData, 30_000);
    return () => clearInterval(interval);
  }, [refreshChainData]);

  // ── جلب سعر SOL اللحظي من CoinGecko ────────────────────────────────────
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
        const d = await r.json();
        if (d?.solana?.usd) setLiveSolPrice(d.solana.usd);
      } catch { /* ignore */ }
    };
    fetchPrice();
    const iv = setInterval(fetchPrice, 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── مزامنة سعر SOL مع العقد ──────────────────────────────────────────────
  const handleSyncSolPrice = async () => {
    if (!livesolPrice) { showNotification("لم يتم جلب سعر SOL اللحظي بعد", "error"); return; }
    if (!syncSolWallet) { showNotification("يرجى إدخال عنوان محفظة الأدمن أولاً", "error"); return; }
    setSyncSolLoading(true);
    try {
      await updateSolPrice(syncSolWallet, livesolPrice, "phantom");
      showNotification(`✅ تم تحديث سعر SOL إلى $${livesolPrice.toFixed(2)} في العقد`, "success");
      await refreshChainData();
    } catch (e) {
      showNotification(`❌ ${(e as Error).message}`, "error");
    } finally {
      setSyncSolLoading(false);
    }
  };

  const connectAdminPhantom = async () => {
    try {
      const provider = (window as any).phantom?.solana ?? (window as any).solana;
      if (!provider) throw new Error("Phantom wallet not found");
      const resp = await provider.connect();
      const addr = resp.publicKey?.toString() ?? provider.publicKey?.toString();
      if (addr) setSyncSolWallet(addr);
    } catch (e) {
      showNotification((e as Error).message, "error");
    }
  };

  const doAction = async (key: string, fn: () => Promise<{ success: boolean; message: string }>) => {
    setActionLoading(key);
    try {
      const result = await fn();
      showNotification(result.message, result.success ? "success" : "error");
      fetchStats();
    } catch (e) {
      showNotification((e as Error).message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#39ff14]/50 border-t-[#39ff14] rounded-full animate-spin" />
      </div>
    );
  }

  const config = stats?.presaleConfig;
  const maxNetworkCount = Math.max(...(stats?.networkBreakdown.map((n) => n.count) ?? [1]));

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${notification.type === "success" ? "bg-[#39ff14]/20 border-[#39ff14]/40 text-[#39ff14]" : "bg-red-500/20 border-red-500/40 text-red-300"}`}>
          {notification.msg}
        </div>
      )}

      <header className="border-b border-white/10 bg-[#111118]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#39ff14]/30 to-[#00d4ff]/30 border border-[#39ff14]/30 flex items-center justify-center text-xs font-bold text-[#39ff14]">
              ⚡
            </div>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
            <span className="text-xs px-2 py-0.5 bg-[#39ff14]/10 text-[#39ff14] rounded-full border border-[#39ff14]/20">
              PEPEWIFE
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/admin/buyers")}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Buyers List →
            </button>
            <button onClick={fetchStats} className="text-gray-400 hover:text-white transition-colors" title="Refresh">
              ↻
            </button>
            <div className="flex items-center gap-2">
              {user?.avatar && <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" />}
              <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            </div>
            <button onClick={logout} className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {dataLoading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#39ff14]/50 border-t-[#39ff14] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Presale Status Banner */}
            {config && (
              <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${config.isActive ? "bg-[#39ff14]/10 border-[#39ff14]/30" : "bg-red-500/10 border-red-500/30"}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${config.isActive ? "bg-[#39ff14] animate-pulse" : "bg-red-500"}`} />
                <span className="font-semibold">
                  Presale is currently{" "}
                  <span className={config.isActive ? "text-[#39ff14]" : "text-red-400"}>
                    {config.isActive ? "ACTIVE" : "PAUSED"}
                  </span>
                </span>
                <span className="ml-auto text-sm text-gray-400">
                  Stage {config.currentStage} · Claim: {config.claimEnabled ? "✅" : "❌"} · Staking: {config.stakingEnabled ? "✅" : "❌"}
                </span>
              </div>
            )}

            {/* Stats Grid */}
            <section>
              <h2 className="text-lg font-semibold mb-4 text-gray-300">Overview</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Visits" value={stats?.visits.total ?? 0} sub={`${stats?.visits.unique ?? 0} unique`} color="blue" />
                <StatCard title="Wallets Connected" value={stats?.wallets.unique ?? 0} sub={`${stats?.wallets.total ?? 0} total sessions`} color="purple" />
                <StatCard title="Unique Buyers" value={stats?.buyers.unique ?? 0} sub={`${stats?.buyers.total ?? 0} total purchases`} color="yellow" />
                <StatCard title="Total Raised" value={`$${(stats?.revenue.totalUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} sub="USD from presale" color="green" />
              </div>
            </section>

            {/* Live On-Chain Data */}
            <section className="bg-[#111118] border border-[#9945FF]/20 rounded-2xl p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-300">Live On-Chain Data</h2>
                  <span className="text-xs px-2 py-0.5 bg-[#9945FF]/10 text-[#9945FF] rounded-full border border-[#9945FF]/20">Solana Devnet</span>
                  {chainLastUpdated && (
                    <span className="text-xs text-gray-600">
                      Updated {chainLastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={refreshChainData}
                  disabled={chainLoading}
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  {chainLoading ? (
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : "↻"}
                  Refresh
                </button>
              </div>

              {chainData ? (
                <div className="space-y-6">
                  {/* Row 1 — Main metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Stage + Status */}
                    <div className="bg-[#0a0a0f] border border-[#9945FF]/20 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Current Stage</p>
                      <p className="text-2xl font-bold text-[#9945FF]">Stage {chainData.currentStage + 1}</p>
                      <p className={`text-xs mt-1 font-medium ${chainData.isActive && !chainData.isPaused ? "text-[#39ff14]" : "text-red-400"}`}>
                        {chainData.isActive && !chainData.isPaused ? "● Active" : chainData.isPaused ? "⏸ Paused" : "● Inactive"}
                      </p>
                    </div>

                    {/* Tokens Sold */}
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Tokens Sold</p>
                      <p className="text-2xl font-bold text-[#00d4ff]">{fmtTokens(Number(chainData.totalTokensSold))}</p>
                      <p className="text-xs text-gray-500 mt-1">$PWIFE tokens</p>
                    </div>

                    {/* SOL Raised */}
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">SOL Raised</p>
                      <p className="text-2xl font-bold text-[#39ff14]">
                        {(Number(chainData.totalSolRaised) / 1e9).toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        SOL
                        {(livesolPrice || chainData.solPriceUsdE6 > 0n) && (
                          <span className="ml-1 text-gray-600">
                            ≈ ${((Number(chainData.totalSolRaised) / 1e9) * (livesolPrice ?? Number(chainData.solPriceUsdE6) / 1e6)).toFixed(2)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Buyers */}
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Buyers</p>
                      <p className="text-2xl font-bold text-yellow-400">{Number(chainData.buyersCount).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">unique wallets</p>
                    </div>
                  </div>

                  {/* Row 2 — Secondary metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* USDT Raised */}
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">USDT Raised</p>
                      <p className="text-xl font-bold text-green-400">
                        ${(Number(chainData.totalUsdtRaised) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">raw USDT raised</p>
                    </div>

                    {/* Vault Balance */}
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Vault Balance</p>
                      <p className="text-xl font-bold text-orange-400">
                        {vaultBalance !== null ? vaultBalance.toFixed(4) : "—"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">SOL in vault PDA</p>
                    </div>

                    {/* SOL Price */}
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4 col-span-full">
                      <p className="text-xs text-gray-500 mb-2">SOL Price (contract)</p>
                      <div className="flex flex-wrap items-center gap-4 mb-3">
                        <div>
                          <p className="text-xl font-bold text-blue-400">
                            {chainData.solPriceUsdE6 > 0n
                              ? `$${(Number(chainData.solPriceUsdE6) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                              : "Not set"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">سعر العقد الحالي</p>
                        </div>
                        {livesolPrice && (
                          <div>
                            <p className="text-xl font-bold text-green-400">${livesolPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                            <p className="text-xs text-gray-500 mt-0.5">السعر اللحظي (CoinGecko)</p>
                          </div>
                        )}
                      </div>

                      {/* Sync UI */}
                      <div className="border-t border-white/10 pt-3 space-y-2">
                        <p className="text-xs text-gray-400">مزامنة سعر SOL اللحظي مع العقد — يجب التوقيع بمحفظة الأدمن</p>
                        {!syncSolWallet ? (
                          <button
                            onClick={connectAdminPhantom}
                            className="px-4 py-2 rounded-lg bg-[#9945FF]/20 border border-[#9945FF]/40 text-[#9945FF] text-sm font-medium hover:bg-[#9945FF]/30 transition-all"
                          >
                            🔌 ربط محفظة Phantom
                          </button>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono">{syncSolWallet.slice(0,8)}...{syncSolWallet.slice(-6)}</span>
                            <button
                              onClick={handleSyncSolPrice}
                              disabled={syncSolLoading || !livesolPrice}
                              className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 text-sm font-medium hover:bg-green-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {syncSolLoading && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
                              ⚡ مزامنة السعر اللحظي {livesolPrice ? `($${livesolPrice.toFixed(2)})` : ""}
                            </button>
                            <button onClick={() => setSyncSolWallet("")} className="text-xs text-gray-600 hover:text-gray-400">قطع الاتصال</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Claim status */}
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Claim Opens</p>
                      <p className="text-xl font-bold text-purple-400">
                        {chainData.claimOpensAt > 0n
                          ? new Date(Number(chainData.claimOpensAt) * 1000).toLocaleDateString()
                          : "Not set"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">on-chain timestamp</p>
                    </div>
                  </div>

                  {/* Stage progress + prices */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Stage Details (On-Chain)</p>
                    <div className="space-y-4">
                      {chainData.stages.map((stage, i) => {
                        // max_tokens / tokens_sold are whole tokens — NO decimal division
                        const sold = Number(stage.tokensSold);
                        const max  = Number(stage.maxTokens);
                        const pct  = max > 0 ? Math.min(100, (sold / max) * 100) : 0;
                        const isCurrent = i === chainData.currentStage;
                        // Use confirmed static prices (matches home + dashboard pages)
                        const CONFIRMED_STAGE_PRICES = [0.00000001, 0.00000002, 0.00000004, 0.00000006];
                        const priceUsd = CONFIRMED_STAGE_PRICES[i] ?? stageTokenPriceUsd(stage.tokensPerRawUsdtScaled);
                        return (
                          <div key={i} className={`rounded-xl p-3 border ${isCurrent ? "border-[#9945FF]/30 bg-[#9945FF]/5" : "border-white/5 bg-[#0a0a0f]"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${isCurrent ? "text-[#9945FF]" : "text-gray-400"}`}>
                                  Stage {i + 1}
                                </span>
                                {isCurrent && (
                                  <span className="text-xs px-1.5 py-0.5 bg-[#9945FF]/20 text-[#9945FF] rounded-md border border-[#9945FF]/30">
                                    current
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  Price: {priceUsd > 0 ? `$${priceUsd.toFixed(8)}` : "not set"}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {fmtTokens(sold)} / {fmtTokens(max)} $PWIFE
                                <span className="ml-1 text-gray-600">({pct.toFixed(1)}%)</span>
                              </span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isCurrent ? "bg-[#9945FF]" : "bg-white/20"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Presale dates */}
                  {(chainData.presaleStart > 0n || chainData.presaleEnd > 0n) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {chainData.presaleStart > 0n && (
                        <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-3 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Presale Start</span>
                          <span className="text-sm text-gray-300">{new Date(Number(chainData.presaleStart) * 1000).toLocaleString()}</span>
                        </div>
                      )}
                      {chainData.presaleEnd > 0n && (
                        <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-3 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Presale End</span>
                          <span className="text-sm text-gray-300">{new Date(Number(chainData.presaleEnd) * 1000).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 text-sm space-y-2">
                  {chainLoading ? (
                    <>
                      <span className="w-6 h-6 border-2 border-[#9945FF]/50 border-t-[#9945FF] rounded-full animate-spin mx-auto block" />
                      <p>Reading from Solana blockchain…</p>
                    </>
                  ) : (
                    <>
                      <p className="text-red-400">Could not read on-chain data</p>
                      <p className="text-xs">Check RPC connection · Config PDA: BnHWhbNVB3cjCq7UA1KvBoW8JGe44yspCBSXPTDocuMi</p>
                    </>
                  )}
                </div>
              )}
            </section>

            {/* Referral Overview */}
            <section>
              <h2 className="text-lg font-semibold mb-4 text-gray-300">Referral System</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Referrers" value={stats?.referrals?.totalReferrers ?? 0} sub="active shillers" color="purple" />
                <StatCard title="Total Referrals" value={stats?.referrals?.totalReferrals ?? 0} sub="referred purchases" color="blue" />
                <StatCard
                  title="Pending Rewards"
                  value={`${fmt(stats?.referrals?.pendingRewardTokens ?? 0)} $PWIFE`}
                  sub="awaiting TGE payout"
                  color="yellow"
                />
                <StatCard
                  title="Paid Rewards"
                  value={`${fmt(stats?.referrals?.paidRewardTokens ?? 0)} $PWIFE`}
                  sub="already distributed"
                  color="green"
                />
              </div>
            </section>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Presale Controls */}
              <section className="bg-[#111118] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-6">Presale Controls</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sale Status</p>
                    <div className="flex gap-3">
                      <ControlButton
                        label="⏸ Pause Sale"
                        variant="danger"
                        onClick={() => doAction("pause", adminApi.pausePresale)}
                        loading={actionLoading === "pause"}
                        disabled={(config?.isActive ?? true) === false}
                      />
                      <ControlButton
                        label="▶ Resume Sale"
                        variant="success"
                        onClick={() => doAction("resume", adminApi.resumePresale)}
                        loading={actionLoading === "resume"}
                        disabled={(config?.isActive ?? true) === true}
                      />
                    </div>
                  </div>

                  <div className="h-px bg-white/10" />

                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Features</p>
                    <div className="flex flex-wrap gap-3">
                      <ControlButton
                        label={config?.claimEnabled ? "🔒 Disable Claim" : "🎁 Enable Claim"}
                        variant={config?.claimEnabled ? "warning" : "success"}
                        onClick={() => doAction("claim", () => adminApi.setClaim(!config?.claimEnabled))}
                        loading={actionLoading === "claim"}
                      />
                      <ControlButton
                        label={config?.stakingEnabled ? "🔒 Disable Staking" : "🌾 Enable Staking"}
                        variant={config?.stakingEnabled ? "warning" : "success"}
                        onClick={() => doAction("staking", () => adminApi.setStaking(!config?.stakingEnabled))}
                        loading={actionLoading === "staking"}
                      />
                    </div>
                  </div>

                  <div className="h-px bg-white/10" />

                  <WithdrawPanel />
                </div>
              </section>

              {/* Network Breakdown */}
              <section className="bg-[#111118] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-6">Network Breakdown</h2>
                {!stats?.networkBreakdown.length ? (
                  <p className="text-gray-500 text-sm">No purchase data yet.</p>
                ) : (
                  <div className="space-y-4">
                    {stats.networkBreakdown.map((n) => (
                      <NetworkBar
                        key={n.network}
                        network={n.network}
                        count={n.count}
                        totalUsd={n.totalUsd}
                        maxCount={maxNetworkCount}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Wallet Types</h3>
                  {!stats?.walletTypeBreakdown.length ? (
                    <p className="text-gray-500 text-sm">No connection data yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {stats.walletTypeBreakdown.map((w) => (
                        <span key={w.walletType} className="px-3 py-1 bg-white/10 rounded-full text-sm">
                          {w.walletType}: <span className="text-[#39ff14] font-medium">{w.count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Top Pages */}
            {stats?.topPages && stats.topPages.length > 0 && (
              <section className="bg-[#111118] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Top Pages</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.topPages.map((p) => (
                    <div key={p.page} className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl">
                      <span className="text-gray-300 text-sm font-mono">{p.page || "/"}</span>
                      <span className="text-[#39ff14] text-sm font-medium">{Number(p.count).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Referrers Management Table */}
            {stats?.referrals && (
              <section className="bg-[#111118] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Referrers Leaderboard</h2>
                  <ControlButton
                    label="✅ Mark ALL as Paid"
                    variant="success"
                    onClick={() => doAction("markAllPaid", () => adminApi.markReferralsPaid())}
                    loading={actionLoading === "markAllPaid"}
                    disabled={(stats?.referrals?.pendingRewardTokens ?? 0) === 0}
                  />
                </div>

                {!stats.referrals.topReferrers.length ? (
                  <p className="text-gray-500 text-sm">No referrals yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                          <th className="text-left py-3 pr-4">#</th>
                          <th className="text-left py-3 pr-4">Wallet</th>
                          <th className="text-left py-3 pr-4">Code</th>
                          <th className="text-right py-3 pr-4">Referrals</th>
                          <th className="text-right py-3 pr-4">Total $PWIFE</th>
                          <th className="text-right py-3 pr-4">Reward USD</th>
                          <th className="text-right py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {stats.referrals.topReferrers.map((r, i) => (
                          <tr key={r.walletAddress} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 pr-4 text-gray-500">{i + 1}</td>
                            <td className="py-3 pr-4 font-mono text-gray-300">
                              {r.walletAddress.slice(0, 8)}…{r.walletAddress.slice(-4)}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono text-[#39ff14]">{r.code}</span>
                            </td>
                            <td className="py-3 pr-4 text-right text-white">{r.totalReferrals}</td>
                            <td className="py-3 pr-4 text-right text-yellow-400 font-medium">{fmt(r.totalRewardTokens)}</td>
                            <td className="py-3 pr-4 text-right text-gray-400">${Number(r.totalRewardUsd ?? 0).toFixed(2)}</td>
                            <td className="py-3 text-right">
                              {r.totalRewardTokens > 0 && (
                                <button
                                  onClick={() => doAction(`paid-${r.walletAddress}`, () => adminApi.markReferralsPaid(r.walletAddress))}
                                  disabled={actionLoading === `paid-${r.walletAddress}`}
                                  className="px-3 py-1.5 text-xs bg-[#39ff14]/20 hover:bg-[#39ff14]/30 border border-[#39ff14]/30 text-[#39ff14] rounded-lg transition-all disabled:opacity-40 flex items-center gap-1 ml-auto"
                                >
                                  {actionLoading === `paid-${r.walletAddress}` && (
                                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                  )}
                                  Mark Paid
                                </button>
                              )}
                              {r.totalRewardTokens === 0 && (
                                <span className="text-xs text-gray-600">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  onClick={() => setLocation("/admin/referrals")}
                  className="mt-4 text-sm text-[#39ff14] hover:underline"
                >
                  View all referrals →
                </button>
              </section>
            )}

            {/* Recent Activity */}
            {stats?.recentActivity && stats.recentActivity.length > 0 && (
              <section className="bg-[#111118] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Purchases</h2>
                <div className="space-y-2">
                  {stats.recentActivity.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-4 px-4 py-3 bg-white/5 rounded-xl text-sm">
                      <div className="w-2 h-2 rounded-full bg-[#39ff14] flex-shrink-0" />
                      <span className="font-mono text-gray-300">{tx.walletAddress.slice(0, 8)}...{tx.walletAddress.slice(-4)}</span>
                      <span className="text-gray-500 capitalize">{tx.network}</span>
                      <span className="ml-auto text-[#39ff14] font-semibold">${Number(tx.amountUsd).toFixed(2)}</span>
                      <span className="text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setLocation("/admin/buyers")}
                  className="mt-4 text-sm text-[#39ff14] hover:underline"
                >
                  View all buyers →
                </button>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
