import type { Request, Response } from "express";
import { studentAttendanceService } from "../services/studentAttendance.service.js";

export const studentAttendanceController = {
  async getMyAttendance(req: Request, res: Response) {
    const courses = await studentAttendanceService.getMyAttendance(req.user!);
    res.status(200).json({ status: "OK", courses });
  },
};
