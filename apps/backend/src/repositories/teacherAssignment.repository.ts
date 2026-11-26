import { prisma } from "../lib/prisma.js";
import type { AssignmentRole } from "../types/academic.js";

const teacherUserSelect = {
  userId: true,
  firstName: true,
  lastName: true,
  dni: true,
  email: true,
  role: true,
  isActive: true,
} as const;

const assignmentInclude = {
  teacherProfile: { include: { user: { select: teacherUserSelect } } },
} as const;

/** RF-03: asignación de docentes a comisiones (cursadas). */
export const teacherAssignmentRepository = {
  listCareers() {
    return prisma.career.findMany({
      select: { careerId: true, careerCode: true, careerName: true, durationYears: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { careerName: "asc" }],
    });
  },

  listPeriods() {
    return prisma.academicPeriod.findMany({ orderBy: [{ year: "desc" }, { semester: "desc" }] });
  },

  listTeachers() {
    return prisma.teacherProfile.findMany({
      include: { user: { select: teacherUserSelect } },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    });
  },

  findCareer(careerId: number) {
    return prisma.career.findUnique({ where: { careerId } });
  },

  findPeriod(academicPeriodId: number) {
    return prisma.academicPeriod.findUnique({ where: { academicPeriodId } });
  },

  findPeriodByYearSemester(year: number, semester: number) {
    return prisma.academicPeriod.findUnique({ where: { year_semester: { year, semester } } });
  },

  /**
   * Materias del plan activo de la carrera, con sus comisiones en los períodos indicados y los
   * docentes asignados. El servicio decide qué período corresponde a cada materia (anuales).
   */
  findPlanSubjectsWithOfferings(careerId: number, academicPeriodIds: number[]) {
    return prisma.studyPlanSubject.findMany({
      where: { studyPlan: { careerId, isActive: true } },
      include: {
        subject: true,
        courseOfferings: {
          where: { academicPeriodId: { in: academicPeriodIds } },
          include: {
            schedules: true,
            teacherAssignments: { include: assignmentInclude, orderBy: { teacherAssignmentId: "asc" } },
            _count: { select: { courseEnrollments: { where: { enrollmentStatus: { not: "CANCELADA" } } } } },
          },
          orderBy: { commission: "asc" },
        },
      },
      orderBy: [{ subjectYear: "asc" }, { semester: "asc" }, { subject: { subjectName: "asc" } }],
    });
  },

  findOffering(courseOfferingId: number) {
    return prisma.courseOffering.findUnique({
      where: { courseOfferingId },
      include: {
        academicPeriod: true,
        schedules: true,
        studyPlanSubject: { include: { subject: true } },
        teacherAssignments: true,
      },
    });
  },

  findTeacher(teacherId: number) {
    return prisma.teacherProfile.findUnique({
      where: { teacherId },
      include: { user: { select: teacherUserSelect } },
    });
  },

  findAssignment(teacherAssignmentId: number) {
    return prisma.teacherAssignment.findUnique({
      where: { teacherAssignmentId },
      include: {
        ...assignmentInclude,
        courseOffering: {
          include: { academicPeriod: true, studyPlanSubject: { include: { subject: true } } },
        },
      },
    });
  },

  findAssignmentByPair(teacherId: number, courseOfferingId: number) {
    return prisma.teacherAssignment.findUnique({
      where: { teacherId_courseOfferingId: { teacherId, courseOfferingId } },
    });
  },

  /** Otras comisiones del docente en el mismo período (para avisar superposición de horarios). */
  findTeacherOfferingsInPeriod(teacherId: number, academicPeriodId: number, excludeOfferingId: number) {
    return prisma.teacherAssignment.findMany({
      where: {
        teacherId,
        courseOfferingId: { not: excludeOfferingId },
        courseOffering: { academicPeriodId },
      },
      include: {
        courseOffering: {
          include: { schedules: true, studyPlanSubject: { include: { subject: true } } },
        },
      },
    });
  },

  /** Materias y comisiones a cargo de un docente (RF-03 3.4). */
  findAssignmentsByTeacher(teacherId: number) {
    return prisma.teacherAssignment.findMany({
      where: { teacherId },
      include: {
        courseOffering: {
          include: {
            academicPeriod: true,
            schedules: true,
            studyPlanSubject: {
              include: { subject: true, studyPlan: { include: { career: true } } },
            },
          },
        },
      },
      orderBy: [{ courseOffering: { academicPeriod: { year: "desc" } } }, { courseOffering: { commission: "asc" } }],
    });
  },

  createAssignment(data: { teacherId: number; courseOfferingId: number; assignmentRole: AssignmentRole }) {
    return prisma.teacherAssignment.create({ data });
  },

  updateAssignmentRole(teacherAssignmentId: number, assignmentRole: AssignmentRole) {
    return prisma.teacherAssignment.update({ where: { teacherAssignmentId }, data: { assignmentRole } });
  },

  deleteAssignment(teacherAssignmentId: number) {
    return prisma.teacherAssignment.delete({ where: { teacherAssignmentId } });
  },
};
