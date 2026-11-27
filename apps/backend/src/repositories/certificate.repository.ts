import { prisma } from "../lib/prisma.js";
import { ENROLLMENT_STATUS } from "../types/academic.js";

const certificateInclude = {
  academicPeriod: true,
  studentCareer: {
    include: {
      career: { select: { careerName: true } },
      studentProfile: { select: { legajo: true, user: { select: { userId: true, firstName: true, lastName: true, dni: true } } } },
    },
  },
} as const;

/** RF-11: emisión y consulta de certificados. */
export const certificateRepository = {
  /** Datos del alumno que figuran en el encabezado del certificado. */
  findStudentIdentity(studentCareerId: number) {
    return prisma.studentCareer.findUnique({
      where: { studentCareerId },
      select: {
        admissionYear: true,
        academicStatus: true,
        studentProfile: { select: { legajo: true, user: { select: { firstName: true, lastName: true, dni: true } } } },
      },
    });
  },

  /** Cursadas vigentes (no canceladas) del alumno, con su período. */
  findCourseEnrollments(studentCareerId: number) {
    return prisma.courseEnrollment.findMany({
      where: { studentCareerId, enrollmentStatus: { not: ENROLLMENT_STATUS.CANCELADA } },
      select: {
        courseOffering: {
          select: {
            commission: true,
            academicPeriod: true,
            studyPlanSubject: { select: { subject: { select: { subjectCode: true, subjectName: true } } } },
          },
        },
      },
    });
  },

  findPeriod(academicPeriodId: number) {
    return prisma.academicPeriod.findUnique({ where: { academicPeriodId } });
  },

  codeExists(validationCode: string) {
    return prisma.certificate.findUnique({ where: { validationCode }, select: { certificateId: true } });
  },

  create(data: {
    validationCode: string;
    certificateType: string;
    studentCareerId: number;
    academicPeriodId: number | null;
    contentJson: string;
  }) {
    return prisma.certificate.create({ data });
  },

  findByCode(validationCode: string) {
    return prisma.certificate.findUnique({ where: { validationCode }, include: certificateInclude });
  },

  listByStudentCareer(studentCareerId: number) {
    return prisma.certificate.findMany({
      where: { studentCareerId },
      include: { academicPeriod: true },
      orderBy: { issuedAt: "desc" },
      take: 50,
    });
  },
};
