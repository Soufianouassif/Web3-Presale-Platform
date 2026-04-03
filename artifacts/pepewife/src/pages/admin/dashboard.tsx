import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { adminApi, type AdminStats } from "@/lib/admin-api";

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

                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Funds</p>
                    <ControlButton
                      label="💸 Withdraw Presale Funds"
                      variant="warning"
                      onClick={() => doAction("withdraw", adminApi.withdraw)}
                      loading={actionLoading === "withdraw"}
                    />
                    <p className="text-xs text-gray-600 mt-2">Complete withdrawal via your wallet app after confirmation.</p>
                  </div>
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
