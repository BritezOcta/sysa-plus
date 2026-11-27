import { AppError } from "../lib/AppError.js";
import { attendancePercent, attendedWeight } from "../lib/attendance.js";
import { adminStudentsRepository } from "../repositories/adminStudents.repository.js";

export const adminStudentsService = {
  async getAllCommissions() {
    const offerings = await adminStudentsRepository.findAllCommissions();

    return offerings.map((co) => ({
      id: String(co.courseOfferingId),
      subjectCode: co.studyPlanSubject.subject.subjectCode,
      subjectName: co.studyPlanSubject.subject.subjectName,
      commissionCode: co.commission,
      period: `${co.academicPeriod.year} - ${co.academicPeriod.semester}° Cuat.`,
      enrolledCount: co.courseEnrollments.length,
    }));
  },

  async getCommissionStudents(rawCommissionId: unknown) {
    const courseOfferingId = Number(rawCommissionId);
    if (!Number.isInteger(courseOfferingId) || courseOfferingId <= 0) {
      throw new AppError(
        400,
        "INVALID_COMMISSION_ID",
        "El ID de comisión no es válido.",
      );
    }

    const offering =
      await adminStudentsRepository.findCommissionStudentsWithObservations(
        courseOfferingId,
      );
    if (!offering) {
      throw new AppError(
        404,
        "COMMISSION_NOT_FOUND",
        "Comisión no encontrada.",
      );
    }

    return {
      commission: {
        id: String(offering.courseOfferingId),
        subjectCode: offering.studyPlanSubject.subject.subjectCode,
        subjectName: offering.studyPlanSubject.subject.subjectName,
        commissionCode: offering.commission,
        period: `${offering.academicPeriod.year} - ${offering.academicPeriod.semester}° Cuat.`,
      },
      students: offering.courseEnrollments.map((enr) => {
        const attendancePercentage = attendancePercent(
          attendedWeight(enr.attendances.map((a) => a.attendanceStatus)),
          offering._count.classSessions,
        );

        return {
          enrollmentId: String(enr.courseEnrollmentId),
          legajo: enr.studentCareer.studentProfile.legajo,
          fullName: `${enr.studentCareer.studentProfile.user.firstName} ${enr.studentCareer.studentProfile.user.lastName}`,
          email: enr.studentCareer.studentProfile.user.email,
          enrollmentStatus: enr.enrollmentStatus,
          attendancePercentage,
          observations: enr.studentObservations.map((obs) => ({
            id: String(obs.observationId),
            text: obs.observationText,
            createdAt: obs.createdAt.toISOString(),
            teacherName: `${obs.teacherProfile.user.firstName} ${obs.teacherProfile.user.lastName}`,
          })),
        };
      }),
    };
  },
};
