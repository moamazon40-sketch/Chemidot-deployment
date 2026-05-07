import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import suppliersRouter from "./suppliers";
import rfqsRouter from "./rfqs";
import collectiveOrdersRouter from "./collective_orders";
import ordersRouter from "./orders";
import messagesRouter from "./messages";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import reviewsRouter from "./reviews";
import adminRouter from "./admin";
import supplierShopRouter from "./supplier_shop";
import projectsRouter from "./projects";
import contactRouter from "./contact";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(supplierShopRouter);
router.use(suppliersRouter);
router.use(rfqsRouter);
router.use(collectiveOrdersRouter);
router.use(ordersRouter);
router.use(messagesRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(reviewsRouter);
router.use(adminRouter);
router.use(projectsRouter);
router.use(contactRouter);

export default router;
