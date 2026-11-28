import { randomInt } from "node:crypto";
import bcrypt from "bcrypt";
import { AppError } from "../lib/AppError.js";
import { prisma } from "../lib/prisma.js";
import { parseStudentStatusInput } from "../lib/studentStatus.js";
import { ROLES } from "../types/auth.js";
import { ENROLLMENT_STATUS, EXAM_STATUS } from "../types/academic.js";
import { AUDIT_ACTIONS, auditService } from "./audit.service.js";
import { todayAsDate } from "./courseEnrollment.service.js";

/** Sin 0/O ni 1/l/I para que la clave temporal se pueda dictar o copiar sin confusiones. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const TEMP_PASSWORD_LENGTH = 10;
const MAX_RESULTS = 50;

function generateTemporaryPassword(): string {
  // Garantiza al menos una mayúscula, una minúscula y un número.
  const pick = (chars: string) => chars[randomInt(chars.length)]!;
  const chars = [pick("ABCDEFGHJKLMNPQRSTUVWXYZ"), pick("abcdefghijkmnpqrstuvwxyz"), pick("23456789")];
  while (chars.length < TEMP_PASSWORD_LENGTH) chars.push(pick(ALPHABET));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

function parseUserId(raw: unknown): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "VALIDATION_ERROR", "El identificador de usuario no es válido");
  return id;
}

/** Administrador/Director: búsqueda de usuarios y restablecimiento de contraseña. */
export const adminUsersService = {
  async search(rawSearch: unknown, rawRole: unknown, rawStatus: unknown) {
    const search = typeof rawSearch === "string" ? rawSearch.trim() : "";
    const role = typeof rawRole === "string" && ["ALUMNO", "PROFESOR", "ADMINISTRADOR"].includes(rawRole) ? rawRole : undefined;
    const isActive = rawStatus === "active" ? true : rawStatus === "inactive" ? false : undefined;

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(search
          ? {
              OR: [
                { dni: { contains: search } },
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } },
                { studentProfile: { legajo: { contains: search } } },
              ],
            }
          : {}),
      },
      select: {
        userId: true,
        dni: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lockedUntil: true,
        lastLoginAt: true,
        studentProfile: { select: { legajo: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: MAX_RESULTS,
    });

    const now = new Date();
    return {
      users: users.map((u) => ({
        id: String(u.userId),
        dni: u.dni,
        fullName: `${u.lastName}, ${u.firstName}`,
        email: u.email,
        role: u.role,
        legajo: u.studentProfile?.legajo ?? null,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        isLocked: !!u.lockedUntil && u.lockedUntil > now,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      })),
      limit: MAX_RESULTS,
    };
  },

  /**
   * Genera una contraseña temporal (se devuelve una sola vez), desbloquea la cuenta y obliga
   * al usuario a cambiarla en su próximo inicio de sesión.
   */
  async resetPassword(rawUserId: unknown, actor: { userId: number; ipAddress: string | null }) {
    const userId = parseUserId(rawUserId);
    if (userId === actor.userId) {
      throw new AppError(
        409,
        "CANNOT_RESET_OWN_PASSWORD",
        "No podés restablecer tu propia contraseña desde acá. Usá la opción Contraseña de tu cuenta.",
      );
    }

    const user = await prisma.user.findUnique({ where: { userId }, select: { userId: true, dni: true, firstName: true, lastName: true, role: true, isActive: true } });
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "El usuario indicado no existe");
    if (!user.isActive) {
      throw new AppError(409, "USER_INACTIVE", "El usuario está dado de baja; reactivalo antes de restablecer su contraseña.");
    }

    const temporaryPassword = generateTemporaryPassword();
    await prisma.user.update({
      where: { userId },
      data: {
        passwordHash: await bcrypt.hash(temporaryPassword, 10),
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await auditService.record({
      userId: actor.userId,
      action: AUDIT_ACTIONS.PASSWORD_RESET,
      entity: "USERS",
      entityId: String(userId),
      details: `Restableció la contraseña de ${user.lastName}, ${user.firstName} (DNI ${user.dni}, ${user.role})`,
      ipAddress: actor.ipAddress,
    });

    return { temporaryPassword, fullName: `${user.lastName}, ${user.firstName}`, dni: user.dni };
  },

  /**
   * RF-10: da de baja o reactiva a un alumno. La baja cancela las cursadas que todavía no
   * empezaron y los finales futuros; las cursadas en curso se conservan. Reactivar no restaura
   * inscripciones. Cambio, cancelaciones y auditoría se guardan juntos o no se guarda nada.
   */
  async setStudentStatus(rawUserId: unknown, body: unknown, actor: { userId: number; ipAddress: string | null }) {
    const userId = parseUserId(rawUserId);
    const { isActive, reason } = parseStudentStatusInput(body);
    const noChanges = () => new AppError(409, "NO_CHANGES", "No hay cambios para aplicar");

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { userId },
        select: { userId: true, dni: true, firstName: true, lastName: true, role: true, isActive: true },
      });
      if (!user) throw new AppError(404, "USER_NOT_FOUND", "El usuario indicado no existe");
      if (user.role !== ROLES.ALUMNO) {
        throw new AppError(409, "NOT_A_STUDENT", "Solo se puede cambiar el estado de un alumno");
      }
      if (user.isActive === isActive) throw noChanges();

      // El filtro por el estado actual evita que dos cambios simultáneos se apliquen dos veces.
      const updated = await tx.user.updateMany({
        where: { userId, isActive: !isActive },
        data: isActive ? { isActive, failedLoginAttempts: 0, lockedUntil: null } : { isActive },
      });
      if (updated.count === 0) throw noChanges();

      let cancelledCourses = 0;
      let cancelledExams = 0;
      if (!isActive) {
        const today = todayAsDate();
        // CALL_DATE guarda la hora "de pared" de la mesa en campos UTC: se compara con la hora local en esa misma convención.
        const now = new Date();
        const wallClockNow = new Date(
          Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()),
        );
        const ownedBy = { studentProfile: { userId } };
        cancelledCourses = (
          await tx.courseEnrollment.updateMany({
            where: {
              studentCareer: ownedBy,
              enrollmentStatus: ENROLLMENT_STATUS.INSCRIPTO,
              courseOffering: { academicPeriod: { periodStartDate: { gt: today } } },
            },
            data: { enrollmentStatus: ENROLLMENT_STATUS.CANCELADA },
          })
        ).count;
        cancelledExams = (
          await tx.examEnrollment.updateMany({
            where: { studentCareer: ownedBy, examStatus: EXAM_STATUS.INSCRIPTO, examCall: { callDate: { gt: wallClockNow } } },
            data: { examStatus: EXAM_STATUS.CANCELADA },
          })
        ).count;
      }

      const who = `${user.lastName}, ${user.firstName} (DNI ${user.dni})`;
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          action: isActive ? AUDIT_ACTIONS.STUDENT_REACTIVATED : AUDIT_ACTIONS.STUDENT_DEACTIVATED,
          entity: "USERS",
          entityId: String(userId),
          details: isActive
            ? `Reactivación de ${who}. Motivo: ${reason}`
            : `Baja de ${who}. Motivo: ${reason}. Canceladas: ${cancelledCourses} cursada(s), ${cancelledExams} final(es).`,
          ipAddress: actor.ipAddress,
        },
      });

      return { id: String(userId), isActive, cancelledCourses, cancelledExams };
    });
  },
};
