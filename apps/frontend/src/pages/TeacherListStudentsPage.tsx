import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  teacherApi,
  type CommissionStudentItem,
  type CommissionStudentsResponse,
  type TeacherCommissionSummary,
} from "../api/teacher.api";
import styles from "./TeacherListStudentsPage.module.css";

export default function TeacherListStudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [commissions, setCommissions] = useState<TeacherCommissionSummary[]>(
    [],
  );
  const [selectedCommissionId, setSelectedCommissionId] = useState(
    searchParams.get("comision") ?? "",
  );
  const [students, setStudents] = useState<CommissionStudentItem[]>([]);
  const [assessments, setAssessments] = useState<
    CommissionStudentsResponse["assessments"]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [observationText, setObservationText] = useState("");

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

    async function loadStudents() {
      setIsLoading(true);
      setError(null);
      setSelectedStudentId(null);
      try {
        const data = await teacherApi.getStudents(selectedCommissionId);
        setStudents(data.students);
        setAssessments(data.assessments);
      } catch (err) {
        setStudents([]);
        setAssessments([]);
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el listado de alumnos.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadStudents();
  }, [selectedCommissionId]);

  function handleCommissionChange(newId: string) {
    setSelectedCommissionId(newId);
    setSearchParams({ comision: newId });
  }

  const filteredStudents = students.filter((s) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.legajo.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const activeStudent =
    students.find((s) => s.enrollmentId === selectedStudentId) ?? null;

  async function handleAddObservation(e: React.FormEvent) {
    e.preventDefault();
    if (!activeStudent) return;

    const trimmed = observationText.trim();
    if (!trimmed) {
      setError("Escribí una observación antes de guardar.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const created = await teacherApi.addObservation(
        selectedCommissionId,
        activeStudent.enrollmentId,
        trimmed,
      );

      setStudents((prev) =>
        prev.map((s) =>
          s.enrollmentId === activeStudent.enrollmentId
            ? { ...s, observations: [created, ...s.observations] }
            : s,
        ),
      );
      setObservationText("");
      setSuccessMessage("Observación guardada correctamente.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la observación.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Alumnos Inscriptos y Observaciones</h1>
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
          <label htmlFor="student-search">Buscar alumno</label>
          <input
            id="student-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Legajo, nombre o email..."
            className={styles.input}
          />
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

      <div className={styles.layout}>
        <section className={styles.card}>
          <h2>Listado ({filteredStudents.length})</h2>

          {isLoading ? (
            <p className={styles.muted}>Cargando alumnos...</p>
          ) : filteredStudents.length === 0 ? (
            <p className={styles.muted}>
              No se encontraron alumnos para esta comisión.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Legajo</th>
                  <th>Alumno</th>
                  <th>Asistencia</th>
                  {assessments.map((a) => (
                    <th key={a.id} title={`${a.type} · máx. ${a.maxScore}`}>
                      {a.name}
                    </th>
                  ))}
                  <th>Condición</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr
                    key={s.enrollmentId}
                    className={
                      s.enrollmentId === selectedStudentId
                        ? styles.selectedRow
                        : undefined
                    }
                  >
                    <td>{s.legajo}</td>
                    <td>
                      <div>{s.fullName}</div>
                      <small className={styles.muted}>{s.email}</small>
                    </td>
                    <td>{s.attendancePercentage}%</td>
                    {s.grades.map((g) => (
                      <td key={g.assessmentId}>{g.score ?? "—"}</td>
                    ))}
                    <td>{s.enrollmentStatus}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.enrollmentId);
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className={styles.secondaryBtn}
                      >
                        Ver / Agregar ({s.observations.length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {activeStudent && (
          <aside className={styles.card}>
            <h2>Observaciones de {activeStudent.fullName}</h2>
            <p className={styles.muted}>
              Legajo {activeStudent.legajo} (visibles solo para docentes)
            </p>

            <form
              onSubmit={(e) => void handleAddObservation(e)}
              className={styles.obsForm}
            >
              <textarea
                value={observationText}
                onChange={(e) => setObservationText(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Escribí una observación privada sobre el desempeño del alumno..."
                className={styles.textarea}
              />
              <button
                type="submit"
                disabled={isSaving}
                className={styles.saveBtn}
              >
                {isSaving ? "Guardando..." : "Agregar observación"}
              </button>
            </form>

            {activeStudent.observations.length === 0 ? (
              <p className={styles.muted}>
                Todavía no hay observaciones cargadas.
              </p>
            ) : (
              <ul className={styles.obsList}>
                {activeStudent.observations.map((obs) => (
                  <li key={obs.id} className={styles.obsItem}>
                    <p>{obs.text}</p>
                    <small className={styles.muted}>
                      {obs.authorName} ·{" "}
                      {new Date(obs.createdAt).toLocaleString("es-AR")}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
