import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuthenticatedUser } from "../auth/AuthContext";
import { APP_ROUTES } from "../constants";
import { getUserFullName } from "../helpers/UserDisplayHelper";
import type {
  ApprovalCondition,
  EvaluationType,
  GradeInstance,
  GradeStudent,
} from "../types/teacherGrades.types";
import styles from "./TeacherGradesPage.module.css";

const MIN_SCORE = 1;
const MAX_SCORE = 10;

const INITIAL_INSTANCES: GradeInstance[] = [
  {
    id: "inst-1",
    commissionId: "c1",
    subjectName: "Análisis Matemático I",
    commissionOrTable: "Com. 1K1",
    evaluationType: "PARCIAL",
    label: "Parcial 1",
    date: "2026-10-20",
    isClosed: false,
    unlockedCorrelatives: ["Análisis Matemático II", "Física I"],
  },
  {
    id: "inst-2",
    commissionId: "c1",
    subjectName: "Análisis Matemático I",
    commissionOrTable: "Com. 1K1",
    evaluationType: "RECUPERATORIO",
    label: "Recuperatorio Parcial 1",
    date: "2026-11-05",
    isClosed: false,
    unlockedCorrelatives: ["Análisis Matemático II", "Física I"],
  },
  {
    id: "inst-3",
    commissionId: "c2",
    subjectName: "Algoritmos y Estructuras de Datos",
    commissionOrTable: "Mesa Final - Turno Nov",
    evaluationType: "FINAL",
    label: "Examen Final",
    date: "2026-11-18",
    isClosed: false,
    unlockedCorrelatives: [
      "Sintaxis y Semántica de los Lenguajes",
      "Paradigmas de Programación",
    ],
  },
  {
    id: "inst-4",
    commissionId: "c2",
    subjectName: "Algoritmos y Estructuras de Datos",
    commissionOrTable: "Com. 1K2",
    evaluationType: "PARCIAL",
    label: "Parcial 1 (Acta cerrada de prueba)",
    date: "2026-09-30",
    isClosed: true,
    closedBy: "Laura Díaz",
    closedAt: "2026-10-02T19:00:00Z",
    unlockedCorrelatives: ["Sintaxis y Semántica de los Lenguajes"],
  },
];

const INITIAL_STUDENTS_BY_INSTANCE: Record<string, GradeStudent[]> = {
  "inst-1": [
    {
      enrollmentId: "e1",
      studentId: "s1",
      legajo: "30001",
      fullName: "Juan Pérez",
      score: 8,
    },
    {
      enrollmentId: "e2",
      studentId: "s2",
      legajo: "30005",
      fullName: "Sofía Martínez",
      score: 5,
    },
    {
      enrollmentId: "e3",
      studentId: "s3",
      legajo: "30012",
      fullName: "Lucas Fernández",
      score: null,
    },
  ],
  "inst-2": [
    {
      enrollmentId: "e2",
      studentId: "s2",
      legajo: "30005",
      fullName: "Sofía Martínez",
      score: null,
    },
  ],
  "inst-3": [
    {
      enrollmentId: "e4",
      studentId: "s1",
      legajo: "30001",
      fullName: "Juan Pérez",
      score: null,
    },
    {
      enrollmentId: "e5",
      studentId: "s3",
      legajo: "30012",
      fullName: "Lucas Fernández",
      score: 7,
    },
  ],
  "inst-4": [
    {
      enrollmentId: "e6",
      studentId: "s1",
      legajo: "30001",
      fullName: "Juan Pérez",
      score: 9,
      updatedBy: "Laura Díaz",
      updatedAt: "2026-10-02T18:45:00Z",
    },
  ],
};

function getCondition(
  score: number | null,
  type: EvaluationType,
): ApprovalCondition {
  if (score === null) return "PENDIENTE";
  if (type === "FINAL") {
    return score >= 6 ? "APROBADO" : "DESAPROBADO";
  }
  if (score >= 8) return "PROMOCIONADO";
  if (score >= 6) return "REGULAR";
  return "DESAPROBADO";
}

function getEvaluationTypeLabel(type: EvaluationType): string {
  if (type === "PARCIAL") return "Parcial";
  if (type === "RECUPERATORIO") return "Recuperatorio";
  return "Examen Final";
}

