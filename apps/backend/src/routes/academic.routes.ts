import { Router } from "express";
import { academicController } from "../controllers/academic.controller.js";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";

export const academicRouter = Router();

academicRouter.use(requireAuth, requireRole("ADMINISTRADOR"));

academicRouter.get("/snapshot", academicController.snapshot);

academicRouter.post("/careers", academicController.saveCareer);
academicRouter.put("/careers/:careerId", academicController.saveCareer);
academicRouter.patch("/careers/:careerId/status", academicController.toggleCareerStatus);
academicRouter.delete("/careers/:careerId", academicController.deleteCareer);

academicRouter.post("/subjects", academicController.saveSubject);
academicRouter.put("/subjects/:studyPlanSubjectId", academicController.saveSubject);
academicRouter.patch("/subjects/:studyPlanSubjectId/slot", academicController.moveSubjectSlot);
academicRouter.patch("/subjects/:studyPlanSubjectId/status", academicController.toggleSubjectStatus);
academicRouter.delete("/subjects/:studyPlanSubjectId", academicController.deleteSubject);

academicRouter.post("/correlativities", academicController.connectCorrelativity);
academicRouter.patch("/correlativities/:correlativityId/type", academicController.updateCorrelativityType);
academicRouter.delete("/correlativities/:correlativityId", academicController.removeCorrelativity);
