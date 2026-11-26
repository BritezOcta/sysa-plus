import { Link } from "react-router";
import { useAcademicStatus } from "../../../hooks/useAcademicStatus";
import type { AcademicStatus } from "../../../types/academicStatus.types";
import { AcademicStatusFallback } from "../AcademicStatusFallback";
import { formatFecha } from "../formatFecha";
import common from "../common.module.css";

const GRADE_WORDS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];

/** Nota con su escritura en letras, como en el acta: 8 → "8 (ocho)". */
function gradeText(grade: number): string {
  return Number.isInteger(grade) && GRADE_WORDS[grade] ? `${grade} (${GRADE_WORDS[grade]})` : String(grade);
}

/** Exámenes finales rendidos por el alumno (/alumno/examenes). Datos de RF-09. */
export function ExamenesPage() {
  const { state, retry } = useAcademicStatus();

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Exámenes</h1>
          <p className={common.subtitle}>
            {state.status === "ready"
              ? `${state.data.student.careerName} · ${state.data.student.studyPlan}`
              : "Tus exámenes finales rendidos"}
          </p>
        </div>
        <Link to="/alumno/inscripcion-examen" className={`${common.btn} ${common.btnGhost}`}>
          Inscripción a examen
        </Link>
      </header>

      {state.status === "ready" ? <ExamenesTable data={state.data} /> : <AcademicStatusFallback state={state} onRetry={retry} />}
    </div>
  );
}

function ExamenesTable({ data }: { data: AcademicStatus }) {
  // Orden cronológico, como el listado del acta.
  const finals = data.history.filter((h) => h.kind === "FINAL").sort((a, b) => a.date.localeCompare(b.date));
  const approved = finals.filter((h) => h.result === "APROBADO").length;

  return (
    <section className={common.card}>
      <div className={common.sectionHead}>
        <h2>Finales rendidos</h2>
        <span className={common.muted}>
          {finals.length} rendidos · {approved} aprobados
          {data.summary.average !== null && ` · Promedio ${data.summary.average.toFixed(2)}`}
        </span>
      </div>
      {finals.length === 0 ? (
        <div className={common.empty}>Todavía no rendiste ningún examen final.</div>
      ) : (
        <div className={common.tableWrap}>
          <table className={common.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Código</th>
                <th>Materia</th>
                <th>Nota</th>
                <th>Resultado</th>
                <th>Turno</th>
              </tr>
            </thead>
            <tbody>
              {finals.map((h, i) => (
                <tr key={`${h.studyPlanSubjectId}-${h.date}-${i}`}>
                  <td className={common.num}>{formatFecha(h.date)}</td>
                  <td>
                    <span className={common.code}>{h.subjectCode}</span>
                  </td>
                  <td>
                    <strong>{h.subjectName}</strong>
                  </td>
                  <td className={common.num}>
                    <strong>{h.grade === null ? "—" : gradeText(h.grade)}</strong>
                  </td>
                  <td>
                    <span className={`${common.chip} ${h.result === "APROBADO" ? common.chipOk : common.chipDanger}`}>
                      {h.result === "APROBADO" ? "Aprobado" : "Desaprobado"}
                    </span>
                  </td>
                  <td className={common.muted}>{h.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
