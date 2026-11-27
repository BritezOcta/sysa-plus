import type { Request, Response } from "express";
import { certificateService } from "../services/certificate.service.js";

export const certificateController = {
  async options(req: Request, res: Response) {
    const data = await certificateService.getOptions(req.user!);
    res.status(200).json({ status: "OK", ...data });
  },

  async issue(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const certificate = await certificateService.issue(req.user!, body["type"], body["periodId"], req.ip ?? null);
    res.status(201).json({ status: "OK", certificate });
  },

  async pdf(req: Request, res: Response) {
    const { pdf, fileName } = await certificateService.getPdf(req.user!, req.params["code"]);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(pdf);
  },

  async verify(req: Request, res: Response) {
    const data = await certificateService.verify(req.params["code"]);
    res.status(200).json({ status: "OK", ...data });
  },
};
