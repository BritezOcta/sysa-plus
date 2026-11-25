import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { courseEnrollmentRouter } from "./courseEnrollment.routes.js";
import { healthRouter } from "./health.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/course-enrollments", courseEnrollmentRouter);
