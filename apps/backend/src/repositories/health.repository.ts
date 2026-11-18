import { prisma } from "../lib/prisma.js";

export const healthRepository = {
  async ping(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  },
};
