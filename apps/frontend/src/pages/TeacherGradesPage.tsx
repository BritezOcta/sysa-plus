import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  teacherApi,
  type AssessmentItem,
  type CommissionGradesResponse,
  type CourseCondition,
  type ExamCallStudentItem,
  type TeacherCommissionSummary,
  type TeacherExamCallSummary,
} from "../api/teacher.api";
import pageStyles from "./TeacherGradesPage.module.css";
import sharedStyles from "./TeacherShared.module.css";
import common from "../features/student/common.module.css";

// Controles comunes del profesor + estilos propios de la página (los propios tienen prioridad).
const styles = { ...sharedStyles, ...pageStyles };

type StudentRow = CommissionGradesResponse["students"][number];

const CONDITION_LABELS: Record<CourseCondition, string> = {
  APROBADA: "Promocionada",
  REGULAR: "Regular",
  DESAPROBADA: "Desaprobada",
  LIBRE: "Libre",
};

const CONDITION_BADGE: Record<CourseCondition, string> = {
  APROBADA: styles.badge_APROBADO,
  REGULAR: styles.badge_REGULAR,
  DESAPROBADA: styles.badge_DESAPROBADO,
  LIBRE: styles.badge_LIBRE,
};

function ConditionBadge({ condition }: { condition: string | null }) {
  if (!condition) return <span className={styles.badge_PENDIENTE}>Cancelada</span>;
  const known = condition in CONDITION_LABELS ? (condition as CourseCondition) : null;
  return (
    <span className={known ? CONDITION_BADGE[known] : styles.badge_PENDIENTE}>
      {known ? CONDITION_LABELS[known] : condition}
    </span>
  );
}

