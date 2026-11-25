/** Tipos de la API de inscripción a cursadas (RF-04). Espejo de apps/backend/src/types/courseEnrollment.ts */

export type CourseCorrelativityType = 'regularizada_cursar' | 'aprobada_cursar' | 'aprobada_rendir'

export interface ScheduleSlot {
  /** 1 = Lunes ... 7 = Domingo */
  dayOfWeek: number
  dayName: string
  /** "HH:MM" */
  startTime: string
  /** "HH:MM" */
  endTime: string
}

export interface EnrollmentPeriod {
  academicPeriodId: number
  year: number
  semester: number
  /** "YYYY-MM-DD" */
  enrollmentStartDate: string
  /** "YYYY-MM-DD" */
  enrollmentEndDate: string
  isOpen: boolean
}

export interface MissingRequirement {
  studyPlanSubjectId: number
  subjectCode: string
  subjectName: string
  type: CourseCorrelativityType
  requiredCondition: 'REGULAR' | 'APROBADA'
}

export interface Commission {
  courseOfferingId: number
  name: string
  schedules: ScheduleSlot[]
  scheduleText: string
  /** Vacío = sin docente asignado todavía */
  teachers: string[]
  enrolledCount: number
  capacity: number
}

export interface AvailableSubject {
  studyPlanSubjectId: number
  subjectCode: string
  subjectName: string
  year: number | null
  semester: number | null
  /** Correlatividades para cursar que el alumno todavía no cumple (vacío = habilitado) */
  missingRequirements: MissingRequirement[]
  commissions: Commission[]
}

export interface StudentEnrollment {
  courseEnrollmentId: number
  courseOfferingId: number
  studyPlanSubjectId: number
  subjectCode: string
  subjectName: string
  commission: string
  schedules: ScheduleSlot[]
  scheduleText: string
  teachers: string[]
  /** "YYYY-MM-DD" */
  enrollmentDate: string
}

export interface EnrollmentOverview {
  /** null = no hay ningún período con inscripción configurada */
  period: EnrollmentPeriod | null
  student: {
    isActive: boolean
    careerName: string
    studyPlan: string
  }
  subjects: AvailableSubject[]
  enrollments: StudentEnrollment[]
}
