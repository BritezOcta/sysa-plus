import { Router } from "express";
import { adminStudentsController } from "../controllers/adminStudents.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";

export const adminStudentsRouter = Router();

adminStudentsRouter.use(requireAuth, requireRole("ADMINISTRADOR"));
adminStudentsRouter.get("/commissions", adminStudentsController.getCommissions);
adminStudentsRouter.get(
  "/commissions/:commissionId/students",
  adminStudentsController.getCommissionStudents,
);
