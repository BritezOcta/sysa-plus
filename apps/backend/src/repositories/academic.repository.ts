import { AppError } from "../lib/AppError.js";
import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";

function mapDbError(err: unknown, context: string): never {
  if (err instanceof AppError) throw err;

  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";

  if (code === "P2002") {
    throw new AppError(
      409,
      "DUPLICATE_RECORD",
      `Ya existe un registro con el mismo código o clave única (${context})`,
    );
  }

  if (code === "P2003") {
    throw new AppError(
      409,
      "FOREIGN_KEY_CONSTRAINT",
      `No se puede completar la operación porque existen registros dependientes (${context})`,
    );
  }

  throw err;
}

/** Queries share the transaction supplied by the service. */
export const createAcademicRepository = (db: Prisma.TransactionClient) => ({
  countCareers() {
    return db.career.count();
  },

  listCareersWithMeta() {
    return db.career.findMany({
      orderBy: [{ isActive: "desc" }, { careerCode: "asc" }],
      include: {
        studyPlans: {
          where: { isActive: true },
          orderBy: { studyPlanId: "desc" },
          take: 1,
          include: {
            studyPlanSubjects: {
              include: {
                subject: true,
                requirements: true,
                requiredBy: true,
                courseOfferings: {
                  include: {
                    _count: { select: { courseEnrollments: true } },
                  },
                },
                examCalls: {
                  include: {
                    _count: { select: { examEnrollments: true } },
                  },
                },
              },
            },
          },
        },
        studentCareers: {
          select: {
            studentCareerId: true,
            academicStatus: true,
            _count: {
              select: {
                courseEnrollments: true,
                examEnrollments: true,
              },
            },
          },
        },
      },
    });
  },

  findCareerById(careerId: number) {
    return db.career.findUnique({
      where: { careerId },
      include: {
        studyPlans: {
          where: { isActive: true },
          orderBy: { studyPlanId: "desc" },
          take: 1,
        },
        studentCareers: {
          select: {
            studentCareerId: true,
            academicStatus: true,
            _count: {
              select: {
                courseEnrollments: true,
                examEnrollments: true,
              },
            },
          },
        },
      },
    });
  },

  findCareerByCode(careerCode: string) {
    return db.career.findUnique({ where: { careerCode } });
  },

  async createCareerWithDefaultPlan(data: {
    careerCode: string;
    careerName: string;
    durationYears: number;
    careerDescription: string | null;
    isActive: boolean;
    resolution: string;
  }) {
    try {
      const career = await db.career.create({
        data: {
          careerCode: data.careerCode,
          careerName: data.careerName,
          durationYears: data.durationYears,
          careerDescription: data.careerDescription,
          isActive: data.isActive,
        },
      });

      const plan = await db.studyPlan.create({
        data: {
          careerId: career.careerId,
          resolution: data.resolution,
          isActive: true,
        },
      });

      return { career, plan };
    } catch (err) {
      mapDbError(err, `carrera ${data.careerCode}`);
    }
  },

  async updateCareerAndPlan(
    careerId: number,
    data: {
      careerCode: string;
      careerName: string;
      durationYears: number;
      careerDescription: string | null;
      isActive?: boolean;
      resolution?: string;
    },
  ) {
    try {
      const career = await db.career.update({
        where: { careerId },
        data: {
          careerCode: data.careerCode,
          careerName: data.careerName,
          durationYears: data.durationYears,
          careerDescription: data.careerDescription,
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      if (data.resolution !== undefined) {
        const activePlan = await db.studyPlan.findFirst({
          where: { careerId, isActive: true },
          orderBy: { studyPlanId: "desc" },
        });
        if (activePlan) {
          await db.studyPlan.update({
            where: { studyPlanId: activePlan.studyPlanId },
            data: { resolution: data.resolution },
          });
        } else {
          await db.studyPlan.create({
            data: {
              careerId,
              resolution: data.resolution,
              isActive: true,
            },
          });
        }
      }

      return career;
    } catch (err) {
      mapDbError(err, `carrera ${data.careerCode}`);
    }
  },

  async deleteCareerCascadePlan(careerId: number) {
    try {
      const plans = await db.studyPlan.findMany({
        where: { careerId },
        select: { studyPlanId: true },
      });
      const planIds = plans.map((p) => p.studyPlanId);

      if (planIds.length > 0) {
        const spsList = await db.studyPlanSubject.findMany({
          where: { studyPlanId: { in: planIds } },
          select: { studyPlanSubjectId: true },
        });
        const spsIds = spsList.map((s) => s.studyPlanSubjectId);

        if (spsIds.length > 0) {
          await db.subjectCorrelativity.deleteMany({
            where: {
              OR: [
                { targetSubjectId: { in: spsIds } },
                { requiredSubjectId: { in: spsIds } },
              ],
            },
          });
          await db.studyPlanSubject.deleteMany({
            where: { studyPlanSubjectId: { in: spsIds } },
          });
        }

        await db.studyPlan.deleteMany({
          where: { studyPlanId: { in: planIds } },
        });
      }

      await db.career.delete({ where: { careerId } });
    } catch (err) {
      mapDbError(err, `baja de carrera #${careerId}`);
    }
  },

  async ensureActiveStudyPlanId(careerId: number, fallbackResolution: string): Promise<number> {
    const existing = await db.studyPlan.findFirst({
      where: { careerId, isActive: true },
      orderBy: { studyPlanId: "desc" },
    });
    if (existing) return existing.studyPlanId;

    const created = await db.studyPlan.create({
      data: { careerId, resolution: fallbackResolution, isActive: true },
    });
    return created.studyPlanId;
  },

  findStudyPlanSubjectById(studyPlanSubjectId: number) {
    return db.studyPlanSubject.findUnique({
      where: { studyPlanSubjectId },
      include: {
        subject: true,
        studyPlan: { include: { career: true } },
        courseOfferings: {
          include: { _count: { select: { courseEnrollments: true } } },
        },
        examCalls: {
          include: { _count: { select: { examEnrollments: true } } },
        },
      },
    });
  },

  countStudyPlanSubjectsInPlan(studyPlanId: number, studyPlanSubjectIds: number[]) {
    if (studyPlanSubjectIds.length === 0) return Promise.resolve(0);
    return db.studyPlanSubject.count({
      where: { studyPlanId, studyPlanSubjectId: { in: studyPlanSubjectIds } },
    });
  },

  async findMaxSubjectYearForCareer(careerId: number): Promise<number | null> {
    const result = await db.studyPlanSubject.aggregate({
      where: { studyPlan: { careerId, isActive: true } },
      _max: { subjectYear: true },
    });
    return result._max.subjectYear ?? null;
  },

  listPlanCorrelativityEdgesExcludingTarget(studyPlanId: number, excludedTargetId?: number) {
    return db.subjectCorrelativity.findMany({
      where: {
        targetSubject: { studyPlanId },
        ...(excludedTargetId !== undefined ? { NOT: { targetSubjectId: excludedTargetId } } : {}),
      },
      select: { targetSubjectId: true, requiredSubjectId: true },
    });
  },

  async upsertStudyPlanSubjectWithCorrelativities(params: {
    studyPlanSubjectId?: number;
    planId: number;
    code: string;
    name: string;
    year: number | null;
    semester: number | null;
    weeklyHours: number;
    totalHours: number;
    isActive: boolean;
    regularGrade: number;
    promotionGrade: number | null;
    requirements: Array<{ requiresSubjectId: number; type: string }>;
  }): Promise<number> {
    try {
      let currentSpsId: number;

      if (params.studyPlanSubjectId !== undefined) {
        currentSpsId = params.studyPlanSubjectId;
        const existingSps = await db.studyPlanSubject.findUnique({
          where: { studyPlanSubjectId: currentSpsId },
          select: { subjectId: true },
        });
        if (!existingSps) {
          throw new AppError(404, "SUBJECT_NOT_FOUND", "La materia del plan no existe");
        }

        const codeOwner = await db.subject.findUnique({
          where: { subjectCode: params.code },
          select: { subjectId: true },
        });
        if (codeOwner && codeOwner.subjectId !== existingSps.subjectId) {
          throw new AppError(
            409,
            "DUPLICATE_SUBJECT_CODE",
            `El código de materia ${params.code} ya pertenece a otra materia`,
          );
        }

        await db.subject.update({
          where: { subjectId: existingSps.subjectId },
          data: { subjectCode: params.code, subjectName: params.name },
        });

        await db.studyPlanSubject.update({
          where: { studyPlanSubjectId: currentSpsId },
          data: {
            studyPlanId: params.planId,
            subjectYear: params.year,
            semester: params.semester,
            weeklyHours: params.weeklyHours,
            totalHours: params.totalHours,
            isActive: params.isActive,
            regularGrade: params.regularGrade,
            promotionGrade: params.promotionGrade,
          },
        });
      } else {
        const subjectRecord = await db.subject.findUnique({
          where: { subjectCode: params.code },
          include: { _count: { select: { studyPlanSubjects: true } } },
        });

        if (subjectRecord && subjectRecord._count.studyPlanSubjects > 0) {
          throw new AppError(409, "DUPLICATE_SUBJECT_CODE", "El código de materia ya existe. Editá la materia existente o usá otro código.");
        }
        // A deleted plan subject may leave an unused catalog row. Reuse only
        // that orphan, never rename a subject still attached to another plan.
        const catalogSubject = subjectRecord
          ? await db.subject.update({
              where: { subjectId: subjectRecord.subjectId },
              data: { subjectName: params.name },
            })
          : await db.subject.create({
              data: { subjectCode: params.code, subjectName: params.name },
            });

        const createdSps = await db.studyPlanSubject.create({
          data: {
            studyPlanId: params.planId,
            subjectId: catalogSubject.subjectId,
            subjectYear: params.year,
            semester: params.semester,
            weeklyHours: params.weeklyHours,
            totalHours: params.totalHours,
            isActive: params.isActive,
            regularGrade: params.regularGrade,
            promotionGrade: params.promotionGrade,
          },
        });
        currentSpsId = createdSps.studyPlanSubjectId;
      }

      await db.subjectCorrelativity.deleteMany({
        where: { targetSubjectId: currentSpsId },
      });

      if (params.requirements.length > 0) {
        await db.subjectCorrelativity.createMany({
          data: params.requirements.map((req) => ({
            targetSubjectId: currentSpsId,
            requiredSubjectId: req.requiresSubjectId,
            correlativityType: req.type,
          })),
        });
      }

      return currentSpsId;
    } catch (err) {
      mapDbError(err, `materia ${params.code}`);
    }
  },

  updateStudyPlanSubjectSlot(studyPlanSubjectId: number, year: number | null, semester: number | null) {
    return db.studyPlanSubject.update({
      where: { studyPlanSubjectId },
      data: { subjectYear: year, semester },
    });
  },

  updateStudyPlanSubjectStatus(studyPlanSubjectId: number, isActive: boolean) {
    return db.studyPlanSubject.update({
      where: { studyPlanSubjectId },
      data: { isActive },
    });
  },

  async deleteStudyPlanSubjectCascadeCorrelativities(studyPlanSubjectId: number) {
    try {
      await db.subjectCorrelativity.deleteMany({
        where: {
          OR: [
            { targetSubjectId: studyPlanSubjectId },
            { requiredSubjectId: studyPlanSubjectId },
          ],
        },
      });
      await db.studyPlanSubject.delete({
        where: { studyPlanSubjectId },
      });
    } catch (err) {
      mapDbError(err, `baja de materia #${studyPlanSubjectId}`);
    }
  },

  findCorrelativityByPair(targetSubjectId: number, requiredSubjectId: number) {
    return db.subjectCorrelativity.findFirst({
      where: { targetSubjectId, requiredSubjectId },
    });
  },

  findCorrelativityById(correlativityId: number) {
    return db.subjectCorrelativity.findUnique({
      where: { correlativityId },
    });
  },

  createCorrelativity(data: {
    targetSubjectId: number;
    requiredSubjectId: number;
    correlativityType: string;
  }) {
    return db.subjectCorrelativity.create({ data });
  },

  updateCorrelativityType(correlativityId: number, correlativityType: string) {
    return db.subjectCorrelativity.update({
      where: { correlativityId },
      data: { correlativityType },
    });
  },

  deleteCorrelativity(correlativityId: number) {
    return db.subjectCorrelativity.delete({
      where: { correlativityId },
    });
  },

  createAuditLog(entry: {
    userId: number | null;
    action: string;
    entity: string;
    entityId: string;
    details: string;
    ipAddress: string | null;
  }) {
    return db.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        details: entry.details,
        ipAddress: entry.ipAddress,
      },
    });
  },

  listAcademicAuditLogs(limit = 100) {
    return db.auditLog.findMany({
      where: {
        entity: { in: ["CARRERA", "MATERIA", "CORRELATIVIDAD"] },
        // Old seed events have no actor; never display them as actual user activity.
        userId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  },
});

export type AcademicRepository = ReturnType<typeof createAcademicRepository>;
export const academicRepository = createAcademicRepository(prisma);

/** Validate, mutate and audit as one serializable unit, including concurrent graph edits. */
export async function runAcademicTransaction<T>(work: (repository: AcademicRepository) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(tx => work(createAcademicRepository(tx)), {
      isolationLevel: "Serializable",
      maxWait: 5000,
      timeout: 15000,
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2034") {
      throw new AppError(409, "CONCURRENT_UPDATE", "Otro usuario modificó estos datos. Recargá la oferta académica e intentá nuevamente.");
    }
    mapDbError(err, "gestión académica");
  }
}
