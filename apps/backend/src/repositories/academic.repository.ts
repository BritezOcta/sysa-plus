import { UTN_SEED_CAREERS, UTN_SEED_CORRELATIVITIES, UTN_SEED_SUBJECTS } from "../data/utnAcademicSeed.js";
import { AppError } from "../lib/AppError.js";
import { prisma } from "../lib/prisma.js";

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

export const academicRepository = {
  async ensureInitialSeedIfEmpty() {
    const existingCount = await prisma.career.count();
    if (existingCount > 0) return;

    await prisma.$transaction(async (tx) => {
      const doubleCheck = await tx.career.count();
      if (doubleCheck > 0) return;

      const planIdByCareerKey = new Map<string, number>();

      for (const c of UTN_SEED_CAREERS) {
        const career = await tx.career.create({
          data: {
            careerCode: c.code,
            careerName: c.name,
            durationYears: c.durationYears,
            careerDescription: c.description,
            isActive: c.isActive,
          },
        });
        const plan = await tx.studyPlan.create({
          data: {
            careerId: career.careerId,
            resolution: c.studyPlan,
            isActive: true,
          },
        });
        planIdByCareerKey.set(c.key, plan.studyPlanId);
      }

      const spsIdBySubjectKey = new Map<string, number>();

      for (const s of UTN_SEED_SUBJECTS) {
        const planId = planIdByCareerKey.get(s.careerKey);
        if (!planId) continue;

        const subject = await tx.subject.upsert({
          where: { subjectCode: s.code },
          update: { subjectName: s.name },
          create: { subjectCode: s.code, subjectName: s.name },
        });

        const sps = await tx.studyPlanSubject.create({
          data: {
            studyPlanId: planId,
            subjectId: subject.subjectId,
            subjectYear: s.year,
            semester: s.semester,
            weeklyHours: s.weeklyHours,
            totalHours: s.totalHours,
            isActive: s.isActive,
          },
        });
        spsIdBySubjectKey.set(s.key, sps.studyPlanSubjectId);
      }

      for (const corr of UTN_SEED_CORRELATIVITIES) {
        const requiredId = spsIdBySubjectKey.get(corr.requiresKey);
        const targetId = spsIdBySubjectKey.get(corr.targetKey);
        if (!requiredId || !targetId) continue;

        await tx.subjectCorrelativity.create({
          data: {
            targetSubjectId: targetId,
            requiredSubjectId: requiredId,
            correlativityType: corr.type,
          },
        });
      }
    });
  },

  countCareers() {
    return prisma.career.count();
  },

  listCareersWithMeta() {
    return prisma.career.findMany({
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
    return prisma.career.findUnique({
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
    return prisma.career.findUnique({ where: { careerCode } });
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
      return await prisma.$transaction(async (tx) => {
        const career = await tx.career.create({
          data: {
            careerCode: data.careerCode,
            careerName: data.careerName,
            durationYears: data.durationYears,
            careerDescription: data.careerDescription,
            isActive: data.isActive,
          },
        });

        const plan = await tx.studyPlan.create({
          data: {
            careerId: career.careerId,
            resolution: data.resolution,
            isActive: true,
          },
        });

        return { career, plan };
      });
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
      return await prisma.$transaction(async (tx) => {
        const career = await tx.career.update({
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
          const activePlan = await tx.studyPlan.findFirst({
            where: { careerId, isActive: true },
            orderBy: { studyPlanId: "desc" },
          });
          if (activePlan) {
            await tx.studyPlan.update({
              where: { studyPlanId: activePlan.studyPlanId },
              data: { resolution: data.resolution },
            });
          } else {
            await tx.studyPlan.create({
              data: {
                careerId,
                resolution: data.resolution,
                isActive: true,
              },
            });
          }
        }

        return career;
      });
    } catch (err) {
      mapDbError(err, `carrera ${data.careerCode}`);
    }
  },

  async deleteCareerCascadePlan(careerId: number) {
    try {
      await prisma.$transaction(async (tx) => {
        const plans = await tx.studyPlan.findMany({
          where: { careerId },
          select: { studyPlanId: true },
        });
        const planIds = plans.map((p) => p.studyPlanId);

        if (planIds.length > 0) {
          const spsList = await tx.studyPlanSubject.findMany({
            where: { studyPlanId: { in: planIds } },
            select: { studyPlanSubjectId: true },
          });
          const spsIds = spsList.map((s) => s.studyPlanSubjectId);

          if (spsIds.length > 0) {
            await tx.subjectCorrelativity.deleteMany({
              where: {
                OR: [
                  { targetSubjectId: { in: spsIds } },
                  { requiredSubjectId: { in: spsIds } },
                ],
              },
            });
            await tx.studyPlanSubject.deleteMany({
              where: { studyPlanSubjectId: { in: spsIds } },
            });
          }

          await tx.studyPlan.deleteMany({
            where: { studyPlanId: { in: planIds } },
          });
        }

        await tx.career.delete({ where: { careerId } });
      });
    } catch (err) {
      mapDbError(err, `baja de carrera #${careerId}`);
    }
  },

  async ensureActiveStudyPlanId(careerId: number, fallbackResolution: string): Promise<number> {
    const existing = await prisma.studyPlan.findFirst({
      where: { careerId, isActive: true },
      orderBy: { studyPlanId: "desc" },
    });
    if (existing) return existing.studyPlanId;

    const created = await prisma.studyPlan.create({
      data: { careerId, resolution: fallbackResolution, isActive: true },
    });
    return created.studyPlanId;
  },

  findStudyPlanSubjectById(studyPlanSubjectId: number) {
    return prisma.studyPlanSubject.findUnique({
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
    return prisma.studyPlanSubject.count({
      where: { studyPlanId, studyPlanSubjectId: { in: studyPlanSubjectIds } },
    });
  },

  async findMaxSubjectYearForCareer(careerId: number): Promise<number | null> {
    const result = await prisma.studyPlanSubject.aggregate({
      where: { studyPlan: { careerId, isActive: true } },
      _max: { subjectYear: true },
    });
    return result._max.subjectYear ?? null;
  },

  listPlanCorrelativityEdgesExcludingTarget(studyPlanId: number, excludedTargetId?: number) {
    return prisma.subjectCorrelativity.findMany({
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
    requirements: Array<{ requiresSubjectId: number; type: string }>;
  }): Promise<number> {
    try {
      return await prisma.$transaction(async (tx) => {
        let currentSpsId: number;

        if (params.studyPlanSubjectId !== undefined) {
          currentSpsId = params.studyPlanSubjectId;
          const existingSps = await tx.studyPlanSubject.findUnique({
            where: { studyPlanSubjectId: currentSpsId },
            select: { subjectId: true },
          });
          if (!existingSps) {
            throw new AppError(404, "SUBJECT_NOT_FOUND", "La materia del plan no existe");
          }

          const codeOwner = await tx.subject.findUnique({
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

          await tx.subject.update({
            where: { subjectId: existingSps.subjectId },
            data: { subjectCode: params.code, subjectName: params.name },
          });

          await tx.studyPlanSubject.update({
            where: { studyPlanSubjectId: currentSpsId },
            data: {
              studyPlanId: params.planId,
              subjectYear: params.year,
              semester: params.semester,
              weeklyHours: params.weeklyHours,
              totalHours: params.totalHours,
              isActive: params.isActive,
            },
          });
        } else {
          let subjectRecord = await tx.subject.findUnique({
            where: { subjectCode: params.code },
          });

          if (subjectRecord) {
            const duplicateInPlan = await tx.studyPlanSubject.findUnique({
              where: {
                studyPlanId_subjectId: {
                  studyPlanId: params.planId,
                  subjectId: subjectRecord.subjectId,
                },
              },
            });
            if (duplicateInPlan) {
              throw new AppError(
                409,
                "DUPLICATE_SUBJECT_CODE",
                `La materia con código ${params.code} ya se encuentra cargada en este plan de estudios`,
              );
            }
          } else {
            subjectRecord = await tx.subject.create({
              data: { subjectCode: params.code, subjectName: params.name },
            });
          }

          const createdSps = await tx.studyPlanSubject.create({
            data: {
              studyPlanId: params.planId,
              subjectId: subjectRecord.subjectId,
              subjectYear: params.year,
              semester: params.semester,
              weeklyHours: params.weeklyHours,
              totalHours: params.totalHours,
              isActive: params.isActive,
            },
          });
          currentSpsId = createdSps.studyPlanSubjectId;
        }

        await tx.subjectCorrelativity.deleteMany({
          where: { targetSubjectId: currentSpsId },
        });

        if (params.requirements.length > 0) {
          await tx.subjectCorrelativity.createMany({
            data: params.requirements.map((req) => ({
              targetSubjectId: currentSpsId,
              requiredSubjectId: req.requiresSubjectId,
              correlativityType: req.type,
            })),
          });
        }

        return currentSpsId;
      });
    } catch (err) {
      mapDbError(err, `materia ${params.code}`);
    }
  },

  updateStudyPlanSubjectSlot(studyPlanSubjectId: number, year: number | null, semester: number | null) {
    return prisma.studyPlanSubject.update({
      where: { studyPlanSubjectId },
      data: { subjectYear: year, semester },
    });
  },

  updateStudyPlanSubjectStatus(studyPlanSubjectId: number, isActive: boolean) {
    return prisma.studyPlanSubject.update({
      where: { studyPlanSubjectId },
      data: { isActive },
    });
  },

  async deleteStudyPlanSubjectCascadeCorrelativities(studyPlanSubjectId: number) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.subjectCorrelativity.deleteMany({
          where: {
            OR: [
              { targetSubjectId: studyPlanSubjectId },
              { requiredSubjectId: studyPlanSubjectId },
            ],
          },
        });
        await tx.studyPlanSubject.delete({
          where: { studyPlanSubjectId },
        });
      });
    } catch (err) {
      mapDbError(err, `baja de materia #${studyPlanSubjectId}`);
    }
  },

  findCorrelativityByPair(targetSubjectId: number, requiredSubjectId: number) {
    return prisma.subjectCorrelativity.findFirst({
      where: { targetSubjectId, requiredSubjectId },
    });
  },

  findCorrelativityById(correlativityId: number) {
    return prisma.subjectCorrelativity.findUnique({
      where: { correlativityId },
    });
  },

  createCorrelativity(data: {
    targetSubjectId: number;
    requiredSubjectId: number;
    correlativityType: string;
  }) {
    return prisma.subjectCorrelativity.create({ data });
  },

  updateCorrelativityType(correlativityId: number, correlativityType: string) {
    return prisma.subjectCorrelativity.update({
      where: { correlativityId },
      data: { correlativityType },
    });
  },

  deleteCorrelativity(correlativityId: number) {
    return prisma.subjectCorrelativity.delete({
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
    return prisma.auditLog.create({
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
    return prisma.auditLog.findMany({
      where: {
        entity: { in: ["CARRERA", "MATERIA", "CORRELATIVIDAD"] },
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
};
