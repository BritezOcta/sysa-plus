import type { Request, Response } from "express";
import { adminReportsService } from "../services/adminReports.service.js";

export const adminReportsController = {
  async getFilterOptions(_req: Request, res: Response) {
    const filters = await adminReportsService.getFilterOptions();
    res.status(200).json({ status: "OK", ...filters });
  },

  async generateReport(req: Request, res: Response) {
    const data = await adminReportsService.generateReport({
      user: req.user!,
      ipAddress: req.ip ?? null,
      rawType: req.query["type"],
      rawCareerId: req.query["careerId"],
      rawSubjectId: req.query["subjectId"],
      rawPeriodId: req.query["periodId"],
      rawDateFrom: req.query["dateFrom"],
      rawDateTo: req.query["dateTo"],
    });
    res.status(200).json({ status: "OK", ...data });
  },
};
