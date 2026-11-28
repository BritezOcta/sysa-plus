import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
  CORRELATIVITY_TYPE,
  ENROLLMENT_STATUS,
  FINAL_EXAM_PASSING_GRADE,
  OFFERING_STATUS,
} from "../types/academic.js";

type Db = Prisma.TransactionClient | typeof prisma;

/** Resultado de reserveCourseSeat: OK con el id, o el motivo del rechazo. */
export interface SeatReservation {
  result: "OK" | "ALREADY_ENROLLED" | "ALREADY_ENROLLED_IN_SUBJECT" | "SCHEDULE_CONFLICT" | "COMMISSION_FULL";
  courseEnrollmentId: number | null;
}

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
   * Inscribe al alumno en la comisión en UNA sola ida a la base: bloqueo del alumno y de la
   * comisión, verificación y alta (o reactivación) en un bloque T-SQL con su propia transacción.
   * Así el bloqueo de la comisión dura lo que tarda SQL Server, no las idas y vueltas de Node:
   * con la comisión disputada, cada ida y vuelta esperaba en la cola de eventos del worker con la
   * comisión bloqueada (medido con loadtest/pico-inscripcion.js, Fase 2).
   *
   * Es la verificación definitiva: repite en SQL las reglas de `validate()` en
   * courseEnrollment.service.ts (misma comisión, misma materia, horarios superpuestos con la misma
   * regla que schedulesOverlap, y cupo). Si cambia una regla, hay que cambiarla en los dos lugares.
   */
  async reserveCourseSeat(p: {
    studentCareerId: number;
    courseOfferingId: number;
    academicPeriodId: number;
    studyPlanSubjectId: number;
    enrollmentDate: Date;
  }): Promise<SeatReservation> {
    const active = ENROLLMENT_STATUS.INSCRIPTO;
    const rows = await prisma.$queryRaw<SeatReservation[]>`
      SET NOCOUNT ON;
      SET XACT_ABORT ON;
      DECLARE @result NVARCHAR(30) = NULL, @id INT = NULL, @capacity INT, @lockedStudent INT;
      BEGIN TRAN;
      -- Orden fijo alumno -> comisión: los pedidos del mismo alumno y los de la misma comisión hacen fila.
      SELECT @lockedStudent = STUDENT_CAREER_ID FROM STUDENT_CAREER WITH (UPDLOCK, ROWLOCK) WHERE STUDENT_CAREER_ID = ${p.studentCareerId};
      SELECT @capacity = CAPACITY FROM COURSE_OFFERING WITH (UPDLOCK, ROWLOCK) WHERE COURSE_OFFERING_ID = ${p.courseOfferingId};

      IF EXISTS (SELECT 1 FROM COURSE_ENROLLMENT
                 WHERE STUDENT_CAREER_ID = ${p.studentCareerId} AND COURSE_OFFERING_ID = ${p.courseOfferingId} AND ENROLLMENT_STATUS = ${active})
        SET @result = 'ALREADY_ENROLLED';
      ELSE IF EXISTS (SELECT 1 FROM COURSE_ENROLLMENT e JOIN COURSE_OFFERING o ON o.COURSE_OFFERING_ID = e.COURSE_OFFERING_ID
                      WHERE e.STUDENT_CAREER_ID = ${p.studentCareerId} AND e.ENROLLMENT_STATUS = ${active}
                        AND o.ACADEMIC_PERIOD_ID = ${p.academicPeriodId} AND o.STUDY_PLAN_SUBJECT_ID = ${p.studyPlanSubjectId})
        SET @result = 'ALREADY_ENROLLED_IN_SUBJECT';
      ELSE IF EXISTS (SELECT 1 FROM COURSE_ENROLLMENT e
                      JOIN COURSE_OFFERING o ON o.COURSE_OFFERING_ID = e.COURSE_OFFERING_ID
                      JOIN COURSE_SCHEDULE mine ON mine.COURSE_OFFERING_ID = e.COURSE_OFFERING_ID
                      JOIN COURSE_SCHEDULE target ON target.COURSE_OFFERING_ID = ${p.courseOfferingId}
                       AND target.DAY_OF_WEEK = mine.DAY_OF_WEEK
                       AND mine.START_TIME < target.END_TIME AND target.START_TIME < mine.END_TIME
                      WHERE e.STUDENT_CAREER_ID = ${p.studentCareerId} AND e.ENROLLMENT_STATUS = ${active}
                        AND o.ACADEMIC_PERIOD_ID = ${p.academicPeriodId})
        SET @result = 'SCHEDULE_CONFLICT';
      ELSE IF (SELECT COUNT(*) FROM COURSE_ENROLLMENT
               WHERE COURSE_OFFERING_ID = ${p.courseOfferingId} AND ENROLLMENT_STATUS = ${active}) >= @capacity
        SET @result = 'COMMISSION_FULL';
      ELSE
      BEGIN
        -- Si se había inscripto antes a esta comisión y canceló, se reactiva ese registro (UNIQUE alumno+comisión).
        SELECT @id = COURSE_ENROLLMENT_ID FROM COURSE_ENROLLMENT
        WHERE STUDENT_CAREER_ID = ${p.studentCareerId} AND COURSE_OFFERING_ID = ${p.courseOfferingId};
        IF @id IS NOT NULL
          UPDATE COURSE_ENROLLMENT SET ENROLLMENT_STATUS = ${active}, ENROLLMENT_DATE = ${p.enrollmentDate}
          WHERE COURSE_ENROLLMENT_ID = @id;
        ELSE
        BEGIN
          INSERT INTO COURSE_ENROLLMENT (STUDENT_CAREER_ID, COURSE_OFFERING_ID, ENROLLMENT_DATE, ENROLLMENT_STATUS)
          VALUES (${p.studentCareerId}, ${p.courseOfferingId}, ${p.enrollmentDate}, ${active});
          SET @id = SCOPE_IDENTITY();
        END
        SET @result = 'OK';
      END
      COMMIT;
      SELECT @result AS result, @id AS courseEnrollmentId;
    `;
    const row = rows[0];
    if (!row) throw new Error("reserveCourseSeat: la base no devolvió resultado");
    return row;
  },

  /**
   * Inscripción a examen: ejecuta `fn` con la fila del alumno y la de la mesa bloqueadas (UPDLOCK)
   * hasta el commit. Así las inscripciones a una misma mesa, y las de un mismo alumno, hacen fila en
   * vez de chocar: el conteo de cupo y las validaciones del alumno que hace `fn` no se pueden pisar.
   * Las de mesas y alumnos distintos siguen en paralelo.
   *
   * Reemplaza a SERIALIZABLE, que bajo carga generaba deadlocks (medido con loadtest/). El orden
   * fijo alumno → mesa evita deadlocks; si igual SQL Server elige una víctima (P2034), se reintenta.
   * Pendiente: con muchísima demanda sobre una misma mesa conviene el enfoque de una sola ida a la
   * base de reserveCourseSeat (el bloqueo acá dura las idas y vueltas de Node).
   */
  async runWithEnrollmentLocks<T>(
    lock: { studentCareerId: number; examCallId: number },
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    maxAttempts = 3,
  ): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT STUDENT_CAREER_ID FROM STUDENT_CAREER WITH (UPDLOCK, ROWLOCK) WHERE STUDENT_CAREER_ID = ${lock.studentCareerId}`;
          await tx.$queryRaw`SELECT EXAM_CALL_ID FROM EXAM_CALL WITH (UPDLOCK, ROWLOCK) WHERE EXAM_CALL_ID = ${lock.examCallId}`;
          return fn(tx);
        });
      } catch (error) {
        const isConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (!isConflict || attempt >= maxAttempts) throw error;
      }
    }
  },
};
