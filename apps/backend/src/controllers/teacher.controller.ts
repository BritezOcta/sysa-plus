import type { Request, Response } from "express";
import { teacherService } from "../services/teacher.service.js";

// requireAuth y requireRole(ROLES.PROFESOR) garantizan req.user en todas estas rutas.

export const teacherController = {
  async commissions(req: Request, res: Response) {
    const commissions = await teacherService.getMyCommissions(req.user!);
    res.status(200).json({ status: "OK", commissions });
  },

  async getAttendance(req: Request, res: Response) {
    const data = await teacherService.getAttendanceForDate(
      req.user!,
      req.params["commissionId"],
      req.query["date"],
    );
    res.status(200).json({ status: "OK", ...data });
  },

  async saveAttendance(req: Request, res: Response) {
    const body: Record<string, unknown> = req.body ?? {};
    const result = await teacherService.saveAttendance({
      user: req.user!,
      ipAddress: req.ip ?? null,
      rawCommissionId: req.params["commissionId"],
      date: body["date"],
      topic: body["topic"],
      allowOverwrite: body["allowOverwrite"],
      records: body["records"],
    });
    res.status(200).json({ status: "OK", ...result });
  },

  async getStudents(req: Request, res: Response) {
    const data = await teacherService.getCommissionStudents(
      req.user!,
      req.params["commissionId"],
    );
    res.status(200).json({ status: "OK", ...data });
  },

  async addObservation(req: Request, res: Response) {
    const body: Record<string, unknown> = req.body ?? {};
    const observation = await teacherService.addStudentObservation({
      user: req.user!,
      ipAddress: req.ip ?? null,
      rawCommissionId: req.params["commissionId"],
      rawEnrollmentId: req.params["enrollmentId"],
      text: body["text"],
    });
    res.status(201).json({ status: "OK", observation });
  },

  async getGrades(req: Request, res: Response) {
    const data = await teacherService.getCommissionGrades(
      req.user!,
      req.params["commissionId"],
    );
    res.status(200).json({ status: "OK", ...data });
  },

  async createAssessment(req: Request, res: Response) {
    const body: Record<string, unknown> = req.body ?? {};
    const assessment = await teacherService.createAssessment({
      user: req.user!,
      ipAddress: req.ip ?? null,
      rawCommissionId: req.params["commissionId"],
      name: body["name"],
      type: body["type"],
      date: body["date"],
      maxScore: body["maxScore"],
    });
    res.status(201).json({ status: "OK", assessment });
  },

  async saveGrades(req: Request, res: Response) {
    const body: Record<string, unknown> = req.body ?? {};
    const result = await teacherService.saveAssessmentGrades({
      user: req.user!,
      ipAddress: req.ip ?? null,
      rawCommissionId: req.params["commissionId"],
      rawAssessmentId: req.params["assessmentId"],
      grades: body["grades"],
    });
    res.status(200).json({ status: "OK", ...result });
  },

  async closeAssessment(req: Request, res: Response) {
    const result = await teacherService.closeAssessment({
      user: req.user!,
      ipAddress: req.ip ?? null,
      rawCommissionId: req.params["commissionId"],
      rawAssessmentId: req.params["assessmentId"],
    });
    res.status(200).json({ status: "OK", ...result });
  },
};
