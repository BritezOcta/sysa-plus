import type { Request, Response } from "express";
import { careerInput, correlativityType, entityStatus, objectBody, positiveId, subjectInput, subjectSlot } from "../lib/academic.validation.js";
import { academicService } from "../services/academic.service.js";

function getActor(req: Request) {
  return { userId: req.user!.userId, ipAddress: req.ip ?? null };
}

export const academicController = {
  async snapshot(_req: Request, res: Response) {
    res.json({ status: "OK", ...await academicService.getSnapshot() });
  },
  async saveCareer(req: Request, res: Response) {
    const input = careerInput(req.body, req.params.careerId);
    const result = await academicService.saveCareer(input, getActor(req));
    res.status(input.id ? 200 : 201).json({ status: "OK", ...result });
  },
  async toggleCareerStatus(req: Request, res: Response) {
    const status = entityStatus(objectBody(req.body).status);
    res.json(await academicService.toggleCareerStatus(positiveId(req.params.careerId), getActor(req), status));
  },
  async deleteCareer(req: Request, res: Response) {
    await academicService.deleteCareer(positiveId(req.params.careerId), getActor(req));
    res.status(204).end();
  },
  async saveSubject(req: Request, res: Response) {
    const input = subjectInput(req.body, req.params.studyPlanSubjectId);
    const result = await academicService.saveSubject(input, getActor(req));
    res.status(input.id ? 200 : 201).json({ status: "OK", ...result });
  },
  async moveSubjectSlot(req: Request, res: Response) {
    const slot = subjectSlot(objectBody(req.body));
    await academicService.moveSubjectSlot(positiveId(req.params.studyPlanSubjectId), slot.year, slot.period, getActor(req));
    res.json({ status: "OK" });
  },
  async toggleSubjectStatus(req: Request, res: Response) {
    const status = entityStatus(objectBody(req.body).status);
    res.json(await academicService.setSubjectStatus(positiveId(req.params.studyPlanSubjectId), status, getActor(req)));
  },
  async deleteSubject(req: Request, res: Response) {
    await academicService.deleteSubject(positiveId(req.params.studyPlanSubjectId), getActor(req));
    res.status(204).end();
  },
  async connectCorrelativity(req: Request, res: Response) {
    const body = objectBody(req.body);
    const result = await academicService.connectCorrelativity({
      requiresSubjectId: String(positiveId(body.requiresSubjectId)), targetSubjectId: String(positiveId(body.targetSubjectId)),
      type: correlativityType(body.type),
    }, getActor(req));
    res.status(201).json({ status: "OK", ...result });
  },
  async updateCorrelativityType(req: Request, res: Response) {
    await academicService.updateCorrelativityType(positiveId(req.params.correlativityId), correlativityType(objectBody(req.body).type), getActor(req));
    res.json({ status: "OK" });
  },
  async removeCorrelativity(req: Request, res: Response) {
    await academicService.removeCorrelativity(positiveId(req.params.correlativityId), getActor(req));
    res.status(204).end();
  },
};
