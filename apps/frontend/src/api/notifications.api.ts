import { apiRequest } from "./httpClient";

export interface NotificationItem {
  id: string;
  titulo: string;
  cuerpo: string;
  fecha: string;
  tipo: "importante" | "info";
  leido: boolean;
  link: string | null;
}

export interface NotificationsResponse {
  unreadCount: number;
  notifications: NotificationItem[];
}

export const notificationsApi = {
  getMyNotifications(): Promise<NotificationsResponse> {
    return apiRequest<NotificationsResponse>("/notifications");
  },

  markAsRead(id: string): Promise<void> {
    return apiRequest<void>(`/notifications/${id}/read`, { method: "PATCH" });
  },

  markAllAsRead(): Promise<void> {
    return apiRequest<void>("/notifications/read-all", { method: "PATCH" });
  },
};
