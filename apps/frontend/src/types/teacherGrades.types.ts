export type EvaluationType = "PARCIAL" | "RECUPERATORIO" | "FINAL";

export type ApprovalCondition =
  | "PENDIENTE"
  | "DESAPROBADO"
  | "REGULAR"
  | "PROMOCIONADO"
  | "APROBADO";

export interface GradeInstance {
  id: string;
  commissionId: string;
  subjectName: string;
  commissionOrTable: string; // Ej: "Com. 1K1" o "Mesa 18/12"
  evaluationType: EvaluationType;
  label: string; // Ej: "Parcial 1", "Recuperatorio 1", "Examen Final - Turno Dic"
  date: string;
  isClosed: boolean;
  closedBy?: string;
  closedAt?: string;
  unlockedCorrelatives?: string[]; // Materias que se habilitan al aprobar
}

export interface GradeStudent {
  enrollmentId: string;
  studentId: string;
  legajo: string;
  fullName: string;
  score: number | null;
  updatedBy?: string;
  updatedAt?: string;
}
