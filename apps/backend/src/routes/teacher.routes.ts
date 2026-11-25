import { Router } from "express";
import { teacherController } from "../controllers/teacher.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { ROLES } from "../types/auth.js";

/** Módulo docente: comisiones y RF-05 asistencias (solo profesores). */
export const teacherRouter = Router();

teacherRouter.use(requireAuth, requireRole(ROLES.PROFESOR));

teacherRouter.get("/commissions", teacherController.commissions);
teacherRouter.get(
  "/commissions/:commissionId/attendance",
  teacherController.getAttendance,
);
teacherRouter.put(
  "/commissions/:commissionId/attendance",
  teacherController.saveAttendance,
);
