import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger.js";

const ADMIN_IDLE_TIMEOUT_MS      = 8  * 60 * 60 * 1_000; // 8 hours
const SUSPICIOUS_REAUTH_MINUTES  = 10;
const MAX_IP_CHANGES_BEFORE_KILL = 5;
const MAX_UA_CHANGES_BEFORE_KILL = 2;
const MAX_IP_HISTORY_SIZE        = 10;

export function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    "unknown"
  );
}

export function normalizeUa(req: Request): string {
  return (req.headers["user-agent"] ?? "unknown").slice(0, 300);
}

function sessionId(req: Request): string {
  return req.session?.id ? req.session.id.slice(0, 12) + "…" : "no-session";
}

// structured log line for SIEM pickup
export function securityAlert(
  type: string,
  req: Request,
  extra: Record<string, unknown> = {},
) {
  logger.warn(
    {
      security: true,
      alert: true,
      alertType: type,
      sessionId: sessionId(req),
      userId: req.session?.userId,
      userEmail: req.session?.userEmail,
      ip: getClientIp(req),
      ua: normalizeUa(req).slice(0, 80),
      path: req.path,
      method: req.method,
      securityLevel: req.session?.securityLevel,
      ipChangeCount: req.session?.ipChangeCount,
      uaChangeCount: req.session?.uaChangeCount,
      ipHistory: req.session?.ipHistory,
      ...extra,
    },
    `[SECURITY_ALERT] ${type}`,
  );
}

function terminateSession(
  req: Request,
  res: Response,
  reason: string,
  alertType: string,
) {
  if (req.session) req.session.securityLevel = 3;
  securityAlert(alertType, req, { terminationReason: reason });
  req.session.destroy(() => {});
  res.status(401).json({
    error: "Session terminated for security reasons",
    code: "SESSION_TERMINATED",
    reason,
  });
}

