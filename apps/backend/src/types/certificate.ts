/** RF-11: tipos de certificado que el alumno puede generar (CERTIFICATE.CERTIFICATE_TYPE). */
export const CERTIFICATE_TYPE = {
  ALUMNO_REGULAR: "ALUMNO_REGULAR",
  ANALITICO_PARCIAL: "ANALITICO_PARCIAL",
  ANALITICO_COMPLETO: "ANALITICO_COMPLETO",
} as const;

export type CertificateType = (typeof CERTIFICATE_TYPE)[keyof typeof CERTIFICATE_TYPE];

export const CERTIFICATE_LABELS: Record<CertificateType, string> = {
  ALUMNO_REGULAR: "Certificado de alumno regular",
  ANALITICO_PARCIAL: "Certificado analítico parcial",
  ANALITICO_COMPLETO: "Certificado analítico completo",
};

export function isCertificateType(value: unknown): value is CertificateType {
  return Object.values(CERTIFICATE_TYPE).includes(value as CertificateType);
}

/** Códigos de error que el frontend interpreta (RF-11 11.5). */
export const CERTIFICATE_ERROR_CODES = {
  INVALID_TYPE: "INVALID_CERTIFICATE_TYPE",
  STUDENT_INACTIVE: "STUDENT_INACTIVE",
  INSUFFICIENT_DATA: "INSUFFICIENT_ACADEMIC_DATA",
  PERIOD_NOT_FOUND: "PERIOD_NOT_FOUND",
  NOT_FOUND: "CERTIFICATE_NOT_FOUND",
  PDF_ERROR: "PDF_GENERATION_ERROR",
} as const;

export interface CertifiedSubject {
  code: string;
  name: string;
  year: number | null;
  grade: number | null;
  /** yyyy-mm-dd */
  approvalDate: string | null;
  approvedBy: "FINAL" | "PROMOCION" | null;
}

export interface CertifiedCourse {
  code: string;
  name: string;
  commission: string;
}

/**
 * Datos certificados al momento de la emisión (CERTIFICATE.CONTENT_JSON). El PDF y la
 * verificación pública se arman siempre desde acá, no desde el registro académico actual.
 */
export interface CertificateContent {
  student: { fullName: string; dni: string; legajo: string };
  career: { name: string; studyPlan: string; admissionYear: number };
  /** ALUMNO_REGULAR */
  period?: { label: string; startDate: string; endDate: string };
  courses?: CertifiedCourse[];
  /** ANALITICO_* */
  subjects?: CertifiedSubject[];
  summary?: { approved: number; totalSubjects: number; average: number | null; progressPercent: number };
}
