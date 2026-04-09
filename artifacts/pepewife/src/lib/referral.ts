const API_BASE = "/api";

export interface ReferralStats {
  code: string | null;
  totalReferrals: number;
  totalRewardTokens: string;
  totalRewardUsd: string;
  pendingTokens: string;
  paidTokens: string;
  recentReferrals: {
    referredWallet: string;
    rewardTokens: string;
    status: string;
    createdAt: string;
  }[];
}

export interface LeaderboardEntry {
  walletAddress: string;
  totalReferrals: number;
  totalRewardTokens: string;
}

// ── Storage keys ───────────────────────────────────────────────────────────────
const REF_CODE_KEY = "pwife_ref_code";

// ── Detect ?ref=CODE in URL and persist it ─────────────────────────────────────
// يُخزَّن في localStorage حتى يبقى بعد إغلاق المتصفح وفتح تبويبات جديدة
export function captureReferralFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref");
  if (code && /^[1-9A-HJ-NP-Za-km-z]{6,16}$/.test(code)) {
    localStorage.setItem(REF_CODE_KEY, code);
    return code;
  }
  return localStorage.getItem(REF_CODE_KEY);
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REF_CODE_KEY);
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REF_CODE_KEY);
}

// ── API helpers ────────────────────────────────────────────────────────────────

/** Fetch or create the referral code for a connected wallet. */
export async function fetchOrCreateReferralCode(wallet: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/referral/code/${encodeURIComponent(wallet)}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { code?: string };
    return data.code ?? null;
  } catch {
    return null;
  }
}

/** Fetch full referral stats for a wallet. */
export async function fetchReferralStats(wallet: string): Promise<ReferralStats | null> {
  try {
    const res = await fetch(`${API_BASE}/referral/stats/${encodeURIComponent(wallet)}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    return (await res.json()) as ReferralStats;
  } catch {
    return null;
  }
}

/** Validate a referral code and get the masked referrer. */
export async function resolveReferralCode(
  code: string,
): Promise<{ valid: boolean; referrerMasked?: string }> {
  try {
    const res = await fetch(`${API_BASE}/referral/resolve/${encodeURIComponent(code)}`, {
      credentials: "include",
    });
    return (await res.json()) as { valid: boolean; referrerMasked?: string };
  } catch {
    return { valid: false };
  }
}

/** Fetch the leaderboard (top 10 referrers). */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/referral/leaderboard`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    return (await res.json()) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

/** Build the full referral URL for sharing. */
export function buildReferralUrl(code: string): string {
  const base =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "https://pepewife.io";
  return `${base}/?ref=${code}`;
}

/** Format token amount for display (no trailing zeros). */
export function formatTokens(raw: string | number): string {
  const n = parseFloat(String(raw));
  if (isNaN(n) || n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
