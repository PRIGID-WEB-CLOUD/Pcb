import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import cartRouter from "./cart";
import wishlistRouter from "./wishlist";
import ordersRouter from "./orders";
import reviewsRouter from "./reviews";
import newsletterRouter from "./newsletter";
import paymentsRouter from "./payments";
import seedRouter from "./seed";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/categories", categoriesRouter);
router.use("/cart", cartRouter);
router.use("/wishlist", wishlistRouter);
router.use("/orders", ordersRouter);
router.use("/reviews", reviewsRouter);
router.use("/newsletter", newsletterRouter);
router.use("/payments", paymentsRouter);
router.use("/seed", seedRouter);

export default router;
