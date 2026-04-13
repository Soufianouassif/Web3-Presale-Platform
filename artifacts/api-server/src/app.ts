import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimpleFactory from "connect-pg-simple";
import passport from "passport";
import type { IncomingMessage, ServerResponse } from "node:http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { runSolPriceSync } from "./routes/sol-price-sync.js";
import { pool } from "@workspace/db";

type PinoHttpFactory = (opts?: Record<string, unknown>) => RequestHandler;
const pinoHttpMiddleware = (pinoHttp as unknown as PinoHttpFactory);

const ConnectPgSimple = connectPgSimpleFactory(session);

const IS_PROD = process.env.NODE_ENV === "production";

if (IS_PROD && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required in production");
}
const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-only-secret-not-for-production";

const ALLOWED_ORIGINS_EXACT: string[] = [
  "https://pwifecoin.fun",
  "https://www.pwifecoin.fun",
  ...(IS_PROD ? [] : ["http://localhost:22793", "http://localhost:3000"]),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const VERCEL_PREVIEW_DOMAIN = process.env.VERCEL_PREVIEW_DOMAIN ?? null;

const isOriginAllowed = (origin: string): boolean => {
  if (ALLOWED_ORIGINS_EXACT.includes(origin)) return true;
  if (VERCEL_PREVIEW_DOMAIN && origin.endsWith(`.${VERCEL_PREVIEW_DOMAIN}`)) return true;
  if (VERCEL_PREVIEW_DOMAIN && origin === `https://${VERCEL_PREVIEW_DOMAIN}`) return true;
  return false;
};

// check required env vars on startup
const REQUIRED_PROD_VARS = IS_PROD
  ? (["SESSION_SECRET"] as const)
  : ([] as const);
for (const v of REQUIRED_PROD_VARS) {
  if (!process.env[v]) {
    throw new Error(`[STARTUP] Missing required environment variable: ${v}`);
  }
}
if (IS_PROD && !process.env.CRON_SECRET) {
  logger.warn("CRON_SECRET not set — cron endpoints will be disabled");
}

const app: Express = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false, // wallet extensions need this off
    frameguard: { action: "sameorigin" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: IS_PROD
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
  }),
);

// Permissions-Policy not in Helmet v8 yet
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()",
  );
  next();
});

app.use(
  pinoHttpMiddleware({
    logger,
    serializers: {
      req(req: IncomingMessage & { id?: unknown }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || isOriginAllowed(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));
app.use(cookieParser());

app.use(
  session({
    name: "__pwife_sid",
    store: new ConnectPgSimple({
      pool: pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: IS_PROD,
      httpOnly: true,
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api", router);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = (err as { status?: number }).status ?? 500;
  const message = err.message ?? "Internal Server Error";
  logger.error({ err }, "Unhandled error");
  res.status(status).json({ error: message, stack: IS_PROD ? undefined : err.stack });
});

// sync SOL price every 5 min if admin keypair is configured
if (process.env.ADMIN_KEYPAIR_JSON) {
  const SYNC_INTERVAL_MS = 5 * 60 * 1_000;
  setTimeout(() => runSolPriceSync(), 10_000);
  setInterval(() => runSolPriceSync(), SYNC_INTERVAL_MS);
  logger.info("SOL price auto-sync enabled (every 5 minutes)");
} else {
  logger.warn("ADMIN_KEYPAIR_JSON not set — SOL price auto-sync disabled");
}

export default app;