export default function TeacherGradesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"cursada" | "finales">("cursada");

  // Estado Cursadas
  const [commissions, setCommissions] = useState<TeacherCommissionSummary[]>(
    [],
  );
  const [selectedCommissionId, setSelectedCommissionId] = useState(
    searchParams.get("comision") ?? "",
  );
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("PARCIAL");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newMaxScore, setNewMaxScore] = useState("10");
  const [newRecoversId, setNewRecoversId] = useState("");
  const [courseInfo, setCourseInfo] = useState<
    CommissionGradesResponse["commission"] | null
  >(null);
  const [gradesVersion, setGradesVersion] = useState(0);

  // Estado Mesas de Final
  const [examCalls, setExamCalls] = useState<TeacherExamCallSummary[]>([]);
  const [selectedExamCallId, setSelectedExamCallId] = useState<string>("");
  const [examStudents, setExamStudents] = useState<ExamCallStudentItem[]>([]);
  const [examDraftGrades, setExamDraftGrades] = useState<
    Record<string, string>
  >({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitial() {
      setIsLoading(true);
      setError(null);
      try {
        const [commList, callList] = await Promise.all([
          teacherApi.getCommissions(),
          teacherApi.getExamCalls(),
        ]);
        setCommissions(commList);
        setExamCalls(callList);

        if (commList.length > 0) {
          const fromUrl = searchParams.get("comision");
          const validId = commList.some((c) => c.id === fromUrl)
            ? fromUrl!
            : commList[0].id;
          setSelectedCommissionId(validId);
        }
        if (callList.length > 0) {
          setSelectedExamCallId(callList[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los datos.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCommissionId) return;

    async function loadGrades() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await teacherApi.getGrades(selectedCommissionId);
        setCourseInfo(data.commission);
        setStudents(data.students);
        setAssessments(data.assessments);
        setSelectedAssessmentId((prev) =>
          data.assessments.some((a) => a.id === prev)
            ? prev
            : (data.assessments[0]?.id ?? ""),
        );
      } catch (err) {
        setCourseInfo(null);
        setStudents([]);
        setAssessments([]);
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las evaluaciones.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadGrades();
  }, [selectedCommissionId, gradesVersion]);

  useEffect(() => {
    if (!selectedExamCallId) return;

    async function loadExamCall() {
      setError(null);
      try {
        const data = await teacherApi.getExamCallGrades(selectedExamCallId);
        setExamStudents(data.students);
        const map: Record<string, string> = {};
        for (const s of data.students) {
          if (s.examGrade !== null)
            map[s.examEnrollmentId] = String(s.examGrade);
        }
        setExamDraftGrades(map);
      } catch (err) {
        setExamStudents([]);
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar la mesa de examen.",
        );
      }
    }

    void loadExamCall();
  }, [selectedExamCallId]);

  const activeAssessment =
    assessments.find((a) => a.id === selectedAssessmentId) ?? null;
  const isCourseClosed = Boolean(courseInfo?.closedAt);
  // Parciales que todavía no tienen recuperatorio (RF-07).
  const recoverableParciales = assessments.filter(
    (a) =>
      a.type === "PARCIAL" &&
      !assessments.some((r) => r.recoversAssessmentId === a.id),
  );
  const assessmentLabel = (a: AssessmentItem) => {
    const recovered = assessments.find((p) => p.id === a.recoversAssessmentId);
    return recovered ? `${a.name} (recupera ${recovered.name})` : `${a.name} (${a.type})`;
  };
  const activeExamCall =
    examCalls.find((c) => c.id === selectedExamCallId) ?? null;

  useEffect(() => {
    if (!activeAssessment) {
      setDraftScores({});
      return;
    }
    const map: Record<string, string> = {};
    for (const g of activeAssessment.grades) {
      map[g.enrollmentId] = String(g.score);
    }
    setDraftScores(map);
  }, [activeAssessment]);

  function handleCommissionChange(newId: string) {
    setSelectedCommissionId(newId);
    setSearchParams({ comision: newId });
  }

  async function handleCreateAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCommissionId) return;
    if (newType === "RECUPERATORIO" && !newRecoversId) {
      setError("Elegí el parcial que recupera este recuperatorio.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const created = await teacherApi.createAssessment(selectedCommissionId, {
        name: newName,
        type: newType,
        date: newDate,
        maxScore: Number(newMaxScore),
        ...(newType === "RECUPERATORIO" ? { recoversAssessmentId: newRecoversId } : {}),
      });
      setAssessments((prev) => [...prev, created]);
      setSelectedAssessmentId(created.id);
      setNewName("");
      setNewRecoversId("");
      setSuccessMessage(`Evaluación "${created.name}" creada correctamente.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear la evaluación.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveGrades() {
    if (!activeAssessment) return;

    const gradesToSave: { enrollmentId: string; score: number }[] = [];
    for (const s of students) {
      const raw = draftScores[s.enrollmentId]?.trim();
      if (raw === undefined || raw === "") continue;
      const score = Number(raw);
      if (
        !Number.isFinite(score) ||
        score < 0 ||
        score > activeAssessment.maxScore
      ) {
        setError(
          `La nota de ${s.fullName} debe estar entre 0 y ${activeAssessment.maxScore}.`,
        );
        return;
      }
      gradesToSave.push({ enrollmentId: s.enrollmentId, score });
    }

    if (gradesToSave.length === 0) {
      setError("Cargá al menos una nota antes de guardar.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await teacherApi.saveGrades(
        selectedCommissionId,
        activeAssessment.id,
        gradesToSave,
      );
      // Recarga para actualizar la condición proyectada de cada alumno.
      setGradesVersion((v) => v + 1);
      setSuccessMessage("Notas de cursada guardadas correctamente.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar las notas.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCloseCourse() {
    if (!selectedCommissionId) return;
    if (
      !window.confirm(
        "¿Cerrar la cursada? Se guardará la condición final de cada alumno según los criterios de la materia y se cerrarán todas las actas. Solo el Administrador/Director podrá reabrirla.",
      )
    )
      return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const { closedCount } = await teacherApi.closeCourse(selectedCommissionId);
      setGradesVersion((v) => v + 1);
      setSuccessMessage(
        `Cursada cerrada: se guardó la condición final de ${closedCount} alumno(s).`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cerrar la cursada.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCloseAssessment() {
    if (!activeAssessment) return;
    if (!window.confirm(`¿Cerrar el acta de "${activeAssessment.name}"?`))
      return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await teacherApi.closeAssessment(
        selectedCommissionId,
        activeAssessment.id,
      );
      setAssessments((prev) =>
        prev.map((a) =>
          a.id === activeAssessment.id ? { ...a, isClosed: true } : a,
        ),
      );
      setSuccessMessage(
        `Acta de "${activeAssessment.name}" cerrada definitivamente.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cerrar el acta.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveExamGrades() {
    if (!activeExamCall) return;

    const gradesToSave: { examEnrollmentId: string; examGrade: number }[] = [];
    for (const s of examStudents) {
      const raw = examDraftGrades[s.examEnrollmentId]?.trim();
      if (raw === undefined || raw === "") continue;
      const examGrade = Number(raw);
      if (!Number.isFinite(examGrade) || examGrade < 0 || examGrade > 10) {
        setError(`La nota de ${s.fullName} debe estar entre 0 y 10.`);
        return;
      }
      gradesToSave.push({ examEnrollmentId: s.examEnrollmentId, examGrade });
    }

    if (gradesToSave.length === 0) {
      setError("Cargá al menos una nota de final antes de guardar.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await teacherApi.saveExamCallGrades(activeExamCall.id, gradesToSave);
      const refreshed = await teacherApi.getExamCallGrades(activeExamCall.id);
      setExamStudents(refreshed.students);
      setSuccessMessage("Notas de final guardadas y estados actualizados.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar las notas de final.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCloseExamCall() {
    if (!activeExamCall) return;
    if (
      !window.confirm(
        `¿Cerrar el acta de la mesa de ${activeExamCall.subjectName}?`,
      )
    )
      return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await teacherApi.closeExamCall(activeExamCall.id);
      setExamCalls((prev) =>
        prev.map((c) =>
          c.id === activeExamCall.id ? { ...c, callStatus: "CERRADA" } : c,
        ),
      );
      setSuccessMessage("Acta de examen final cerrada definitivamente.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cerrar la mesa.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Carga de Notas y Cierre de Actas</h1>
          <p className={common.subtitle}>Cargá notas de parciales y finales, y cerrá las actas</p>
        </div>
      </header>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => {
            setActiveTab("cursada");
            setError(null);
            setSuccessMessage(null);
          }}
          className={
            activeTab === "cursada" ? styles.saveBtn : styles.secondaryBtn
          }
        >
          Cursada (Parciales y Condición)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("finales");
            setError(null);
            setSuccessMessage(null);
          }}
          className={
            activeTab === "finales" ? styles.saveBtn : styles.secondaryBtn
          }
        >
          Mesas de Final ({examCalls.length})
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}
      {successMessage && (
        <div className={styles.successBanner} role="status">
          {successMessage}
        </div>
      )}

      {activeTab === "cursada" ? (
        <>
          <section className={styles.controls}>
            <div className={styles.field}>
              <label htmlFor="commission-select">Materia y Comisión</label>
              <select
                id="commission-select"
                value={selectedCommissionId}
                onChange={(e) => handleCommissionChange(e.target.value)}
                disabled={commissions.length === 0}
                className={styles.select}
              >
                {commissions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subjectName} — Com. {c.commissionCode}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="assessment-select">Evaluación</label>
              <select
                id="assessment-select"
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                disabled={assessments.length === 0}
                className={styles.select}
              >
                {assessments.length === 0 ? (
                  <option value="">Sin evaluaciones creadas</option>
                ) : (
                  assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {assessmentLabel(a)}
                      {a.isClosed ? " [CERRADA]" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          </section>

          {courseInfo && (
            <p className={styles.criteriaHint}>
              Criterios de la materia: cada parcial (o su recuperatorio) con{" "}
              {courseInfo.criteria.regularGrade} o más regulariza
              {courseInfo.criteria.promotionGrade !== null
                ? `; con ${courseInfo.criteria.promotionGrade} o más en todos promociona`
                : "; la materia no tiene promoción"}
              . Asistencia menor al 75% → Libre. Los TP no cuentan para la condición.
            </p>
          )}

          {isCourseClosed && courseInfo?.closedAt && (
            <div className={styles.warningBanner} role="status">
              Cursada cerrada el{" "}
              {new Date(courseInfo.closedAt).toLocaleDateString("es-AR")}. Las
              condiciones son definitivas; para modificarlas solicitá la
              reapertura al Administrador/Director.
            </div>
          )}

          {!isCourseClosed && (
          <section className={styles.card}>
            <h2>Nueva evaluación</h2>
            <form
              onSubmit={(e) => void handleCreateAssessment(e)}
              className={styles.controls}
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: 1er Parcial"
                required
                className={styles.input}
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className={styles.select}
              >
                <option value="PARCIAL">Parcial</option>
                <option value="RECUPERATORIO">Recuperatorio</option>
                <option value="TP">Trabajo Práctico</option>
              </select>
              {newType === "RECUPERATORIO" && (
                <select
                  value={newRecoversId}
                  onChange={(e) => setNewRecoversId(e.target.value)}
                  className={styles.select}
                  aria-label="Parcial que recupera"
                  required
                >
                  <option value="">
                    {recoverableParciales.length === 0
                      ? "No hay parciales sin recuperatorio"
                      : "¿Qué parcial recupera?"}
                  </option>
                  {recoverableParciales.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className={styles.input}
              />
              <input
                type="number"
                min={1}
                max={100}
                value={newMaxScore}
                onChange={(e) => setNewMaxScore(e.target.value)}
                className={styles.input}
              />
              <button
                type="submit"
                disabled={isSaving || !selectedCommissionId}
                className={styles.saveBtn}
              >
                Crear evaluación
              </button>
            </form>
          </section>
          )}

          <section className={styles.card}>
            <h2>
              Calificaciones y Condición{" "}
              {activeAssessment
                ? `— ${activeAssessment.name} (máx. ${activeAssessment.maxScore})`
                : ""}
            </h2>

            {isLoading ? (
              <p className={styles.muted}>Cargando...</p>
            ) : students.length === 0 ? (
              <p className={styles.muted}>
                No hay alumnos inscriptos en esta comisión.
              </p>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Legajo</th>
                      <th>Alumno</th>
                      {activeAssessment && (
                        <th>Nota (0 - {activeAssessment.maxScore})</th>
                      )}
                      <th>Asistencia</th>
                      <th>
                        {isCourseClosed ? "Condición final" : "Condición proyectada"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.enrollmentId}>
                        <td>{s.legajo}</td>
                        <td>{s.fullName}</td>
                        {activeAssessment && (
                          <td>
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              max={activeAssessment.maxScore}
                              disabled={activeAssessment.isClosed}
                              value={draftScores[s.enrollmentId] ?? ""}
                              onChange={(e) =>
                                setDraftScores((prev) => ({
                                  ...prev,
                                  [s.enrollmentId]: e.target.value,
                                }))
                              }
                              className={styles.input}
                            />
                          </td>
                        )}
                        <td>{s.attendancePercentage}%</td>
                        <td>
                          <ConditionBadge
                            condition={
                              isCourseClosed
                                ? s.enrollmentStatus === "CANCELADA"
                                  ? null
                                  : s.enrollmentStatus
                                : s.projectedCondition
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {activeAssessment && (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      onClick={() => void handleSaveGrades()}
                      disabled={isSaving || activeAssessment.isClosed}
                      className={styles.saveBtn}
                    >
                      {isSaving ? "Guardando..." : "Guardar notas"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCloseAssessment()}
                      disabled={isSaving || activeAssessment.isClosed}
                      className={styles.secondaryBtn}
                    >
                      {activeAssessment.isClosed
                        ? "Acta cerrada"
                        : "Cerrar acta"}
                    </button>
                  </div>
                )}

                {activeAssessment?.isClosed && !isCourseClosed && (
                  <p className={styles.criteriaHint}>
                    El acta está cerrada. Para modificarla solicitá la reapertura
                    al Administrador/Director.
                  </p>
                )}

                {!isCourseClosed && (
                  <div className={styles.footerActions}>
                    <button
                      type="button"
                      onClick={() => void handleCloseCourse()}
                      disabled={isSaving}
                      className={styles.closeActBtn}
                    >
                      Cerrar cursada y guardar condiciones
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      ) : (
        <section className={styles.card}>
          <div className={styles.field}>
            <label htmlFor="exam-call-select">Mesa de Examen Asignada</label>
            <select
              id="exam-call-select"
              value={selectedExamCallId}
              onChange={(e) => setSelectedExamCallId(e.target.value)}
              disabled={examCalls.length === 0}
              className={styles.select}
            >
              {examCalls.length === 0 ? (
                <option value="">No tenés mesas de examen asignadas</option>
              ) : (
                examCalls.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subjectName} — {c.sessionName} ({c.callDate}) [
                    {c.callStatus}]
                  </option>
                ))
              )}
            </select>
          </div>

          {activeExamCall && (
            <>
              <p className={styles.muted}>
                Aula: {activeExamCall.classroom ?? "A confirmar"} · Estado:{" "}
                <strong>{activeExamCall.callStatus}</strong> (Aprueba con 6 o
                más)
              </p>

              {examStudents.length === 0 ? (
                <p className={styles.muted}>
                  No hay alumnos inscriptos en esta mesa.
                </p>
              ) : (
                <>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Legajo</th>
                        <th>Alumno</th>
                        <th>Nota Final (0 - 10)</th>
                        <th>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examStudents.map((s) => (
                        <tr key={s.examEnrollmentId}>
                          <td>{s.legajo}</td>
                          <td>{s.fullName}</td>
                          <td>
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              max={10}
                              disabled={activeExamCall.callStatus === "CERRADA"}
                              value={examDraftGrades[s.examEnrollmentId] ?? ""}
                              onChange={(e) =>
                                setExamDraftGrades((prev) => ({
                                  ...prev,
                                  [s.examEnrollmentId]: e.target.value,
                                }))
                              }
                              className={styles.input}
                            />
                          </td>
                          <td>
                            <strong>{s.examStatus}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      onClick={() => void handleSaveExamGrades()}
                      disabled={
                        isSaving || activeExamCall.callStatus === "CERRADA"
                      }
                      className={styles.saveBtn}
                    >
                      {isSaving ? "Guardando..." : "Guardar notas de final"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCloseExamCall()}
                      disabled={
                        isSaving || activeExamCall.callStatus === "CERRADA"
                      }
                      className={styles.secondaryBtn}
                    >
                      {activeExamCall.callStatus === "CERRADA"
                        ? "Acta de final cerrada"
                        : "Cerrar acta de final"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
