/**
 * /admin/sessions — Enterprise session management.
 * List, inspect, and forcibly terminate active admin sessions.
 */
import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { requireAdminAuth, requireRecentAuth, securityAlert, getClientIp } from "../middleware/admin-auth.js";

const router = Router();

// All routes require admin auth + recent login (15 min) for session kill ops
router.use(requireAdminAuth);

// ── Session row from DB ────────────────────────────────────────────────────
interface SessionRow {
  sid: string;
  sess: {
    userId?: number;
    userEmail?: string;
    isAdmin?: boolean;
    adminLoginAt?: number;
    adminLastActivity?: number;
    sessionLoginIp?: string;
    sessionUserAgent?: string;
    sessionSuspicious?: boolean;
    suspiciousReason?: string;
    securityLevel?: number;
    ipChangeCount?: number;
    uaChangeCount?: number;
    ipHistory?: string[];
    requestCount?: number;
  };
  expire: string;
}

interface SessionSummary {
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

async function getAdminSessions(currentSid: string): Promise<SessionSummary[]> {
  const result = await pool.query<SessionRow>(
    `SELECT sid, sess, expire FROM user_sessions
     WHERE expire > NOW()
       AND (sess->>'isAdmin')::boolean = true
     ORDER BY COALESCE((sess->>'adminLastActivity'),'0')::bigint DESC
     LIMIT 100`,
  );

  return result.rows.map((row) => ({
    sid:             row.sid,
    userId:          row.sess.userId,
    userEmail:       row.sess.userEmail,
    loginAt:         row.sess.adminLoginAt,
    lastActivity:    row.sess.adminLastActivity,
    loginIp:         row.sess.sessionLoginIp,
    userAgent:       row.sess.sessionUserAgent?.slice(0, 120),
    suspicious:      row.sess.sessionSuspicious ?? false,
    suspiciousReason: row.sess.suspiciousReason,
    securityLevel:   row.sess.securityLevel ?? 0,
    ipChangeCount:   row.sess.ipChangeCount ?? 0,
    uaChangeCount:   row.sess.uaChangeCount ?? 0,
    ipHistory:       row.sess.ipHistory ?? [],
    requestCount:    row.sess.requestCount ?? 0,
    expiresAt:       row.expire,
    isCurrent:       row.sid === currentSid,
  }));
}

// ── GET /admin/sessions ────────────────────────────────────────────────────
router.get("/admin/sessions", async (req: Request, res: Response) => {
  try {
    const sessions = await getAdminSessions(req.sessionID);

    logger.info(
      {
        requestedBy: req.session.userEmail,
        ip: getClientIp(req),
        totalSessions: sessions.length,
        suspicious: sessions.filter((s) => s.suspicious).length,
      },
      "[SESSIONS] Admin listed active sessions",
    );

    res.json({ sessions, total: sessions.length });
  } catch (err) {
    logger.error({ err }, "[SESSIONS] Failed to list active sessions");
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

// ── DELETE /admin/sessions/:sid ────────────────────────────────────────────
router.delete(
  "/admin/sessions/:sid",
  requireRecentAuth(15),
  async (req: Request, res: Response) => {
    const { sid } = req.params;

    if (sid === req.sessionID) {
      res.status(400).json({ error: "Cannot terminate your own session. Use /auth/logout instead." });
      return;
    }

    try {
      // Fetch session data before deleting (for audit log)
      const existing = await pool.query<SessionRow>(
        "SELECT sid, sess, expire FROM user_sessions WHERE sid = $1",
        [sid],
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: "Session not found or already expired" });
        return;
      }

      const target = existing.rows[0];
      const targetEmail = target.sess.userEmail ?? "unknown";
      const targetIp    = target.sess.sessionLoginIp ?? "unknown";

      // Delete the session from DB
      await pool.query("DELETE FROM user_sessions WHERE sid = $1", [sid]);

      securityAlert("ADMIN_SESSION_KILL", req, {
        killedBy:       req.session.userEmail,
        killedSid:      sid.slice(0, 12) + "…",
        killedUser:     targetEmail,
        killedLoginIp:  targetIp,
        targetSuspicious: target.sess.sessionSuspicious ?? false,
        targetLevel:    target.sess.securityLevel ?? 0,
      });

      logger.info(
        {
          killedBy:  req.session.userEmail,
          killed:    targetEmail,
          sid:       sid.slice(0, 12) + "…",
          ip:        getClientIp(req),
        },
        "[SESSIONS] ✓ Session terminated",
      );

      res.json({ success: true, terminated: sid });
    } catch (err) {
      logger.error({ err, sid: sid.slice(0, 12) }, "[SESSIONS] Failed to terminate session");
      res.status(500).json({ error: "Failed to terminate session" });
    }
  },
);

// ── POST /admin/sessions/purge — kill all OTHER sessions ──────────────────
router.post(
  "/admin/sessions/purge",
  requireRecentAuth(15),
  async (req: Request, res: Response) => {
    try {
      const currentSid = req.sessionID;

      // Count what will be purged
      const countRes = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM user_sessions
         WHERE expire > NOW()
           AND (sess->>'isAdmin')::boolean = true
           AND sid != $1`,
        [currentSid],
      );
      const purgeCount = parseInt(countRes.rows[0]?.count ?? "0", 10);

      // Purge
      await pool.query(
        `DELETE FROM user_sessions
         WHERE (sess->>'isAdmin')::boolean = true
           AND sid != $1`,
        [currentSid],
      );

      securityAlert("ADMIN_SESSION_PURGE_ALL", req, {
        initiatedBy:    req.session.userEmail,
        sessionsKilled: purgeCount,
      });

      logger.info(
        {
          initiatedBy: req.session.userEmail,
          ip:          getClientIp(req),
          purgeCount,
        },
        "[SESSIONS] ✓ All other admin sessions purged",
      );

      res.json({ success: true, terminated: purgeCount });
    } catch (err) {
      logger.error({ err }, "[SESSIONS] Failed to purge sessions");
      res.status(500).json({ error: "Failed to purge sessions" });
    }
  },
);

export default router;
