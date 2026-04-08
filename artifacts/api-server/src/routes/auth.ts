import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "@workspace/db";
import { adminUsers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? "/api/auth/google/callback";

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? "";
          if (!email || (!ADMIN_EMAILS.includes(email.toLowerCase()) && ADMIN_EMAILS.length > 0)) {
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
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
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

router.get("/auth/google", (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(503).json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    return;
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/auth/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { failureRedirect: "/admin?error=unauthorized" })(req, res, next);
  },
  (req, res) => {
    const user = req.user as { id: number; email: string } | undefined;
    if (user) {
      // إعادة توليد session ID لمنع Session Fixation
      req.session.regenerate((err) => {
        if (err) {
          res.redirect("/admin?error=session_error");
          return;
        }
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        res.redirect("/admin/dashboard");
      });
    } else {
      res.redirect("/admin?error=unauthorized");
    }
  },
);

router.get("/auth/me", (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({
    authenticated: true,
    user: req.user,
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

export default router;
