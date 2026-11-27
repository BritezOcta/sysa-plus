import { prisma } from "../lib/prisma.js";

const authUserSelect = {
  userId: true,
  role: true,
  dni: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  email: true,
  isActive: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  mustChangePassword: true,
  studentProfile: { select: { legajo: true } },
} as const;

export const userRepository = {
  findForAuthByDni(dni: string) {
    return prisma.user.findUnique({ where: { dni }, select: authUserSelect });
  },

  findForAuthById(userId: number) {
    return prisma.user.findUnique({ where: { userId }, select: authUserSelect });
  },

  /** Incrementa el contador de forma atómica y devuelve el valor resultante. */
  async incrementFailedAttempts(userId: number): Promise<number> {
    const updated = await prisma.user.update({
      where: { userId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    return updated.failedLoginAttempts;
  },

  lockUntil(userId: number, lockedUntil: Date) {
    return prisma.user.update({
      where: { userId },
      data: { lockedUntil, failedLoginAttempts: 0 },
    });
  },

  updatePasswordHash(userId: number, passwordHash: string) {
    return prisma.user.update({ where: { userId }, data: { passwordHash, mustChangePassword: false } });
  },

  registerSuccessfulLogin(userId: number, at: Date) {
    return prisma.user.update({
      where: { userId },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: at },
    });
  },
};
