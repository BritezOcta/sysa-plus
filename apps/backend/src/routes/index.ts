import { Router } from "express";
import { academicRouter } from "./academic.routes.js";
import { academicStatusRouter } from "./academicStatus.routes.js";
import { authRouter } from "./auth.routes.js";
import { certificateRouter } from "./certificate.routes.js";
import { courseEnrollmentRouter } from "./courseEnrollment.routes.js";
import { examEnrollmentRouter } from "./examEnrollment.routes.js";
import { healthRouter } from "./health.routes.js";
import { teacherRouter } from "./teacher.routes.js";
import { studentAttendanceRouter } from "./studentAttendance.routes.js";
import { adminStudentsRouter } from "./adminStudents.routes.js";
import { adminRecordsRouter } from "./adminRecords.routes.js";
import { adminReportsRouter } from "./adminReports.routes.js";
import { teacherAssignmentRouter } from "./teacherAssignment.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/academic", academicRouter);
apiRouter.use("/academic-status", academicStatusRouter);
apiRouter.use("/certificates", certificateRouter);
apiRouter.use("/course-enrollments", courseEnrollmentRouter);
apiRouter.use("/exam-enrollments", examEnrollmentRouter);
apiRouter.use("/teacher", teacherRouter);
apiRouter.use("/student/attendance", studentAttendanceRouter);
apiRouter.use("/admin/records", adminRecordsRouter);
apiRouter.use("/admin", adminStudentsRouter);
