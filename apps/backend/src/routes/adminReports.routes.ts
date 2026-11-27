import { Router } from "express";
import { adminReportsController } from "../controllers/adminReports.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";

export const adminReportsRouter = Router();

adminReportsRouter.use(requireAuth, requireRole("ADMINISTRADOR"));
adminReportsRouter.get("/filters", adminReportsController.getFilterOptions);
adminReportsRouter.get("/", adminReportsController.generateReport);
