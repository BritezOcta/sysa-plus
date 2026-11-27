import { Router } from "express";
import { notificationsController } from "../controllers/notifications.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";

export const notificationsRouter = Router();

// Accesible para ALUMNO, PROFESOR y ADMINISTRADOR autenticados
notificationsRouter.use(requireAuth);
notificationsRouter.get("/", notificationsController.list);
notificationsRouter.patch("/read-all", notificationsController.markAllAsRead);
notificationsRouter.patch("/:id/read", notificationsController.markAsRead);
notificationsRouter.post(
  "/broadcast",
  requireRole("ADMINISTRADOR"),
  notificationsController.broadcast,
);
