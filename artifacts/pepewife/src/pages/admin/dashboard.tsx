import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { adminApi, type AdminStats } from "@/lib/admin-api";
import { withdrawSol, connection, SOL_VAULT_PDA } from "@/lib/presale-contract";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
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
type WithdrawStep = "idle" | "connecting" | "signing" | "success" | "error";

function WithdrawPanel() {
  const [vaultSol, setVaultSol]         = useState<number | null>(null);
  const [walletAddr, setWalletAddr]     = useState<string>("");
  const [walletType, setWalletType]     = useState<"phantom" | "solflare">("phantom");
  const [step, setStep]                 = useState<WithdrawStep>("idle");
  const [txSig, setTxSig]              = useState("");
  const [withdrawn, setWithdrawn]       = useState<string>("");
  const [errMsg, setErrMsg]             = useState("");

  // Fetch vault balance
  useEffect(() => {
    connection.getBalance(SOL_VAULT_PDA)
      .then(lamps => setVaultSol(lamps / 1e9))
      .catch(() => setVaultSol(null));
  }, []);

  // Connect admin wallet
  async function connectWallet() {
    setStep("connecting");
    try {
      const provider = walletType === "phantom"
        ? (window as any).phantom?.solana
        : (window as any).solflare;
      if (!provider) throw new Error(`${walletType} not found`);
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

  // Execute withdrawal
  async function doWithdraw() {
    if (!walletAddr) return;
    setStep("signing");
    setErrMsg("");
    try {
      const result = await withdrawSol(walletAddr, walletType);
      setTxSig(result.signature);
      setWithdrawn((Number(result.withdrawnLamports) / 1e9).toFixed(4));
      setStep("success");
      // Refresh vault balance
      connection.getBalance(SOL_VAULT_PDA).then(lamps => setVaultSol(lamps / 1e9)).catch(() => {});
    } catch (e: any) {
      const msg: string = e.message ?? String(e);
      if (msg.toLowerCase().includes("unauthorized")) {
        setErrMsg("This wallet is not the presale authority. Connect the correct admin wallet.");
      } else {
        setErrMsg(msg.length > 150 ? msg.slice(0, 150) + "…" : msg);
      }
      setStep("error");
    }
  }

  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Vault Funds</p>

      {/* Vault balance */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
        <p className="text-xs text-yellow-300/70 mb-1">SOL Vault Balance</p>
        <p className="text-2xl font-bold text-yellow-300">
          {vaultSol === null ? "Loading…" : `${vaultSol.toFixed(4)} SOL`}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Vault: <span className="font-mono">4vWdK1b3…ZjfK</span>
        </p>
      </div>

      {/* Need SOL for fees alert */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4 text-xs text-blue-300">
        ⚠️ Your admin wallet needs a tiny amount of SOL (~0.001) to pay transaction fees before withdrawing.
        <a
          href="https://faucet.solana.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 underline text-blue-200 hover:text-white"
        >
          Get free Devnet SOL → faucet.solana.com
        </a>
        <p className="mt-1 text-blue-300/70">Address to fund: <span className="font-mono">6dSw3tP6…67Ac1</span></p>
      </div>

      {/* Wallet selector */}
      {step !== "success" && (
        <div className="flex gap-2 mb-3">
          {(["phantom", "solflare"] as const).map(w => (
            <button
              key={w}
              onClick={() => setWalletType(w)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all capitalize ${
                walletType === w
                  ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                  : "bg-white/5 border-white/20 text-gray-400 hover:bg-white/10"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {/* Connect / Withdraw button */}
      {step === "idle" && !walletAddr && (
        <ControlButton
          label={`🔌 Connect ${walletType.charAt(0).toUpperCase() + walletType.slice(1)}`}
          variant="warning"
          onClick={connectWallet}
        />
      )}

      {step === "idle" && walletAddr && (
        <div className="space-y-2">
          <p className="text-xs text-green-400">
            ✓ Connected: <span className="font-mono">{walletAddr.slice(0,8)}…{walletAddr.slice(-4)}</span>
          </p>
          <ControlButton
            label="💸 Withdraw All SOL"
            variant="warning"
            onClick={doWithdraw}
          />
        </div>
      )}

      {step === "connecting" && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          Connecting wallet…
        </div>
      )}

      {step === "signing" && (
        <div className="flex items-center gap-2 text-sm text-yellow-300">
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          Waiting for wallet approval…
        </div>
      )}

      {step === "success" && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <p className="text-green-400 font-semibold mb-1">✅ Withdrawal Successful!</p>
          <p className="text-sm text-gray-300">Received: <span className="text-white font-bold">{withdrawn} SOL</span></p>
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 underline mt-2 block"
          >
            View on Explorer: {txSig.slice(0, 16)}…
          </a>
        </div>
      )}

      {step === "error" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
          <p className="font-semibold mb-1">❌ Failed</p>
          <p className="text-xs">{errMsg}</p>
          <button onClick={() => setStep("idle")} className="mt-2 text-xs underline text-red-400">Try again</button>
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
                        disabled={!config?.isActive}
                      />
                      <ControlButton
                        label="▶ Resume Sale"
                        variant="success"
                        onClick={() => doAction("resume", adminApi.resumePresale)}
                        loading={actionLoading === "resume"}
                        disabled={config?.isActive}
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
