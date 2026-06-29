import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storeRouter from "./store";
import newsletterRouter from "./newsletter";
import ecommerceRouter from "./ecommerce";
import settingsRouter from "./settings";
import channelsRouter from "./channels";
import facebookRouter from "./facebook";
import twitterRouter from "./twitter";
import whatsappRouter from "./whatsapp";
import pushTokensRouter from "./push-tokens";
import adminStatsRouter from "./admin-stats";
import eventsRouter from "./events";
import eproloRouter from "./eprolo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(storeRouter);
router.use(adminStatsRouter);
router.use(newsletterRouter);
router.use(ecommerceRouter);
router.use(settingsRouter);
router.use(channelsRouter);
router.use(facebookRouter);
router.use(twitterRouter);
router.use(whatsappRouter);
router.use(pushTokensRouter);
router.use(eproloRouter);

export default router;
