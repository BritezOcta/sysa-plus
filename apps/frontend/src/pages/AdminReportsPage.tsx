import { useEffect, useState } from "react";
import {
  adminReportsApi,
  type AcademicReportResponse,
  type ReportFilterOptions,
  type ReportType,
} from "../api/adminReports.api";
import {
  exportReportToExcel,
  exportReportToPdf,
  type ReportExportMeta,
} from "../helpers/ReportExportHelper";
import common from "../features/student/common.module.css";
import s from "./AdminReportsPage.module.css";

const REPORT_LABELS: Record<ReportType, string> = {
  RENDIMIENTO: "Rendimiento Académico (Aprobación)",
  ASISTENCIA: "Asistencia Promedio",
  INSCRIPCIONES: "Inscripciones por Período / Comisión",
  DESERCION: "Deserción (Libres y Bajas)",
};

export default function AdminReportsPage() {
  const [filters, setFilters] = useState<ReportFilterOptions>({
    careers: [],
    subjects: [],
    periods: [],
  });

  const [reportType, setReportType] = useState<ReportType>("RENDIMIENTO");
  const [careerId, setCareerId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [report, setReport] = useState<AcademicReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadFilters() {
      try {
        const data = await adminReportsApi.getFilters();
        setFilters(data);
      } catch {
        setError(
          "Error de conexión al cargar los filtros. Reintentá más tarde.",
        );
      }
    }
    void loadFilters();
  }, []);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await adminReportsApi.generateReport({
        type: reportType,
        careerId: careerId || undefined,
        subjectId: subjectId || undefined,
        periodId: periodId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setReport(data);
      if (data.rows.length > 0) {
        setSuccessMsg(
          "Reporte generado y registrado en auditoría correctamente.",
        );
      }
    } catch (err) {
      setReport(null);
      setError(
        err instanceof Error
          ? err.message
          : "Error de conexión con el servidor al generar el reporte.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function buildExportMeta(type: ReportType): ReportExportMeta {
    const labelOf = (
      options: { id: string; label: string }[],
      id: string,
      all: string,
    ) => options.find((o) => o.id === id)?.label ?? all;
    return {
      title: REPORT_LABELS[type],
      filters: [
        { label: "Carrera", value: labelOf(filters.careers, careerId, "Todas") },
        { label: "Materia", value: labelOf(filters.subjects, subjectId, "Todas") },
        { label: "Período", value: labelOf(filters.periods, periodId, "Todos") },
        { label: "Rango de fechas", value: dateFrom || dateTo ? `${dateFrom || "…"} a ${dateTo || "…"}` : "Sin límite" },
      ],
    };
  }

  async function handleExport(format: "pdf" | "excel") {
    if (!report || report.rows.length === 0) return;
    setIsExporting(true);
    setError(null);
    try {
      const meta = buildExportMeta(report.reportType);
      if (format === "pdf") await exportReportToPdf(report, meta);
      else await exportReportToExcel(report, meta);
    } catch {
      setError(
        format === "pdf"
          ? "Ocurrió un error al generar el PDF. Intentá nuevamente."
          : "Ocurrió un error al exportar el archivo Excel. Intentá nuevamente.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  const selects: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { id: string; label: string }[];
    allLabel?: string;
  }[] = [
    {
      id: "report-type",
      label: "Tipo de reporte",
      value: reportType,
      onChange: (v) => setReportType(v as ReportType),
      options: (Object.keys(REPORT_LABELS) as ReportType[]).map((key) => ({ id: key, label: REPORT_LABELS[key] })),
    },
    { id: "filter-career", label: "Carrera", value: careerId, onChange: setCareerId, options: filters.careers, allLabel: "Todas las carreras" },
    { id: "filter-subject", label: "Materia", value: subjectId, onChange: setSubjectId, options: filters.subjects, allLabel: "Todas las materias" },
    { id: "filter-period", label: "Período académico", value: periodId, onChange: setPeriodId, options: filters.periods, allLabel: "Todos los períodos" },
  ];

  const stats: [string, string][] = report
    ? [
        ["Comisiones analizadas", String(report.summary.totalCommissions)],
        ["Total inscriptos", String(report.summary.totalInscriptos)],
        ["Aprobación promedio", `${report.summary.avgAprobacion}%`],
        ["Asistencia promedio", `${report.summary.avgAsistencia}%`],
        ["Deserción promedio", `${report.summary.avgDesercion}%`],
      ]
    : [];

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Reportes académicos</h1>
          <p className={common.subtitle}>Rendimiento, asistencia, inscripciones y deserción por carrera, materia o período</p>
        </div>
      </header>

      <section className={`${common.card} ${common.cardPad}`}>
        <div className={s.filters}>
          {selects.map((f) => (
            <label key={f.id} htmlFor={f.id} className={s.filterField}>
              {f.label}
              <select
                id={f.id}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className={`${common.field} ${s.control}`}
              >
                {f.allLabel && <option value="">{f.allLabel}</option>}
                {f.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label htmlFor="filter-date-from" className={s.filterField}>
            Desde
            <input
              id="filter-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`${common.field} ${s.control}`}
            />
          </label>
          <label htmlFor="filter-date-to" className={s.filterField}>
            Hasta
            <input
              id="filter-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className={`${common.field} ${s.control}`}
            />
          </label>
        </div>
      </section>

      <div className={common.toolbar}>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isLoading}
          className={`${common.btn} ${common.btnPrimary}`}
        >
          {isLoading ? "Generando..." : "Generar reporte"}
        </button>

        {report && report.rows.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => void handleExport("excel")}
              disabled={isExporting}
              className={`${common.btn} ${common.btnGhost}`}
            >
              Exportar Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              disabled={isExporting}
              className={`${common.btn} ${common.btnGhost}`}
            >
              {isExporting ? "Exportando..." : "Exportar PDF"}
            </button>
          </>
        )}
      </div>

      {error && (
        <div role="alert" className={s.feedbackError}>
          {error}
          <button type="button" onClick={() => void handleGenerate()} className={`${common.btn} ${common.btnGhost}`}>
            Reintentar
          </button>
        </div>
      )}

      {successMsg && (
        <div role="status" className={s.feedbackOk}>
          {successMsg}
        </div>
      )}

      {report && report.rows.length === 0 && (
        <div className={`${common.card} ${common.empty}`}>No hay información disponible para los filtros seleccionados.</div>
      )}

      {report && report.rows.length > 0 && (
        <>
          <section className={s.stats}>
            {stats.map(([label, value]) => (
              <div key={label} className={`${common.card} ${common.cardPad}`}>
                <span className={common.muted}>{label}</span>
                <p className={s.statValue}>{value}</p>
              </div>
            ))}
          </section>

          <section className={common.card}>
            <div className={common.tableWrap}>
              <table className={common.table}>
                <thead>
                  <tr>
                    <th>Materia / Com.</th>
                    <th>Período</th>
                    <th>Inscriptos</th>
                    {report.reportType === "RENDIMIENTO" && (
                      <>
                        <th>Aprob. / Reg.</th>
                        <th>Tasa Aprobación</th>
                      </>
                    )}
                    {report.reportType === "ASISTENCIA" && <th>Asistencia Promedio</th>}
                    {report.reportType === "INSCRIPCIONES" && (
                      <>
                        <th>Cupo</th>
                        <th>Activos / Bajas</th>
                      </>
                    )}
                    {report.reportType === "DESERCION" && (
                      <>
                        <th>Libres / Canceladas</th>
                        <th>Tasa Deserción</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.offeringId}>
                      <td>
                        <strong>
                          {r.subjectName} ({r.subjectCode})
                        </strong>
                        <div className={common.muted}>
                          Com. {r.commission} · {r.careerName}
                        </div>
                      </td>
                      <td>{r.period}</td>
                      <td className={common.num}>{r.totalInscriptos}</td>

                      {report.reportType === "RENDIMIENTO" && (
                        <>
                          <td className={common.num}>
                            {r.aprobados} / {r.regulares}
                          </td>
                          <td className={common.num}>
                            <strong>{r.tasaAprobacion}%</strong>
                          </td>
                        </>
                      )}

                      {report.reportType === "ASISTENCIA" && (
                        <td className={common.num}>
                          <strong>{r.promedioAsistencia}%</strong>
                        </td>
                      )}

                      {report.reportType === "INSCRIPCIONES" && (
                        <>
                          <td className={common.num}>{r.capacity}</td>
                          <td className={common.num}>
                            {r.activos} / {r.canceladas}
                          </td>
                        </>
                      )}

                      {report.reportType === "DESERCION" && (
                        <>
                          <td className={common.num}>
                            {r.libres} / {r.canceladas}
                          </td>
                          <td className={common.num}>
                            <strong>{r.tasaDesercion}%</strong>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
