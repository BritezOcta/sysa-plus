import { Router } from "express";
import { academicStatusController } from "../controllers/academicStatus.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { ROLES } from "../types/auth.js";

/** RF-09: estado académico del alumno autenticado. */
export const academicStatusRouter = Router();

academicStatusRouter.use(requireAuth, requireRole(ROLES.ALUMNO));

academicStatusRouter.get("/", academicStatusController.get);
