import { Router } from "express";
import { examEnrollmentController } from "../controllers/examEnrollment.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { ROLES } from "../types/auth.js";

/** RF-06: inscripción a exámenes finales (solo alumnos). */
export const examEnrollmentRouter = Router();

examEnrollmentRouter.use(requireAuth, requireRole(ROLES.ALUMNO));

examEnrollmentRouter.get("/", examEnrollmentController.overview);
examEnrollmentRouter.post("/", examEnrollmentController.enroll);
examEnrollmentRouter.delete("/:examEnrollmentId", examEnrollmentController.cancel);
