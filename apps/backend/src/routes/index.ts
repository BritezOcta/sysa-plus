import { Router } from "express";
import { academicRouter } from "./academic.routes.js";
import { academicStatusRouter } from "./academicStatus.routes.js";
import { authRouter } from "./auth.routes.js";
import { courseEnrollmentRouter } from "./courseEnrollment.routes.js";
import { healthRouter } from "./health.routes.js";
import { teacherRouter } from "./teacher.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/academic", academicRouter);
apiRouter.use("/academic-status", academicStatusRouter);
apiRouter.use("/course-enrollments", courseEnrollmentRouter);
apiRouter.use("/teacher", teacherRouter);
