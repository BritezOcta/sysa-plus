import type { Request, Response } from "express";
import { teacherAssignmentService, type Actor } from "../services/teacherAssignment.service.js";

function actor(req: Request): Actor {
  return { userId: req.user?.userId ?? 0, ipAddress: req.ip ?? null };
}

function body(req: Request): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

export const teacherAssignmentController = {
  async options(_req: Request, res: Response) {
    res.status(200).json({ status: "OK", ...(await teacherAssignmentService.getOptions()) });
  },

  async commissions(req: Request, res: Response) {
    const data = await teacherAssignmentService.getCommissions(req.query["careerId"], req.query["periodId"]);
    res.status(200).json({ status: "OK", ...data });
  },

  async teacherLoad(req: Request, res: Response) {
    const data = await teacherAssignmentService.getTeacherLoad(req.params["teacherId"]);
    res.status(200).json({ status: "OK", ...data });
  },

  async assign(req: Request, res: Response) {
    const b = body(req);
    const result = await teacherAssignmentService.assign(
      { courseOfferingId: b["courseOfferingId"], teacherId: b["teacherId"], role: b["role"] },
      actor(req),
    );
    res.status(201).json({ status: "OK", ...result });
  },

  async changeRole(req: Request, res: Response) {
    const result = await teacherAssignmentService.changeRole(req.params["assignmentId"], body(req)["role"], actor(req));
    res.status(200).json({ status: "OK", ...result });
  },

  async unassign(req: Request, res: Response) {
    await teacherAssignmentService.unassign(req.params["assignmentId"], actor(req));
    res.status(200).json({ status: "OK" });
  },
};
