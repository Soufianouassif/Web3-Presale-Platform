import { Router } from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "@workspace/db";
import { adminUsers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { getClientIp, normalizeUa, securityAlert } from "../middleware/admin-auth.js";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const CALLBACK_URL         = process.env.GOOGLE_CALLBACK_URL  ?? "/api/auth/google/callback";

const IS_PROD = process.env.NODE_ENV === "production";

const COOKIE_OPTS = {
  path:     "/",
  httpOnly: true,
  secure:   IS_PROD,
  sameSite: "lax" as const,
};

const ADMIN_IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1_000;

const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1_000,
  max:            20,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "Too many auth requests. Please try again later." },
});

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL:  CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? "";
          if (!email || (!ADMIN_EMAILS.includes(email.toLowerCase()) && ADMIN_EMAILS.length > 0)) {
            logger.warn({ email }, "AUTH_GOOGLE: email not authorized as admin");
            return done(null, false, { message: "Email not authorized as admin" });
          }

          const existing = await db.select().from(adminUsers).where(eq(adminUsers.googleId, profile.id)).limit(1);

          let user;
          if (existing.length > 0) {
            const [updated] = await db
              .update(adminUsers)
              .set({ lastLogin: new Date(), name: profile.displayName, avatar: profile.photos?.[0]?.value })
              .where(eq(adminUsers.googleId, profile.id))
              .returning();
            user = updated;
          } else {
            const [created] = await db
              .insert(adminUsers)
              .values({
                googleId: profile.id,
                email,
                name:     profile.displayName,
                avatar:   profile.photos?.[0]?.value,
              })
              .returning();
            user = created;
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );
}

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as { id: number }).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    done(null, user ?? null);
  } catch (err) {
    done(err);
  }
});

const router = Router();

// ── GET /auth/google ───────────────────────────────────────────────────────
router.get("/auth/google", authLimiter, (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(503).json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    return;
  }
  logger.info({ ip: getClientIp(req) }, "AUTH_GOOGLE: OAuth flow initiated");
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

// ── GET /auth/google/callback ──────────────────────────────────────────────
router.get(
  "/auth/google/callback",
  authLimiter,
  (req, res, next) => {
    passport.authenticate("google", { failureRedirect: "/admin?error=unauthorized" })(req, res, next);
  },
  (req, res) => {
    const user = req.user as { id: number; email: string } | undefined;
    const ip   = getClientIp(req);
    const ua   = normalizeUa(req);

    if (user) {
      req.session.regenerate((err) => {
        if (err) {
          logger.error({ err, ip }, "AUTH_GOOGLE: session regenerate failed");
          res.redirect("/admin?error=session_error");
          return;
        }
        const now = Date.now();
        req.session.userId             = user.id;
        req.session.userEmail          = user.email;
        req.session.isAdmin            = true;
        req.session.adminLoginAt       = now;
        req.session.adminLastActivity  = now;
        req.session.sessionUserAgent   = ua;
        req.session.sessionLoginIp     = ip;
        // Init security fields on fresh login
        req.session.securityLevel      = 0;
        req.session.sessionSuspicious  = false;
        req.session.ipChangeCount      = 0;
        req.session.uaChangeCount      = 0;
        req.session.ipHistory          = [ip];
        req.session.requestCount       = 0;

        req.session.save((saveErr) => {
          if (saveErr) {
            logger.error({ saveErr, ip }, "AUTH_GOOGLE: session save failed");
            res.redirect("/admin?error=session_error");
            return;
          }
          logger.info(
            { userId: user.id, email: user.email, ip, ua: ua.slice(0, 80) },
            "AUTH_LOGIN: admin login success — session bound to UA+IP",
          );
          res.redirect("/admin/dashboard");
        });
      });
    } else {
      logger.warn({ ip }, "AUTH_GOOGLE: login failed — user not authorized");
      res.redirect("/admin?error=unauthorized");
    }
  },
);

// ── GET /auth/me ───────────────────────────────────────────────────────────
router.get("/auth/me", (req, res) => {
  const ip = getClientIp(req);

  if (!req.session?.userId || !req.session?.isAdmin) {
    res.status(401).json({ authenticated: false });
    return;
  }

  const lastActivity = req.session.adminLastActivity ?? req.session.adminLoginAt ?? 0;
  if (Date.now() - lastActivity > ADMIN_IDLE_TIMEOUT_MS) {
    logger.warn(
      { userId: req.session.userId, userEmail: req.session.userEmail, ip },
      "AUTH_ME: session idle timeout — destroying",
    );
    securityAlert("SESSION_IDLE_EXPIRED", req, { idleMs: Date.now() - lastActivity });
    req.session.destroy(() => {});
    res.status(401).json({ authenticated: false, reason: "session_expired" });
    return;
  }

  const loginAge = Math.floor((Date.now() - (req.session.adminLoginAt ?? Date.now())) / 60_000);
  logger.info(
    {
      userId:           req.session.userId,
      userEmail:        req.session.userEmail,
      ip,
      loginAgeMinutes:  loginAge,
      securityLevel:    req.session.securityLevel ?? 0,
      suspicious:       req.session.sessionSuspicious ?? false,
      requestCount:     req.session.requestCount ?? 0,
      source:           "SESSION_REUSE",
    },
    "AUTH_ME: session reused",
  );

  req.session.adminLastActivity = Date.now();
  req.session.requestCount = (req.session.requestCount ?? 0) + 1;

  res.json({
    authenticated: true,
    user:          req.user,
    security: {
      level:           req.session.securityLevel ?? 0,
      suspicious:      req.session.sessionSuspicious ?? false,
      suspiciousReason: req.session.suspiciousReason,
      ipChangeCount:   req.session.ipChangeCount   ?? 0,
      uaChangeCount:   req.session.uaChangeCount   ?? 0,
      requestCount:    req.session.requestCount,
      loginAgeMinutes: loginAge,
    },
  });
});

// ── POST /auth/logout ──────────────────────────────────────────────────────
router.post("/auth/logout", authLimiter, (req, res) => {
  const userId    = req.session?.userId;
  const userEmail = req.session?.userEmail;
  const ip        = getClientIp(req);

  req.session.destroy((err) => {
    if (err) {
      logger.error({ err, ip }, "AUTH_LOGOUT: session destroy failed");
    } else {
      logger.info({ userId, userEmail, ip }, "AUTH_LOGOUT: admin logged out");
    }
    res.clearCookie("__pwife_sid", COOKIE_OPTS);
    res.json({ success: true });
  });
});

export default router;
