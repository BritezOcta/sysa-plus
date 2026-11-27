import { AppError } from "../lib/AppError.js";
import {
  notificationsRepository,
  type CreateNotificationInput,
} from "../repositories/notifications.repository.js";

export const notificationsService = {
  /**
   * Helper para llamar desde cualquier otro service (RF-04, RF-06, RF-07, etc.).
   * Envuelto en try/catch para que un fallo en un aviso nunca rompa la operación principal.
   */
  async notify(input: CreateNotificationInput): Promise<void> {
    try {
      await notificationsRepository.create(input);
    } catch (error) {
      console.error("[notifications] Error creando notificación:", error);
    }
  },

  async getMyNotifications(userId: number) {
    const [items, unreadCount] = await Promise.all([
      notificationsRepository.findByUserId(userId),
      notificationsRepository.countUnread(userId),
    ]);

    return {
      unreadCount,
      notifications: items.map((n) => ({
        id: String(n.notificationId),
        titulo: n.title,
        cuerpo: n.body,
        fecha: n.createdAt.toISOString(),
        tipo: (n.type === "importante" ? "importante" : "info") as
          | "importante"
          | "info",
        leido: n.isRead,
        link: n.link,
      })),
    };
  },

  async markAsRead(userId: number, rawNotificationId: string) {
    const notificationId = Number(rawNotificationId);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      throw new AppError(400, "INVALID_ID", "ID de notificación inválido.");
    }
    await notificationsRepository.markAsRead(notificationId, userId);
  },

  async markAllAsRead(userId: number) {
    await notificationsRepository.markAllAsRead(userId);
  },
};
