import { createRequire } from "node:module";
import express, { type Express, type RequestHandler } from "express";
import cors from "cors";
import type { IncomingMessage, ServerResponse } from "node:http";
import router from "./routes";
import { logger } from "./lib/logger";

const require = createRequire(import.meta.url);

// pino-http uses `export =` (CJS) which is incompatible with ESM default imports.
// We load it via createRequire and define the callable type ourselves so the fix
// works regardless of tsconfig esModuleInterop settings or build environment.
type PinoHttpFactory = (opts?: Record<string, unknown>) => RequestHandler;
const pinoHttp = require("pino-http") as PinoHttpFactory;

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
