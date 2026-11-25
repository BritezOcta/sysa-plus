import { Router } from "express";
import { courseEnrollmentController } from "../controllers/courseEnrollment.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { ROLES } from "../types/auth.js";

/** RF-04: inscripción a cursadas (solo alumnos). */
export const courseEnrollmentRouter = Router();

courseEnrollmentRouter.use(requireAuth, requireRole(ROLES.ALUMNO));

courseEnrollmentRouter.get("/", courseEnrollmentController.overview);
courseEnrollmentRouter.post("/", courseEnrollmentController.enroll);
courseEnrollmentRouter.delete("/:courseEnrollmentId", courseEnrollmentController.cancel);
