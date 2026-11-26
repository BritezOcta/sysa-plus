import { AppError } from "../lib/AppError.js";
import { adminRecordsRepository } from "../repositories/adminRecords.repository.js";
import { EXAM_CALL_STATUS } from "../types/academic.js";

type Actor = { userId: number; ipAddress: string | null };
export type RecordKind = "courses" | "assessments" | "exam-calls";

function parseId(raw: unknown): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "INVALID_ID", "El identificador enviado no es válido.");
  }
  return id;
}

function parseReason(raw: unknown): string {
  const reason = typeof raw === "string" ? raw.trim() : "";
  if (!reason) {
    throw new AppError(400, "EMPTY_REASON", "Indicá el motivo de la reapertura.");
  }
  if (reason.length > 500) {
    throw new AppError(400, "REASON_TOO_LONG", "El motivo no puede superar los 500 caracteres.");
  }
  return reason;
}

const notFound = () => new AppError(404, "RECORD_NOT_FOUND", "El acta indicada no existe.");
const notClosed = () => new AppError(409, "RECORD_NOT_CLOSED", "El acta indicada no está cerrada.");

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
const periodLabel = (p: { year: number; semester: number }) => `${p.year} - ${p.semester}° Cuat.`;

/** RF-07: el Administrador/Director consulta y reabre actas cerradas. */
export const adminRecordsService = {
  async listClosed() {
    const { courses, assessments, examCalls } = await adminRecordsRepository.findClosedRecords();
    return {
      courses: courses.map((c) => ({
        id: String(c.courseOfferingId),
        subjectName: c.studyPlanSubject.subject.subjectName,
        commission: c.commission,
        period: periodLabel(c.academicPeriod),
        closedAt: c.gradesClosedAt!.toISOString(),
      })),
      assessments: assessments.map((a) => ({
        id: String(a.assessmentId),
        name: a.assessmentName,
        type: a.assessmentType,
        subjectName: a.courseOffering.studyPlanSubject.subject.subjectName,
        commission: a.courseOffering.commission,
        period: periodLabel(a.courseOffering.academicPeriod),
      })),
      examCalls: examCalls.map((e) => ({
        id: String(e.examCallId),
        subjectName: e.studyPlanSubject.subject.subjectName,
        sessionName: e.examSession.examName,
        callDate: toIsoDate(e.callDate),
      })),
    };
  },

  async reopen(kind: RecordKind, rawId: unknown, rawReason: unknown, actor: Actor) {
    const id = parseId(rawId);
    const reason = parseReason(rawReason);
    const audit = (what: string) => ({
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      details: `${what} - Motivo: ${reason}`.slice(0, 1000),
    });

    if (kind === "courses") {
      const course = await adminRecordsRepository.findCourse(id);
      if (!course) throw notFound();
      if (!course.gradesClosedAt) throw notClosed();
      await adminRecordsRepository.reopenCourse(
        id,
        audit(`Reapertura de cursada ${course.studyPlanSubject.subject.subjectCode} com. ${course.commission}`),
      );
    } else if (kind === "assessments") {
      const assessment = await adminRecordsRepository.findAssessment(id);
      if (!assessment) throw notFound();
      if (!assessment.isClosed) throw notClosed();
      if (assessment.courseOffering.gradesClosedAt) {
        throw new AppError(
          409,
          "COURSE_CLOSED",
          "La cursada de esta evaluación está cerrada: reabrí primero la cursada.",
        );
      }
      await adminRecordsRepository.reopenAssessment(
        id,
        audit(
          `Reapertura de acta "${assessment.assessmentName}" - ${assessment.courseOffering.studyPlanSubject.subject.subjectCode} com. ${assessment.courseOffering.commission}`,
        ),
      );
    } else {
      const call = await adminRecordsRepository.findExamCall(id);
      if (!call) throw notFound();
      if (call.callStatus !== EXAM_CALL_STATUS.CERRADA) throw notClosed();
      await adminRecordsRepository.reopenExamCall(
        id,
        audit(`Reapertura de acta de final ${call.studyPlanSubject.subject.subjectCode}`),
      );
    }

    return { id: String(id), kind };
  },
};
