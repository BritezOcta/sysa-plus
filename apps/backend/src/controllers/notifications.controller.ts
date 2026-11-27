import type { Request, Response, NextFunction } from "express";
import { notificationsService } from "../services/notifications.service.js";

export const notificationsController = {
  async list(req: Request, res: Response) {
    const data = await notificationsService.getMyNotifications(
      req.user!.userId,
    );
    res.status(200).json({ status: "OK", ...data });
  },

  async markAsRead(req: Request, res: Response) {
    await notificationsService.markAsRead(
      req.user!.userId,
      String(req.params["id"] ?? ""),
    );
    res.status(200).json({ status: "OK" });
  },

  async markAllAsRead(req: Request, res: Response) {
    await notificationsService.markAllAsRead(req.user!.userId);
    res.status(200).json({ status: "OK" });
  },

  async broadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, body, type } = req.body as {
        title?: unknown;
        body?: unknown;
        type?: unknown;
      };

      if (typeof title !== "string" || typeof body !== "string") {
        res.status(400).json({
          error: "INVALID_NOTIFICATION",
          message: "Título y mensaje son obligatorios.",
        });
        return;
      }

      const parsedType =
        type === "importante" || type === "info" ? type : "info";

      const result = await notificationsService.broadcastToStudents({
        title,
        body,
        type: parsedType,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
};
