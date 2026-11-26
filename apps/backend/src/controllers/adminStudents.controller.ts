import type { Request, Response } from "express";
import { adminStudentsService } from "../services/adminStudents.service.js";

export const adminStudentsController = {
  async getCommissions(_req: Request, res: Response) {
    const commissions = await adminStudentsService.getAllCommissions();
    res.status(200).json({ status: "OK", commissions });
  },

  async getCommissionStudents(req: Request, res: Response) {
    const data = await adminStudentsService.getCommissionStudents(
      req.params["commissionId"],
    );
    res.status(200).json({ status: "OK", ...data });
  },
};
