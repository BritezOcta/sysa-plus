import { randomInt } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";
import { buildCertificatePdf } from "../lib/certificatePdf.js";
import { certificateRepository as repo } from "../repositories/certificate.repository.js";
import type { AuthUser } from "../types/auth.js";
import {
  CERTIFICATE_ERROR_CODES as ERR,
  CERTIFICATE_LABELS,
  CERTIFICATE_TYPE,
  isCertificateType,
  type CertificateContent,
  type CertificateType,
} from "../types/certificate.js";
import { academicStatusService } from "./academicStatus.service.js";
import { AUDIT_ACTIONS, auditService } from "./audit.service.js";
import { loadStudentContext, todayAsDate, toIsoDate } from "./courseEnrollment.service.js";

/** Estados de STUDENT_CAREER.ACADEMIC_STATUS que impiden emitir certificados (RF-10). */
const INACTIVE_CAREER_STATUSES = new Set(["BAJA", "DADO_DE_BAJA", "INACTIVO"]);

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I para que se pueda tipear
const CODE_PREFIX = "SYSA";

const DESCRIPTIONS: Record<CertificateType, string> = {
  ALUMNO_REGULAR: "Constancia de que cursás en un cuatrimestre, con las asignaturas en curso.",
  ANALITICO_PARCIAL: "Asignaturas aprobadas con nota, fecha y forma de aprobación, promedio y avance del plan.",
  ANALITICO_COMPLETO: "Constancia de que aprobaste la totalidad del plan de estudios, con el detalle de notas.",
};

interface PeriodLike {
  academicPeriodId: number;
  year: number;
  semester: number;
  periodStartDate: Date;
  periodEndDate: Date;
}

function periodLabel(p: { year: number; semester: number }): string {
  return `${p.semester}° cuatrimestre ${p.year}`;
}

function generateCode(): string {
  const block = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `${CODE_PREFIX}-${block()}-${block()}`;
}

function normalizeCode(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase();
}

function verificationUrl(code: string): string {
  return `${env.PUBLIC_APP_URL}/verificar/${encodeURIComponent(code)}`;
}

/** "33444555" → "****4555": la verificación pública no expone el DNI completo. */
function maskDni(dni: string): string {
  return dni.length <= 4 ? dni : `${"*".repeat(dni.length - 4)}${dni.slice(-4)}`;
}

/** RF-11 11.3: el alumno debe estar activo para generar certificados. */
async function loadActiveStudent(user: AuthUser) {
  const context = await loadStudentContext(user.userId);
  const identity = await repo.findStudentIdentity(context.studentCareerId);
  const careerInactive = identity && INACTIVE_CAREER_STATUSES.has(identity.academicStatus.toUpperCase());
  if (!context.isActive || !identity || careerInactive) {
    throw new AppError(
      403,
      ERR.STUDENT_INACTIVE,
      "Tu condición de alumno no está activa (dado de baja o inactivo), por lo que no podés generar certificados. Comunicate con la Dirección.",
    );
  }
  return { context, identity };
}

/** Períodos en los que el alumno tiene cursadas vigentes, del más reciente al más antiguo. */
function periodsWithCourses(enrollments: Awaited<ReturnType<typeof repo.findCourseEnrollments>>) {
  const byId = new Map<number, PeriodLike>();
  for (const e of enrollments) byId.set(e.courseOffering.academicPeriod.academicPeriodId, e.courseOffering.academicPeriod);
  return [...byId.values()].sort((a, b) => b.year - a.year || b.semester - a.semester);
}

function isCurrent(period: PeriodLike, today: Date): boolean {
  return period.periodStartDate <= today && today <= period.periodEndDate;
}

