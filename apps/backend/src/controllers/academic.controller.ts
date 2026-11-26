import type { Request, Response } from "express";
import { AppError } from "../lib/AppError.js";
import { academicService } from "../services/academic.service.js";

/** Id numérico de la URL; un valor no numérico responde 400 en vez de llegar a Prisma. */
function routeId(raw: string | string[] | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", "El identificador indicado no es válido");
  }
  return id;
}

function getActor(req: Request) {
  return {
    userId: req.user?.userId ?? 0,
    ipAddress: req.ip ?? null,
  };
}

export const academicController = {
  async snapshot(_req: Request, res: Response) {
    const data = await academicService.getSnapshot();
    res.status(200).json({ status: "OK", ...data });
  },

  async saveCareer(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const saved = await academicService.saveCareer(
      {
        ...(typeof body.id === "string" ? { id: body.id } : {}),
        code: String(body.code ?? ""),
        name: String(body.name ?? ""),
        studyPlan: String(body.studyPlan ?? ""),
        durationYears: Number(body.durationYears ?? 5),
        status: body.status === "inactive" ? "inactive" : "active",
        description: String(body.description ?? ""),
      },
      getActor(req),
    );
    res.status(body.id ? 200 : 201).json({ status: "OK", ...saved });
  },

  async toggleCareerStatus(req: Request, res: Response) {
    const result = await academicService.toggleCareerStatus(
      routeId(req.params.careerId),
      getActor(req),
    );
    // `result` ya trae su propio `status` (el estado resultante), por eso no se antepone "OK".
    res.status(200).json({ ...result });
  },

  async deleteCareer(req: Request, res: Response) {
    await academicService.deleteCareer(routeId(req.params.careerId), getActor(req));
    res.status(200).json({ status: "OK" });
  },

  async saveSubject(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawReqs = Array.isArray(body.requirements) ? body.requirements : [];
    const requirements = rawReqs.map((r) => {
      const item = (r ?? {}) as Record<string, unknown>;
      return {
        requiresSubjectId: String(item.requiresSubjectId ?? ""),
        type: (item.type as "regularizada_cursar" | "aprobada_cursar" | "aprobada_rendir") ?? "regularizada_cursar",
      };
    });

    const saved = await academicService.saveSubject(
      {
        ...(typeof body.id === "string" ? { id: body.id } : {}),
        careerId: String(body.careerId ?? ""),
        code: String(body.code ?? ""),
        name: String(body.name ?? ""),
        weeklyHours: Number(body.weeklyHours ?? 0),
        totalHours: Number(body.totalHours ?? 0),
        year: body.year === null || body.year === undefined ? null : Number(body.year),
        period:
          body.period === null || body.period === undefined
            ? null
            : body.period === "anual"
              ? "anual"
              : Number(body.period) === 2
                ? 2
                : 1,
        status: body.status === "inactive" ? "inactive" : "active",
        regularGrade: body.regularGrade === undefined ? 6 : Number(body.regularGrade),
        promotionGrade:
          body.promotionGrade === null || body.promotionGrade === undefined || body.promotionGrade === ""
            ? null
            : Number(body.promotionGrade),
        requirements,
      },
      getActor(req),
    );
    res.status(body.id ? 200 : 201).json({ status: "OK", ...saved });
  },

  async moveSubjectSlot(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    await academicService.moveSubjectSlot(
      routeId(req.params.studyPlanSubjectId),
      body.year === null || body.year === undefined ? null : Number(body.year),
      body.period === null || body.period === undefined
        ? null
        : body.period === "anual"
          ? "anual"
          : Number(body.period) === 2
            ? 2
            : 1,
      getActor(req),
    );
    res.status(200).json({ status: "OK" });
  },

  async toggleSubjectStatus(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const explicitStatus =
      body.status === "active" || body.status === "inactive" ? body.status : undefined;

    const result = explicitStatus
      ? await academicService.setSubjectStatus(
          routeId(req.params.studyPlanSubjectId),
          explicitStatus,
          getActor(req),
        )
      : await academicService.toggleSubjectStatus(
          routeId(req.params.studyPlanSubjectId),
          getActor(req),
        );

    // `result` ya trae su propio `status` (el estado resultante), por eso no se antepone "OK".
    res.status(200).json({ ...result });
  },

  async deleteSubject(req: Request, res: Response) {
    await academicService.deleteSubject(
      routeId(req.params.studyPlanSubjectId),
      getActor(req),
    );
    res.status(200).json({ status: "OK" });
  },

  async connectCorrelativity(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const created = await academicService.connectCorrelativity(
      {
        requiresSubjectId: String(body.requiresSubjectId ?? ""),
        targetSubjectId: String(body.targetSubjectId ?? ""),
        type:
          (body.type as "regularizada_cursar" | "aprobada_cursar" | "aprobada_rendir") ??
          "regularizada_cursar",
      },
      getActor(req),
    );
    res.status(201).json({ status: "OK", ...created });
  },

  async updateCorrelativityType(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    await academicService.updateCorrelativityType(
      routeId(req.params.correlativityId),
      (body.type as "regularizada_cursar" | "aprobada_cursar" | "aprobada_rendir") ??
        "regularizada_cursar",
      getActor(req),
    );
    res.status(200).json({ status: "OK" });
  },

  async removeCorrelativity(req: Request, res: Response) {
    await academicService.removeCorrelativity(
      routeId(req.params.correlativityId),
      getActor(req),
    );
    res.status(200).json({ status: "OK" });
  },
};
