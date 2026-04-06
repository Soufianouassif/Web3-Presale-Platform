import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { adminApi, type Buyer } from "@/lib/admin-api";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function NetworkBadge({ network }: { network: string }) {
  const colors: Record<string, string> = {
    solana: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    ethereum: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    bsc: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    polygon: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${colors[network.toLowerCase()] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
      {network}
    </span>
  );
}

export default function AdminBuyers() {
  const { loading, authenticated, user, logout } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!loading && !authenticated) setLocation("/admin");
  }, [loading, authenticated, setLocation]);

  useEffect(() => {
    if (!authenticated) return;
    setDataLoading(true);
    adminApi.getBuyers(page, 50).then((data) => {
      setBuyers(data.buyers);
      setPagination(data.pagination);
      setDataLoading(false);
    }).catch((e: Error) => {
      setError(e.message);
      setDataLoading(false);
    });
  }, [authenticated, page]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#39ff14]/50 border-t-[#39ff14] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 bg-[#111118]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setLocation("/admin/dashboard")} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              <span>←</span> Dashboard
            </button>
            <div className="w-px h-4 bg-white/20" />
            <h1 className="text-lg font-bold">Buyers List</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.email}</span>
            <button onClick={logout} className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">All Buyers</h2>
            <p className="text-gray-400 text-sm mt-1">
              {pagination.total.toLocaleString()} unique buyers — sorted by amount (largest first)
            </p>
          </div>
          <div className="text-sm text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">{error}</div>
        )}

        <div className="bg-[#111118] border border-white/10 rounded-2xl overflow-hidden">
          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#39ff14]/50 border-t-[#39ff14] rounded-full animate-spin" />
            </div>
          ) : buyers.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No buyers yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Wallet</th>
                    <th className="px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Network</th>
                    <th className="px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider text-right">Total USD</th>
                    <th className="px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider text-right">Tokens</th>
                    <th className="px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider text-right">Purchases</th>
                    <th className="px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map((buyer, i) => (
                    <tr key={buyer.walletAddress + buyer.network} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-gray-500 text-sm">{(page - 1) * 50 + i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${i < 3 ? "bg-[#39ff14]" : "bg-gray-600"}`} />
                          <span className="font-mono text-sm text-white" title={buyer.walletAddress}>
                            {truncateAddress(buyer.walletAddress)}
                          </span>
                          <button
                            onClick={() => navigator.clipboard.writeText(buyer.walletAddress)}
                            className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
                            title="Copy"
                          >
                            ⎘
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <NetworkBadge network={buyer.network} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{buyer.walletType ?? "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[#39ff14] font-semibold">${buyer.totalUsd.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-300">
                        {buyer.totalTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-400">{buyer.purchaseCount}x</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(buyer.lastPurchase).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">Page {page} / {pagination.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
