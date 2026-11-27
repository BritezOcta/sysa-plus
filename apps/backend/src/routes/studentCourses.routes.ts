import { Router } from "express";
import { studentCoursesController } from "../controllers/studentCourses.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";

export const studentCoursesRouter = Router();

studentCoursesRouter.use(requireAuth, requireRole("ALUMNO"));
studentCoursesRouter.get("/", studentCoursesController.getMyCourses);
studentCoursesRouter.post("/:enrollmentId/survey", studentCoursesController.submitSurvey);