export default function TeacherGradesPage() {
  const user = useAuthenticatedUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const commissionFilter = searchParams.get("comision");
  const [instances, setInstances] =
    useState<GradeInstance[]>(INITIAL_INSTANCES);
  const [studentsByInstance, setStudentsByInstance] = useState<
    Record<string, GradeStudent[]>
  >(INITIAL_STUDENTS_BY_INSTANCE);

  const defaultInstanceId = useMemo(() => {
    if (commissionFilter) {
      const match = instances.find((i) => i.commissionId === commissionFilter);
      if (match) return match.id;
    }
    return instances[0].id;
  }, [commissionFilter, instances]);

  const [selectedInstanceId, setSelectedInstanceId] =
    useState<string>(defaultInstanceId);
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const instance = instances.find((i) => i.id === selectedInstanceId) ?? null;
  const students = instance ? (studentsByInstance[instance.id] ?? []) : [];

  useEffect(() => {
    setFormError(null);
    setSuccessMessage(null);
    setConnectionError(null);

    const initialDraft: Record<string, string> = {};
    for (const s of students) {
      initialDraft[s.enrollmentId] = s.score !== null ? String(s.score) : "";
    }
    setDraftScores(initialDraft);
  }, [selectedInstanceId, studentsByInstance]);

  function handleInstanceChange(newId: string) {
    setSelectedInstanceId(newId);
    const target = instances.find((i) => i.id === newId);
    if (target) {
      setSearchParams({ comision: target.commissionId });
    }
  }

  function handleScoreChange(enrollmentId: string, value: string) {
    setDraftScores((prev) => ({ ...prev, [enrollmentId]: value }));
    setFormError(null);
    setSuccessMessage(null);
  }

  function parseDraftScore(raw: string): {
    valid: boolean;
    value: number | null;
  } {
    const trimmed = raw.trim();
    if (trimmed === "") return { valid: true, value: null };

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      return { valid: false, value: null };
    }
    if (parsed < MIN_SCORE || parsed > MAX_SCORE) {
      return { valid: false, value: null };
    }
    return { valid: true, value: Math.round(parsed * 100) / 100 };
  }

  function validateAndBuildUpdates(): GradeStudent[] | null {
    if (!instance) {
      setFormError(
        "Acceso denegado: no estás asignado a la instancia seleccionada.",
      );
      return null;
    }

    if (instance.isClosed) {
      setFormError(
        "El acta se encuentra cerrada. Para modificar notas debés solicitar la reapertura al Administrador/Director.",
      );
      return null;
    }

    const enrolledIds = new Set(students.map((s) => s.enrollmentId));
    for (const key of Object.keys(draftScores)) {
      if (!enrolledIds.has(key)) {
        setFormError(
          "Se intentó cargar una nota a un alumno que no está inscripto en esta instancia.",
        );
        return null;
      }
    }

    const now = new Date().toISOString();
    const teacherName = getUserFullName(user);
    const updatedStudents: GradeStudent[] = [];

    for (const student of students) {
      const raw = draftScores[student.enrollmentId] ?? "";
      const { valid, value } = parseDraftScore(raw);

      if (!valid) {
        setFormError(
          `Nota inválida para ${student.fullName} (Legajo ${student.legajo}): debe estar entre ${MIN_SCORE} y ${MAX_SCORE}.`,
        );
        return null;
      }

      updatedStudents.push({
        ...student,
        score: value,
        updatedBy: value !== null ? teacherName : student.updatedBy,
        updatedAt: value !== null ? now : student.updatedAt,
      });
    }

    return updatedStudents;
  }

  function handleSaveGrades(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const updated = validateAndBuildUpdates();
    if (!updated || !instance) return;

    setStudentsByInstance((prev) => ({
      ...prev,
      [instance.id]: updated,
    }));

    const approvedCount = updated.filter((s) => {
      const cond = getCondition(s.score, instance.evaluationType);
      return cond === "APROBADO" || cond === "PROMOCIONADO";
    }).length;

    const correlativesNote =
      approvedCount > 0 && instance.unlockedCorrelatives?.length
        ? ` Se habilitaron correlatividades (${instance.unlockedCorrelatives.join(", ")}) para ${approvedCount} alumno(s).`
        : "";

    setSuccessMessage(
      `Notas guardadas correctamente por ${getUserFullName(user)}. Historial académico actualizado y alumnos notificados.${correlativesNote}`,
    );
  }

  function handleCloseAct() {
    setFormError(null);
    setSuccessMessage(null);

    const updated = validateAndBuildUpdates();
    if (!updated || !instance) return;

    const hasPending = updated.some((s) => s.score === null);
    if (hasPending) {
      setFormError(
        "No podés cerrar el acta mientras haya alumnos sin nota cargada.",
      );
      return;
    }

    const confirmed = window.confirm(
      "¿Seguro que querés cerrar el acta? Una vez cerrada, solo el Administrador/Director podrá reabrirla.",
    );
    if (!confirmed) return;

    setStudentsByInstance((prev) => ({
      ...prev,
      [instance.id]: updated,
    }));

    const now = new Date().toISOString();
    const teacherName = getUserFullName(user);

    setInstances((prev) =>
      prev.map((item) =>
        item.id === instance.id
          ? { ...item, isClosed: true, closedBy: teacherName, closedAt: now }
          : item,
      ),
    );

    setSuccessMessage(`Acta cerrada correctamente por ${teacherName}.`);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link to={APP_ROUTES.TEACHER_AREA} className={styles.backLink}>
            ← Volver al Panel Docente
          </Link>
          <h1 className={styles.title}>
            Carga de Notas y Estado de Aprobación
          </h1>
        </div>
      </header>

      {connectionError && (
        <div className={styles.errorBanner} role="alert">
          <span>{connectionError}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => setConnectionError(null)}
          >
            Reintentar
          </button>
        </div>
      )}

      {!instance ? (
        <div className={styles.errorBanner} role="alert">
          Acceso denegado: no estás asignado a la materia, comisión o mesa
          solicitada.
        </div>
      ) : (
        <main className={styles.container}>
          {/* Selector de instancia */}
          <section className={styles.controlsCard}>
            <div className={styles.field}>
              <label htmlFor="grade-instance">
                Materia, Comisión o Mesa de Examen
              </label>
              <select
                id="grade-instance"
                value={selectedInstanceId}
                onChange={(e) => handleInstanceChange(e.target.value)}
                className={styles.input}
              >
                {instances.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.subjectName} — {item.commissionOrTable} ({item.label})
                    {item.isClosed ? " [Cerrada]" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.metaBox}>
              <span className={styles.typeBadge}>
                {getEvaluationTypeLabel(instance.evaluationType)}
              </span>
              <span className={styles.metaText}>Fecha: {instance.date}</span>
              <span className={styles.metaText}>
                Rango válido: {MIN_SCORE} a {MAX_SCORE}
              </span>
            </div>
          </section>

          {/* Aviso de acta cerrada (7.5) */}
          {instance.isClosed && (
            <div className={styles.warningBanner} role="status">
              <strong>Acta cerrada</strong>
              {instance.closedBy && ` por ${instance.closedBy}`}. No es posible
              modificar las notas; para realizar cambios debés solicitar la
              reapertura al Administrador/Director.
            </div>
          )}

          {/* Tabla de carga de notas */}
          <form onSubmit={handleSaveGrades} className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h2>Alumnos inscriptos ({students.length})</h2>
              <span className={styles.criteriaHint}>
                {instance.evaluationType === "FINAL"
                  ? "Criterio Final: ≥ 6 Aprobado · < 6 Desaprobado"
                  : "Criterio Cursada: ≥ 8 Promocionado · 6–7 Regular · < 6 Desaprobado"}
              </span>
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Legajo</th>
                  <th>Alumno</th>
                  <th>
                    Nota ({MIN_SCORE}–{MAX_SCORE})
                  </th>
                  <th>Condición resultante</th>
                  <th>Impacto académico</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const raw = draftScores[student.enrollmentId] ?? "";
                  const { valid, value } = parseDraftScore(raw);
                  const condition = valid
                    ? getCondition(value, instance.evaluationType)
                    : "PENDIENTE";
                  const unlocks =
                    condition === "APROBADO" || condition === "PROMOCIONADO";

                  return (
                    <tr key={student.enrollmentId}>
                      <td>{student.legajo}</td>
                      <td>{student.fullName}</td>
                      <td>
                        <input
                          type="number"
                          min={MIN_SCORE}
                          max={MAX_SCORE}
                          step="0.5"
                          value={raw}
                          disabled={instance.isClosed}
                          onChange={(e) =>
                            handleScoreChange(
                              student.enrollmentId,
                              e.target.value,
                            )
                          }
                          placeholder="-"
                          className={`${styles.scoreInput} ${!valid ? styles.invalidInput : ""}`}
                        />
                      </td>
                      <td>
                        {!valid ? (
                          <span className={styles.badgeError}>
                            Fuera de rango
                          </span>
                        ) : (
                          <span className={styles[`badge_${condition}`]}>
                            {condition === "PENDIENTE" && "Pendiente"}
                            {condition === "DESAPROBADO" && "Desaprobado"}
                            {condition === "REGULAR" && "Regular"}
                            {condition === "PROMOCIONADO" && "Promocionado"}
                            {condition === "APROBADO" && "Aprobado"}
                          </span>
                        )}
                      </td>
                      <td className={styles.impactCell}>
                        {unlocks && instance.unlockedCorrelatives?.length
                          ? `Habilita: ${instance.unlockedCorrelatives.join(", ")}`
                          : condition === "REGULAR"
                            ? "Habilita rendir final"
                            : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {formError && (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            )}
            {successMessage && (
              <p className={styles.formSuccess} role="status">
                {successMessage}
              </p>
            )}

            {!instance.isClosed && (
              <div className={styles.footerActions}>
                <button
                  type="button"
                  className={styles.closeActBtn}
                  onClick={handleCloseAct}
                >
                  Cerrar acta
                </button>
                <button type="submit" className={styles.saveBtn}>
                  Guardar notas
                </button>
              </div>
            )}
          </form>
        </main>
      )}
    </div>
  );
}
