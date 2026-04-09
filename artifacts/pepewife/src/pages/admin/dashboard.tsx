import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { adminApi, type AdminStats } from "@/lib/admin-api";
import {
  withdrawSol, withdrawSolWithKeypair, withdrawUsdt, updateSolPrice,
  pauseSaleWithKeypair, resumeSaleWithKeypair,
  advanceStage, endPresale,
  connection, SOL_VAULT_PDA, VAULT_USDT_ATA,
  fetchPresaleState, stageTokenPriceUsd, buildExplorerUrl, type PresaleState,
} from "@/lib/presale-contract";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function fmtTokens(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000)     return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)         return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)             return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, color = "green",
}: { title: string; value: string | number; sub?: string; color?: "green" | "blue" | "purple" | "yellow" | "orange" }) {
  const colors = {
    green:  "from-[#39ff14]/10 to-[#39ff14]/5 border-[#39ff14]/20 text-[#39ff14]",
    blue:   "from-[#00d4ff]/10 to-[#00d4ff]/5 border-[#00d4ff]/20 text-[#00d4ff]",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400",
    yellow: "from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 text-yellow-400",
    orange: "from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function Btn({
  label, onClick, variant = "default", disabled = false, loading = false, size = "md",
}: {
  label: string; onClick: () => void;
  variant?: "default" | "danger" | "success" | "warning" | "ghost";
  disabled?: boolean; loading?: boolean; size?: "sm" | "md";
}) {
  const variants = {
    default: "bg-white/10 hover:bg-white/20 border-white/20 text-white",
    danger:  "bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-300",
    success: "bg-[#39ff14]/20 hover:bg-[#39ff14]/30 border-[#39ff14]/40 text-[#39ff14]",
    warning: "bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/40 text-yellow-300",
    ghost:   "bg-transparent hover:bg-white/10 border-transparent text-gray-400 hover:text-white",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs rounded-lg", md: "px-5 py-2.5 text-sm rounded-xl" };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${sizes[size]} border font-medium transition-all ${variants[variant]} disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2`}
    >
      {loading && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
      {label}
    </button>
  );
}

function SectionCard({ children, title, action }: { children: React.ReactNode; title?: string; action?: React.ReactNode }) {
  return (
    <div className="bg-[#111118] border border-white/10 rounded-2xl p-6">
      {title && (
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-200">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── On-Chain Pause / Resume Panel ───────────────────────────────────────────
const PRESALE_AUTHORITY = "6dSw3tPGZtiykZXoSx4uPb6jPc95WAV39fHbN1QG7Aci";

function ChainPausePanel({
  showNotification,
  chainData,
  onRefresh,
}: {
  showNotification: (msg: string, type?: "success" | "error") => void;
  chainData: PresaleState | null;
  onRefresh: () => void;
}) {
  const [keypairBytes, setKeypairBytes] = useState<number[] | null>(null);
  const [fileAddr,     setFileAddr]     = useState("");
  const [loading,      setLoading]      = useState<"pause" | "resume" | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const bytes = JSON.parse(ev.target?.result as string) as number[];
        if (!Array.isArray(bytes) || bytes.length !== 64)
          throw new Error("Keypair غير صالح: يجب أن يكون 64 byte");
        setKeypairBytes(bytes);
        const { Keypair } = await import("@solana/web3.js");
        const kp = Keypair.fromSecretKey(new Uint8Array(bytes));
        setFileAddr(kp.publicKey.toBase58());
      } catch (err) {
        showNotification((err as Error).message, "error");
      }
    };
    reader.readAsText(file);
  }

  async function handleChainAction(action: "pause" | "resume") {
    if (!keypairBytes) { showNotification("ارفع ملف الـ Keypair أولاً", "error"); return; }
    if (fileAddr !== PRESALE_AUTHORITY) {
      showNotification(`خطأ: هذا ليس keypair الأدمن (${PRESALE_AUTHORITY.slice(0, 8)}...)`, "error");
      return;
    }
    setLoading(action);
    try {
      const fn = action === "pause" ? pauseSaleWithKeypair : resumeSaleWithKeypair;
      const { signature } = await fn(keypairBytes);
      showNotification(
        `✅ ${action === "pause" ? "تم إيقاف" : "تم استئناف"} البريسيل على البلوكتشين — ${signature.slice(0, 12)}...`,
        "success",
      );
      onRefresh();
    } catch (err) {
      const msg = (err as Error).message;
      showNotification(`❌ ${msg}`, "error");
    } finally {
      setLoading(null);
    }
  }

  const isPaused = chainData?.isPaused ?? false;

  return (
    <div className="space-y-4">
      {/* حالة العقد */}
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${isPaused ? "bg-red-500/10 border-red-500/30" : "bg-[#39ff14]/10 border-[#39ff14]/30"}`}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPaused ? "bg-red-500" : "bg-[#39ff14] animate-pulse"}`} />
        <span className="text-sm font-semibold">
          حالة العقد: <span className={isPaused ? "text-red-400" : "text-[#39ff14]"}>{isPaused ? "⏸ موقوف" : "▶ نشط"}</span>
        </span>
      </div>

      {/* رفع الـ keypair */}
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">ملف Keypair (للتوقيع على السلسلة)</p>
        <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
          <span className="text-lg">📁</span>
          <div className="text-sm">
            {fileAddr
              ? <span className="text-[#39ff14] font-mono text-xs">{fileAddr.slice(0, 12)}...{fileAddr.slice(-6)}</span>
              : <span className="text-gray-400">اضغط لرفع keypair.json</span>}
          </div>
          <input type="file" accept=".json" className="hidden" onChange={handleFile} />
        </label>
      </div>

      {/* الأزرار */}
      <div className="flex gap-2">
        <button
          onClick={() => handleChainAction("pause")}
          disabled={loading !== null || isPaused}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading === "pause" && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
          ⏸ إيقاف على السلسلة
        </button>
        <button
          onClick={() => handleChainAction("resume")}
          disabled={loading !== null || !isPaused}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium bg-[#39ff14]/20 hover:bg-[#39ff14]/30 border-[#39ff14]/40 text-[#39ff14] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading === "resume" && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
          ▶ استئناف على السلسلة
        </button>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">
        ✅ العقد يدعم هذه التعليمات مباشرةً (pause / resume).
      </p>
    </div>
  );
}

// ─── Withdraw Panel ───────────────────────────────────────────────────────────
type WithdrawStep = "idle" | "connecting" | "signing" | "confirming" | "success" | "error";
type WithdrawMethod = "file" | "phantom";
const spinning = <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />;

function WithdrawPanel({ showNotification }: { showNotification: (msg: string, type?: "success" | "error") => void }) {
  const [vaultSol, setVaultSol]     = useState<number | null>(null);
  const [method, setMethod]         = useState<WithdrawMethod>("file");
  const [walletAddr, setWalletAddr] = useState("");
  const [keypairBytes, setKeypairBytes] = useState<number[] | null>(null);
  const [fileAddr, setFileAddr]     = useState("");
  const [step, setStep]             = useState<WithdrawStep>("idle");
  const [txSig, setTxSig]           = useState("");
  const [withdrawn, setWithdrawn]   = useState("");
  const [errMsg, setErrMsg]         = useState("");

  useEffect(() => {
    connection.getBalance(SOL_VAULT_PDA)
      .then(lamps => setVaultSol(lamps / 1e9))
      .catch(() => setVaultSol(null));
  }, []);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const bytes = JSON.parse(ev.target?.result as string) as number[];
        if (!Array.isArray(bytes) || bytes.length !== 64) throw new Error("Invalid keypair: expected 64 bytes");
        setKeypairBytes(bytes);
        const { Keypair } = await import("@solana/web3.js");
        const kp = Keypair.fromSecretKey(new Uint8Array(bytes));
        setFileAddr(kp.publicKey.toBase58());
      } catch (err) {
        showNotification((err as Error).message, "error");
      }
    };
    reader.readAsText(file);
  }

  async function handleWithdraw() {
    if (method === "file") {
      if (!keypairBytes || !fileAddr) { showNotification("Upload keypair file first", "error"); return; }
      if (fileAddr !== PRESALE_AUTHORITY) { showNotification(`Wrong keypair. Need: ${PRESALE_AUTHORITY.slice(0,8)}...`, "error"); return; }
      try {
        setStep("signing");
        const { signature, withdrawnLamports } = await withdrawSolWithKeypair(keypairBytes);
        setTxSig(signature);
        setWithdrawn((Number(withdrawnLamports) / 1e9).toFixed(6));
        setStep("success");
        showNotification(`Withdrew ${(Number(withdrawnLamports) / 1e9).toFixed(4)} SOL`, "success");
      } catch (err) {
        setErrMsg((err as Error).message);
        setStep("error");
      }
    } else {
      try {
        setStep("connecting");
        const provider = (window as any).phantom?.solana ?? (window as any).solana;
        if (!provider) throw new Error("Phantom not found");
        const resp = await provider.connect();
        const addr = resp.publicKey?.toString() ?? provider.publicKey?.toString();
        setWalletAddr(addr);
        if (addr !== PRESALE_AUTHORITY) throw new Error(`Need authority wallet: ${PRESALE_AUTHORITY.slice(0,8)}...`);
        setStep("signing");
        const { signature, withdrawnLamports } = await withdrawSol(addr, "phantom");
        setTxSig(signature);
        setWithdrawn((Number(withdrawnLamports) / 1e9).toFixed(6));
        setStep("success");
        showNotification(`Withdrew ${(Number(withdrawnLamports) / 1e9).toFixed(4)} SOL`, "success");
      } catch (err) {
        setErrMsg((err as Error).message);
        setStep("error");
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Vault Balance</p>
          <p className="text-xl font-bold text-yellow-400">{vaultSol !== null ? `${vaultSol.toFixed(4)} SOL` : "—"}</p>
        </div>
        {vaultSol !== null && vaultSol > 0 && (
          <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg border border-yellow-500/30">Ready to withdraw</span>
        )}
      </div>

      <div className="flex gap-2">
        {(["file", "phantom"] as WithdrawMethod[]).map(m => (
          <button key={m} onClick={() => setMethod(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${method === m ? "bg-[#39ff14]/20 border-[#39ff14]/40 text-[#39ff14]" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
            {m === "file" ? "📁 Keypair File" : "👻 Phantom"}
          </button>
        ))}
      </div>

      {method === "file" && (
        <div className="space-y-3">
          <label className="block border-2 border-dashed border-yellow-500/30 rounded-xl p-4 text-center cursor-pointer hover:border-yellow-500/50 transition-colors">
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            <p className="text-sm text-gray-400">{fileAddr ? <span className="text-[#39ff14] font-mono text-xs">{fileAddr.slice(0,12)}...{fileAddr.slice(-8)}</span> : "Click to upload keypair JSON"}</p>
          </label>
        </div>
      )}

      {step === "idle" && (
        <Btn label="⬇ Withdraw SOL" variant="warning" onClick={handleWithdraw} disabled={vaultSol === 0 || vaultSol === null} />
      )}
      {step === "connecting"  && <p className="flex items-center gap-2 text-sm text-gray-400">{spinning} Connecting…</p>}
      {step === "signing"     && <p className="flex items-center gap-2 text-sm text-yellow-300">{spinning} Signing…</p>}
      {step === "confirming"  && <p className="flex items-center gap-2 text-sm text-blue-300">{spinning} Confirming on-chain…</p>}
      {step === "success" && (
        <div className="p-4 bg-[#39ff14]/10 border border-[#39ff14]/20 rounded-xl space-y-1">
          <p className="text-[#39ff14] text-sm font-medium">✅ Withdrawn {withdrawn} SOL</p>
          <a href={buildExplorerUrl(txSig)} target="_blank" rel="noreferrer"
            className="text-xs text-blue-400 hover:underline font-mono">{txSig.slice(0, 20)}…</a>
        </div>
      )}
      {step === "error" && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-xs">❌ {errMsg}</p>
          <button onClick={() => setStep("idle")} className="text-xs text-gray-500 hover:text-white mt-1">Try again</button>
        </div>
      )}
    </div>
  );
}

// ─── Withdraw USDT Panel ──────────────────────────────────────────────────────
function WithdrawUsdtPanel({ showNotification }: { showNotification: (msg: string, type?: "success" | "error") => void }) {
  const [vaultUsdt, setVaultUsdt]   = useState<number | null>(null);
  const [step, setStep]             = useState<WithdrawStep>("idle");
  const [txSig, setTxSig]           = useState("");
  const [withdrawn, setWithdrawn]   = useState("");
  const [errMsg, setErrMsg]         = useState("");

  useEffect(() => {
    connection.getTokenAccountBalance(VAULT_USDT_ATA)
      .then(info => setVaultUsdt(Number(info.value.uiAmount ?? 0)))
      .catch(() => setVaultUsdt(null));
  }, []);

  async function handleWithdraw() {
    try {
      setStep("connecting");
      const provider = (window as any).phantom?.solana ?? (window as any).solana;
      if (!provider) throw new Error("Phantom not found");
      const resp = await provider.connect();
      const addr = resp.publicKey?.toString() ?? provider.publicKey?.toString();
      if (addr !== PRESALE_AUTHORITY) throw new Error(`Need authority wallet: ${PRESALE_AUTHORITY.slice(0, 8)}...`);
      setStep("signing");
      const { signature, withdrawnRaw } = await withdrawUsdt(addr, "phantom", () => setStep("confirming"));
      setTxSig(signature);
      setWithdrawn((Number(withdrawnRaw) / 1e6).toFixed(2));
      setStep("success");
      showNotification(`Withdrew ${(Number(withdrawnRaw) / 1e6).toFixed(2)} USDT`, "success");
    } catch (err) {
      setErrMsg((err as Error).message);
      setStep("error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">USDT Vault Balance</p>
          <p className="text-xl font-bold text-green-400">{vaultUsdt !== null ? `${vaultUsdt.toLocaleString()} USDT` : "—"}</p>
        </div>
        {vaultUsdt !== null && vaultUsdt > 0 && (
          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-lg border border-green-500/30">Ready to withdraw</span>
        )}
      </div>

      {step === "idle" && (
        <Btn label="⬇ Withdraw USDT" variant="success" onClick={handleWithdraw} disabled={!vaultUsdt || vaultUsdt === 0} />
      )}
      {step === "connecting"  && <p className="flex items-center gap-2 text-sm text-gray-400">{spinning} Connecting Phantom…</p>}
      {step === "signing"     && <p className="flex items-center gap-2 text-sm text-yellow-300">{spinning} Signing…</p>}
      {step === "confirming"  && <p className="flex items-center gap-2 text-sm text-blue-300">{spinning} Confirming on-chain…</p>}
      {step === "success" && (
        <div className="p-4 bg-[#39ff14]/10 border border-[#39ff14]/20 rounded-xl space-y-1">
          <p className="text-[#39ff14] text-sm font-medium">✅ Withdrawn {withdrawn} USDT</p>
          <a href={buildExplorerUrl(txSig)} target="_blank" rel="noreferrer"
            className="text-xs text-blue-400 hover:underline font-mono">{txSig.slice(0, 20)}…</a>
        </div>
      )}
      {step === "error" && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-xs">❌ {errMsg}</p>
          <button onClick={() => setStep("idle")} className="text-xs text-gray-500 hover:text-white mt-1">Try again</button>
        </div>
      )}
    </div>
  );
}

// ─── Advance Stage Panel ─────────────────────────────────────────────────────
function AdvanceStagePanel({
  chainData,
  onRefresh,
  showNotification,
}: {
  chainData: PresaleState | null;
  onRefresh: () => void;
  showNotification: (msg: string, type?: "success" | "error") => void;
}) {
  const [step, setStep] = useState<"idle" | "connecting" | "signing" | "confirming" | "success" | "error">("idle");
  const [txSig, setTxSig] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const currentStage = chainData?.currentStage ?? 0;
  const isLastStage  = currentStage >= 3;

  async function handleAdvance() {
    try {
      setStep("connecting");
      const provider = (window as any).phantom?.solana ?? (window as any).solana;
      if (!provider) throw new Error("Phantom not found");
      const resp = await provider.connect();
      const addr = resp.publicKey?.toString() ?? provider.publicKey?.toString();
      if (addr !== PRESALE_AUTHORITY) throw new Error(`Need authority wallet: ${PRESALE_AUTHORITY.slice(0, 8)}...`);
      setStep("signing");
      const { signature } = await advanceStage(addr, "phantom", () => setStep("confirming"));
      setTxSig(signature);
      setStep("success");
      showNotification(`✅ تم الانتقال للمرحلة ${currentStage + 2}`, "success");
      onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
      setStep("error");
    }
  }

  return (
    <div className="space-y-4">
      {/* حالة المراحل */}
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`rounded-xl p-3 border text-center ${
            i === currentStage
              ? "bg-[#39ff14]/15 border-[#39ff14]/40"
              : i < currentStage
              ? "bg-white/5 border-white/10 opacity-50"
              : "bg-white/3 border-white/5 opacity-30"
          }`}>
            <p className="text-xs text-gray-400 mb-0.5">المرحلة {i + 1}</p>
            <p className="text-[10px] font-mono text-gray-500">
              {i < currentStage ? "✅ انتهت" : i === currentStage ? "🟢 نشطة" : "🔒 قادمة"}
            </p>
          </div>
        ))}
      </div>

      {step === "idle" && !isLastStage && (
        <button
          onClick={handleAdvance}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 text-blue-300 transition-all"
        >
          ⏭ الانتقال للمرحلة {currentStage + 2}
        </button>
      )}
      {isLastStage && step === "idle" && (
        <p className="text-xs text-center text-gray-500 py-2">أنت في المرحلة الأخيرة — استخدم "إنهاء البيع" أدناه</p>
      )}
      {step === "connecting"  && <p className="flex items-center gap-2 text-sm text-gray-400">{spinning} Connecting Phantom…</p>}
      {step === "signing"     && <p className="flex items-center gap-2 text-sm text-yellow-300">{spinning} Signing…</p>}
      {step === "confirming"  && <p className="flex items-center gap-2 text-sm text-blue-300">{spinning} Confirming on-chain…</p>}
      {step === "success" && (
        <div className="p-4 bg-[#39ff14]/10 border border-[#39ff14]/20 rounded-xl space-y-1">
          <p className="text-[#39ff14] text-sm font-medium">✅ تم الانتقال للمرحلة {currentStage + 2}</p>
          <a href={buildExplorerUrl(txSig)} target="_blank" rel="noreferrer"
            className="text-xs text-blue-400 hover:underline font-mono">{txSig.slice(0, 20)}…</a>
          <button onClick={() => setStep("idle")} className="block text-xs text-gray-500 hover:text-white mt-1">إغلاق</button>
        </div>
      )}
      {step === "error" && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-xs">❌ {errMsg}</p>
          <button onClick={() => setStep("idle")} className="text-xs text-gray-500 hover:text-white mt-1">Try again</button>
        </div>
      )}
    </div>
  );
}