// returns false if session should be terminated (response already sent)
function analyzeSessionBinding(
  req: Request,
  res: Response,
  ip: string,
  ua: string,
): boolean {
  const s = req.session;

  if (s.ipChangeCount === undefined) s.ipChangeCount = 0;
  if (s.uaChangeCount === undefined) s.uaChangeCount = 0;
  if (s.ipHistory     === undefined) s.ipHistory     = [s.sessionLoginIp ?? ip];
  if (s.requestCount  === undefined) s.requestCount  = 0;
  if (s.securityLevel === undefined) s.securityLevel = 0;

  s.requestCount  = (s.requestCount ?? 0) + 1;
  s.lastRequestAt = Date.now();

  const loginIp = s.sessionLoginIp;
  const loginUa = s.sessionUserAgent;

  const ipChanged = loginIp !== undefined && loginIp !== ip;
  const uaChanged = loginUa !== undefined && loginUa !== ua;

  if (ipChanged && !s.ipHistory.includes(ip)) {
    s.ipHistory = [...s.ipHistory, ip].slice(-MAX_IP_HISTORY_SIZE);
    s.ipChangeCount += 1;
  }
  if (uaChanged) {
    s.uaChangeCount = (s.uaChangeCount ?? 0) + 1;
  }

  const uniqueIps = new Set(s.ipHistory).size;

  // terminate on critical threats
  if (ipChanged && uaChanged) {
    terminateSession(req, res, "Both IP and User-Agent changed simultaneously", "DUAL_CHANGE_ATTACK");
    return false;
  }
  if (uniqueIps > MAX_IP_CHANGES_BEFORE_KILL) {
    terminateSession(req, res, `Session used from ${uniqueIps} different IPs`, "RAPID_IP_SWITCHING");
    return false;
  }
  if ((s.uaChangeCount ?? 0) > MAX_UA_CHANGES_BEFORE_KILL) {
    terminateSession(req, res, `User-Agent changed ${s.uaChangeCount} times`, "UA_MANIPULATION");
    return false;
  }

  // flag suspicious sessions
  if (ipChanged) {
    s.sessionSuspicious = true;
    s.suspiciousReason  = s.suspiciousReason ? s.suspiciousReason + "; IP_CHANGE" : "IP_CHANGE";
    if ((s.securityLevel ?? 0) < 2) s.securityLevel = 2;
    securityAlert("IP_CHANGE_DETECTED", req, {
      loginIp,
      currentIp: ip,
      ipChangeCount: s.ipChangeCount,
      uniqueIps,
    });
  }

  if (uaChanged) {
    s.sessionSuspicious = true;
    s.suspiciousReason  = s.suspiciousReason ? s.suspiciousReason + "; UA_CHANGE" : "UA_CHANGE";
    if ((s.securityLevel ?? 0) < 2) s.securityLevel = 2;
    securityAlert("UA_CHANGE_DETECTED", req, {
      loginUa: loginUa?.slice(0, 80),
      currentUa: ua.slice(0, 80),
      uaChangeCount: s.uaChangeCount,
    });
  }

  if (!ipChanged && !uaChanged && (s.securityLevel ?? 0) === 0) {
    s.securityLevel = 0;
  }

  return true;
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/admin")) {
    return next();
  }

  const ip = getClientIp(req);
  const ua = normalizeUa(req);

  if (!req.session?.userId || !req.session?.isAdmin) {
    logger.warn({ ip, path: req.path, sessionId: sessionId(req) }, "ADMIN_ACCESS_DENIED: not authenticated");
    res.status(401).json({ error: "Unauthorized", code: "NOT_AUTHENTICATED" });
    return;
  }

  const lastActivity = req.session.adminLastActivity ?? req.session.adminLoginAt ?? 0;
  if (Date.now() - lastActivity > ADMIN_IDLE_TIMEOUT_MS) {
    logger.warn(
      {
        ip,
        userId: req.session.userId,
        userEmail: req.session.userEmail,
        path: req.path,
        idleHours: ((Date.now() - lastActivity) / 3_600_000).toFixed(1),
      },
      "ADMIN_SESSION_EXPIRED: idle timeout exceeded",
    );
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session expired", code: "SESSION_EXPIRED" });
    return;
  }

  const continueOk = analyzeSessionBinding(req, res, ip, ua);
  if (!continueOk) return;

  if ((req.session.securityLevel ?? 0) >= 2) {
    const loginAt   = req.session.adminLoginAt ?? 0;
    const elapsedMs = Date.now() - loginAt;
    const limitMs   = SUSPICIOUS_REAUTH_MINUTES * 60 * 1_000;

    if (elapsedMs > limitMs) {
      securityAlert("SUSPICIOUS_SESSION_REAUTH_REQUIRED", req, {
        suspiciousReason: req.session.suspiciousReason,
        loginAgeMinutes:  Math.floor(elapsedMs / 60_000),
        requiredWithin:   SUSPICIOUS_REAUTH_MINUTES,
      });
      res.status(403).json({
        error: "Re-authentication required (session flagged)",
        code:  "REAUTH_REQUIRED",
        message: `Your session was flagged for suspicious activity (${req.session.suspiciousReason}). Please log in again to continue.`,
        loginAgeMinutes: Math.floor(elapsedMs / 60_000),
        sessionFlagged: true,
      });
      return;
    }
  }

  req.session.adminLastActivity = Date.now();
  next();
}

// use on sensitive routes after requireAdminAuth
export function requireRecentAuth(minutes: number) {
  return function recentAuthGuard(req: Request, res: Response, next: NextFunction) {
    const loginAt   = req.session?.adminLoginAt ?? 0;
    const elapsedMs = Date.now() - loginAt;
    const limitMs   = minutes * 60 * 1_000;

    if (elapsedMs > limitMs) {
      logger.warn(
        {
          userId:                req.session?.userId,
          userEmail:             req.session?.userEmail,
          ip:                    getClientIp(req),
          path:                  req.path,
          loginAgeMinutes:       Math.floor(elapsedMs / 60_000),
          requiredWithinMinutes: minutes,
          sessionFlagged:        req.session?.sessionSuspicious ?? false,
        },
        "ADMIN_REAUTH_REQUIRED: sensitive action blocked — login too old",
      );
      res.status(403).json({
        error: "Re-authentication required",
        code:  "REAUTH_REQUIRED",
        message: `This action requires a fresh login within the last ${minutes} minutes. Please log out and log in again.`,
        loginAgeMinutes: Math.floor(elapsedMs / 60_000),
      });
      return;
    }

    logger.info(
      {
        userId:                req.session?.userId,
        userEmail:             req.session?.userEmail,
        path:                  req.path,
        loginAgeMinutes:       Math.floor(elapsedMs / 60_000),
        requiredWithinMinutes: minutes,
      },
      "ADMIN_SENSITIVE_ACTION: recent-auth check passed",
    );
    next();
  };
}
