import { auditRepository, type AuditEntryInput } from "../repositories/audit.repository.js";

/** Acciones de auditoría registradas por RF-01. Los demás RF agregan las suyas. */
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGIN_LOCKED: "LOGIN_LOCKED",
  LOGIN_INACTIVE: "LOGIN_INACTIVE",
  LOGOUT: "LOGOUT",
} as const;

export const auditService = {
  /**
   * Registra un evento de auditoría. Un fallo al auditar se loguea pero no
   * interrumpe la operación del usuario.
   */
  async record(entry: AuditEntryInput): Promise<void> {
    try {
      await auditRepository.create(entry);
    } catch (error) {
      console.error("Audit log error:", error);
    }
  },
};
