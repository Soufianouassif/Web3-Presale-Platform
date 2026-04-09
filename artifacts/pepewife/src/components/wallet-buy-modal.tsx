import { useState, useEffect, useCallback } from "react";
import { X, Loader2, CheckCircle2, XCircle, ExternalLink, Download, Shield, ArrowLeft } from "lucide-react";
import { useWallet } from "@/contexts/wallet-context";
import { useLanguage } from "@/i18n/context";
import { getInstallUrl, type WalletType } from "@/lib/wallet";
import { buyWithSol, buyWithUsdt, buildExplorerUrl, type PresaleState } from "@/lib/presale-contract";

// ─── Wallet definitions (Solana only) ───────────────────────────────────────
const WALLETS: {
  id: WalletType;
  name: string;
  iconSrc: string;
  color: string;
  shadow: string;
  bg: string;
}[] = [
  { id: "phantom",  name: "Phantom",     iconSrc: "/wallet-phantom.png",  color: "#AB47BC", shadow: "#7B1FA2", bg: "bg-[#F3E5F5]" },
  { id: "solflare", name: "Solflare",    iconSrc: "/wallet-solflare.svg", color: "#FC6E21", shadow: "#C94F0A", bg: "bg-[#FFF3E0]" },
  { id: "backpack", name: "Backpack",    iconSrc: "/wallet-backpack.svg", color: "#E05CFF", shadow: "#9B1DCC", bg: "bg-[#FAF0FF]" },
  { id: "okx",      name: "OKX Wallet", iconSrc: "/wallet-okx.svg",      color: "#000000", shadow: "#333333", bg: "bg-[#F5F5F5]" },
];

// ─── Types ──────────────────────────────────────────────────────────────────
type ModalStep =
  | "select"       // choose wallet
  | "connecting"   // waiting for wallet extension
  | "confirm"      // wallet connected — confirm the tx
  | "signing"      // waiting for user approval in wallet
  | "success"      // tx confirmed
  | "error";       // something went wrong

