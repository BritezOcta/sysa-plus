import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuthenticatedUser } from "../auth/AuthContext";
import { APP_ROUTES } from "../constants";
import { getUserFullName } from "../helpers/UserDisplayHelper";
import type {
  CommissionStudent,
  StudentObservation,
  TeacherCommission,
} from "../types/teacherStudents.types";
import styles from "./TeacherListStudentsPage.module.css";

const MOCK_COMMISSIONS: TeacherCommission[] = [
  {
    id: "c1",
    subjectName: "Análisis Matemático I",
    commissionCode: "1K1",
    schedule: "Lun y Mié 18:00",
  },
  {
    id: "c2",
    subjectName: "Algoritmos y Estructuras de Datos",
    commissionCode: "1K2",
    schedule: "Mar y Jue 19:30",
  },
];

const MOCK_STUDENTS_BY_COMMISSION: Record<string, CommissionStudent[]> = {
  c1: [
    {
      enrollmentId: "e1",
      studentId: "s1",
      legajo: "30001",
      fullName: "Juan Pérez",
      attendancePercentage: 85,
      grades: [
        { label: "Parcial 1", score: 8 },
        { label: "Parcial 2", score: null },
      ],
      observations: [
        {
          id: "obs1",
          studentId: "s1",
          commissionId: "c1",
          teacherName: "Laura Díaz",
          text: "Participa activamente en clase y resuelve los ejercicios en el pizarrón.",
          createdAt: "2026-10-15T18:30:00Z",
        },
      ],
    },
    {
      enrollmentId: "e2",
      studentId: "s2",
      legajo: "30005",
      fullName: "Sofía Martínez",
      attendancePercentage: 65,
      grades: [
        { label: "Parcial 1", score: 5 },
        { label: "Parcial 2", score: null },
      ],
      observations: [],
    },
  ],
  c2: [
    {
      enrollmentId: "e3",
      studentId: "s1",
      legajo: "30001",
      fullName: "Juan Pérez",
      attendancePercentage: 92,
      grades: [{ label: "TP 1", score: 9 }],
      observations: [],
    },
  ],
};

