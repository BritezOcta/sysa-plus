import { Router } from "express";
import { teacherAssignmentController as controller } from "../controllers/teacherAssignment.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { ROLES } from "../types/auth.js";

/** RF-03: asignar profesores a materias y comisiones (solo Administrador/Director). */
export const teacherAssignmentRouter = Router();

teacherAssignmentRouter.use(requireAuth, requireRole(ROLES.ADMINISTRADOR));

teacherAssignmentRouter.get("/options", controller.options);
teacherAssignmentRouter.get("/commissions", controller.commissions);
teacherAssignmentRouter.get("/teachers/:teacherId", controller.teacherLoad);
teacherAssignmentRouter.post("/", controller.assign);
teacherAssignmentRouter.patch("/:assignmentId", controller.changeRole);
teacherAssignmentRouter.delete("/:assignmentId", controller.unassign);
