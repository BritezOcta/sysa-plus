import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  teacherApi,
  type AssessmentItem,
  type ExamCallStudentItem,
  type TeacherCommissionSummary,
  type TeacherExamCallSummary,
} from "../api/teacher.api";
import { APP_ROUTES } from "../constants";
import styles from "./TeacherGradesPage.module.css";

interface StudentRow {
  enrollmentId: string;
  legajo: string;
  fullName: string;
  enrollmentStatus: string;
}

const COURSE_STATUSES = [
  "INSCRIPTO",
  "REGULAR",
  "APROBADA",
  "LIBRE",
  "DESAPROBADA",
] as const;

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
        setStudents(data.students);
        setAssessments(data.assessments);
        setSelectedAssessmentId(
          data.assessments.length > 0 ? data.assessments[0].id : "",
        );
      } catch (err) {
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
  }, [selectedCommissionId]);

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

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const created = await teacherApi.createAssessment(selectedCommissionId, {
        name: newName,
        type: newType,
        date: newDate,
        maxScore: Number(newMaxScore),
      });
      setAssessments((prev) => [...prev, created]);
      setSelectedAssessmentId(created.id);
      setNewName("");
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
      setAssessments((prev) =>
        prev.map((a) =>
          a.id === activeAssessment.id ? { ...a, grades: gradesToSave } : a,
        ),
      );
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

  async function handleStatusChange(enrollmentId: string, newStatus: string) {
    setError(null);
    setSuccessMessage(null);
    try {
      await teacherApi.updateEnrollmentStatus(
        selectedCommissionId,
        enrollmentId,
        newStatus,
      );
      setStudents((prev) =>
        prev.map((s) =>
          s.enrollmentId === enrollmentId
            ? { ...s, enrollmentStatus: newStatus }
            : s,
        ),
      );
      setSuccessMessage("Condición académica actualizada.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la condición.",
      );
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
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link to={APP_ROUTES.TEACHER_AREA} className={styles.backLink}>
            ← Volver al Panel Docente
          </Link>
          <h1 className={styles.title}>Carga de Notas y Cierre de Actas</h1>
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
                      {a.name} ({a.type}){a.isClosed ? " [CERRADA]" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          </section>

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
                      <th>Condición de cursada</th>
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
                        <td>
                          <select
                            value={s.enrollmentStatus}
                            onChange={(e) =>
                              void handleStatusChange(
                                s.enrollmentId,
                                e.target.value,
                              )
                            }
                            className={styles.select}
                          >
                            {COURSE_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
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
