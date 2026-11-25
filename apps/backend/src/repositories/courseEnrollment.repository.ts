import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
  CORRELATIVITY_TYPE,
  ENROLLMENT_STATUS,
  FINAL_EXAM_PASSING_GRADE,
  OFFERING_STATUS,
} from "../types/academic.js";

type Db = Prisma.TransactionClient | typeof prisma;

/** Correlatividades que se exigen para CURSAR (las de rendir son de RF-06). */
const COURSE_CORRELATIVITY_TYPES = [CORRELATIVITY_TYPE.REGULAR_TO_ENROLL, CORRELATIVITY_TYPE.APPROVED_TO_ENROLL];

const periodSelect = {
  academicPeriodId: true,
  year: true,
  semester: true,
  enrollmentStartDate: true,
  enrollmentEndDate: true,
} as const;

const subjectNameSelect = { select: { subjectCode: true, subjectName: true } } as const;

const requirementsSelect = {
  where: { correlativityType: { in: COURSE_CORRELATIVITY_TYPES } },
  select: {
    correlativityType: true,
    requiredSubject: { select: { studyPlanSubjectId: true, subject: subjectNameSelect } },
  },
} as const;

const offeringSelect = {
  courseOfferingId: true,
  commission: true,
  capacity: true,
  schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } },
  teacherAssignments: {
    select: { teacherProfile: { select: { user: { select: { firstName: true, lastName: true } } } } },
  },
  _count: {
    select: { courseEnrollments: { where: { enrollmentStatus: ENROLLMENT_STATUS.INSCRIPTO } } },
  },
} as const;