export default function TeacherListStudentsPage() {
  const user = useAuthenticatedUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCommission =
    searchParams.get("comision") ?? MOCK_COMMISSIONS[0].id;
  const [selectedCommissionId, setSelectedCommissionId] =
    useState(initialCommission);
  const [students, setStudents] = useState<CommissionStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  const [observationText, setObservationText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function loadStudents(commissionId: string) {
    setIsLoading(true);
    setConnectionError(null);
    setSelectedStudentId(null);

    try {
      const isAssigned = MOCK_COMMISSIONS.some((c) => c.id === commissionId);
      if (!isAssigned) {
        setStudents([]);
        setConnectionError(
          "Acceso denegado: no estás asignado a la comisión seleccionada.",
        );
        return;
      }

      const list = MOCK_STUDENTS_BY_COMMISSION[commissionId] ?? [];
      setStudents(list);
    } catch {
      setConnectionError(
        "No se pudo conectar con el servidor. Intentá nuevamente.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStudents(selectedCommissionId);
  }, [selectedCommissionId]);

  function handleCommissionChange(newId: string) {
    setSelectedCommissionId(newId);
    setSearchParams({ comision: newId });
    setFormError(null);
    setSuccessMessage(null);
  }

  const selectedStudent =
    students.find((s) => s.studentId === selectedStudentId) ?? null;

  function handleSaveObservation(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!selectedStudent) {
      setFormError("El alumno seleccionado no pertenece a esta comisión.");
      return;
    }

    const trimmed = observationText.trim();
    if (!trimmed) {
      setFormError("Completá el texto de la observación antes de guardar.");
      return;
    }

    const newObs: StudentObservation = {
      id: crypto.randomUUID(),
      studentId: selectedStudent.studentId,
      commissionId: selectedCommissionId,
      teacherName: getUserFullName(user),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setStudents((prev) =>
      prev.map((student) =>
        student.studentId === selectedStudent.studentId
          ? { ...student, observations: [newObs, ...student.observations] }
          : student,
      ),
    );

    setObservationText("");
    setSuccessMessage("Observación guardada correctamente.");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link to={APP_ROUTES.TEACHER_AREA} className={styles.backLink}>
            ← Volver al Panel Docente
          </Link>
          <h1 className={styles.title}>Listado de Alumnos y Observaciones</h1>
        </div>

        <div className={styles.selectorBox}>
          <label htmlFor="commission-select">Materia y Comisión:</label>
          <select
            id="commission-select"
            value={selectedCommissionId}
            onChange={(e) => handleCommissionChange(e.target.value)}
            className={styles.select}
          >
            {MOCK_COMMISSIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subjectName} — Com. {c.commissionCode}
              </option>
            ))}
          </select>
        </div>
      </header>

      {connectionError && (
        <div className={styles.errorBanner} role="alert">
          <span>{connectionError}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => loadStudents(selectedCommissionId)}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className={styles.layout}>
        <section className={styles.tableCard}>
          <h2>Alumnos inscriptos ({students.length})</h2>
          {isLoading ? (
            <p className={styles.muted}>Cargando alumnos...</p>
          ) : students.length === 0 ? (
            <p className={styles.muted}>
              No hay alumnos inscriptos en esta comisión.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Legajo</th>
                  <th>Alumno</th>
                  <th>Asistencia</th>
                  <th>Notas</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const isSelected = student.studentId === selectedStudentId;
                  return (
                    <tr
                      key={student.enrollmentId}
                      className={isSelected ? styles.selectedRow : undefined}
                    >
                      <td>{student.legajo}</td>
                      <td>{student.fullName}</td>
                      <td>
                        <span
                          className={
                            student.attendancePercentage < 75
                              ? styles.lowAttendance
                              : styles.okAttendance
                          }
                        >
                          {student.attendancePercentage}%
                        </span>
                      </td>
                      <td>
                        {student.grades.length === 0
                          ? "Sin notas"
                          : student.grades
                              .map((g) => `${g.label}: ${g.score ?? "-"}`)
                              .join(" · ")}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.obsBtn}
                          onClick={() => {
                            setSelectedStudentId(student.studentId);
                            setFormError(null);
                            setSuccessMessage(null);
                          }}
                        >
                          Ver / Agregar ({student.observations.length})
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <aside className={styles.sidePanel}>
          {!selectedStudent ? (
            <p className={styles.muted}>
              Seleccioná un alumno de la tabla para ver su historial o registrar
              una observación privada.
            </p>
          ) : (
            <>
              <div className={styles.panelHeader}>
                <h2>{selectedStudent.fullName}</h2>
                <span className={styles.legajoBadge}>
                  Legajo {selectedStudent.legajo}
                </span>
              </div>
              <p className={styles.privacyNote}>
                Visible únicamente para docentes de la materia y
                Administración/Dirección.
              </p>

              <form onSubmit={handleSaveObservation} className={styles.form}>
                <label htmlFor="obs-text">Nueva observación</label>
                <textarea
                  id="obs-text"
                  rows={3}
                  value={observationText}
                  onChange={(e) => setObservationText(e.target.value)}
                  placeholder="Ej: Buen desempeño en clase práctica, entregó los trabajos en término..."
                  className={styles.textarea}
                />

                {formError && <p className={styles.formError}>{formError}</p>}
                {successMessage && (
                  <p className={styles.formSuccess}>{successMessage}</p>
                )}

                <button type="submit" className={styles.saveBtn}>
                  Guardar observación
                </button>
              </form>

              <div className={styles.history}>
                <h3>Historial ({selectedStudent.observations.length})</h3>
                {selectedStudent.observations.length === 0 ? (
                  <p className={styles.muted}>
                    Todavía no hay observaciones registradas.
                  </p>
                ) : (
                  <ul className={styles.obsList}>
                    {selectedStudent.observations.map((obs) => (
                      <li key={obs.id} className={styles.obsItem}>
                        <div className={styles.obsMeta}>
                          <strong>{obs.teacherName}</strong>
                          <span>
                            {new Date(obs.createdAt).toLocaleDateString(
                              "es-AR",
                            )}
                          </span>
                        </div>
                        <p>{obs.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
