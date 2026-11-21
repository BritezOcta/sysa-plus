import { prisma } from "../lib/prisma.js";

export interface AuditEntryInput {
  userId: number | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}

export const auditRepository = {
  async create(entry: AuditEntryInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        details: entry.details ?? null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  },
};
