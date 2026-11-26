import type { Request, Response } from "express";
import { courseEnrollmentService } from "../services/courseEnrollment.service.js";

// requireAuth garantiza req.user en todas estas rutas.

export const courseEnrollmentController = {
  async overview(req: Request, res: Response) {
    const overview = await courseEnrollmentService.getOverview(req.user!);
    res.status(200).json({ status: "OK", ...overview });
  },

  async enroll(req: Request, res: Response) {
    const body: Record<string, unknown> = req.body ?? {};
    const enrollment = await courseEnrollmentService.enroll(req.user!, body["courseOfferingId"], req.ip ?? null);
    res.status(201).json({ status: "OK", enrollment });
  },

  async cancel(req: Request, res: Response) {
    await courseEnrollmentService.cancel(req.user!, req.params["courseEnrollmentId"], req.ip ?? null);
    res.status(200).json({ status: "OK" });
  },
};
