import { useCallback, useEffect, useState } from "react";
import { studentCoursesApi, type StudentAssessment, type StudentCourse } from "../../../api/studentCourses.api";
import type { SubjectStatus } from "../../../types/academicStatus.types";
import { formatFecha } from "../formatFecha";
import { getNavItem } from "../nav";
import { StatusChip } from "../StatusChip";
import { SurveyModal } from "./SurveyModal";
import common from "../common.module.css";
import s from "./CursadoPage.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; questions: string[]; courses: StudentCourse[] };

const CHIP_CONDITIONS = new Set<string>(["CURSANDO", "REGULAR", "APROBADA", "LIBRE", "DESAPROBADA"]);

const formatScore = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

function ConditionChip({ condition }: { condition: string }) {
  if (CHIP_CONDITIONS.has(condition)) return <StatusChip estado={condition as SubjectStatus} />;
  return <span className={`${common.chip} ${common.chipMuted}`}>{condition === "SIN CERRAR" ? "Sin cerrar" : condition}</span>;
}

/** Cursado / Notas de parciales / Encuestas (/alumno/cursado). */
export function CursadoPage() {
  const item = getNavItem("cursado");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [surveyFor, setSurveyFor] = useState<StudentCourse | null>(null);

  const load = useCallback(
    () =>
      studentCoursesApi.getMyCourses().then(
        ({ questions, courses }) => setState({ status: "ready", questions, courses }),
        (err: unknown) =>
          setState({ status: "error", message: err instanceof Error ? err.message : "No se pudieron cargar tus cursadas." }),
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

  function markAnswered(enrollmentId: string) {
    setState((prev) =>
      prev.status === "ready"
        ? {
            ...prev,
            courses: prev.courses.map((c) => (c.enrollmentId === enrollmentId ? { ...c, survey: "ANSWERED" } : c)),
          }
        : prev,
    );
    setSurveyFor(null);
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
          Cargando tus cursadas…
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

      {state.status === "ready" && <CourseSections courses={state.courses} onOpenSurvey={setSurveyFor} />}

      {surveyFor && state.status === "ready" && (
        <SurveyModal
          course={surveyFor}
          questions={state.questions}
          onClose={() => setSurveyFor(null)}
          onAnswered={() => markAnswered(surveyFor.enrollmentId)}
        />
      )}
    </div>
  );
}

function CourseSections({
  courses,
  onOpenSurvey,
}: {
  courses: StudentCourse[];
  onOpenSurvey: (c: StudentCourse) => void;
}) {
  if (courses.length === 0) {
    return <div className={`${common.card} ${common.empty}`}>No tenés cursadas registradas.</div>;
  }
  const current = courses.filter((c) => c.inProgress);
  const past = courses.filter((c) => !c.inProgress);

  return (
    <>
      <section className={s.section}>
        <h2 className={s.sectionTitle}>En curso</h2>
        {current.length === 0 ? (
          <div className={`${common.card} ${common.empty}`}>No estás cursando materias en este momento.</div>
        ) : (
          current.map((c) => (
            <article key={c.enrollmentId} className={common.card}>
              <div className={common.sectionHead}>
                <CourseHeading course={c} />
                <ConditionChip condition={c.condition} />
              </div>
              <AssessmentTable assessments={c.assessments} />
              <SurveyFooter course={c} onOpen={() => onOpenSurvey(c)} />
            </article>
          ))
        )}
      </section>

      {past.length > 0 && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>Cursadas anteriores</h2>
          {past.map((c) => (
            <details key={c.enrollmentId} className={`${common.card} ${s.pastCourse}`}>
              <summary className={s.pastSummary}>
                <CourseHeading course={c} />
                <ConditionChip condition={c.condition} />
              </summary>
              <AssessmentTable assessments={c.assessments} />
            </details>
          ))}
        </section>
      )}
    </>
  );
}

function CourseHeading({ course }: { course: StudentCourse }) {
  return (
    <div className={s.heading}>
      <span className={common.code}>{course.subjectCode}</span>
      <div>
        <strong>{course.subjectName}</strong>
        <div className={common.muted}>
          Comisión {course.commission} · {course.period}
        </div>
      </div>
    </div>
  );
}

function AssessmentTable({ assessments }: { assessments: StudentAssessment[] }) {
  if (assessments.length === 0) {
    return <div className={common.empty}>Todavía no hay evaluaciones cargadas.</div>;
  }
  return (
    <div className={common.tableWrap}>
      <table className={common.table}>
        <thead>
          <tr>
            <th>Evaluación</th>
            <th>Fecha</th>
            <th>Nota</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {assessments.map((a) => (
            <tr key={a.id}>
              <td>
                <strong>{a.name}</strong>
                {a.recoversName && <div className={common.muted}>Recupera: {a.recoversName}</div>}
              </td>
              <td className={common.num}>{a.date ? formatFecha(a.date) : "—"}</td>
              <td className={common.num}>
                {a.score === null ? (
                  <span className={common.muted}>Pendiente</span>
                ) : (
                  <strong>
                    {formatScore(a.score)} / {formatScore(a.maxScore)}
                  </strong>
                )}
              </td>
              <td>
                {a.score === null ? null : a.isClosed ? (
                  <span className={`${common.chip} ${common.chipOk}`}>Definitiva</span>
                ) : (
                  <span className={`${common.chip} ${common.chipMuted}`}>Provisoria</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SurveyFooter({ course, onOpen }: { course: StudentCourse; onOpen: () => void }) {
  if (course.survey === "NOT_AVAILABLE") return null;
  return (
    <div className={s.surveyFooter}>
      {course.survey === "ANSWERED" ? (
        <span className={common.muted}>Encuesta docente respondida ✓</span>
      ) : (
        <button type="button" className={`${common.btn} ${common.btnPrimary}`} onClick={onOpen}>
          Responder encuesta docente
        </button>
      )}
    </div>
  );
}
