import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  teacherApi,
  type AssessmentItem,
  type TeacherCommissionSummary,
} from "../api/teacher.api";
import { APP_ROUTES } from "../constants";
import styles from "./TeacherGradesPage.module.css";

interface StudentRow {
  enrollmentId: string;
  legajo: string;
  fullName: string;
}

export default function TeacherGradesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

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

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommissions() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await teacherApi.getCommissions();
        setCommissions(list);
        if (list.length > 0) {
          const fromUrl = searchParams.get("comision");
          const validId = list.some((c) => c.id === fromUrl)
            ? fromUrl!
            : list[0].id;
          setSelectedCommissionId(validId);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las comisiones.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCommissionId) return;

    async function loadGrades() {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const data = await teacherApi.getGrades(selectedCommissionId);
        setStudents(data.students);
        setAssessments(data.assessments);
        if (data.assessments.length > 0) {
          setSelectedAssessmentId(data.assessments[0].id);
        } else {
          setSelectedAssessmentId("");
        }
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

  const activeAssessment =
    assessments.find((a) => a.id === selectedAssessmentId) ?? null;

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
      setSuccessMessage("Notas guardadas correctamente.");
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

  async function handleCloseAssessment() {
    if (!activeAssessment) return;
    const confirmed = window.confirm(
      `¿Cerrar el acta de "${activeAssessment.name}"? Una vez cerrada no podrás modificar las notas.`,
    );
    if (!confirmed) return;

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
            <option value="FINAL">Final</option>
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
          Calificaciones{" "}
          {activeAssessment
            ? `— ${activeAssessment.name} (máx. ${activeAssessment.maxScore})`
            : ""}
        </h2>

        {isLoading ? (
          <p className={styles.muted}>Cargando...</p>
        ) : !activeAssessment ? (
          <p className={styles.muted}>
            Creá una evaluación arriba para comenzar a cargar notas.
          </p>
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
                  <th>Nota (0 - {activeAssessment.maxScore})</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.enrollmentId}>
                    <td>{s.legajo}</td>
                    <td>{s.fullName}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>

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
                {activeAssessment.isClosed ? "Acta cerrada" : "Cerrar acta"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
