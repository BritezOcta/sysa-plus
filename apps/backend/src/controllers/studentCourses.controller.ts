import type { Request, Response } from "express";
import { studentCoursesService } from "../services/studentCourses.service.js";

export const studentCoursesController = {
  async getMyCourses(req: Request, res: Response) {
    const { questions, courses } = await studentCoursesService.getMyCourses(req.user!);
    res.status(200).json({ status: "OK", questions, courses });
  },

  async submitSurvey(req: Request<{ enrollmentId: string }>, res: Response) {
    await studentCoursesService.submitSurvey(req.user!, req.params.enrollmentId, req.body);
    res.status(201).json({ status: "OK" });
  },
};
