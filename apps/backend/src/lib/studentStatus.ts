import { AppError } from "./AppError.js";

/** RF-10: largo máximo del motivo de baja o reactivación. */
export const STUDENT_STATUS_REASON_MAX = 500;

/** RF-10: valida el body de PATCH /admin/users/:userId/status. */
export function parseStudentStatusInput(body: unknown): { isActive: boolean; reason: string } {
  const { status, reason } = (body ?? {}) as { status?: unknown; reason?: unknown };
  if (status !== "active" && status !== "inactive") {
    throw new AppError(400, "VALIDATION_ERROR", 'El estado debe ser "active" o "inactive"');
  }
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  if (!trimmed) {
    throw new AppError(400, "VALIDATION_ERROR", "Indicá el motivo del cambio de estado");
  }
  if (trimmed.length > STUDENT_STATUS_REASON_MAX) {
    throw new AppError(400, "VALIDATION_ERROR", `El motivo no puede superar los ${STUDENT_STATUS_REASON_MAX} caracteres`);
  }
  return { isActive: status === "active", reason: trimmed };
}
