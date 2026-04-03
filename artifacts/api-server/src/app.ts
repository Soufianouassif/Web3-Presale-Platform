import { createRequire } from "node:module";
import express, { type Express } from "express";
import cors from "cors";
import type { IncomingMessage, ServerResponse } from "node:http";
import type pinoHttpType from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const require = createRequire(import.meta.url);
// pino-http uses `export =` which is incompatible with ESM default imports
// under moduleResolution:bundler — load via createRequire and cast to the
// correct callable type (esModuleInterop gives us the typed default).
const pinoHttp = require("pino-http") as typeof pinoHttpType;

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