// ─── End Presale Panel ────────────────────────────────────────────────────────
function EndPresalePanel({
  chainData,
  onRefresh,
  showNotification,
}: {
  chainData: PresaleState | null;
  onRefresh: () => void;
  showNotification: (msg: string, type?: "success" | "error") => void;
}) {
  const [step, setStep]     = useState<"idle" | "confirm" | "connecting" | "signing" | "confirming" | "success" | "error">("idle");
  const [txSig, setTxSig]   = useState("");
  const [errMsg, setErrMsg] = useState("");

  const isActive = chainData?.isActive ?? true;

  async function handleEnd() {
    try {
      setStep("connecting");
      const provider = (window as any).phantom?.solana ?? (window as any).solana;
      if (!provider) throw new Error("Phantom not found");
      const resp = await provider.connect();
      const addr = resp.publicKey?.toString() ?? provider.publicKey?.toString();
      if (addr !== PRESALE_AUTHORITY) throw new Error(`Need authority wallet: ${PRESALE_AUTHORITY.slice(0, 8)}...`);
      setStep("signing");
      const { signature } = await endPresale(addr, "phantom", () => setStep("confirming"));
      setTxSig(signature);
      setStep("success");
      showNotification("✅ تم إنهاء البيع على البلوكتشين", "success");
      onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
      setStep("error");
    }
  }

  if (!isActive) {
    return (
      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center">
        <p className="text-purple-300 text-sm font-semibold">🏁 البيع منتهٍ</p>
        <p className="text-xs text-gray-500 mt-1">presale_end تم تسجيله على البلوكتشين</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
        <p className="text-red-300 text-sm font-semibold">⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه</p>
        <p className="text-xs text-gray-400 mt-1">بمجرد الإنهاء، لن يستطيع أحد الشراء وسيُسجَّل وقت انتهاء البيع لعقد الاستحقاق.</p>
      </div>

      {step === "idle" && (
        <button
          onClick={() => setStep("confirm")}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-300 transition-all"
        >
          🏁 إنهاء البيع نهائياً
        </button>
      )}
      {step === "confirm" && (
        <div className="space-y-2">
          <p className="text-sm text-center text-yellow-300">هل أنت متأكد؟ هذا الإجراء لا رجعة فيه.</p>
          <div className="flex gap-2">
            <button onClick={handleEnd}
              className="flex-1 px-4 py-2 rounded-xl bg-red-500/30 border border-red-500/40 text-red-300 text-sm hover:bg-red-500/40 transition-all">
              نعم، إنهاء البيع
            </button>
            <button onClick={() => setStep("idle")}
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-all">
              إلغاء
            </button>
          </div>
        </div>
      )}
      {step === "connecting"  && <p className="flex items-center gap-2 text-sm text-gray-400">{spinning} Connecting Phantom…</p>}
      {step === "signing"     && <p className="flex items-center gap-2 text-sm text-yellow-300">{spinning} Signing…</p>}
      {step === "confirming"  && <p className="flex items-center gap-2 text-sm text-blue-300">{spinning} Confirming on-chain…</p>}
      {step === "success" && (
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-1">
          <p className="text-purple-300 text-sm font-medium">🏁 تم إنهاء البيع على البلوكتشين</p>
          <a href={buildExplorerUrl(txSig)} target="_blank" rel="noreferrer"
            className="text-xs text-blue-400 hover:underline font-mono">{txSig.slice(0, 20)}…</a>
        </div>
      )}
      {step === "error" && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-xs">❌ {errMsg}</p>
          <button onClick={() => setStep("idle")} className="text-xs text-gray-500 hover:text-white mt-1">Try again</button>
        </div>
      )}
    </div>
  );
}

