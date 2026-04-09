const API_BASE = "/api";

// Persistent anonymous visitor ID — stored in localStorage
function getOrCreateVisitorId(): string {
  const KEY = "__pwife_vid";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const e = err as { error?: string; message?: string; code?: string; loginAgeMinutes?: number };
    if (e.code === "REAUTH_REQUIRED") {
      const age = e.loginAgeMinutes !== undefined ? ` (logged in ${e.loginAgeMinutes}m ago)` : "";
      throw new Error(`🔐 Re-login required for this action${age}. Please log out and log back in.`);
    }
    throw new Error(e.error ?? e.message ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export interface AdminStats {
  visits: { total: number; unique: number };
  wallets: { total: number; unique: number };
  buyers: { unique: number; total: number };
  revenue: { totalUsd: number };
  networkBreakdown: { network: string; count: number; totalUsd: number }[];
  walletTypeBreakdown: { walletType: string; count: number }[];
  topPages: { page: string; count: number }[];
  recentActivity: {
    id: number;
    walletAddress: string;
    network: string;
    amountUsd: string;
    amountTokens: string;
    createdAt: string;
  }[];
  presaleConfig: {
    isActive: boolean;
    claimEnabled: boolean;
    stakingEnabled: boolean;
    currentStage: number;
    totalRaisedUsd: string;
  } | null;
  referrals: {
    totalReferrers: number;
    totalReferrals: number;
    pendingRewardTokens: number;
    paidRewardTokens: number;
    topReferrers: {
      walletAddress: string;
      code: string;
      totalReferrals: number;
      totalRewardTokens: number;
      totalRewardUsd: number;
      pendingTokens?: number;
      paidTokens?: number;
    }[];
  };
}

export interface ReferralRecord {
  id: number;
  referrerWallet: string;
  referredWallet: string;
  rewardTokens: number;
  rewardUsd: number;
  status: "pending" | "paid";
  createdAt: string;
}

export interface ReferralsResponse {
  referrals: ReferralRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface Buyer {
  walletAddress: string;
  walletType: string | null;
  network: string;
  totalUsd: number;
  totalTokens: number;
  purchaseCount: number;
  lastPurchase: string;
}

export interface BuyersResponse {
  buyers: Buyer[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminUser {
  authenticated: boolean;
  user?: {
    id: number;
    email: string;
    name: string | null;
    avatar: string | null;
  };
}

export interface PublicPresaleConfig {
  isActive: boolean;
  claimEnabled: boolean;
  stakingEnabled: boolean;
  currentStage: number;
}

export async function fetchPublicPresaleConfig(): Promise<PublicPresaleConfig> {
  try {
    const res = await fetch(`${API_BASE}/presale/config`, { credentials: "include" });
    if (!res.ok) return { isActive: true, claimEnabled: false, stakingEnabled: false, currentStage: 1 };
    return res.json() as Promise<PublicPresaleConfig>;
  } catch {
    return { isActive: true, claimEnabled: false, stakingEnabled: false, currentStage: 1 };
  }
}

export const adminApi = {
  getMe: () => fetchApi<AdminUser>("/auth/me"),
  logout: () => fetchApi<{ success: boolean }>("/auth/logout", { method: "POST" }),
  getStats: () => fetchApi<AdminStats>("/admin/stats"),
  getBuyers: (page = 1, limit = 50) => fetchApi<BuyersResponse>(`/admin/buyers?page=${page}&limit=${limit}`),
  getConfig: () => fetchApi<AdminStats["presaleConfig"]>("/admin/config"),
  pausePresale: () => fetchApi<{ success: boolean; message: string }>("/admin/presale/pause", { method: "POST" }),
  resumePresale: () => fetchApi<{ success: boolean; message: string }>("/admin/presale/resume", { method: "POST" }),
  withdraw: () => fetchApi<{ success: boolean; message: string }>("/admin/presale/withdraw", { method: "POST" }),
  setClaim: (enabled: boolean) =>
    fetchApi<{ success: boolean; message: string }>("/admin/presale/claim", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),
  setStaking: (enabled: boolean) =>
    fetchApi<{ success: boolean; message: string }>("/admin/presale/staking", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),
  getReferrals: (page = 1, limit = 50, status?: "pending" | "paid") => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) qs.set("status", status);
    return fetchApi<ReferralsResponse>(`/admin/referrals?${qs}`);
  },
  markReferralsPaid: (walletAddress?: string) =>
    fetchApi<{ success: boolean; message: string }>("/admin/referrals/mark-paid", {
      method: "POST",
      body: JSON.stringify(walletAddress ? { walletAddress } : {}),
    }),
  getSessions: () => fetchApi<{ sessions: SessionInfo[]; total: number }>("/admin/sessions"),
  terminateSession: (sid: string) =>
    fetchApi<{ success: boolean; terminated: string }>(`/admin/sessions/${sid}`, { method: "DELETE" }),
  purgeOtherSessions: () =>
    fetchApi<{ success: boolean; terminated: number }>("/admin/sessions/purge", { method: "POST" }),
};

export interface SessionInfo {
  sid: string;
  userId?: number;
  userEmail?: string;
  loginAt?: number;
  lastActivity?: number;
  loginIp?: string;
  userAgent?: string;
  suspicious?: boolean;
  suspiciousReason?: string;
  securityLevel?: number;
  ipChangeCount?: number;
  uaChangeCount?: number;
  ipHistory?: string[];
  requestCount?: number;
  expiresAt: string;
  isCurrent: boolean;
}

export const tracker = {
  visit: (page: string) => {
    const visitorId = getOrCreateVisitorId();
    fetch(`${API_BASE}/track/visit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, visitorId, referrer: document.referrer }),
    }).catch(() => {});
  },
  wallet: (walletAddress: string, walletType: string, network: string) => {
    fetch(`${API_BASE}/track/wallet`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, walletType, network }),
    }).catch(() => {});
  },
  purchase: async (data: {
    walletAddress: string;
    walletType?: string;
    network: string;
    amountUsd: number;
    amountTokens: number;
    txHash?: string;
    stage?: number;
    referralCode?: string;
  }): Promise<{ success: boolean; purchaseId?: number; error?: string; reason?: string }> => {
    try {
      console.log("[tracker.purchase] Sending:", {
        wallet: data.walletAddress?.slice(0, 8),
        amountUsd: data.amountUsd,
        amountTokens: data.amountTokens,
        txHash: data.txHash?.slice(0, 16),
        hasReferral: !!data.referralCode,
        referralCode: data.referralCode,
      });
      const res = await fetch(`${API_BASE}/track/purchase`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { success?: boolean; error?: string; reason?: string; purchaseId?: number };
      console.log("[tracker.purchase] Response:", { status: res.status, json });
      if (!res.ok || !json.success) {
        return { success: false, error: json.error, reason: json.reason };
      }
      return { success: true, purchaseId: json.purchaseId };
    } catch (err) {
      console.error("[tracker.purchase] Network error:", err);
      return { success: false, error: "Network error" };
    }
  },
};
