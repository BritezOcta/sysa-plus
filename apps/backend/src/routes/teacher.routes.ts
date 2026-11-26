import { Router } from "express";
import { teacherController } from "../controllers/teacher.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { ROLES } from "../types/auth.js";

/** Módulo docente: comisiones y RF-05 asistencias (solo profesores). */
export const teacherRouter = Router();

teacherRouter.use(requireAuth, requireRole(ROLES.PROFESOR));

teacherRouter.get("/commissions", teacherController.commissions);
teacherRouter.get(
  "/commissions/:commissionId/attendance",
  teacherController.getAttendance,
);
teacherRouter.put(
  "/commissions/:commissionId/attendance",
  teacherController.saveAttendance,
);
teacherRouter.get(
  "/commissions/:commissionId/students",
  teacherController.getStudents,
);
teacherRouter.post(
  "/commissions/:commissionId/students/:enrollmentId/observations",
  teacherController.addObservation,
);
teacherRouter.get(
  "/commissions/:commissionId/grades",
  teacherController.getGrades,
);
teacherRouter.post(
  "/commissions/:commissionId/assessments",
  teacherController.createAssessment,
);
teacherRouter.put(
  "/commissions/:commissionId/assessments/:assessmentId/grades",
  teacherController.saveGrades,
);
teacherRouter.post(
  "/commissions/:commissionId/assessments/:assessmentId/close",
  teacherController.closeAssessment,
);
teacherRouter.patch(
  "/commissions/:commissionId/enrollments/:enrollmentId/status",
  teacherController.updateEnrollmentStatus,
);
teacherRouter.get("/exam-calls", teacherController.getExamCalls);
teacherRouter.get(
  "/exam-calls/:examCallId/grades",
  teacherController.getExamCallGrades,
);
teacherRouter.put(
  "/exam-calls/:examCallId/grades",
  teacherController.saveExamCallGrades,
);
teacherRouter.post(
  "/exam-calls/:examCallId/close",
  teacherController.closeExamCall,
);
