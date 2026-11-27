import { useCallback, useEffect, useState } from "react";
import {
  studentAttendanceApi,
  type AttendanceSessionStatus,
  type StudentCourseAttendance,
} from "../../../api/studentAttendance.api";
import { formatFecha } from "../formatFecha";
import { getNavItem } from "../nav";
import common from "../common.module.css";
import s from "./AsistenciasPage.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; courses: StudentCourseAttendance[] };

const STATUS_CHIP: Record<AttendanceSessionStatus, { label: string; className: string }> = {
  PRESENTE: { label: "Presente", className: common.chipOk },
  JUSTIFICADO: { label: "Justificado", className: common.chipInfo },
  TARDANZA: { label: "Tardanza (½)", className: common.chipWarn },
  AUSENTE: { label: "Ausente", className: common.chipDanger },
  SIN_REGISTRO: { label: "Sin registro", className: common.chipMuted },
};

const formatNumber = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });

/** Asistencia ponderada: presentes y justificadas valen 1, tardanzas ½. */
function attendedOf(c: StudentCourseAttendance): number {
  return c.summary.presentCount + c.summary.justifiedCount + c.summary.lateCount / 2;
}

/** Asistencias (/alumno/asistencias). RF-05, con el mismo cálculo que el cierre de cursada. */
export function AsistenciasPage() {
  const item = getNavItem("asistencias");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(
    () =>
      studentAttendanceApi.getMyAttendance().then(
        (courses) => setState({ status: "ready", courses }),
        (err: unknown) =>
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "No se pudieron cargar tus asistencias.",
          }),
      ),
    [],
  );

  // Carga inicial: el setState ocurre en el callback de la promesa, no en el cuerpo del efecto.
  useEffect(() => {
    void load();
  }, [load]);

  function retry() {
    setState({ status: "loading" });
    void load();
  }

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>{item?.label}</h1>
          <p className={common.subtitle}>{item?.description}</p>
        </div>
      </header>

      {state.status === "loading" && (
        <div className={`${common.card} ${common.empty}`} role="status">
          Cargando tus asistencias…
        </div>
      )}

      {state.status === "error" && (
        <div className={`${common.card} ${common.empty}`} role="alert">
          <p>{state.message}</p>
          <button type="button" className={`${common.btn} ${common.btnPrimary}`} onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <AttendanceSections courses={state.courses} selectedId={selectedId} onSelect={setSelectedId} />
      )}
    </div>
  );
}

function AttendanceSections({
  courses,
  selectedId,
  onSelect,
}: {
  courses: StudentCourseAttendance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (courses.length === 0) {
    return <div className={`${common.card} ${common.empty}`}>No tenés cursadas registradas para consultar asistencias.</div>;
  }
  const current = courses.filter((c) => c.inProgress);
  const past = courses.filter((c) => !c.inProgress);
  const selected = current.find((c) => c.enrollmentId === selectedId) ?? current[0] ?? null;

  return (
    <>
      <section className={s.section}>
        <h2 className={s.sectionTitle}>En curso</h2>
        {current.length === 0 ? (
          <div className={`${common.card} ${common.empty}`}>No estás cursando materias en este momento.</div>
        ) : (
          <>
            <div className={s.grid}>
              {current.map((c) => (
                <SummaryCard
                  key={c.enrollmentId}
                  course={c}
                  selected={c.enrollmentId === selected?.enrollmentId}
                  onSelect={() => onSelect(c.enrollmentId)}
                />
              ))}
            </div>
            {selected && (
              <article className={common.card}>
                <div className={common.sectionHead}>
                  <h2>
                    {selected.subjectName} · Comisión {selected.commission}
                  </h2>
                  <StatusTotals course={selected} />
                </div>
                <SessionsTable course={selected} />
              </article>
            )}
          </>
        )}
      </section>

      {past.length > 0 && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>Cursadas anteriores</h2>
          {past.map((c) => (
            <details key={c.enrollmentId} className={`${common.card} ${s.pastCourse}`}>
              <summary className={s.pastSummary}>
                <span className={common.code}>{c.subjectCode}</span>
                <span className={s.pastName}>
                  <strong>{c.subjectName}</strong>
                  <span className={common.muted}>
                    Comisión {c.commission} · {c.period}
                  </span>
                </span>
                <span className={s.pastPercent}>
                  {c.summary.totalClasses === 0 ? "—" : `${c.summary.attendancePercentage}%`}
                </span>
              </summary>
              <SessionsTable course={c} />
            </details>
          ))}
        </section>
      )}
    </>
  );
}

function SummaryCard({
  course,
  selected,
  onSelect,
}: {
  course: StudentCourseAttendance;
  selected: boolean;
  onSelect: () => void;
}) {
  const { summary } = course;
  const noClasses = summary.totalClasses === 0;
  return (
    <button
      type="button"
      className={`${common.card} ${s.summaryCard} ${selected ? s.summaryCardSelected : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className={s.cardHeading}>
        <span className={common.code}>{course.subjectCode}</span>
        <span>
          <strong>{course.subjectName}</strong>
          <span className={`${common.muted} ${s.block}`}>
            Comisión {course.commission} · {course.period}
          </span>
        </span>
      </span>

      {noClasses ? (
        <span className={common.muted}>Todavía no hay clases registradas.</span>
      ) : (
        <>
          <span className={`${s.percent} ${summary.atRisk ? s.percentDanger : ""}`}>
            {summary.attendancePercentage}%
          </span>
          <span
            className={s.bar}
            role="img"
            aria-label={`${summary.attendancePercentage}% de asistencia; mínimo ${summary.minPercentage}%`}
          >
            <span
              className={`${s.barFill} ${summary.atRisk ? s.barFillDanger : ""}`}
              style={{ width: `${Math.min(summary.attendancePercentage, 100)}%` }}
            />
            <span className={s.barMark} style={{ left: `${summary.minPercentage}%` }} />
          </span>
          <span className={s.cardFooter}>
            <span className={common.muted}>
              {formatNumber(attendedOf(course))} de {summary.totalClasses} clases · mínimo {summary.minPercentage}%
            </span>
            {summary.atRisk && (
              <span className={`${common.chip} ${common.chipDanger}`}>Riesgo de quedar libre</span>
            )}
          </span>
        </>
      )}
    </button>
  );
}

function StatusTotals({ course }: { course: StudentCourseAttendance }) {
  const { summary } = course;
  const parts = [
    `${summary.presentCount} presentes`,
    summary.justifiedCount > 0 && `${summary.justifiedCount} justificadas`,
    summary.lateCount > 0 && `${summary.lateCount} tardanzas`,
    `${summary.absentCount} ausentes`,
    summary.unrecordedCount > 0 && `${summary.unrecordedCount} sin registro`,
  ].filter(Boolean);
  return <span className={common.muted}>{parts.join(" · ")}</span>;
}

function SessionsTable({ course }: { course: StudentCourseAttendance }) {
  if (course.sessions.length === 0) {
    return <div className={common.empty}>Todavía no hay clases registradas en esta comisión.</div>;
  }
  return (
    <div className={common.tableWrap}>
      <table className={common.table}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tema</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {course.sessions.map((session) => {
            const chip = STATUS_CHIP[session.status] ?? STATUS_CHIP.SIN_REGISTRO;
            return (
              <tr key={session.sessionId}>
                <td className={common.num}>{formatFecha(session.date, true)}</td>
                <td>{session.topic ?? "—"}</td>
                <td>
                  <span className={`${common.chip} ${chip.className}`}>{chip.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