// ─── Stage Progress Bar ───────────────────────────────────────────────────────
function StageBar({ label, sold, max, isCurrent, price }: { label: string; sold: number; max: number; isCurrent: boolean; price: number }) {
  const pct = max > 0 ? Math.min(100, (sold / max) * 100) : 0;
  return (
    <div className={`rounded-xl p-4 border ${isCurrent ? "border-[#9945FF]/30 bg-[#9945FF]/5" : "border-white/5 bg-[#0a0a0f]"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isCurrent ? "text-[#9945FF]" : "text-gray-400"}`}>{label}</span>
          {isCurrent && <span className="text-xs px-1.5 py-0.5 bg-[#9945FF]/20 text-[#9945FF] rounded border border-[#9945FF]/30">current</span>}
          <span className="text-xs text-gray-500">{price > 0 ? `$${price.toFixed(8)}` : "—"}</span>
        </div>
        <span className="text-xs text-gray-500">{fmtTokens(sold)} / {fmtTokens(max)} <span className="text-gray-600">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isCurrent ? "bg-[#9945FF]" : "bg-white/20"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────
type Section = "overview" | "blockchain" | "control" | "revenue" | "referrals" | "analytics";
const NAV: { key: Section; icon: string; label: string }[] = [
  { key: "overview",   icon: "📊", label: "نظرة عامة" },
  { key: "blockchain", icon: "⛓",  label: "البلوكتشين" },
  { key: "control",    icon: "🎛",  label: "التحكم بالبيع" },
  { key: "revenue",    icon: "💰",  label: "الإيرادات" },
  { key: "referrals",  icon: "🔗",  label: "الإحالات" },
  { key: "analytics",  icon: "📈",  label: "التحليلات" },
];

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { loading, authenticated, user, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen]     = useState(true);

  const [stats, setStats]               = useState<AdminStats | null>(null);
  const [dataLoading, setDataLoading]   = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [chainData, setChainData]           = useState<PresaleState | null>(null);
  const [vaultBalance, setVaultBalance]     = useState<number | null>(null);
  const [chainLoading, setChainLoading]     = useState(false);
  const [chainLastUpdated, setChainLastUpdated] = useState<Date | null>(null);

  const [livesolPrice, setLiveSolPrice]     = useState<number | null>(null);
  const [syncSolLoading, setSyncSolLoading] = useState(false);
  const [syncSolWallet, setSyncSolWallet]   = useState("");

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4500);
  };

  useEffect(() => {
    if (!loading && !authenticated) setLocation("/admin");
  }, [loading, authenticated, setLocation]);

  // ── Fetch DB stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(() => {
    if (!authenticated) return;
    setDataLoading(true);
    adminApi.getStats()
      .then(d => { setStats(d); setDataLoading(false); })
      .catch(() => setDataLoading(false));
  }, [authenticated]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Fetch on-chain data ─────────────────────────────────────────────────────
  const refreshChain = useCallback(async () => {
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
    refreshChain();
    const iv = setInterval(refreshChain, 30_000);
    return () => clearInterval(iv);
  }, [refreshChain]);

  // ── Live SOL price ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = async () => {
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
        const d = await r.json();
        if (d?.solana?.usd) setLiveSolPrice(d.solana.usd);
      } catch { /* ignore */ }
    };
    fn();
    const iv = setInterval(fn, 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── SOL price sync (Phantom) ────────────────────────────────────────────────
  const connectPhantom = async () => {
    try {
      const p = (window as any).phantom?.solana ?? (window as any).solana;
      if (!p) throw new Error("Phantom not found");
      const resp = await p.connect();
      setSyncSolWallet(resp.publicKey?.toString() ?? p.publicKey?.toString());
    } catch (e) { showNotification((e as Error).message, "error"); }
  };
  const handleSyncSolPrice = async () => {
    if (!livesolPrice) { showNotification("Waiting for SOL price…", "error"); return; }
    if (!syncSolWallet) { showNotification("Connect Phantom first", "error"); return; }
    setSyncSolLoading(true);
    try {
      await updateSolPrice(syncSolWallet, livesolPrice, "phantom");
      showNotification(`✅ SOL price updated to $${livesolPrice.toFixed(2)} on-chain`, "success");
      await refreshChain();
    } catch (e) { showNotification(`❌ ${(e as Error).message}`, "error"); }
    finally { setSyncSolLoading(false); }
  };

  // ── Auto-sync via server ────────────────────────────────────────────────────
  const [autoSyncStatus, setAutoSyncStatus] = useState<{ lastSyncAt: string | null; lastPrice: number | null } | null>(null);
  useEffect(() => {
    const fn = async () => {
      try {
        const r = await fetch("/api/cron/sync-sol-price/status");
        if (r.ok) setAutoSyncStatus(await r.json());
      } catch { /* ignore */ }
    };
    fn();
    const iv = setInterval(fn, 30_000);
    return () => clearInterval(iv);
  }, []);

  // ── Generic action (calls backend then refreshes) ───────────────────────────
  const doAction = async (key: string, fn: () => Promise<{ success: boolean; message: string }>) => {
    setActionLoading(key);
    try {
      const r = await fn();
      showNotification(r.message, r.success ? "success" : "error");
      fetchStats();
    } catch (e) { showNotification((e as Error).message, "error"); }
    finally { setActionLoading(null); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-[#39ff14]/50 border-t-[#39ff14] rounded-full animate-spin" />
    </div>
  );

  const cfg = stats?.presaleConfig;
  const maxNetCount = Math.max(...(stats?.networkBreakdown.map(n => n.count) ?? [1]));
  const chainActive = chainData?.isActive && !chainData?.isPaused;

  // ════════════════════════════════════════════════════════════════════════════
  //  SECTIONS
  // ════════════════════════════════════════════════════════════════════════════

  const SectionOverview = (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${chainActive ? "bg-[#39ff14]/10 border-[#39ff14]/30" : "bg-red-500/10 border-red-500/30"}`}>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${chainActive ? "bg-[#39ff14] animate-pulse" : "bg-red-500"}`} />
        <span className="font-semibold text-sm">
          Presale is <span className={chainActive ? "text-[#39ff14]" : "text-red-400"}>{chainActive ? "ACTIVE" : chainData?.isPaused ? "PAUSED" : "INACTIVE"}</span> on-chain
        </span>
        {cfg && (
          <span className="ml-auto text-xs text-gray-500">
            UI: {cfg.isActive ? "✅ Open" : "🔒 Closed"} · Claim: {cfg.claimEnabled ? "✅" : "❌"} · Staking: {cfg.stakingEnabled ? "✅" : "❌"}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Visits"       value={stats?.visits.total ?? 0}  sub={`${stats?.visits.unique ?? 0} unique`}           color="blue" />
        <StatCard title="Wallets Connected"  value={stats?.wallets.unique ?? 0} sub={`${stats?.wallets.total ?? 0} sessions`}         color="purple" />
        <StatCard title="Unique Buyers"      value={stats?.buyers.unique ?? 0}  sub={`${stats?.buyers.total ?? 0} purchases`}         color="yellow" />
        <StatCard title="Total Raised"       value={`$${(stats?.revenue.totalUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} sub="USD" color="green" />
      </div>

      {/* On-chain quick metrics */}
      {chainData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#0a0a0f] border border-[#9945FF]/20 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Current Stage</p>
            <p className="text-2xl font-bold text-[#9945FF]">Stage {chainData.currentStage + 1}</p>
          </div>
          <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Tokens Sold</p>
            <p className="text-2xl font-bold text-[#00d4ff]">{fmtTokens(Number(chainData.totalTokensSold))}</p>
          </div>
          <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">SOL Raised</p>
            <p className="text-2xl font-bold text-[#39ff14]">{(Number(chainData.totalSolRaised) / 1e9).toFixed(3)}</p>
          </div>
          <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Unique Buyers</p>
            <p className="text-2xl font-bold text-yellow-400">{Number(chainData.buyersCount).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Recent purchases */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <SectionCard title="Recent Purchases" action={
          <button onClick={() => setLocation("/admin/buyers")} className="text-xs text-[#39ff14] hover:underline">View all →</button>
        }>
          <div className="space-y-2">
            {stats.recentActivity.slice(0, 6).map(tx => (
              <div key={tx.id} className="flex items-center gap-4 px-4 py-3 bg-white/5 rounded-xl text-sm">
                <span className="w-2 h-2 rounded-full bg-[#39ff14] flex-shrink-0" />
                <span className="font-mono text-gray-300">{tx.walletAddress.slice(0,8)}…{tx.walletAddress.slice(-4)}</span>
                <span className="text-gray-500 capitalize text-xs">{tx.network}</span>
                <span className="ml-auto text-[#39ff14] font-semibold">${Number(tx.amountUsd).toFixed(2)}</span>
                <span className="text-gray-600 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );

  const SectionBlockchain = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-[#9945FF]/10 text-[#9945FF] rounded-full border border-[#9945FF]/20">Solana Devnet</span>
          {chainLastUpdated && <span className="text-xs text-gray-600">Updated {chainLastUpdated.toLocaleTimeString()}</span>}
        </div>
        <button onClick={refreshChain} disabled={chainLoading}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
          {chainLoading ? spinning : "↻"} Refresh
        </button>
      </div>

      {chainData ? (
        <>
          {/* Secondary metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">USDT Raised</p>
              <p className="text-xl font-bold text-green-400">${(Number(chainData.totalUsdtRaised) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Vault Balance</p>
              <p className="text-xl font-bold text-orange-400">{vaultBalance !== null ? `${vaultBalance.toFixed(4)} SOL` : "—"}</p>
            </div>
            <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Claim Opens</p>
              <p className="text-xl font-bold text-purple-400">
                {chainData.claimOpensAt > 0n ? new Date(Number(chainData.claimOpensAt) * 1000).toLocaleDateString() : "Not set"}
              </p>
            </div>
          </div>

          {/* SOL Price */}
          <SectionCard title="SOL Price">
            <div className="flex flex-wrap gap-6 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Contract price</p>
                <p className="text-2xl font-bold text-blue-400">
                  {chainData.solPriceUsdE6 > 0n ? `$${(Number(chainData.solPriceUsdE6) / 1e6).toFixed(2)}` : "Not set"}
                </p>
              </div>
              {livesolPrice && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Live (CoinGecko)</p>
                  <p className="text-2xl font-bold text-[#39ff14]">${livesolPrice.toFixed(2)}</p>
                </div>
              )}
              {autoSyncStatus?.lastSyncAt && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Auto-sync</p>
                  <p className="text-sm text-gray-300">
                    {new Date(autoSyncStatus.lastSyncAt).toLocaleTimeString()}
                    {autoSyncStatus.lastPrice && <span className="text-gray-500 ml-1">(${autoSyncStatus.lastPrice})</span>}
                  </p>
                  <p className="text-xs text-[#39ff14]">● Every 5 minutes</p>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-gray-500 mb-2">Manual sync via Phantom wallet</p>
              {!syncSolWallet ? (
                <Btn label="🔌 Connect Phantom" onClick={connectPhantom} variant="default" />
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-400 font-mono">{syncSolWallet.slice(0,8)}…{syncSolWallet.slice(-6)}</span>
                  <Btn
                    label={`⚡ Sync Now${livesolPrice ? ` ($${livesolPrice.toFixed(2)})` : ""}`}
                    onClick={handleSyncSolPrice}
                    loading={syncSolLoading}
                    variant="success"
                    disabled={!livesolPrice}
                  />
                  <button onClick={() => setSyncSolWallet("")} className="text-xs text-gray-600 hover:text-gray-400">Disconnect</button>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Stages */}
          <SectionCard title="Stage Progress">
            <div className="space-y-3">
              {chainData.stages.map((s, i) => (
                <StageBar
                  key={i}
                  label={`Stage ${i + 1}`}
                  sold={Number(s.tokensSold)}
                  max={Number(s.maxTokens)}
                  isCurrent={i === chainData.currentStage}
                  price={stageTokenPriceUsd(s.tokensPerRawUsdtScaled)}
                />
              ))}
            </div>
          </SectionCard>

          {/* Presale dates */}
          {(chainData.presaleStart > 0n || chainData.presaleEnd > 0n) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {chainData.presaleStart > 0n && (
                <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Presale Start</span>
                  <span className="text-sm text-gray-300">{new Date(Number(chainData.presaleStart) * 1000).toLocaleString()}</span>
                </div>
              )}
              {chainData.presaleEnd > 0n && (
                <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Presale End</span>
                  <span className="text-sm text-gray-300">{new Date(Number(chainData.presaleEnd) * 1000).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-gray-500">
          {chainLoading ? (
            <><span className="w-6 h-6 border-2 border-[#9945FF]/50 border-t-[#9945FF] rounded-full animate-spin mx-auto block mb-2" /><p>Reading Solana blockchain…</p></>
          ) : (
            <><p className="text-red-400">Cannot read on-chain data</p><p className="text-xs mt-1">Config PDA: BnHWhbNVB3cjCq7UA1KvBoW8JGe44yspCBSXPTDocuMi</p></>
          )}
        </div>
      )}
    </div>
  );

  const SectionControl = (
    <div className="space-y-6">
      {/* On-chain status readout */}
      {chainData && (
        <div className={`flex items-center gap-4 p-4 rounded-2xl border ${chainActive ? "bg-[#39ff14]/10 border-[#39ff14]/30" : "bg-red-500/10 border-red-500/30"}`}>
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${chainActive ? "bg-[#39ff14] animate-pulse" : "bg-red-500"}`} />
          <div>
            <p className="text-sm font-semibold">
              On-Chain: <span className={chainActive ? "text-[#39ff14]" : "text-red-400"}>{chainActive ? "Active" : chainData.isPaused ? "Paused" : "Inactive"}</span>
            </p>
            <p className="text-xs text-gray-500">Stage {chainData.currentStage + 1} · {Number(chainData.buyersCount)} buyers · {fmtTokens(Number(chainData.totalTokensSold))} sold</p>
          </div>
        </div>
      )}

      {/* On-Chain Pause / Resume */}
      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="⛓ إيقاف/استئناف على البلوكتشين">
          <p className="text-xs text-gray-500 mb-4">يُوقف الشراء مباشرة في العقد الذكي — لا يمكن لأحد الشراء حتى لو تجاوز الموقع</p>
          <ChainPausePanel showNotification={showNotification} chainData={chainData} onRefresh={refreshChain} />
        </SectionCard>

        {/* Contract Info */}
        <SectionCard title="📋 معلومات العقد الذكي">
          <p className="text-xs text-gray-500 mb-3">العقد يدعم الإيقاف والاستئناف مباشرةً — لا يلزم أي تعديل:</p>
          <div className="bg-black/40 rounded-xl p-3 font-mono text-xs text-[#39ff14] overflow-x-auto space-y-1 border border-white/10">
            <p className="text-gray-400">// contracts/programs/pepewife-presale/src/instructions/admin.rs</p>
            <p>pub fn pause(ctx: Context{"<"}AdminOnly{">"}) {"→"} Result{"<()>"} {"{"}</p>
            <p className="pl-4">ctx.accounts.config.is_paused = true;</p>
            <p className="pl-4">Ok(())</p>
            <p>{"}"}</p>
            <p className="mt-1">pub fn resume(ctx: Context{"<"}AdminOnly{">"}) {"→"} Result{"<()>"} {"{"}</p>
            <p className="pl-4">ctx.accounts.config.is_paused = false;</p>
            <p className="pl-4">Ok(())</p>
            <p>{"}"}</p>
            <p className="mt-2 text-gray-400">// buy_with_sol.rs + buy_with_usdt.rs يتحققان:</p>
            <p>require!(!config.is_paused, PresaleError::Paused);</p>
          </div>
        </SectionCard>
      </div>

      {/* Advance Stage + End Presale */}
      <div className="grid lg:grid-cols-2 gap-5">
        <SectionCard title="⏭ الانتقال بين المراحل">
          <p className="text-xs text-gray-500 mb-4">عند انتهاء توكنز المرحلة الحالية، اضغط للانتقال للمرحلة التالية على البلوكتشين</p>
          <AdvanceStagePanel chainData={chainData} onRefresh={refreshChain} showNotification={showNotification} />
        </SectionCard>

        <SectionCard title="🏁 إنهاء البيع نهائياً">
          <p className="text-xs text-gray-500 mb-4">يُسجّل وقت انتهاء البيع على العقد — يُفعّل عقد الاستحقاق (Claim) بعده</p>
          <EndPresalePanel chainData={chainData} onRefresh={refreshChain} showNotification={showNotification} />
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* UI Controls */}
        <SectionCard title="🖥 واجهة المستخدم (UI Control)">
          <p className="text-xs text-gray-500 mb-4">تتحكم في ما يراه المستخدم فقط — لا تؤثر على العقد الذكي</p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">حالة زر الشراء</p>
              <div className="flex gap-2">
                <Btn
                  label="⏸ إيقاف الشراء"
                  variant="danger"
                  onClick={() => doAction("pause", adminApi.pausePresale)}
                  loading={actionLoading === "pause"}
                  disabled={!(cfg?.isActive ?? true)}
                />
                <Btn
                  label="▶ تفعيل الشراء"
                  variant="success"
                  onClick={() => doAction("resume", adminApi.resumePresale)}
                  loading={actionLoading === "resume"}
                  disabled={cfg?.isActive ?? true}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">الحالة الحالية: {cfg?.isActive ? <span className="text-[#39ff14]">مفتوح</span> : <span className="text-red-400">مغلق</span>}</p>
            </div>

            <div className="h-px bg-white/10" />

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">الميزات</p>
              <div className="flex flex-wrap gap-2">
                <Btn
                  label={cfg?.claimEnabled ? "🔒 تعطيل Claim" : "🎁 تفعيل Claim"}
                  variant={cfg?.claimEnabled ? "warning" : "success"}
                  onClick={() => doAction("claim", () => adminApi.setClaim(!cfg?.claimEnabled))}
                  loading={actionLoading === "claim"}
                />
                <Btn
                  label={cfg?.stakingEnabled ? "🔒 تعطيل Staking" : "🌾 تفعيل Staking"}
                  variant={cfg?.stakingEnabled ? "warning" : "success"}
                  onClick={() => doAction("staking", () => adminApi.setStaking(!cfg?.stakingEnabled))}
                  loading={actionLoading === "staking"}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Stage Info */}
        <SectionCard title="📋 معلومات المراحل">
          <p className="text-xs text-gray-500 mb-4">المراحل لا تتقدم تلقائياً — يجب على الأدمن الضغط على "الانتقال للمرحلة التالية"</p>
          {chainData ? (
            <div className="space-y-2">
              {chainData.stages.map((s, i) => {
                const sold = Number(s.tokensSold);
                const max  = Number(s.maxTokens);
                const pct  = max > 0 ? Math.min(100, (sold / max) * 100) : 0;
                const isCurrent = i === chainData.currentStage;
                return (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${isCurrent ? "bg-[#9945FF]/10" : ""}`}>
                    <span className={`text-xs font-mono w-14 ${isCurrent ? "text-[#9945FF]" : "text-gray-500"}`}>Stage {i + 1}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isCurrent ? "bg-[#9945FF]" : "bg-white/20"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-xs text-gray-500">Loading chain data…</p>}
        </SectionCard>
      </div>
    </div>
  );

  const SectionRevenue = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total USD Raised"  value={`$${(stats?.revenue.totalUsd ?? 0).toFixed(2)}`}  color="green" />
        <StatCard title="Vault (SOL)"        value={vaultBalance !== null ? `${vaultBalance.toFixed(4)} SOL` : "—"} color="yellow" />
        <StatCard title="SOL Raised (chain)" value={chainData ? `${(Number(chainData.totalSolRaised) / 1e9).toFixed(4)} SOL` : "—"} color="orange" />
      </div>

      <SectionCard title="سحب SOL من الخزينة">
        <WithdrawPanel showNotification={showNotification} />
      </SectionCard>

      <SectionCard title="سحب USDT من الخزينة">
        <WithdrawUsdtPanel showNotification={showNotification} />
      </SectionCard>

      {/* Network breakdown */}
      <SectionCard title="توزيع الشبكات">
        {!stats?.networkBreakdown.length ? (
          <p className="text-gray-500 text-sm">No purchase data yet.</p>
        ) : (
          <div className="space-y-3">
            {stats.networkBreakdown.map(n => (
              <div key={n.network} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300 capitalize">{n.network}</span>
                  <span className="text-gray-400">{n.count} · ${Number(n.totalUsd).toFixed(2)}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#9945FF] rounded-full" style={{ width: `${(n.count / maxNetCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );

  const SectionReferrals = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Referrers"       value={stats?.referrals?.totalReferrers ?? 0}    sub="active shillers"    color="purple" />
        <StatCard title="Referrals"       value={stats?.referrals?.totalReferrals ?? 0}    sub="purchases referred" color="blue" />
        <StatCard title="Pending Rewards" value={`${fmt(stats?.referrals?.pendingRewardTokens ?? 0)} $PWIFE`} sub="awaiting TGE" color="yellow" />
        <StatCard title="Paid Rewards"    value={`${fmt(stats?.referrals?.paidRewardTokens ?? 0)} $PWIFE`}    sub="distributed"    color="green" />
      </div>

      {stats?.referrals && (
        <SectionCard
          title="Referrers Leaderboard"
          action={
            <Btn
              label="✅ Mark ALL Paid"
              variant="success"
              size="sm"
              onClick={() => doAction("markAllPaid", () => adminApi.markReferralsPaid())}
              loading={actionLoading === "markAllPaid"}
              disabled={(stats.referrals.pendingRewardTokens ?? 0) === 0}
            />
          }
        >
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
                    <th className="text-right py-3 pr-4">$PWIFE</th>
                    <th className="text-right py-3 pr-4">USD</th>
                    <th className="text-right py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.referrals.topReferrers.map((r, i) => (
                    <tr key={r.walletAddress} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4 text-gray-500">{i + 1}</td>
                      <td className="py-3 pr-4 font-mono text-gray-300">{r.walletAddress.slice(0,8)}…{r.walletAddress.slice(-4)}</td>
                      <td className="py-3 pr-4"><span className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono text-[#39ff14]">{r.code}</span></td>
                      <td className="py-3 pr-4 text-right text-white">{r.totalReferrals}</td>
                      <td className="py-3 pr-4 text-right text-yellow-400 font-medium">{fmt(r.totalRewardTokens)}</td>
                      <td className="py-3 pr-4 text-right text-gray-400">${Number(r.totalRewardUsd ?? 0).toFixed(2)}</td>
                      <td className="py-3 text-right">
                        {r.totalRewardTokens > 0 ? (
                          <button
                            onClick={() => doAction(`paid-${r.walletAddress}`, () => adminApi.markReferralsPaid(r.walletAddress))}
                            disabled={actionLoading === `paid-${r.walletAddress}`}
                            className="px-3 py-1.5 text-xs bg-[#39ff14]/20 hover:bg-[#39ff14]/30 border border-[#39ff14]/30 text-[#39ff14] rounded-lg transition-all disabled:opacity-40 flex items-center gap-1 ml-auto"
                          >
                            {actionLoading === `paid-${r.walletAddress}` && spinning} Mark Paid
                          </button>
                        ) : <span className="text-xs text-gray-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={() => setLocation("/admin/referrals")} className="mt-4 text-xs text-[#39ff14] hover:underline">View all referrals →</button>
        </SectionCard>
      )}
    </div>
  );

  const SectionAnalytics = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Page Views"    value={stats?.visits.total ?? 0}   sub="all visits"      color="blue" />
        <StatCard title="Unique Users"  value={stats?.visits.unique ?? 0}  sub="unique visitors" color="purple" />
        <StatCard title="Wallets"       value={stats?.wallets.unique ?? 0} sub="connected"       color="green" />
        <StatCard title="Conv. Rate"    value={stats?.wallets.unique && stats?.visits.unique ? `${((stats.wallets.unique / stats.visits.unique) * 100).toFixed(1)}%` : "0%"} sub="visitors → wallets" color="yellow" />
      </div>

      {stats?.topPages && stats.topPages.length > 0 && (
        <SectionCard title="Top Pages">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stats.topPages.map(p => (
              <div key={p.page} className="flex justify-between px-4 py-3 bg-white/5 rounded-xl">
                <span className="text-gray-300 text-sm font-mono">{p.page || "/"}</span>
                <span className="text-[#39ff14] text-sm font-medium">{Number(p.count).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {stats?.walletTypeBreakdown && stats.walletTypeBreakdown.length > 0 && (
        <SectionCard title="Wallet Types">
          <div className="flex flex-wrap gap-2">
            {stats.walletTypeBreakdown.map(w => (
              <span key={w.walletType} className="px-3 py-2 bg-white/10 rounded-xl text-sm">
                {w.walletType}: <span className="text-[#39ff14] font-semibold">{w.count}</span>
              </span>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );

  const SECTION_MAP: Record<Section, React.ReactNode> = {
    overview:   SectionOverview,
    blockchain: SectionBlockchain,
    control:    SectionControl,
    revenue:    SectionRevenue,
    referrals:  SectionReferrals,
    analytics:  SectionAnalytics,
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

      {/* Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-fade-in ${notification.type === "success" ? "bg-[#39ff14]/20 border-[#39ff14]/40 text-[#39ff14]" : "bg-red-500/20 border-red-500/40 text-red-300"}`}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 bg-[#111118]/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => setSidebarOpen(o => !o)} className="text-gray-400 hover:text-white text-lg leading-none">☰</button>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#39ff14]/30 to-[#00d4ff]/30 border border-[#39ff14]/30 flex items-center justify-center text-xs font-bold text-[#39ff14]">⚡</span>
            <h1 className="text-sm font-bold">Admin Panel</h1>
            <span className="text-xs px-2 py-0.5 bg-[#39ff14]/10 text-[#39ff14] rounded-full border border-[#39ff14]/20">PEPEWIFE</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={fetchStats} className="text-gray-400 hover:text-white text-sm" title="Refresh">↻</button>
            {user?.avatar && <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" />}
            <span className="text-xs text-gray-400 hidden sm:block">{user?.email}</span>
            <button onClick={logout} className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors">Logout</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "w-52" : "w-0 overflow-hidden"} transition-all duration-200 bg-[#0d0d14] border-r border-white/10 flex-shrink-0`}>
          <nav className="p-3 space-y-1 pt-4">
            {NAV.map(n => (
              <button
                key={n.key}
                onClick={() => setActiveSection(n.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-right ${activeSection === n.key ? "bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <span className="text-base leading-none">{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
            <div className="pt-3 border-t border-white/10 mt-3 space-y-1">
              <button onClick={() => setLocation("/admin/buyers")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                <span>👤</span><span>Buyers List</span>
              </button>
              <button onClick={() => setLocation("/admin/referrals")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                <span>📋</span><span>All Referrals</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-5 py-7">
            {/* Section title */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{NAV.find(n => n.key === activeSection)?.icon}</span>
              <h2 className="text-xl font-bold">{NAV.find(n => n.key === activeSection)?.label}</h2>
            </div>

            {dataLoading && !stats ? (
              <div className="flex items-center justify-center py-20">
                <span className="w-8 h-8 border-2 border-[#39ff14]/50 border-t-[#39ff14] rounded-full animate-spin" />
              </div>
            ) : (
              SECTION_MAP[activeSection]
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
