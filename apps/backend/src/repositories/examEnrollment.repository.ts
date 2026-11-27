import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { CORRELATIVITY_TYPE, ENROLLMENT_STATUS, EXAM_CALL_STATUS, EXAM_STATUS } from "../types/academic.js";

type Db = Prisma.TransactionClient | typeof prisma;

const sessionSelect = {
  examSessionId: true,
  examName: true,
  enrollmentStartDate: true,
  enrollmentEndDate: true,
} as const;

const subjectNameSelect = { select: { subjectCode: true, subjectName: true } } as const;

/** Correlatividades que se exigen para RENDIR (las de cursar son de RF-04). */
const examRequirementsSelect = {
  where: { correlativityType: CORRELATIVITY_TYPE.APPROVED_FOR_EXAM },
  select: {
    correlativityType: true,
    requiredSubject: { select: { studyPlanSubjectId: true, subject: subjectNameSelect } },
  },
} as const;

const teacherSelect = { select: { user: { select: { firstName: true, lastName: true } } } } as const;

const callSelect = {
  examCallId: true,
  examSessionId: true,
  callDate: true,
  callStatus: true,
  classroom: true,
  capacity: true,
  teacherProfile: teacherSelect,
  studyPlanSubject: {
    select: {
      studyPlanSubjectId: true,
      studyPlanId: true,
      isActive: true,
      subjectYear: true,
      subject: subjectNameSelect,
      requirements: examRequirementsSelect,
    },
  },
  _count: { select: { examEnrollments: { where: { examStatus: EXAM_STATUS.INSCRIPTO } } } },
} as const;

const enrollmentSelect = {
  examEnrollmentId: true,
  examCall: {
    select: {
      examCallId: true,
      callDate: true,
      classroom: true,
      teacherProfile: teacherSelect,
      examSession: { select: sessionSelect },
      studyPlanSubject: { select: { studyPlanSubjectId: true, subject: subjectNameSelect } },
    },
  },
} as const;

/** RF-06: inscripción a exámenes finales. */
export const examEnrollmentRepository = {
  /** Turnos de examen con ventana de inscripción configurada. */
  findSessionsWithEnrollmentWindow() {
    return prisma.examSession.findMany({
      where: { enrollmentStartDate: { not: null }, enrollmentEndDate: { not: null } },
      orderBy: { enrollmentStartDate: "asc" },
      select: sessionSelect,
    });
  },

  /** Mesas abiertas de un turno para las materias activas del plan, en orden de fecha. */
  findOpenCalls(examSessionId: number, studyPlanId: number) {
    return prisma.examCall.findMany({
      where: {
        examSessionId,
        callStatus: EXAM_CALL_STATUS.ABIERTA,
        studyPlanSubject: { studyPlanId, isActive: true },
      },
      orderBy: [{ callDate: "asc" }, { examCallId: "asc" }],
      select: callSelect,
    });
  },

  findCall(examCallId: number) {
    return prisma.examCall.findUnique({
      where: { examCallId },
      select: { ...callSelect, examSession: { select: sessionSelect } },
    });
  },

  /** Cursadas regularizadas del alumno: materia y fin del cuatrimestre en que se regularizó. */
  findRegularCourses(studentCareerId: number) {
    return prisma.courseEnrollment.findMany({
      where: { studentCareerId, enrollmentStatus: ENROLLMENT_STATUS.REGULAR },
      select: {
        courseOffering: {
          select: { studyPlanSubjectId: true, academicPeriod: { select: { periodEndDate: true } } },
        },
      },
    });
  },

  /** Inscripciones vigentes del alumno a mesas que todavía no se tomaron ("Mis exámenes"). */
  findUpcomingEnrollments(studentCareerId: number, fromDate: Date, db: Db = prisma) {
    return db.examEnrollment.findMany({
      where: { studentCareerId, examStatus: EXAM_STATUS.INSCRIPTO, examCall: { callDate: { gte: fromDate } } },
      orderBy: { examCall: { callDate: "asc" } },
      select: enrollmentSelect,
    });
  },

  findStudentStudyPlan(studentCareerId: number, studyPlanId: number) {
    return prisma.studentStudyPlan.findUnique({
      where: { studentCareerId_studyPlanId: { studentCareerId, studyPlanId } },
      select: { studentStudyPlanId: true },
    });
  },

  countActiveEnrollments(examCallId: number, db: Db = prisma) {
    return db.examEnrollment.count({ where: { examCallId, examStatus: EXAM_STATUS.INSCRIPTO } });
  },

  findEnrollment(examCallId: number, studentCareerId: number, db: Db = prisma) {
    return db.examEnrollment.findUnique({
      where: { examCallId_studentCareerId: { examCallId, studentCareerId } },
      select: { examEnrollmentId: true, examStatus: true },
    });
  },

  createEnrollment(examCallId: number, studentCareerId: number, studentStudyPlanId: number, db: Db = prisma) {
    return db.examEnrollment.create({
      data: { examCallId, studentCareerId, studentStudyPlanId, examStatus: EXAM_STATUS.INSCRIPTO },
      select: { examEnrollmentId: true },
    });
  },

  /** Vuelve a activar una inscripción cancelada a la misma mesa (la tabla tiene UNIQUE mesa+alumno). */
  reactivateEnrollment(examEnrollmentId: number, db: Db = prisma) {
    return db.examEnrollment.update({
      where: { examEnrollmentId },
      data: { examStatus: EXAM_STATUS.INSCRIPTO },
      select: { examEnrollmentId: true },
    });
  },

  findEnrollmentById(examEnrollmentId: number) {
    return prisma.examEnrollment.findUnique({
      where: { examEnrollmentId },
      select: {
        ...enrollmentSelect,
        examStatus: true,
        studentCareer: { select: { studentProfile: { select: { userId: true } } } },
      },
    });
  },

  cancelEnrollment(examEnrollmentId: number) {
    return prisma.examEnrollment.update({
      where: { examEnrollmentId },
      data: { examStatus: EXAM_STATUS.CANCELADA },
    });
  },
};
