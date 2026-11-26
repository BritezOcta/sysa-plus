import type { Request, Response } from "express";
import { examEnrollmentService } from "../services/examEnrollment.service.js";

// requireAuth garantiza req.user en todas estas rutas.

export const examEnrollmentController = {
  async overview(req: Request, res: Response) {
    const overview = await examEnrollmentService.getOverview(req.user!);
    res.status(200).json({ status: "OK", ...overview });
  },

  async enroll(req: Request, res: Response) {
    const body: Record<string, unknown> = req.body ?? {};
    const enrollment = await examEnrollmentService.enroll(req.user!, body["examCallId"], req.ip ?? null);
    res.status(201).json({ status: "OK", enrollment });
  },

  async cancel(req: Request, res: Response) {
    await examEnrollmentService.cancel(req.user!, req.params["examEnrollmentId"], req.ip ?? null);
    res.status(200).json({ status: "OK" });
  },
};
