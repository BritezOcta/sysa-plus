import type { Request, Response } from "express";
import { adminRecordsService, type RecordKind } from "../services/adminRecords.service.js";

const reopen = (kind: RecordKind) => async (req: Request, res: Response) => {
  const body: Record<string, unknown> = req.body ?? {};
  const result = await adminRecordsService.reopen(kind, req.params["id"], body["reason"], {
    userId: req.user!.userId,
    ipAddress: req.ip ?? null,
  });
  res.status(200).json({ status: "OK", ...result });
};

export const adminRecordsController = {
  async listClosed(_req: Request, res: Response) {
    const records = await adminRecordsService.listClosed();
    res.status(200).json({ status: "OK", ...records });
  },
  reopenCourse: reopen("courses"),
  reopenAssessment: reopen("assessments"),
  reopenExamCall: reopen("exam-calls"),
};