interface Props {
  amount: number;
  currency: "SOL" | "USDT_SPL";
  presaleData: PresaleState | null;
  tokensEstimate: number;
  onClose: () => void;
  onSuccess: (signature: string) => void;
  disableWalletSwitch?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("reject") || m.includes("cancel") || m.includes("denied"))
    return "Transaction rejected in wallet.";
  if (m.includes("not installed") || m.includes("not found"))
    return "Wallet extension not found. Please install it first.";
  if (m.includes("insufficient") || m.includes("balance"))
    return "Insufficient balance to complete this purchase.";
  if (m.includes("block height") || m.includes("blockhash") || m.includes("expired"))
    return "Transaction timed out — but your SOL may already be deducted. Check Solana Explorer for your signature to confirm the purchase went through.";
  if (m.includes("network") || m.includes("timeout") || m.includes("failed to fetch"))
    return "Network error. Check your connection and try again.";
  return msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function WalletBuyModal({ amount, currency, presaleData, tokensEstimate, onClose, onSuccess, disableWalletSwitch = false }: Props) {
  const { status, walletType: connectedWallet, address, connect, installedWallets, refreshDetection } = useWallet();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  // If wallet is already connected when the modal opens → start at "confirm" directly
  const isAlreadyConnected = status === "connected" && !!connectedWallet;
  const [step, setStep]           = useState<ModalStep>(isAlreadyConnected ? "confirm" : "select");
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(isAlreadyConnected ? connectedWallet : null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [signature, setSignature] = useState("");
  const [connectingId, setConnectingId] = useState<WalletType | null>(null);

  // Refresh wallet detection and handle delayed session restore (wallet restores after 800ms)
  useEffect(() => {
    refreshDetection();
    // Handle the case where wallet context restores connection asynchronously after modal opens
    if (status === "connected" && connectedWallet && step === "select") {
      setSelectedWallet(connectedWallet);
      setStep("confirm");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a wallet connects, move to confirm
  useEffect(() => {
    if (status === "connected" && connectedWallet && step === "connecting") {
      setSelectedWallet(connectedWallet);
      setStep("confirm");
      setConnectingId(null);
    }
    if (status === "error" && step === "connecting") {
      setStep("error");
      setErrorMsg("Failed to connect wallet. Please try again.");
      setConnectingId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, connectedWallet]);

  // ── Connect handler ────────────────────────────────────────────────────────
  const handleSelectWallet = useCallback(async (walletId: WalletType) => {
    const isInstalled = installedWallets[walletId];
    if (!isInstalled) {
      window.open(getInstallUrl(walletId), "_blank", "noopener,noreferrer");
      return;
    }

    setConnectingId(walletId);
    setStep("connecting");
    const ok = await connect(walletId);
    if (!ok) {
      setStep("error");
      setErrorMsg("Wallet connection was rejected or failed.");
      setConnectingId(null);
    }
  }, [connect, installedWallets, currency]);

  // ── Sign / send transaction ────────────────────────────────────────────────
  const handleSign = useCallback(async () => {
    if (!address || !selectedWallet) return;

    setStep("signing");
    try {
      if (currency === "SOL") {
        const result = await buyWithSol(address, amount, selectedWallet);
        setSignature(result.signature);
        setStep("success");
        onSuccess(result.signature);
      } else {
        const result = await buyWithUsdt(address, amount, selectedWallet);
        setSignature(result.signature);
        setStep("success");
        onSuccess(result.signature);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(friendlyError(msg));
      setStep("error");
    }
  }, [address, selectedWallet, currency, amount, presaleData, onSuccess]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const walletMeta = WALLETS.find(w => w.id === selectedWallet);
  const currencyLabel = currency === "SOL" ? "SOL" : "USDT";
  const explorerUrl = signature ? buildExplorerUrl(signature) : "";

  // Close on backdrop click only when not in the middle of signing
  const handleBackdrop = () => {
    if (step === "signing" || step === "connecting") return;
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(26,26,46,0.75)", backdropFilter: "blur(6px)" }}
      onClick={handleBackdrop}
    >
      <div
        className="relative w-full max-w-md bg-[#FFFDE7] rounded-3xl border-4 border-[#1a1a2e] shadow-[8px_8px_0px_#1a1a2e] overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ direction: isRTL ? "rtl" : "ltr" }}
      >
        {/* Zigzag top */}
        <div className="zigzag-border" />

        {/* Close button */}
        {step !== "signing" && step !== "connecting" && (
          <button
            onClick={onClose}
            className="absolute top-4 end-4 z-10 w-8 h-8 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center hover:bg-[#FF4D9D] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* ── SELECT WALLET ───────────────────────────────────────────── */}
        {step === "select" && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-1">
              <Shield className="h-5 w-5 text-[#4CAF50]" />
              <h2 className="font-display text-2xl text-[#1a1a2e] tracking-wider">Choose Wallet</h2>
            </div>
            <p className="text-sm text-[#1a1a2e]/50 font-bold mb-5">
              Select your wallet to sign the purchase of{" "}
              <span className="text-[#FF4D9D] font-display">{amount} {currencyLabel}</span>
            </p>

            {/* Purchase summary pill */}
            <div className="bg-white border-2 border-[#4CAF50] rounded-2xl p-3 mb-5 shadow-[3px_3px_0px_#2E7D32]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-display tracking-wider text-[#1a1a2e]/50">YOU PAY</span>
                <span className="font-display text-xl text-[#1a1a2e] tracking-wider">{amount} {currencyLabel}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs font-display tracking-wider text-[#1a1a2e]/50">YOU GET</span>
                <span className="font-display text-base text-[#4CAF50] tracking-wider">
                  {tokensEstimate > 0
                    ? `~${tokensEstimate.toLocaleString()} $PWIFE`
                    : "Calculating…"}
                </span>
              </div>
            </div>

            {/* Solana wallets */}
            <div className="mb-2">
              <span className="text-[10px] font-display tracking-widest text-[#14F195]/80 uppercase ps-1">⬡ Solana</span>
              <div className="space-y-2 mt-1">
                {WALLETS.map(w => {
                  const installed = installedWallets[w.id];
                  return (
                    <button
                      key={w.id}
                      onClick={() => handleSelectWallet(w.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 transition-all text-start ${w.bg}`}
                      style={{ borderColor: installed ? w.color : "#1a1a2e20" }}
                    >
                      <img src={w.iconSrc} alt={w.name} className="w-9 h-9 rounded-xl border-2 border-[#1a1a2e]/10 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-base tracking-wide" style={{ color: w.color }}>{w.name}</div>
                        <div className="text-[11px] text-[#1a1a2e]/40 font-bold">
                          {installed ? "Installed · ready to connect" : "Not installed"}
                        </div>
                      </div>
                      {!installed && (
                        <span className="shrink-0 flex items-center gap-1 text-[11px] font-display text-[#1a1a2e]/40 border border-[#1a1a2e]/20 rounded-lg px-2 py-0.5">
                          <Download className="h-3 w-3" /> Install
                        </span>
                      )}
                      {installed && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-[#4CAF50]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-center text-[11px] text-[#1a1a2e]/30 font-bold">
              🔒 Your keys, your crypto. We never store private keys.
            </p>
          </div>
        )}

        {/* ── CONNECTING ──────────────────────────────────────────────── */}
        {step === "connecting" && (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            {connectingId && (
              <img
                src={WALLETS.find(w => w.id === connectingId)?.iconSrc}
                alt="wallet"
                className="w-16 h-16 rounded-2xl border-4 border-[#1a1a2e]"
              />
            )}
            <Loader2 className="h-10 w-10 animate-spin text-[#FF4D9D]" />
            <div>
              <h3 className="font-display text-2xl text-[#1a1a2e] tracking-wider">Connecting…</h3>
              <p className="text-sm text-[#1a1a2e]/50 font-bold mt-1">
                Approve the connection in your wallet extension.
              </p>
            </div>
          </div>
        )}

        {/* ── CONFIRM TX ──────────────────────────────────────────────── */}
        {step === "confirm" && walletMeta && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <img src={walletMeta.iconSrc} alt={walletMeta.name} className="w-10 h-10 rounded-xl border-2 border-[#1a1a2e]" />
              <div>
                <h2 className="font-display text-xl text-[#1a1a2e] tracking-wider">Confirm Purchase</h2>
                <p className="text-xs text-[#1a1a2e]/50 font-bold">Connected via {walletMeta.name}</p>
              </div>
            </div>

            {/* TX details */}
            <div className="bg-white border-2 border-[#1a1a2e] rounded-2xl divide-y-2 divide-[#1a1a2e]/10 overflow-hidden shadow-[4px_4px_0px_#1a1a2e]">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs font-display tracking-wider text-[#1a1a2e]/50">WALLET</span>
                <span className="font-mono text-sm text-[#1a1a2e] font-bold">
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs font-display tracking-wider text-[#1a1a2e]/50">YOU PAY</span>
                <span className="font-display text-lg text-[#FF4D9D] tracking-wider">{amount} {currencyLabel}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs font-display tracking-wider text-[#1a1a2e]/50">YOU GET</span>
                <span className="font-display text-lg text-[#4CAF50] tracking-wider">
                  {tokensEstimate > 0
                    ? `~${tokensEstimate.toLocaleString()} $PWIFE`
                    : "Calculating…"}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs font-display tracking-wider text-[#1a1a2e]/50">NETWORK</span>
                <span className="font-display text-sm text-[#14F195] tracking-wider">
                  ⬡ Solana
                </span>
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 bg-[#E8F5E9] border-2 border-[#4CAF50]/40 rounded-xl p-3">
              <Shield className="h-4 w-4 text-[#4CAF50] mt-0.5 shrink-0" />
              <p className="text-[11px] text-[#1a1a2e]/60 font-bold leading-relaxed">
                Your wallet will ask you to approve this transaction. Review the details carefully before signing.
              </p>
            </div>

            <div className={`grid gap-3 ${disableWalletSwitch ? "grid-cols-1" : "grid-cols-2"}`}>
              {!disableWalletSwitch && (
                <button
                  onClick={() => { setStep("select"); setSelectedWallet(null); }}
                  className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-[#1a1a2e] bg-white font-display text-base tracking-wider text-[#1a1a2e] hover:bg-[#FFFDE7] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Change
                </button>
              )}
              <button
                onClick={handleSign}
                className="btn-meme h-12 rounded-xl font-display text-base tracking-wider text-white"
                style={{ background: "linear-gradient(135deg, #4CAF50, #FF4D9D)", boxShadow: "3px 3px 0px #1a1a2e" }}
              >
                Sign & Buy 🚀
              </button>
            </div>
          </div>
        )}

        {/* ── SIGNING ─────────────────────────────────────────────────── */}
        {step === "signing" && (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            {walletMeta && (
              <img src={walletMeta.iconSrc} alt={walletMeta.name} className="w-16 h-16 rounded-2xl border-4 border-[#1a1a2e]" />
            )}
            <Loader2 className="h-10 w-10 animate-spin text-[#FF4D9D]" />
            <div>
              <h3 className="font-display text-2xl text-[#1a1a2e] tracking-wider">Awaiting Signature…</h3>
              <p className="text-sm text-[#1a1a2e]/50 font-bold mt-1">
                Approve the transaction in your wallet popup.
              </p>
            </div>
            <div className="bg-[#FFF3E0] border-2 border-[#FC6E21]/30 rounded-xl p-3 w-full text-xs text-[#1a1a2e]/50 font-bold text-center">
              ⚠️ Do not close this window until the transaction is confirmed.
            </div>
          </div>
        )}

        {/* ── SUCCESS ─────────────────────────────────────────────────── */}
        {step === "success" && (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <CheckCircle2 className="h-16 w-16 text-[#4CAF50]" />
            <div>
              <div className="sticker bg-[#4CAF50] text-white mb-3 inline-block text-sm" style={{ transform: "rotate(-2deg)" }}>
                Purchase Complete!
              </div>
              <h3 className="font-display text-3xl text-[#1a1a2e] tracking-wider comic-shadow">
                You're in! 🐸
              </h3>
              <p className="text-sm text-[#1a1a2e]/50 font-bold mt-2">
                Your $PWIFE tokens are secured. Track them in your dashboard.
              </p>
            </div>

            {signature && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-mono text-[#1a1a2e]/40 hover:text-[#FF4D9D] transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                {signature.slice(0, 16)}…{signature.slice(-8)}
              </a>
            )}

            <button
              onClick={onClose}
              className="btn-meme w-full h-12 rounded-xl font-display text-lg tracking-wider text-white"
              style={{ background: "linear-gradient(135deg, #4CAF50, #FF4D9D)", boxShadow: "4px 4px 0px #1a1a2e" }}
            >
              View Dashboard 📊
            </button>
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────────────────────── */}
        {step === "error" && (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <XCircle className="h-14 w-14 text-[#FF4D9D]" />
            <div>
              <h3 className="font-display text-2xl text-[#1a1a2e] tracking-wider">Something went wrong</h3>
              <p className="text-sm text-[#FF4D9D] font-bold mt-2 max-w-xs">{errorMsg}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => {
                  setErrorMsg("");
                  if (disableWalletSwitch && selectedWallet) {
                    setStep("confirm");
                  } else {
                    setStep("select");
                    setSelectedWallet(null);
                  }
                }}
                className="h-11 rounded-xl border-2 border-[#1a1a2e] bg-white font-display text-sm tracking-wider hover:bg-[#FFFDE7] transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="h-11 rounded-xl border-2 border-[#1a1a2e]/30 bg-[#FFFDE7] font-display text-sm tracking-wider text-[#1a1a2e]/60 hover:text-[#1a1a2e] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
