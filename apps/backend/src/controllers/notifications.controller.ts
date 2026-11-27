import type { Request, Response } from "express";
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
};
