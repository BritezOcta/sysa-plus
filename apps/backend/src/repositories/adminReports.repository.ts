import { prisma } from "../lib/prisma.js";

export interface ReportFilterParams {
  careerId?: number | undefined;
  subjectId?: number | undefined;
  academicPeriodId?: number | undefined;
}
export const adminReportsRepository = {
  async getFilterOptions() {
    const [careers, subjects, periods] = await Promise.all([
      prisma.career.findMany({
        where: { isActive: true },
        select: { careerId: true, careerCode: true, careerName: true },
        orderBy: { careerName: "asc" },
      }),
      prisma.subject.findMany({
        select: { subjectId: true, subjectCode: true, subjectName: true },
        orderBy: { subjectName: "asc" },
      }),
      prisma.academicPeriod.findMany({
        select: { academicPeriodId: true, year: true, semester: true },
        orderBy: [{ year: "desc" }, { semester: "desc" }],
      }),
    ]);

    return { careers, subjects, periods };
  },

  async findOfferingsForReport(filters: ReportFilterParams) {
    return prisma.courseOffering.findMany({
      where: {
        ...(filters.academicPeriodId
          ? { academicPeriodId: filters.academicPeriodId }
          : {}),
        studyPlanSubject: {
          ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
          ...(filters.careerId
            ? { studyPlan: { careerId: filters.careerId } }
            : {}),
        },
      },
      include: {
        academicPeriod: true,
        studyPlanSubject: {
          include: {
            subject: true,
            studyPlan: {
              include: { career: true },
            },
          },
        },
        courseEnrollments: {
          include: {
            attendances: {
              select: { attendanceStatus: true },
            },
          },
        },
      },
      orderBy: [
        { academicPeriod: { year: "desc" } },
        { academicPeriod: { semester: "desc" } },
        { studyPlanSubject: { subject: { subjectName: "asc" } } },
        { commission: "asc" },
      ],
    });
  },

  async logReportGeneration(params: {
    userId: number;
    reportType: string;
    details: string;
    ipAddress: string | null;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: "GENERAR_REPORTE",
        entity: "ACADEMIC_REPORT",
        entityId: params.reportType,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  },
};