export const courseEnrollmentRepository = {
  /** Perfil de alumno con sus carreras y planes de estudio. */
  findStudentContext(userId: number) {
    return prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        studentId: true,
        user: { select: { isActive: true } },
        studentCareers: {
          orderBy: { studentCareerId: "asc" },
          select: {
            studentCareerId: true,
            academicStatus: true,
            career: { select: { careerName: true, isActive: true } },
            studentStudyPlans: {
              orderBy: { studentStudyPlanId: "desc" },
              select: { studyPlan: { select: { studyPlanId: true, resolution: true, isActive: true } } },
            },
          },
        },
      },
    });
  },

  /** Períodos que tienen ventana de inscripción configurada. */
  findPeriodsWithEnrollmentWindow() {
    return prisma.academicPeriod.findMany({
      where: { enrollmentStartDate: { not: null }, enrollmentEndDate: { not: null } },
      orderBy: { enrollmentStartDate: "asc" },
      select: periodSelect,
    });
  },

  /**
   * Materias que el alumno ya regularizó o aprobó.
   * TODO(RF-07/RF-06): hoy se calcula con los estados de COURSE_ENROLLMENT y la nota de
   * EXAM_ENROLLMENT; falta contemplar el vencimiento de la regularidad y equivalencias.
   */
  async findAcademicHistory(studentCareerId: number) {
    const [courses, exams] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: {
          studentCareerId,
          enrollmentStatus: { in: [ENROLLMENT_STATUS.REGULAR, ENROLLMENT_STATUS.APROBADA] },
        },
        select: { enrollmentStatus: true, courseOffering: { select: { studyPlanSubjectId: true } } },
      }),
      prisma.examEnrollment.findMany({
        where: { studentCareerId, examGrade: { gte: FINAL_EXAM_PASSING_GRADE } },
        select: { examCall: { select: { studyPlanSubjectId: true } } },
      }),
    ]);

    const approved = new Set<number>();
    const regular = new Set<number>();
    for (const course of courses) {
      const id = course.courseOffering.studyPlanSubjectId;
      if (course.enrollmentStatus === ENROLLMENT_STATUS.APROBADA) approved.add(id);
      else regular.add(id);
    }
    for (const exam of exams) approved.add(exam.examCall.studyPlanSubjectId);

    return { approved, regular };
  },

  /** Materias del plan con al menos una comisión abierta en el período, con sus comisiones. */
  findOfferedPlanSubjects(studyPlanId: number, academicPeriodId: number) {
    const offeringFilter = { academicPeriodId, offeringStatus: OFFERING_STATUS.ABIERTA };
    return prisma.studyPlanSubject.findMany({
      where: { studyPlanId, isActive: true, courseOfferings: { some: offeringFilter } },
      orderBy: [{ subjectYear: "asc" }, { semester: "asc" }, { studyPlanSubjectId: "asc" }],
      select: {
        studyPlanSubjectId: true,
        subjectYear: true,
        semester: true,
        subject: subjectNameSelect,
        requirements: requirementsSelect,
        courseOfferings: {
          where: offeringFilter,
          orderBy: { commission: "asc" },
          select: offeringSelect,
        },
      },
    });
  },

  /** Inscripciones vigentes (INSCRIPTO) del alumno en un período. */
  findActiveEnrollmentsInPeriod(studentCareerId: number, academicPeriodId: number, db: Db = prisma) {
    return db.courseEnrollment.findMany({
      where: {
        studentCareerId,
        enrollmentStatus: ENROLLMENT_STATUS.INSCRIPTO,
        courseOffering: { academicPeriodId },
      },
      orderBy: { courseEnrollmentId: "asc" },
      select: {
        courseEnrollmentId: true,
        enrollmentDate: true,
        courseOffering: {
          select: {
            ...offeringSelect,
            studyPlanSubjectId: true,
            studyPlanSubject: { select: { subject: subjectNameSelect } },
          },
        },
      },
    });
  },

  findOfferingForEnrollment(courseOfferingId: number) {
    return prisma.courseOffering.findUnique({
      where: { courseOfferingId },
      select: {
        ...offeringSelect,
        offeringStatus: true,
        academicPeriod: { select: periodSelect },
        studyPlanSubject: {
          select: {
            studyPlanSubjectId: true,
            studyPlanId: true,
            isActive: true,
            subject: subjectNameSelect,
            requirements: requirementsSelect,
          },
        },
      },
    });
  },

  countActiveEnrollments(courseOfferingId: number, db: Db = prisma) {
    return db.courseEnrollment.count({
      where: { courseOfferingId, enrollmentStatus: ENROLLMENT_STATUS.INSCRIPTO },
    });
  },

  findEnrollment(studentCareerId: number, courseOfferingId: number, db: Db = prisma) {
    return db.courseEnrollment.findUnique({
      where: { studentCareerId_courseOfferingId: { studentCareerId, courseOfferingId } },
      select: { courseEnrollmentId: true, enrollmentStatus: true },
    });
  },

  createEnrollment(studentCareerId: number, courseOfferingId: number, enrollmentDate: Date, db: Db = prisma) {
    return db.courseEnrollment.create({
      data: { studentCareerId, courseOfferingId, enrollmentDate, enrollmentStatus: ENROLLMENT_STATUS.INSCRIPTO },
      select: { courseEnrollmentId: true },
    });
  },

  /** Vuelve a activar una inscripción cancelada a la misma comisión (la tabla tiene UNIQUE alumno+comisión). */
  reactivateEnrollment(courseEnrollmentId: number, enrollmentDate: Date, db: Db = prisma) {
    return db.courseEnrollment.update({
      where: { courseEnrollmentId },
      data: { enrollmentStatus: ENROLLMENT_STATUS.INSCRIPTO, enrollmentDate },
      select: { courseEnrollmentId: true },
    });
  },

  findEnrollmentById(courseEnrollmentId: number) {
    return prisma.courseEnrollment.findUnique({
      where: { courseEnrollmentId },
      select: {
        courseEnrollmentId: true,
        enrollmentStatus: true,
        studentCareer: { select: { studentProfile: { select: { userId: true } } } },
        courseOffering: {
          select: {
            commission: true,
            academicPeriod: { select: periodSelect },
            studyPlanSubject: { select: { subject: subjectNameSelect } },
          },
        },
      },
    });
  },

  cancelEnrollment(courseEnrollmentId: number) {
    return prisma.courseEnrollment.update({
      where: { courseEnrollmentId },
      data: { enrollmentStatus: ENROLLMENT_STATUS.CANCELADA },
    });
  },

  /**
   * Ejecuta `fn` en una transacción SERIALIZABLE: el conteo de cupo y el alta quedan
   * protegidos contra dos alumnos tomando la última vacante al mismo tiempo.
   * SQL Server resuelve ese choque eligiendo una víctima de deadlock (P2034); en ese
   * caso se reintenta, y el reintento ya ve el cupo actualizado.
   */
  async runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, maxAttempts = 3): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        const isConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (!isConflict || attempt >= maxAttempts) throw error;
      }
    }
  },
};
