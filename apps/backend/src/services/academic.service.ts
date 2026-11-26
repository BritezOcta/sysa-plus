import { AppError } from "../lib/AppError.js";
import { academicRepository } from "../repositories/academic.repository.js";

type UiCorrelativityType =
  | "regularizada_cursar"
  | "aprobada_cursar"
  | "aprobada_rendir";

type UiPeriod = 1 | 2 | "anual" | null;

function mapSemesterToPeriod(semester: number | null): UiPeriod {
  if (semester === null || semester === undefined) return null;
  if (semester === 0) return "anual";
  if (semester === 1 || semester === 2) return semester;
  return 1;
}

function mapPeriodToSemester(period: UiPeriod): number | null {
  if (period === null || period === undefined) return null;
  if (period === "anual") return 0;
  return period;
}

const CORRELATIVITY_TYPES: readonly UiCorrelativityType[] = [
  "regularizada_cursar",
  "aprobada_cursar",
  "aprobada_rendir",
];

const MAX_CAREER_DURATION_YEARS = 10;

function validationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(400, "VALIDATION_ERROR", message, details);
}

/** Convierte un id de ruta/body a entero positivo o lanza 400. */
function parseId(raw: unknown, label: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw validationError(`El identificador de ${label} no es válido`);
  }
  return id;
}

function assertCorrelativityType(type: unknown): asserts type is UiCorrelativityType {
  if (!CORRELATIVITY_TYPES.includes(type as UiCorrelativityType)) {
    throw validationError("El tipo de correlatividad no es válido", {
      allowedTypes: CORRELATIVITY_TYPES,
    });
  }
}

function assertNonNegativeInt(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw validationError(`${label} debe ser un número entero mayor o igual a 0`);
  }
}

/**
 * RF-02 2.3: la materia debe ubicarse en un año/cuatrimestre válido del plan.
 * `year = null` deja la materia en el banco sin ubicar (borrador del plan).
 */
function assertValidSlot(year: number | null, period: UiPeriod, durationYears: number) {
  if (year === null) return;
  if (!Number.isInteger(year) || year < 1 || year > durationYears) {
    throw validationError(
      `El año de la materia debe estar entre 1 y ${durationYears} (duración de la carrera)`,
    );
  }
  if (period === null) {
    throw validationError("Indicá el cuatrimestre (1°, 2° o anual) de la materia");
  }
}

function detectCycleBfs(
  edges: Array<{ targetId: number; requiredId: number }>,
  targetSubjectId: number,
  requiresSubjectId: number,
): { hasCycle: boolean; cyclePath: number[] } {
  if (targetSubjectId === requiresSubjectId) {
    return { hasCycle: true, cyclePath: [targetSubjectId, requiresSubjectId] };
  }

  const adj = new Map<number, number[]>();
  for (const edge of edges) {
    const list = adj.get(edge.requiredId) ?? [];
    if (!list.includes(edge.targetId)) list.push(edge.targetId);
    adj.set(edge.requiredId, list);
  }

  const visited = new Set<number>([targetSubjectId]);
  const parent = new Map<number, number>();
  const queue: number[] = [targetSubjectId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === requiresSubjectId) {
      const path: number[] = [requiresSubjectId];
      let step: number | undefined = requiresSubjectId;
      while (step !== undefined && step !== targetSubjectId) {
        step = parent.get(step);
        if (step !== undefined) path.unshift(step);
      }
      path.push(targetSubjectId);
      return { hasCycle: true, cyclePath: path };
    }

    for (const next of adj.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        parent.set(next, current);
        queue.push(next);
      }
    }
  }

  return { hasCycle: false, cyclePath: [] };
}

