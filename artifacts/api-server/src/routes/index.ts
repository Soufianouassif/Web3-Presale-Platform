import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import twitterRouter from "./twitter.js";
import authRouter from "./auth.js";
import adminRouter from "./admin.js";
import trackerRouter from "./tracker.js";
import referralRouter from "./referral.js";
import rpcProxyRouter from "./rpc-proxy.js";
import solPriceSyncRouter from "./sol-price-sync.js";

const router: IRouter = Router();

router.use(rpcProxyRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(trackerRouter);
router.use(referralRouter);
router.use(healthRouter);
router.use(twitterRouter);
router.use(solPriceSyncRouter);

export default router;
