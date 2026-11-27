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

  return (
    <div style={{ maxWidth: 1150, margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1>Reportes Académicos (RF-12)</h1>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <label
            htmlFor="report-type"
            style={{ display: "block", marginBottom: 4 }}
          >
            Tipo de reporte
          </label>
          <select
            id="report-type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            {(Object.keys(REPORT_LABELS) as ReportType[]).map((key) => (
              <option key={key} value={key}>
                {REPORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-career"
            style={{ display: "block", marginBottom: 4 }}
          >
            Carrera
          </label>
          <select
            id="filter-career"
            value={careerId}
            onChange={(e) => setCareerId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">Todas las carreras</option>
            {filters.careers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-subject"
            style={{ display: "block", marginBottom: 4 }}
          >
            Materia
          </label>
          <select
            id="filter-subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">Todas las materias</option>
            {filters.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-period"
            style={{ display: "block", marginBottom: 4 }}
          >
            Período académico
          </label>
          <select
            id="filter-period"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          >
            <option value="">Todos los períodos</option>
            {filters.periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isLoading}
          style={{ padding: "0.6rem 1.2rem", cursor: "pointer" }}
        >
          {isLoading ? "Generando..." : "Generar reporte"}
        </button>

        {report && report.rows.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => void handleExport("excel")}
              disabled={isExporting}
              style={{ padding: "0.6rem 1.2rem", cursor: "pointer" }}
            >
              Exportar Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              disabled={isExporting}
              style={{ padding: "0.6rem 1.2rem", cursor: "pointer" }}
            >
              {isExporting ? "Exportando..." : "Exportar PDF"}
            </button>
          </>
        )}
      </div>

      {error && (
        <div role="alert" style={{ color: "#b91c1c", marginBottom: "1rem" }}>
          {error}{" "}
          <button type="button" onClick={() => void handleGenerate()}>
            Reintentar
          </button>
        </div>
      )}

      {successMsg && (
        <div role="status" style={{ color: "#15803d", marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      {report && report.rows.length === 0 && (
        <p>No hay información disponible para los filtros seleccionados.</p>
      )}

      {report && report.rows.length > 0 && (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "1rem",
              }}
            >
              <small>Comisiones analizadas</small>
              <h2 style={{ margin: "0.25rem 0 0" }}>
                {report.summary.totalCommissions}
              </h2>
            </div>
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "1rem",
              }}
            >
              <small>Total inscriptos</small>
              <h2 style={{ margin: "0.25rem 0 0" }}>
                {report.summary.totalInscriptos}
              </h2>
            </div>
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "1rem",
              }}
            >
              <small>Aprobación promedio</small>
              <h2 style={{ margin: "0.25rem 0 0" }}>
                {report.summary.avgAprobacion}%
              </h2>
            </div>
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "1rem",
              }}
            >
              <small>Asistencia promedio</small>
              <h2 style={{ margin: "0.25rem 0 0" }}>
                {report.summary.avgAsistencia}%
              </h2>
            </div>
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "1rem",
              }}
            >
              <small>Deserción promedio</small>
              <h2 style={{ margin: "0.25rem 0 0" }}>
                {report.summary.avgDesercion}%
              </h2>
            </div>
          </section>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}
              >
                <th style={{ padding: "0.5rem" }}>Materia / Com.</th>
                <th style={{ padding: "0.5rem" }}>Período</th>
                <th style={{ padding: "0.5rem" }}>Inscriptos</th>
                {report.reportType === "RENDIMIENTO" && (
                  <>
                    <th style={{ padding: "0.5rem" }}>Aprob. / Reg.</th>
                    <th style={{ padding: "0.5rem" }}>Tasa Aprobación</th>
                  </>
                )}
                {report.reportType === "ASISTENCIA" && (
                  <th style={{ padding: "0.5rem" }}>Asistencia Promedio</th>
                )}
                {report.reportType === "INSCRIPCIONES" && (
                  <>
                    <th style={{ padding: "0.5rem" }}>Cupo</th>
                    <th style={{ padding: "0.5rem" }}>Activos / Bajas</th>
                  </>
                )}
                {report.reportType === "DESERCION" && (
                  <>
                    <th style={{ padding: "0.5rem" }}>Libres / Canceladas</th>
                    <th style={{ padding: "0.5rem" }}>Tasa Deserción</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr
                  key={r.offeringId}
                  style={{ borderBottom: "1px solid #e2e8f0" }}
                >
                  <td style={{ padding: "0.5rem" }}>
                    <strong>
                      {r.subjectName} ({r.subjectCode})
                    </strong>
                    <div>
                      <small>
                        Com. {r.commission} · {r.careerName}
                      </small>
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem" }}>{r.period}</td>
                  <td style={{ padding: "0.5rem" }}>{r.totalInscriptos}</td>

                  {report.reportType === "RENDIMIENTO" && (
                    <>
                      <td style={{ padding: "0.5rem" }}>
                        {r.aprobados} / {r.regulares}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <strong>{r.tasaAprobacion}%</strong>
                      </td>
                    </>
                  )}

                  {report.reportType === "ASISTENCIA" && (
                    <td style={{ padding: "0.5rem" }}>
                      <strong>{r.promedioAsistencia}%</strong>
                    </td>
                  )}

                  {report.reportType === "INSCRIPCIONES" && (
                    <>
                      <td style={{ padding: "0.5rem" }}>{r.capacity}</td>
                      <td style={{ padding: "0.5rem" }}>
                        {r.activos} / {r.canceladas}
                      </td>
                    </>
                  )}

                  {report.reportType === "DESERCION" && (
                    <>
                      <td style={{ padding: "0.5rem" }}>
                        {r.libres} / {r.canceladas}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <strong>{r.tasaDesercion}%</strong>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