export const certificateService = {
  /** Tipos disponibles (con el motivo si no se puede emitir), períodos certificables e historial. */
  async getOptions(user: AuthUser) {
    const { context } = await loadActiveStudent(user);
    const today = todayAsDate();
    const [enrollments, status, history] = await Promise.all([
      repo.findCourseEnrollments(context.studentCareerId),
      academicStatusService.getStatus(user),
      repo.listByStudentCareer(context.studentCareerId),
    ]);

    const periods = periodsWithCourses(enrollments);
    const current = periods.find((p) => isCurrent(p, today));
    const { approved, totalSubjects } = status.summary;
    const missing = totalSubjects - approved;

    const availability: Record<CertificateType, string | null> = {
      ALUMNO_REGULAR: periods.length ? null : "No registrás cursadas en ningún período.",
      ANALITICO_PARCIAL: approved > 0 ? null : "Todavía no tenés materias aprobadas.",
      ANALITICO_COMPLETO:
        totalSubjects > 0 && missing === 0 ? null : `Te ${missing === 1 ? "falta" : "faltan"} aprobar ${missing} materia${missing === 1 ? "" : "s"} del plan.`,
    };

    return {
      types: Object.values(CERTIFICATE_TYPE).map((type) => ({
        type,
        label: CERTIFICATE_LABELS[type],
        description: DESCRIPTIONS[type],
        available: availability[type] === null,
        reason: availability[type],
      })),
      periods: periods.map((p) => ({
        id: String(p.academicPeriodId),
        label: periodLabel(p),
        isCurrent: isCurrent(p, today),
      })),
      defaultPeriodId: String(current?.academicPeriodId ?? periods[0]?.academicPeriodId ?? ""),
      history: history.map((c) => ({
        code: c.validationCode,
        type: c.certificateType,
        label: isCertificateType(c.certificateType) ? CERTIFICATE_LABELS[c.certificateType] : c.certificateType,
        period: c.academicPeriod ? periodLabel(c.academicPeriod) : null,
        issuedAt: c.issuedAt.toISOString(),
      })),
    };
  },

  /** RF-11 11.3: valida, arma los datos certificados, registra la emisión y la audita. */
  async issue(user: AuthUser, rawType: unknown, rawPeriodId: unknown, ipAddress: string | null) {
    if (!isCertificateType(rawType)) {
      throw new AppError(400, ERR.INVALID_TYPE, "El tipo de certificado no es válido", {
        allowedTypes: Object.values(CERTIFICATE_TYPE),
      });
    }
    const type = rawType;
    const { context, identity } = await loadActiveStudent(user);
    const user_ = identity.studentProfile.user;

    const content: CertificateContent = {
      student: { fullName: `${user_.firstName} ${user_.lastName}`, dni: user_.dni, legajo: identity.studentProfile.legajo },
      career: { name: context.careerName, studyPlan: context.studyPlanResolution, admissionYear: identity.admissionYear },
    };
    let academicPeriodId: number | null = null;

    if (type === CERTIFICATE_TYPE.ALUMNO_REGULAR) {
      const enrollments = await repo.findCourseEnrollments(context.studentCareerId);
      const periods = periodsWithCourses(enrollments);
      const requested = rawPeriodId === undefined || rawPeriodId === null || rawPeriodId === "" ? null : Number(rawPeriodId);
      if (requested !== null && (!Number.isInteger(requested) || requested <= 0)) {
        throw new AppError(400, ERR.PERIOD_NOT_FOUND, "El período indicado no es válido");
      }
      const today = todayAsDate();
      const period =
        requested !== null
          ? periods.find((p) => p.academicPeriodId === requested)
          : (periods.find((p) => isCurrent(p, today)) ?? periods[0]);

      if (!period) {
        if (requested !== null && !(await repo.findPeriod(requested))) {
          throw new AppError(404, ERR.PERIOD_NOT_FOUND, "El período indicado no existe");
        }
        throw new AppError(
          409,
          ERR.INSUFFICIENT_DATA,
          requested !== null
            ? "No registrás cursadas en el período elegido, por lo que no se puede certificar tu condición de alumno regular en ese período."
            : "No registrás cursadas, por lo que no se puede certificar tu condición de alumno regular.",
        );
      }

      academicPeriodId = period.academicPeriodId;
      content.period = {
        label: periodLabel(period),
        startDate: toIsoDate(period.periodStartDate),
        endDate: toIsoDate(period.periodEndDate),
      };
      content.courses = enrollments
        .filter((e) => e.courseOffering.academicPeriod.academicPeriodId === period.academicPeriodId)
        .map((e) => ({
          code: e.courseOffering.studyPlanSubject.subject.subjectCode,
          name: e.courseOffering.studyPlanSubject.subject.subjectName,
          commission: e.courseOffering.commission,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
    } else {
      const status = await academicStatusService.getStatus(user);
      const approved = status.subjects.filter((s) => s.status === "APROBADA");
      const { totalSubjects, average, progressPercent } = status.summary;

      if (approved.length === 0) {
        throw new AppError(
          409,
          ERR.INSUFFICIENT_DATA,
          "Todavía no tenés materias aprobadas, por lo que no se puede generar un certificado analítico.",
        );
      }
      if (type === CERTIFICATE_TYPE.ANALITICO_COMPLETO && approved.length < totalSubjects) {
        const missing = totalSubjects - approved.length;
        throw new AppError(
          409,
          ERR.INSUFFICIENT_DATA,
          `El analítico completo requiere tener aprobado todo el plan de estudios y te ${missing === 1 ? "falta" : "faltan"} ${missing} materia${missing === 1 ? "" : "s"}. Podés generar el analítico parcial.`,
        );
      }

      content.subjects = approved
        .sort((a, b) => (a.year ?? 99) - (b.year ?? 99) || (a.approvalDate ?? "").localeCompare(b.approvalDate ?? ""))
        .map((s) => ({
          code: s.subjectCode,
          name: s.subjectName,
          year: s.year,
          grade: s.grade,
          approvalDate: s.approvalDate,
          approvedBy: s.approvedBy,
        }));
      content.summary = { approved: approved.length, totalSubjects, average, progressPercent };
    }

    let validationCode = generateCode();
    while (await repo.codeExists(validationCode)) validationCode = generateCode();

    const created = await repo.create({
      validationCode,
      certificateType: type,
      studentCareerId: context.studentCareerId,
      academicPeriodId,
      contentJson: JSON.stringify(content),
    });

    await auditService.record({
      userId: user.userId,
      action: AUDIT_ACTIONS.CERTIFICATE_ISSUED,
      entity: "CERTIFICADO",
      entityId: validationCode,
      details: `${CERTIFICATE_LABELS[type]}${content.period ? ` (${content.period.label})` : ""} · código ${validationCode}`,
      ipAddress,
    });

    return {
      code: validationCode,
      type,
      label: CERTIFICATE_LABELS[type],
      issuedAt: created.issuedAt.toISOString(),
      verificationUrl: verificationUrl(validationCode),
    };
  },

  /** PDF de un certificado propio. Se regenera desde los datos guardados en la emisión. */
  async getPdf(user: AuthUser, rawCode: unknown) {
    const code = normalizeCode(rawCode);
    const certificate = await repo.findByCode(code);
    if (!certificate || certificate.studentCareer.studentProfile.user.userId !== user.userId) {
      throw new AppError(404, ERR.NOT_FOUND, "No encontramos ese certificado entre los tuyos.");
    }
    if (!isCertificateType(certificate.certificateType)) {
      throw new AppError(500, ERR.PDF_ERROR, "No se pudo generar el PDF del certificado. Intentá nuevamente.");
    }

    try {
      const pdf = await buildCertificatePdf({
        type: certificate.certificateType,
        validationCode: certificate.validationCode,
        issuedAt: certificate.issuedAt,
        verificationUrl: verificationUrl(certificate.validationCode),
        content: JSON.parse(certificate.contentJson) as CertificateContent,
      });
      const slug = certificate.certificateType.toLowerCase().replace(/_/g, "-");
      return { pdf, fileName: `certificado-${slug}-${certificate.validationCode}.pdf` };
    } catch (error) {
      console.error("Certificate PDF error:", error);
      throw new AppError(500, ERR.PDF_ERROR, "No se pudo generar el PDF del certificado. Intentá nuevamente.");
    }
  },

  /** RF-11 11.4: verificación pública de autenticidad (sin sesión), por código o QR. */
  async verify(rawCode: unknown) {
    const code = normalizeCode(rawCode);
    const certificate = code ? await repo.findByCode(code) : null;
    if (!certificate || !isCertificateType(certificate.certificateType)) {
      throw new AppError(404, ERR.NOT_FOUND, "No existe un certificado emitido con ese código de validación.");
    }
    const content = JSON.parse(certificate.contentJson) as CertificateContent;
    return {
      valid: true,
      code: certificate.validationCode,
      type: certificate.certificateType,
      label: CERTIFICATE_LABELS[certificate.certificateType],
      issuedAt: certificate.issuedAt.toISOString(),
      student: { fullName: content.student.fullName, dni: maskDni(content.student.dni), legajo: content.student.legajo },
      career: { name: content.career.name, studyPlan: content.career.studyPlan },
      period: content.period?.label ?? null,
      summary: content.summary ?? null,
      courses: content.courses?.length ?? null,
    };
  },
};
