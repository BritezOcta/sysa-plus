import { Router } from "express";
import { studentAttendanceController } from "../controllers/studentAttendance.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";

export const studentAttendanceRouter = Router();

studentAttendanceRouter.use(requireAuth, requireRole("ALUMNO"));
studentAttendanceRouter.get("/", studentAttendanceController.getMyAttendance);
