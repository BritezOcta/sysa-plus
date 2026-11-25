import type { Request, Response } from "express";
import { teacherService } from "../services/teacher.service.js";

// requireAuth y requireRole(ROLES.PROFESOR) garantizan req.user en todas estas rutas.

export const teacherController = {
  async commissions(req: Request, res: Response) {
    const commissions = await teacherService.getMyCommissions(req.user!);
    res.status(200).json({ status: "OK", commissions });
  },

  async getAttendance(req: Request, res: Response) {
    const data = await teacherService.getAttendanceForDate(
      req.user!,
      req.params["commissionId"],
      req.query["date"],
    );
    res.status(200).json({ status: "OK", ...data });
  },

  async saveAttendance(req: Request, res: Response) {
    const body: Record<string, unknown> = req.body ?? {};
    const result = await teacherService.saveAttendance({
      user: req.user!,
      ipAddress: req.ip ?? null,
      rawCommissionId: req.params["commissionId"],
      date: body["date"],
      topic: body["topic"],
      allowOverwrite: body["allowOverwrite"],
      records: body["records"],
    });
    res.status(200).json({ status: "OK", ...result });
  },
};
