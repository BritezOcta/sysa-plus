import type { SubjectStatus } from "../../types/academicStatus.types";

export const STATUS_LABELS: Record<SubjectStatus, string> = {
  APROBADA: "Aprobada",
  REGULAR: "Regular",
  CURSANDO: "Cursando",
  LIBRE: "Libre",
  DESAPROBADA: "Desaprobada",
  PENDIENTE: "Pendiente",
};
