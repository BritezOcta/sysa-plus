import { AppError } from "../lib/AppError.js";
import { attendancePercent, attendedWeight } from "../lib/attendance.js";
import { adminReportsRepository } from "../repositories/adminReports.repository.js";
import { ENROLLMENT_STATUS } from "../types/academic.js";

const VALID_REPORT_TYPES = [
  "RENDIMIENTO",
  "ASISTENCIA",
  "INSCRIPCIONES",
  "DESERCION",
] as const;
export type ReportType = (typeof VALID_REPORT_TYPES)[number];

function parseOptionalId(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(
      400,
      "INVALID_FILTER",
      "Uno de los filtros enviados no es válido.",
    );
  }
  return num;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha opcional "AAAA-MM-DD" (como la manda un <input type="date">), en UTC. */
function parseOptionalDate(raw: unknown): Date | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const date = typeof raw === "string" && DATE_PATTERN.test(raw) ? new Date(`${raw}T00:00:00Z`) : null;
  // El round-trip descarta fechas imposibles como 2026-02-31.
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw new AppError(400, "INVALID_FILTER", "Una de las fechas del rango no es válida.");
  }
  return date;
}

export const adminReportsService = {
  async getFilterOptions() {
    const { careers, subjects, periods } =
      await adminReportsRepository.getFilterOptions();
    return {
      careers: careers.map((c) => ({
        id: String(c.careerId),
        label: `${c.careerCode} - ${c.careerName}`,
      })),
      subjects: subjects.map((s) => ({
        id: String(s.subjectId),
        label: `${s.subjectCode} - ${s.subjectName}`,
      })),
      periods: periods.map((p) => ({
        id: String(p.academicPeriodId),
        label: `${p.year} - ${p.semester}° Cuatrimestre`,
      })),
    };
  },

  async generateReport(params: {
    user: { userId: number };
    ipAddress: string | null;
    rawType: unknown;
    rawCareerId: unknown;
    rawSubjectId: unknown;
    rawPeriodId: unknown;
    rawDateFrom: unknown;
    rawDateTo: unknown;
  }) {
    const reportType =
      typeof params.rawType === "string" ? params.rawType.toUpperCase() : "";
    if (!VALID_REPORT_TYPES.includes(reportType as ReportType)) {
      throw new AppError(
        400,
        "INVALID_REPORT_TYPE",
        "Tipo de reporte no válido.",
      );
    }

    const careerId = parseOptionalId(params.rawCareerId);
    const subjectId = parseOptionalId(params.rawSubjectId);
    const academicPeriodId = parseOptionalId(params.rawPeriodId);
    const dateFrom = parseOptionalDate(params.rawDateFrom);
    const dateTo = parseOptionalDate(params.rawDateTo);
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new AppError(400, "INVALID_FILTER", "La fecha desde no puede ser posterior a la fecha hasta.");
    }

    const offerings = await adminReportsRepository.findOfferingsForReport({
      careerId,
      subjectId,
      academicPeriodId,
      dateFrom,
      dateTo,
    });

    const day = (d: Date | undefined) => d?.toISOString().slice(0, 10) ?? "sin límite";
    await adminReportsRepository.logReportGeneration({
      userId: params.user.userId,
      reportType,
      details: `Filtros -> carrera:${careerId ?? "todas"}, materia:${subjectId ?? "todas"}, periodo:${academicPeriodId ?? "todos"}, rango:${day(dateFrom)} a ${day(dateTo)}`,
      ipAddress: params.ipAddress,
    });

    const rows = offerings.map((co) => {
      const allEnrollments = co.courseEnrollments;
      const activeEnrollments = allEnrollments.filter(
        (e) => e.enrollmentStatus !== ENROLLMENT_STATUS.CANCELADA,
      );

      const totalInscriptos = allEnrollments.length;
      const activos = activeEnrollments.length;
      const aprobados = activeEnrollments.filter(
        (e) => e.enrollmentStatus === ENROLLMENT_STATUS.APROBADA,
      ).length;
      const regulares = activeEnrollments.filter(
        (e) => e.enrollmentStatus === ENROLLMENT_STATUS.REGULAR,
      ).length;
      const desaprobados = activeEnrollments.filter(
        (e) => e.enrollmentStatus === ENROLLMENT_STATUS.DESAPROBADA,
      ).length;
      const libres = activeEnrollments.filter(
        (e) => e.enrollmentStatus === ENROLLMENT_STATUS.LIBRE,
      ).length;
      const canceladas = totalInscriptos - activos;

      const tasaAprobacion =
        activos > 0 ? Math.round(((aprobados + regulares) / activos) * 100) : 0;
      const tasaDesercion =
        totalInscriptos > 0
          ? Math.round(((libres + canceladas) / totalInscriptos) * 100)
          : 0;

      // Promedio de asistencia de la comisión
      // Misma regla que el cierre: asistencia ponderada sobre todas las clases de cada alumno activo.
      const totalPresent = activeEnrollments.reduce(
        (sum, enr) => sum + attendedWeight(enr.attendances.map((att) => att.attendanceStatus)),
        0,
      );
      const promedioAsistencia = attendancePercent(totalPresent, activos * co._count.classSessions);

      return {
        offeringId: String(co.courseOfferingId),
        careerName: co.studyPlanSubject.studyPlan.career.careerName,
        subjectCode: co.studyPlanSubject.subject.subjectCode,
        subjectName: co.studyPlanSubject.subject.subjectName,
        commission: co.commission,
        period: `${co.academicPeriod.year} - ${co.academicPeriod.semester}° Cuat.`,
        capacity: co.capacity,
        totalInscriptos,
        activos,
        aprobados,
        regulares,
        desaprobados,
        libres,
        canceladas,
        tasaAprobacion,
        promedioAsistencia,
        tasaDesercion,
      };
    });

    const totalInscriptosGlobal = rows.reduce(
      (acc, r) => acc + r.totalInscriptos,
      0,
    );
    const avgAprobacion =
      rows.length > 0
        ? Math.round(
            rows.reduce((acc, r) => acc + r.tasaAprobacion, 0) / rows.length,
          )
        : 0;
    const avgAsistencia =
      rows.length > 0
        ? Math.round(
            rows.reduce((acc, r) => acc + r.promedioAsistencia, 0) /
              rows.length,
          )
        : 0;
    const avgDesercion =
      rows.length > 0
        ? Math.round(
            rows.reduce((acc, r) => acc + r.tasaDesercion, 0) / rows.length,
          )
        : 0;

    return {
      reportType: reportType as ReportType,
      generatedAt: new Date().toISOString(),
      summary: {
        totalCommissions: rows.length,
        totalInscriptos: totalInscriptosGlobal,
        avgAprobacion,
        avgAsistencia,
        avgDesercion,
      },
      rows,
    };
  },
};
