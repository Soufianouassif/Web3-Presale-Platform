import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimpleFactory from "connect-pg-simple";
import passport from "passport";
import type { IncomingMessage, ServerResponse } from "node:http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
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
  ...(IS_PROD ? [] : ["http://localhost:22793", "http://localhost:3000"]),
  ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const VERCEL_PREVIEW_DOMAIN = process.env.VERCEL_PREVIEW_DOMAIN ?? null;

const isOriginAllowed = (origin: string): boolean => {
  if (ALLOWED_ORIGINS_EXACT.includes(origin)) return true;
  if (VERCEL_PREVIEW_DOMAIN && origin.endsWith(`.${VERCEL_PREVIEW_DOMAIN}`)) return true;
  if (VERCEL_PREVIEW_DOMAIN && origin === `https://${VERCEL_PREVIEW_DOMAIN}`) return true;
  return false;
};

const app: Express = express();

app.set("trust proxy", 1);

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
