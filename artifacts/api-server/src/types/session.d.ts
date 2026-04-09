import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    userEmail?: string;
    isAdmin?: boolean;
    adminLoginAt?: number;
    adminLastActivity?: number;
    sessionUserAgent?: string;
    sessionLoginIp?: string;

    // ── Enterprise security fields ──────────────────────────────────────
    sessionSuspicious?: boolean;
    suspiciousReason?: string;
    ipChangeCount?: number;
    uaChangeCount?: number;
    ipHistory?: string[];     // sliding window of last 5 unique IPs
    requestCount?: number;    // total requests in this session
    lastRequestAt?: number;   // for burst detection
    securityLevel?: 0 | 1 | 2 | 3;
    // 0 = clean, 1 = watch, 2 = flagged (requireRecentAuth), 3 = terminated
  }
}

declare global {
  namespace Express {
    interface User {
      id: number;
      googleId: string;
      email: string;
      name: string | null;
      avatar: string | null;
      lastLogin: Date | null;
      createdAt: Date | null;
    }
  }
}
