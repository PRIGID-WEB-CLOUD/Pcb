import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storeRouter from "./store";
import channelsRouter from "./channels";
import facebookRouter from "./facebook";
import twitterRouter from "./twitter";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storeRouter);
router.use(channelsRouter);
router.use(facebookRouter);
router.use(twitterRouter);
router.use(whatsappRouter);

export default router;
