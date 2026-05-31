import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import postsRouter from "./posts";
import commentsRouter from "./comments";
import followsRouter from "./follows";
import notificationsRouter from "./notifications";
import conversationsRouter from "./conversations";
import meetingsRouter from "./meetings";
import userPostsRouter from "./userPosts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(postsRouter);
router.use(commentsRouter);
router.use(followsRouter);
router.use(notificationsRouter);
router.use(conversationsRouter);
router.use(meetingsRouter);
router.use(userPostsRouter);

export default router;
