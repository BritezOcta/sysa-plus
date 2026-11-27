import { prisma } from "../lib/prisma.js";

export type NotificationType = "importante" | "info";

export interface CreateNotificationInput {
  userId: number;
  title: string;
  body: string;
  type?: NotificationType | undefined;
  link?: string | null | undefined;
}

export const notificationsRepository = {
  create(data: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type ?? "info",
        link: data.link ?? null,
      },
    });
  },

  findByUserId(userId: number, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  countUnread(userId: number) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  },

  markAsRead(notificationId: number, userId: number) {
    return prisma.notification.updateMany({
      where: { notificationId, userId },
      data: { isRead: true },
    });
  },

  markAllAsRead(userId: number) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  async createMany(
    items: {
      userId: number;
      title: string;
      body: string;
      type: string;
      link: string | null;
    }[],
  ) {
    if (items.length === 0) return { count: 0 };
    return prisma.notification.createMany({ data: items });
  },

  async findActiveStudentUserIds(): Promise<number[]> {
    const students = await prisma.studentProfile.findMany({
      where: { user: { isActive: true } },
      select: { userId: true },
    });
    return students.map((s) => s.userId);
  },
};