export const academicService = {
  async getSnapshot() {
    await academicRepository.ensureInitialSeedIfEmpty();

    const [careersRaw, auditRaw] = await Promise.all([
      academicRepository.listCareersWithMeta(),
      academicRepository.listAcademicAuditLogs(100),
    ]);

    const careers: Array<{
      id: string;
      code: string;
      name: string;
      studyPlan: string;
      durationYears: number;
      status: "active" | "inactive";
      description: string;
      updatedAt: string;
    }> = [];

    const subjects: Array<{
      id: string;
      careerId: string;
      code: string;
      name: string;
      weeklyHours: number;
      totalHours: number;
      year: number | null;
      period: UiPeriod;
      status: "active" | "inactive";
      enrolledStudents: number;
    }> = [];

    const correlativities: Array<{
      id: string;
      careerId: string;
      subjectId: string;
      requiresSubjectId: string;
      type: UiCorrelativityType;
      createdAt: string;
    }> = [];

    for (const c of careersRaw) {
      const activePlan = c.studyPlans[0];
      careers.push({
        id: String(c.careerId),
        code: c.careerCode,
        name: c.careerName,
        studyPlan: activePlan?.resolution ?? `Plan ${c.careerCode}`,
        durationYears: c.durationYears,
        status: c.isActive ? "active" : "inactive",
        description: c.careerDescription ?? "",
        updatedAt: c.updatedAt.toISOString(),
      });

      if (activePlan) {
        for (const sps of activePlan.studyPlanSubjects) {
          const enrolledCount = sps.courseOfferings.reduce(
            (acc, co) => acc + co._count.courseEnrollments,
            0,
          );

          subjects.push({
            id: String(sps.studyPlanSubjectId),
            careerId: String(c.careerId),
            code: sps.subject.subjectCode,
            name: sps.subject.subjectName,
            weeklyHours: sps.weeklyHours ?? 0,
            totalHours: sps.totalHours ?? 0,
            year: sps.subjectYear,
            period: mapSemesterToPeriod(sps.semester),
            status: sps.isActive ? "active" : "inactive",
            enrolledStudents: enrolledCount,
          });

          for (const req of sps.requirements) {
            correlativities.push({
              id: String(req.correlativityId),
              careerId: String(c.careerId),
              subjectId: String(req.targetSubjectId),
              requiresSubjectId: String(req.requiredSubjectId),
              type: req.correlativityType as UiCorrelativityType,
              createdAt: req.createdAt.toISOString(),
            });
          }
        }
      }
    }

    const auditLogs = auditRaw.map((log) => ({
      id: String(log.auditLogId),
      timestamp: log.createdAt.toISOString(),
      user: log.user ? `${log.user.firstName} ${log.user.lastName}` : "Sistema",
      role: log.user?.role ?? "ADMINISTRADOR",
      actionType: log.action,
      entity: log.entity ?? "CARRERA",
      summary: `${log.action} · ${log.entity ?? "ENTIDAD"}`,
      details: log.details ?? "",
    }));

    return { careers, subjects, correlativities, auditLogs };
  },

  async saveCareer(
    input: {
      id?: string;
      code: string;
      name: string;
      studyPlan: string;
      durationYears: number;
      status: "active" | "inactive";
      description: string;
    },
    actor: { userId: number; ipAddress: string | null },
  ) {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    const studyPlan = input.studyPlan.trim() || `Plan ${code}`;
    const description = input.description.trim() || null;

    if (!code || !name) {
      throw validationError("Código y nombre de carrera son obligatorios");
    }
    if (
      !Number.isInteger(input.durationYears) ||
      input.durationYears < 1 ||
      input.durationYears > MAX_CAREER_DURATION_YEARS
    ) {
      throw validationError(
        `La duración de la carrera debe ser un entero entre 1 y ${MAX_CAREER_DURATION_YEARS} años`,
      );
    }

    const existingCode = await academicRepository.findCareerByCode(code);

    if (input.id) {
      const careerId = parseId(input.id, "carrera");
      const current = await academicRepository.findCareerById(careerId);
      if (!current) {
        throw new AppError(404, "CAREER_NOT_FOUND", "La carrera indicada no existe");
      }
      if (existingCode && existingCode.careerId !== careerId) {
        throw new AppError(409, "DUPLICATE_CAREER_CODE", `Ya existe una carrera con el código ${code}`);
      }

      const maxSubjectYear = await academicRepository.findMaxSubjectYearForCareer(careerId);
      if (maxSubjectYear !== null && maxSubjectYear > input.durationYears) {
        throw validationError(
          `No se puede reducir la duración a ${input.durationYears} años: hay materias ubicadas en ${maxSubjectYear}° año`,
        );
      }

      const updated = await academicRepository.updateCareerAndPlan(careerId, {
        careerCode: code,
        careerName: name,
        durationYears: input.durationYears,
        careerDescription: description,
        isActive: input.status === "active",
        resolution: studyPlan,
      });

      await academicRepository.createAuditLog({
        userId: actor.userId,
        action: "EDICION",
        entity: "CARRERA",
        entityId: String(updated.careerId),
        details: `Editó carrera ${code} (${name}) · Plan: ${studyPlan} · Duración: ${input.durationYears} años`,
        ipAddress: actor.ipAddress,
      });

      return { id: String(updated.careerId) };
    }

    if (existingCode) {
      throw new AppError(409, "DUPLICATE_CAREER_CODE", `Ya existe una carrera con el código ${code}`);
    }

    const created = await academicRepository.createCareerWithDefaultPlan({
      careerCode: code,
      careerName: name,
      durationYears: input.durationYears,
      careerDescription: description,
      isActive: input.status === "active",
      resolution: studyPlan,
    });

    await academicRepository.createAuditLog({
      userId: actor.userId,
      action: "ALTA",
      entity: "CARRERA",
      entityId: String(created.career.careerId),
      details: `Alta de carrera ${code} (${name}) · Plan: ${studyPlan} · Duración: ${input.durationYears} años`,
      ipAddress: actor.ipAddress,
    });

    return { id: String(created.career.careerId) };
  },

  async toggleCareerStatus(
    careerId: number,
    actor: { userId: number; ipAddress: string | null },
  ) {
    const career = await academicRepository.findCareerById(careerId);
    if (!career) {
      throw new AppError(404, "CAREER_NOT_FOUND", "La carrera no existe");
    }

    const nextActive = !career.isActive;
    await academicRepository.updateCareerAndPlan(careerId, {
      careerCode: career.careerCode,
      careerName: career.careerName,
      durationYears: career.durationYears,
      careerDescription: career.careerDescription,
      isActive: nextActive,
    });

    await academicRepository.createAuditLog({
      userId: actor.userId,
      action: nextActive ? "EDICION" : "INACTIVACION",
      entity: "CARRERA",
      entityId: String(careerId),
      details: `${nextActive ? "Reactivó" : "Inactivó"} la carrera ${career.careerCode} (${career.careerName})`,
      ipAddress: actor.ipAddress,
    });

    return { status: nextActive ? "active" : "inactive" };
  },

  async deleteCareer(
    careerId: number,
    actor: { userId: number; ipAddress: string | null },
  ) {
    const career = await academicRepository.findCareerById(careerId);
    if (!career) {
      throw new AppError(404, "CAREER_NOT_FOUND", "La carrera no existe");
    }

    const totalCareers = await academicRepository.countCareers();
    if (totalCareers <= 1) {
      throw new AppError(409, "MIN_CAREERS_REACHED", "Debe existir al menos una carrera en el sistema");
    }

    const activeEnrollments = career.studentCareers.reduce(
      (sum, sc) => sum + sc._count.courseEnrollments + sc._count.examEnrollments,
      0,
    );
    if (activeEnrollments > 0 || career.studentCareers.length > 0) {
      throw new AppError(
        409,
        "CAREER_HAS_STUDENTS",
        `La carrera ${career.careerCode} tiene alumnos o inscripciones asociadas; se sugiere inactivarla`,
        { activeEnrollments, studentCareersCount: career.studentCareers.length },
      );
    }

    await academicRepository.deleteCareerCascadePlan(careerId);

    await academicRepository.createAuditLog({
      userId: actor.userId,
      action: "BAJA",
      entity: "CARRERA",
      entityId: String(careerId),
      details: `Baja definitiva de carrera ${career.careerCode} (${career.careerName})`,
      ipAddress: actor.ipAddress,
    });
  },

  async saveSubject(
    input: {
      id?: string;
      careerId: string;
      code: string;
      name: string;
      weeklyHours: number;
      totalHours: number;
      year: number | null;
      period: UiPeriod;
      status: "active" | "inactive";
      requirements: Array<{ requiresSubjectId: string; type: UiCorrelativityType }>;
    },
    actor: { userId: number; ipAddress: string | null },
  ) {
    const careerId = parseId(input.careerId, "carrera");
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    const semester = mapPeriodToSemester(input.period);

    if (!code || !name) {
      throw validationError("Código y nombre de la materia son obligatorios");
    }
    assertNonNegativeInt(input.weeklyHours, "La carga horaria semanal");
    assertNonNegativeInt(input.totalHours, "La carga horaria total");

    const career = await academicRepository.findCareerById(careerId);
    if (!career) {
      throw new AppError(404, "CAREER_NOT_FOUND", "La carrera asociada no existe");
    }
    assertValidSlot(input.year, input.period, career.durationYears);

    const planId = await academicRepository.ensureActiveStudyPlanId(
      careerId,
      `Plan ${career.careerCode}`,
    );

    const currentSpsId = input.id ? parseId(input.id, "materia") : undefined;
    if (currentSpsId !== undefined) {
      const current = await academicRepository.findStudyPlanSubjectById(currentSpsId);
      if (!current) {
        throw new AppError(404, "SUBJECT_NOT_FOUND", "La materia del plan no existe");
      }
      if (current.studyPlanId !== planId) {
        throw validationError("La materia no pertenece al plan de estudios de la carrera indicada");
      }
    }

    // Correlativas: tipo válido, sin duplicados, sin autorreferencia y del mismo plan.
    const seenRequirementIds = new Set<number>();
    for (const req of input.requirements) {
      assertCorrelativityType(req.type);
      const reqId = parseId(req.requiresSubjectId, "materia correlativa");
      if (reqId === currentSpsId) {
        throw validationError("Una materia no puede ser correlativa de sí misma");
      }
      if (seenRequirementIds.has(reqId)) {
        throw validationError("La misma materia correlativa figura más de una vez");
      }
      seenRequirementIds.add(reqId);
    }
    const planMatches = await academicRepository.countStudyPlanSubjectsInPlan(
      planId,
      [...seenRequirementIds],
    );
    if (planMatches !== seenRequirementIds.size) {
      throw validationError(
        "Todas las correlativas deben ser materias existentes del mismo plan de estudios",
      );
    }

    const rawEdges = await academicRepository.listPlanCorrelativityEdgesExcludingTarget(
      planId,
      currentSpsId,
    );

    const simulatedEdges: Array<{ targetId: number; requiredId: number }> = rawEdges.map((e) => ({
      targetId: e.targetSubjectId,
      requiredId: e.requiredSubjectId,
    }));

    const checkNodeId = currentSpsId ?? -1;
    for (const req of input.requirements) {
      const reqId = Number(req.requiresSubjectId);
      const check = detectCycleBfs(simulatedEdges, checkNodeId, reqId);
      if (check.hasCycle) {
        throw new AppError(
          409,
          "CIRCULAR_CORRELATIVITY",
          "Se detectó un ciclo en las correlatividades",
          { cycleIds: check.cyclePath.filter((id) => id > 0).map(String) },
        );
      }
      simulatedEdges.push({ targetId: checkNodeId, requiredId: reqId });
    }

    const savedId = await academicRepository.upsertStudyPlanSubjectWithCorrelativities({
      ...(currentSpsId !== undefined ? { studyPlanSubjectId: currentSpsId } : {}),
      planId,
      code,
      name,
      year: input.year,
      semester,
      weeklyHours: input.weeklyHours,
      totalHours: input.totalHours,
      isActive: input.status === "active",
      requirements: input.requirements.map((r) => ({
        requiresSubjectId: Number(r.requiresSubjectId),
        type: r.type,
      })),
    });

    await academicRepository.createAuditLog({
      userId: actor.userId,
      action: input.id ? "EDICION" : "ALTA",
      entity: "MATERIA",
      entityId: String(savedId),
      details: `${input.id ? "Editó" : "Alta de"} materia ${code} (${name}) con ${input.requirements.length} correlativa(s)`,
      ipAddress: actor.ipAddress,
    });

    return { id: String(savedId) };
  },

  async moveSubjectSlot(
    studyPlanSubjectId: number,
    year: number | null,
    period: UiPeriod,
    actor: { userId: number; ipAddress: string | null },
  ) {
    const sps = await academicRepository.findStudyPlanSubjectById(studyPlanSubjectId);
    if (!sps) {
      throw new AppError(404, "SUBJECT_NOT_FOUND", "La materia del plan no existe");
    }

    assertValidSlot(year, period, sps.studyPlan.career.durationYears);
    const semester = mapPeriodToSemester(period);
    await academicRepository.updateStudyPlanSubjectSlot(studyPlanSubjectId, year, semester);

    await academicRepository.createAuditLog({
      userId: actor.userId,
      action: "REUBICACION",
      entity: "MATERIA",
      entityId: String(studyPlanSubjectId),
      details: `Reubicó materia ${sps.subject.subjectCode} a año ${year ?? "sin asignar"} / período ${period ?? "sin asignar"}`,
      ipAddress: actor.ipAddress,
    });
  },

  async setSubjectStatus(
    studyPlanSubjectId: number,
    status: "active" | "inactive",
    actor: { userId: number; ipAddress: string | null },
  ) {
    const sps = await academicRepository.findStudyPlanSubjectById(studyPlanSubjectId);
    if (!sps) {
      throw new AppError(404, "SUBJECT_NOT_FOUND", "La materia del plan no existe");
    }

    const nextActive = status === "active";
    if (sps.isActive !== nextActive) {
      await academicRepository.updateStudyPlanSubjectStatus(studyPlanSubjectId, nextActive);
      await academicRepository.createAuditLog({
        userId: actor.userId,
        action: nextActive ? "EDICION" : "INACTIVACION",
        entity: "MATERIA",
        entityId: String(studyPlanSubjectId),
        details: `${nextActive ? "Reactivó" : "Inactivó"} materia ${sps.subject.subjectCode} (${sps.subject.subjectName})`,
        ipAddress: actor.ipAddress,
      });
    }

    return { status };
  },

  async toggleSubjectStatus(
    studyPlanSubjectId: number,
    actor: { userId: number; ipAddress: string | null },
  ) {
    const sps = await academicRepository.findStudyPlanSubjectById(studyPlanSubjectId);
    if (!sps) {
      throw new AppError(404, "SUBJECT_NOT_FOUND", "La materia del plan no existe");
    }
    return this.setSubjectStatus(studyPlanSubjectId, sps.isActive ? "inactive" : "active", actor);
  },

  async deleteSubject(
    studyPlanSubjectId: number,
    actor: { userId: number; ipAddress: string | null },
  ) {
    const sps = await academicRepository.findStudyPlanSubjectById(studyPlanSubjectId);
    if (!sps) {
      throw new AppError(404, "SUBJECT_NOT_FOUND", "La materia del plan no existe");
    }

    const enrolledStudents = sps.courseOfferings.reduce(
      (sum, co) => sum + co._count.courseEnrollments,
      0,
    );
    if (enrolledStudents > 0) {
      throw new AppError(
        409,
        "SUBJECT_HAS_ENROLLED_STUDENTS",
        `La materia ${sps.subject.subjectCode} tiene ${enrolledStudents} alumno(s) inscripto(s)`,
        { enrolledStudents },
      );
    }

    if (sps.courseOfferings.length > 0 || sps.examCalls.length > 0) {
      throw new AppError(
        409,
        "SUBJECT_HAS_OFFERINGS_OR_EXAMS",
        `No se puede eliminar ${sps.subject.subjectCode} porque ya tiene ${sps.courseOfferings.length} oferta(s) de cursada y ${sps.examCalls.length} llamado(s) de examen cargados. Podés inactivarla en su lugar.`,
        {
          courseOfferingsCount: sps.courseOfferings.length,
          examCallsCount: sps.examCalls.length,
        },
      );
    }

    await academicRepository.deleteStudyPlanSubjectCascadeCorrelativities(studyPlanSubjectId);

    await academicRepository.createAuditLog({
      userId: actor.userId,
      action: "BAJA",
      entity: "MATERIA",
      entityId: String(studyPlanSubjectId),
      details: `Baja de materia ${sps.subject.subjectCode} (${sps.subject.subjectName})`,
      ipAddress: actor.ipAddress,
    });
  },

  async connectCorrelativity(
    input: {
      requiresSubjectId: string;
      targetSubjectId: string;
      type: UiCorrelativityType;
    },
    actor: { userId: number; ipAddress: string | null },
  ) {
    assertCorrelativityType(input.type);
    const requiredId = parseId(input.requiresSubjectId, "materia correlativa");
    const targetId = parseId(input.targetSubjectId, "materia");

    const [reqSps, tgtSps] = await Promise.all([
      academicRepository.findStudyPlanSubjectById(requiredId),
      academicRepository.findStudyPlanSubjectById(targetId),
    ]);

    if (!reqSps || !tgtSps) {
      throw new AppError(404, "SUBJECT_NOT_FOUND", "Materia de correlatividad no encontrada");
    }

    if (reqSps.studyPlanId !== tgtSps.studyPlanId) {
      throw new AppError(
        400,
        "DIFFERENT_STUDY_PLAN",
        "Las materias correlativas deben pertenecer al mismo plan de estudios",
      );
    }

    const existing = await academicRepository.findCorrelativityByPair(targetId, requiredId);

    if (existing) {
      const updated = await academicRepository.updateCorrelativityType(
        existing.correlativityId,
        input.type,
      );

      await academicRepository.createAuditLog({
        userId: actor.userId,
        action: "CORRELATIVIDAD",
        entity: "CORRELATIVIDAD",
        entityId: String(updated.correlativityId),
        details: `Actualizó correlatividad ${reqSps.subject.subjectCode} -> ${tgtSps.subject.subjectCode} (${input.type})`,
        ipAddress: actor.ipAddress,
      });

      return { id: String(updated.correlativityId), createdAt: updated.createdAt.toISOString() };
    }

    const planEdges = await academicRepository.listPlanCorrelativityEdgesExcludingTarget(
      tgtSps.studyPlanId,
    );
    const cycle = detectCycleBfs(
      planEdges.map((e) => ({ targetId: e.targetSubjectId, requiredId: e.requiredSubjectId })),
      targetId,
      requiredId,
    );

    if (cycle.hasCycle) {
      throw new AppError(
        409,
        "CIRCULAR_CORRELATIVITY",
        `Ciclo detectado al vincular ${reqSps.subject.subjectCode} -> ${tgtSps.subject.subjectCode}`,
        { cycleIds: cycle.cyclePath.map(String) },
      );
    }

    const created = await academicRepository.createCorrelativity({
      targetSubjectId: targetId,
      requiredSubjectId: requiredId,
      correlativityType: input.type,
    });

    await academicRepository.createAuditLog({
      userId: actor.userId,
      action: "CORRELATIVIDAD",
      entity: "CORRELATIVIDAD",
      entityId: String(created.correlativityId),
      details: `Vinculó correlatividad ${reqSps.subject.subjectCode} -> ${tgtSps.subject.subjectCode} (${input.type})`,
      ipAddress: actor.ipAddress,
    });

    return { id: String(created.correlativityId), createdAt: created.createdAt.toISOString() };
  },

  async updateCorrelativityType(
    correlativityId: number,
    type: UiCorrelativityType,
    actor: { userId: number; ipAddress: string | null },
  ) {
    assertCorrelativityType(type);
    const corr = await academicRepository.findCorrelativityById(correlativityId);
    if (!corr) {
      throw new AppError(404, "CORRELATIVITY_NOT_FOUND", "La correlatividad no existe");
    }

    await academicRepository.updateCorrelativityType(correlativityId, type);

    await academicRepository.createAuditLog({
      userId: actor.userId,
      action: "CORRELATIVIDAD",
      entity: "CORRELATIVIDAD",
      entityId: String(correlativityId),
      details: `Cambió tipo de correlatividad #${correlativityId} a ${type}`,
      ipAddress: actor.ipAddress,
    });
  },

  async removeCorrelativity(
    correlativityId: number,
    actor: { userId: number; ipAddress: string | null },
  ) {
    const corr = await academicRepository.findCorrelativityById(correlativityId);
    if (!corr) {
      throw new AppError(404, "CORRELATIVITY_NOT_FOUND", "La correlatividad no existe");
    }

    await academicRepository.deleteCorrelativity(correlativityId);

    await academicRepository.createAuditLog({
      userId: actor.userId,
      action: "BAJA",
      entity: "CORRELATIVIDAD",
      entityId: String(correlativityId),
      details: `Eliminó correlatividad #${correlativityId}`,
      ipAddress: actor.ipAddress,
    });
  },
};
