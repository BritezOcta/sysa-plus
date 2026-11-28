import { apiRequest } from "./httpClient";

export type ReportType =
  | "RENDIMIENTO"
  | "ASISTENCIA"
  | "INSCRIPCIONES"
  | "DESERCION";

export interface FilterOption {
  id: string;
  label: string;
}

export interface ReportFilterOptions {
  careers: FilterOption[];
  subjects: FilterOption[];
  periods: FilterOption[];
}

export interface ReportRow {
  offeringId: string;
  careerName: string;
  subjectCode: string;
  subjectName: string;
  commission: string;
  period: string;
  capacity: number;
  totalInscriptos: number;
  activos: number;
  aprobados: number;
  regulares: number;
  desaprobados: number;
  libres: number;
  canceladas: number;
  tasaAprobacion: number;
  promedioAsistencia: number;
  tasaDesercion: number;
}

export interface AcademicReportResponse {
  reportType: ReportType;
  generatedAt: string;
  summary: {
    totalCommissions: number;
    totalInscriptos: number;
    avgAprobacion: number;
    avgAsistencia: number;
    avgDesercion: number;
  };
  rows: ReportRow[];
}

export const adminReportsApi = {
  getFilters(): Promise<ReportFilterOptions> {
    return apiRequest<ReportFilterOptions>("/admin/reports/filters");
  },

  generateReport(params: {
    type: ReportType;
    careerId?: string;
    subjectId?: string;
    periodId?: string;
    /** "AAAA-MM-DD" */
    dateFrom?: string;
    dateTo?: string;
  }): Promise<AcademicReportResponse> {
    const query = new URLSearchParams({ type: params.type });
    if (params.careerId) query.set("careerId", params.careerId);
    if (params.subjectId) query.set("subjectId", params.subjectId);
    if (params.periodId) query.set("periodId", params.periodId);
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);

    return apiRequest<AcademicReportResponse>(
      `/admin/reports?${query.toString()}`,
    );
  },
};
