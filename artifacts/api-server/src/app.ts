import { createRequire } from "node:module";
import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import type { IncomingMessage, ServerResponse } from "node:http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { pool } from "@workspace/db";

const require = createRequire(import.meta.url);

// pino-http uses `export =` (CJS) which is incompatible with ESM default imports.
// We load it via createRequire and define the callable type ourselves so the fix
// works regardless of tsconfig esModuleInterop settings or build environment.
type PinoHttpFactory = (opts?: Record<string, unknown>) => RequestHandler;
const pinoHttp = require("pino-http") as PinoHttpFactory;

const session = require("express-session") as typeof import("express-session");
type PgSessionConstructor = new (opts: Record<string, unknown>) => import("express-session").Store;
type ConnectPgSimple = (session: unknown) => PgSessionConstructor;
const connectPgSimple = require("connect-pg-simple") as ConnectPgSimple;
const passport = require("passport") as typeof import("passport");

const PgSession = connectPgSimple(session);

const SESSION_SECRET = process.env.SESSION_SECRET ?? "fallback-dev-secret-change-in-prod";
const IS_PROD = process.env.NODE_ENV === "production";

const ALLOWED_ORIGINS = [
  "http://localhost:22793",
  "http://localhost:3000",
  ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  // Vercel auto-provides VERCEL_URL (deployment URL) and VERCEL_PROJECT_PRODUCTION_URL
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
];

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
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
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy so secure cookies work behind Replit's reverse proxy in prod
if (IS_PROD) app.set("trust proxy", 1);

app.use(
  session({
    name: "__pwife_sid",           // custom name to avoid server fingerprinting
    store: new PgSession({
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
      maxAge: 7 * 24 * 60 * 60 * 1000,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sameSite: IS_PROD ? "none" : "lax",
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api", router);

export default app;
