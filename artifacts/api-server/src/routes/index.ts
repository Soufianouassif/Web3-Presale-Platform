import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import twitterRouter from "./twitter.js";
import authRouter from "./auth.js";
import adminRouter from "./admin.js";
import trackerRouter from "./tracker.js";
import referralRouter from "./referral.js";
import rpcProxyRouter from "./rpc-proxy.js";
import {
  generalLimiter,
  authLimiter,
  trackerLimiter,
  adminLimiter,
  rpcLimiter,
} from "../middleware/rate-limit.js";

const router: IRouter = Router();

router.use(generalLimiter);

router.use("/rpc", rpcLimiter);
router.use("/auth", authLimiter);
router.use("/admin", adminLimiter);
router.use("/track", trackerLimiter);

router.use(rpcProxyRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(trackerRouter);
router.use(referralRouter);
router.use(healthRouter);
router.use(twitterRouter);

export default router;
