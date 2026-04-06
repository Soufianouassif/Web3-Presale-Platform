import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { adminApi, type ReferralRecord } from "@/lib/admin-api";

const STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  paid: "bg-[#39ff14]/20 text-[#39ff14] border-[#39ff14]/30",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function AdminReferrals() {
  const { loading, authenticated, user, logout } = useAdminAuth();
  const [, setLocation] = useLocation();

  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "paid">("");
  const [dataLoading, setDataLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!loading && !authenticated) setLocation("/admin");
  }, [loading, authenticated, setLocation]);

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchReferrals = useCallback((page = 1) => {
    if (!authenticated) return;
    setDataLoading(true);
    adminApi
      .getReferrals(page, 50, statusFilter || undefined)
      .then((data) => {
        setReferrals(data.referrals);
        setPagination(data.pagination);
        setDataLoading(false);
      })
      .catch(() => setDataLoading(false));
  }, [authenticated, statusFilter]);

  useEffect(() => { fetchReferrals(1); }, [fetchReferrals]);

  const doMarkPaid = async (walletAddress?: string) => {
    const key = walletAddress ?? "all";
    setActionLoading(key);
    try {
      const result = await adminApi.markReferralsPaid(walletAddress);
      showNotification(result.message, "success");
      fetchReferrals(pagination.page);
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

  const pendingCount = referrals.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
            notification.type === "success"
              ? "bg-[#39ff14]/20 border-[#39ff14]/40 text-[#39ff14]"
              : "bg-red-500/20 border-red-500/40 text-red-300"
          }`}
        >
          {notification.msg}
        </div>
      )}

      <header className="border-b border-white/10 bg-[#111118]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/admin/dashboard")} className="text-gray-400 hover:text-white transition-colors text-sm">
              ← Dashboard
            </button>
            <span className="text-white/20">/</span>
            <h1 className="text-lg font-bold">Referrals</h1>
          </div>
          <div className="flex items-center gap-4">
            {user?.avatar && <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" />}
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <button onClick={logout} className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Filter:</span>
            {(["", "pending", "paid"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 text-xs rounded-full border transition-all ${
                  statusFilter === s
                    ? "bg-[#39ff14]/20 border-[#39ff14]/40 text-[#39ff14]"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {pagination.total.toLocaleString()} total
            </span>
            <button
              onClick={() => doMarkPaid()}
              disabled={actionLoading === "all" || pendingCount === 0}
              className="px-4 py-2 text-sm bg-[#39ff14]/20 hover:bg-[#39ff14]/30 border border-[#39ff14]/30 text-[#39ff14] rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {actionLoading === "all" && (
                <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              )}
              ✅ Mark All Pending as Paid
            </button>
          </div>
        </div>

        <section className="bg-[#111118] border border-white/10 rounded-2xl overflow-hidden">
          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#39ff14]/50 border-t-[#39ff14] rounded-full animate-spin" />
            </div>
          ) : !referrals.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="text-4xl mb-3">🔗</div>
              <p>No referrals found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr className="text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-6 py-4">ID</th>
                    <th className="text-left px-6 py-4">Referrer</th>
                    <th className="text-left px-6 py-4">Referred</th>
                    <th className="text-right px-6 py-4">Reward $PWIFE</th>
                    <th className="text-right px-6 py-4">Reward USD</th>
                    <th className="text-center px-6 py-4">Status</th>
                    <th className="text-left px-6 py-4">Date</th>
                    <th className="text-right px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {referrals.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-gray-500">#{r.id}</td>
                      <td className="px-6 py-4 font-mono text-gray-300">
                        {r.referrerWallet.slice(0, 8)}…{r.referrerWallet.slice(-4)}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-300">
                        {r.referredWallet.slice(0, 8)}…{r.referredWallet.slice(-4)}
                      </td>
                      <td className="px-6 py-4 text-right text-yellow-400 font-medium">
                        {fmt(r.rewardTokens)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-300">
                        ${r.rewardUsd.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full border ${STATUS_COLORS[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {r.status === "pending" && (
                          <button
                            onClick={() => doMarkPaid(r.referrerWallet)}
                            disabled={actionLoading === r.referrerWallet}
                            className="px-3 py-1 text-xs bg-[#39ff14]/20 hover:bg-[#39ff14]/30 border border-[#39ff14]/30 text-[#39ff14] rounded-lg transition-all disabled:opacity-40 flex items-center gap-1 ml-auto"
                          >
                            {actionLoading === r.referrerWallet && (
                              <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            )}
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => fetchReferrals(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-30 transition-all"
            >
              ← Prev
            </button>
            <span className="text-gray-400 text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchReferrals(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-30 transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
