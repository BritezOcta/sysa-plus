import { Router, type Request, type Response } from "express";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { adminCalendarService as svc, type Actor } from "../services/adminCalendar.service.js";
import { ROLES } from "../types/auth.js";

/** Administrador/Director: cuatrimestres, comisiones, turnos y mesas de examen con sus ventanas de inscripción. */
export const adminCalendarRouter = Router();

adminCalendarRouter.use(requireAuth, requireRole(ROLES.ADMINISTRADOR));

const actor = (req: Request): Actor => ({ userId: req.user!.userId, ipAddress: req.ip ?? null });
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;
const ok = (res: Response, data: object = {}, status = 200) => res.status(status).json({ status: "OK", ...data });

adminCalendarRouter.get("/options", async (_req, res) => ok(res, await svc.getOptions()));
adminCalendarRouter.get("/careers/:careerId/subjects", async (req, res) => ok(res, await svc.getCareerSubjects(req.params["careerId"])));

adminCalendarRouter.get("/periods", async (_req, res) => ok(res, await svc.listPeriods()));
adminCalendarRouter.post("/periods", async (req, res) => ok(res, await svc.savePeriod(undefined, body(req), actor(req)), 201));
adminCalendarRouter.put("/periods/:id", async (req, res) => ok(res, await svc.savePeriod(req.params["id"], body(req), actor(req))));
adminCalendarRouter.get("/periods/:id/commissions", async (req, res) => ok(res, await svc.listCommissions(req.params["id"], req.query["careerId"])));

adminCalendarRouter.post("/commissions", async (req, res) => ok(res, await svc.createCommission(body(req), actor(req)), 201));
adminCalendarRouter.put("/commissions/:id", async (req, res) => ok(res, await svc.updateCommission(req.params["id"], body(req), actor(req))));
adminCalendarRouter.delete("/commissions/:id", async (req, res) => {
  await svc.deleteCommission(req.params["id"], actor(req));
  ok(res);
});

adminCalendarRouter.get("/exam-sessions", async (_req, res) => ok(res, await svc.listExamSessions()));
adminCalendarRouter.post("/exam-sessions", async (req, res) => ok(res, await svc.saveExamSession(undefined, body(req), actor(req)), 201));
adminCalendarRouter.put("/exam-sessions/:id", async (req, res) => ok(res, await svc.saveExamSession(req.params["id"], body(req), actor(req))));
adminCalendarRouter.get("/exam-sessions/:id/calls", async (req, res) => ok(res, await svc.listExamCalls(req.params["id"], req.query["careerId"])));

adminCalendarRouter.post("/exam-calls", async (req, res) => ok(res, await svc.saveExamCall(undefined, body(req), actor(req)), 201));
adminCalendarRouter.put("/exam-calls/:id", async (req, res) => ok(res, await svc.saveExamCall(req.params["id"], body(req), actor(req))));
adminCalendarRouter.delete("/exam-calls/:id", async (req, res) => {
  await svc.deleteExamCall(req.params["id"], actor(req));
  ok(res);
});
