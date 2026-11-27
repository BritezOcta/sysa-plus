import { Router } from "express";
import { adminRecordsController } from "../controllers/adminRecords.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { ROLES } from "../types/auth.js";

/** RF-07: reapertura de actas (solo Administrador/Director). */
export const adminRecordsRouter = Router();

adminRecordsRouter.use(requireAuth, requireRole(ROLES.ADMINISTRADOR));

adminRecordsRouter.get("/closed", adminRecordsController.listClosed);
adminRecordsRouter.post("/courses/:id/reopen", adminRecordsController.reopenCourse);
adminRecordsRouter.post("/assessments/:id/reopen", adminRecordsController.reopenAssessment);
adminRecordsRouter.post("/exam-calls/:id/reopen", adminRecordsController.reopenExamCall);
