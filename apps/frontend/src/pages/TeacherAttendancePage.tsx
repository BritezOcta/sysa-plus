import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuthenticatedUser } from "../auth/AuthContext";
import { APP_ROUTES } from "../constants";
import { getUserFullName } from "../helpers/UserDisplayHelper";
import type {
  AttendanceCommission,
  AttendanceCondition,
  AttendanceStatus,
  AttendanceStudent,
  ClassAttendanceRecord,
} from "../types/teacherAttendance.types";
import styles from "./TeacherAttendancePage.module.css";

const MIN_REGULAR_PERCENT = 75;
const RISK_THRESHOLD_PERCENT = 80;

const MOCK_COMMISSIONS: AttendanceCommission[] = [
  {
    id: "c1",
    subjectName: "Análisis Matemático I",
    commissionCode: "1K1",
    periodStart: "2026-08-01",
    periodEnd: "2026-12-15",
  },
  {
    id: "c2",
    subjectName: "Algoritmos y Estructuras de Datos",
    commissionCode: "1K2",
    periodStart: "2026-08-01",
    periodEnd: "2026-12-15",
  },
];

const MOCK_STUDENTS: Record<string, AttendanceStudent[]> = {
  c1: [
    {
      enrollmentId: "e1",
      studentId: "s1",
      legajo: "30001",
      fullName: "Juan Pérez",
      previousTotalClasses: 10,
      previousAttendedClasses: 9,
    },
    {
      enrollmentId: "e2",
      studentId: "s2",
      legajo: "30005",
      fullName: "Sofía Martínez",
      previousTotalClasses: 10,
      previousAttendedClasses: 7,
    },
    {
      enrollmentId: "e3",
      studentId: "s3",
      legajo: "30012",
      fullName: "Lucas Fernández",
      previousTotalClasses: 10,
      previousAttendedClasses: 8,
    },
  ],
  c2: [
    {
      enrollmentId: "e4",
      studentId: "s1",
      legajo: "30001",
      fullName: "Juan Pérez",
      previousTotalClasses: 8,
      previousAttendedClasses: 8,
    },
  ],
};

const INITIAL_SAVED_CLASSES: Record<string, ClassAttendanceRecord[]> = {
  c1: [
    {
      date: "2026-10-15",
      topic: "Derivadas parciales",
      records: { e1: "PRESENTE", e2: "AUSENTE", e3: "PRESENTE" },
      updatedBy: "Laura Díaz",
      updatedAt: "2026-10-15T20:15:00Z",
    },
  ],
  c2: [],
};

function getCondition(percentage: number): AttendanceCondition {
  if (percentage < MIN_REGULAR_PERCENT) return "LIBRE";
  if (percentage < RISK_THRESHOLD_PERCENT) return "EN_RIESGO";
  return "REGULAR";
}

export default function TeacherAttendancePage() {
  const user = useAuthenticatedUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCommission =
    searchParams.get("comision") ?? MOCK_COMMISSIONS[0].id;
  const todayIso = new Date().toISOString().slice(0, 10);

  const [selectedCommissionId, setSelectedCommissionId] =
    useState(initialCommission);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [sessionTopic, setSessionTopic] = useState("");
  const [savedClassesByCommission, setSavedClassesByCommission] = useState<
    Record<string, ClassAttendanceRecord[]>
  >(INITIAL_SAVED_CLASSES);

  const [draftStatuses, setDraftStatuses] = useState<
    Record<string, AttendanceStatus | "">
  >({});
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const commission =
    MOCK_COMMISSIONS.find((c) => c.id === selectedCommissionId) ?? null;
  const students = commission ? (MOCK_STUDENTS[commission.id] ?? []) : [];
  const savedClasses = commission
    ? (savedClassesByCommission[commission.id] ?? [])
    : [];

  const existingRecord = useMemo(
    () => savedClasses.find((cls) => cls.date === selectedDate) ?? null,
    [savedClasses, selectedDate],
  );

  const isDateOutOfPeriod = useMemo(() => {
    if (!commission || !selectedDate) return false;
    return (
      selectedDate < commission.periodStart ||
      selectedDate > commission.periodEnd
    );
  }, [commission, selectedDate]);

  useEffect(() => {
    setFormError(null);
    setSuccessMessage(null);
    setIsEditingExisting(false);

    if (existingRecord) {
      setSessionTopic(existingRecord.topic);
      setDraftStatuses(existingRecord.records);
    } else {
      setSessionTopic("");
      const emptyDraft: Record<string, AttendanceStatus | ""> = {};
      for (const s of students) {
        emptyDraft[s.enrollmentId] = "";
      }
      setDraftStatuses(emptyDraft);
    }
  }, [selectedCommissionId, selectedDate, existingRecord]);

  function handleCommissionChange(newId: string) {
    setSelectedCommissionId(newId);
    setSearchParams({ comision: newId });
  }

  function handleStatusChange(enrollmentId: string, status: AttendanceStatus) {
    setDraftStatuses((prev) => ({ ...prev, [enrollmentId]: status }));
    setFormError(null);
    setSuccessMessage(null);
  }

  function handleMarkAllPresent() {
    const allPresent: Record<string, AttendanceStatus> = {};
    for (const s of students) {
      allPresent[s.enrollmentId] = "PRESENTE";
    }
    setDraftStatuses(allPresent);
    setFormError(null);
  }

  function calculateStudentPercentage(student: AttendanceStudent): number {
    const currentStatus = draftStatuses[student.enrollmentId];
    const countsAsExtraClass = !existingRecord && currentStatus !== "";
    const total = student.previousTotalClasses + (countsAsExtraClass ? 1 : 0);

    if (total === 0) return 100;

    let attended = student.previousAttendedClasses;
    if (
      countsAsExtraClass &&
      (currentStatus === "PRESENTE" || currentStatus === "JUSTIFICADO")
    ) {
      attended += 1;
    }

    return Math.round((attended / total) * 100);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!commission) {
      setFormError(
        "Acceso denegado: no estás asignado a la comisión seleccionada.",
      );
      return;
    }

    if (isDateOutOfPeriod) {
      setFormError(
        `La fecha debe estar dentro del período de cursada vigente (${commission.periodStart} al ${commission.periodEnd}).`,
      );
      return;
    }

    if (existingRecord && !isEditingExisting) {
      setFormError(
        'Ya existe un registro de asistencia para esta fecha. Hacé clic en "Editar registro existente" para modificarlo.',
      );
      return;
    }

    const missingStudents = students.filter(
      (s) => !draftStatuses[s.enrollmentId],
    );
    if (missingStudents.length > 0) {
      setFormError(
        `Registro incompleto: falta indicar la asistencia de ${missingStudents.length} alumno(s) antes de guardar.`,
      );
      return;
    }

    const completedRecords: Record<string, AttendanceStatus> = {};
    for (const s of students) {
      completedRecords[s.enrollmentId] = draftStatuses[
        s.enrollmentId
      ] as AttendanceStatus;
    }

    const newRecord: ClassAttendanceRecord = {
      date: selectedDate,
      topic: sessionTopic.trim() || "Clase sin tema especificado",
      records: completedRecords,
      updatedBy: getUserFullName(user),
      updatedAt: new Date().toISOString(),
    };

    setSavedClassesByCommission((prev) => {
      const currentList = prev[commission.id] ?? [];
      const filtered = currentList.filter((item) => item.date !== selectedDate);
      return { ...prev, [commission.id]: [newRecord, ...filtered] };
    });

    setIsEditingExisting(false);
    setSuccessMessage(
      `Asistencia del ${selectedDate} guardada correctamente por ${getUserFullName(user)}.`,
    );
  }

  const inputsDisabled = Boolean(
    (existingRecord && !isEditingExisting) || isDateOutOfPeriod,
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link to={APP_ROUTES.TEACHER_AREA} className={styles.backLink}>
            ← Volver al Panel Docente
          </Link>
          <h1 className={styles.title}>Registro y Consulta de Asistencias</h1>
        </div>
      </header>

      {!commission ? (
        <div className={styles.errorBanner} role="alert">
          Acceso denegado: no estás asignado a la materia o comisión solicitada.
        </div>
      ) : (
        <main className={styles.container}>
          <section className={styles.controlsCard}>
            <div className={styles.field}>
              <label htmlFor="att-commission">Materia y Comisión</label>
              <select
                id="att-commission"
                value={selectedCommissionId}
                onChange={(e) => handleCommissionChange(e.target.value)}
                className={styles.input}
              >
                {MOCK_COMMISSIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subjectName} — Com. {c.commissionCode}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="att-date">Fecha de la clase</label>
              <input
                id="att-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={styles.input}
              />
              <span className={styles.hint}>
                Período vigente: {commission.periodStart} a{" "}
                {commission.periodEnd}
              </span>
            </div>

            <div className={styles.field}>
              <label htmlFor="att-topic">Tema visto (opcional)</label>
              <input
                id="att-topic"
                type="text"
                value={sessionTopic}
                onChange={(e) => setSessionTopic(e.target.value)}
                disabled={inputsDisabled}
                placeholder="Ej: Unidad 3 - Integrales"
                className={styles.input}
              />
            </div>
          </section>

          {isDateOutOfPeriod && (
            <div className={styles.errorBanner} role="alert">
              Fecha fuera del período de cursada vigente (
              {commission.periodStart} al {commission.periodEnd}). Seleccioná
              una fecha válida para registrar asistencia.
            </div>
          )}

          {existingRecord && !isEditingExisting && !isDateOutOfPeriod && (
            <div className={styles.warningBanner} role="status">
              <div>
                <strong>
                  Ya existe un registro cargado para el {existingRecord.date}
                </strong>{" "}
                (última edición por {existingRecord.updatedBy}).
              </div>
              <button
                type="button"
                className={styles.editBtn}
                onClick={() => setIsEditingExisting(true)}
              >
                Editar registro existente
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h2>Listado de Alumnos ({students.length})</h2>
              {!inputsDisabled && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleMarkAllPresent}
                >
                  Marcar todos presentes
                </button>
              )}
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Legajo</th>
                  <th>Alumno</th>
                  <th>Estado ({selectedDate})</th>
                  <th>% Acumulado</th>
                  <th>Condición</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const pct = calculateStudentPercentage(student);
                  const condition = getCondition(pct);
                  const currentVal = draftStatuses[student.enrollmentId] ?? "";

                  return (
                    <tr key={student.enrollmentId}>
                      <td>{student.legajo}</td>
                      <td>{student.fullName}</td>
                      <td>
                        <div className={styles.statusGroup}>
                          {(
                            [
                              "PRESENTE",
                              "AUSENTE",
                              "JUSTIFICADO",
                            ] as AttendanceStatus[]
                          ).map((st) => (
                            <label key={st} className={styles.radioLabel}>
                              <input
                                type="radio"
                                name={`status-${student.enrollmentId}`}
                                value={st}
                                checked={currentVal === st}
                                disabled={inputsDisabled}
                                onChange={() =>
                                  handleStatusChange(student.enrollmentId, st)
                                }
                              />
                              {st === "PRESENTE"
                                ? "Presente"
                                : st === "AUSENTE"
                                  ? "Ausente"
                                  : "Justificado"}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td>
                        <strong>{pct}%</strong>
                      </td>
                      <td>
                        {condition === "REGULAR" && (
                          <span className={styles.badgeRegular}>Regular</span>
                        )}
                        {condition === "EN_RIESGO" && (
                          <span className={styles.badgeRisk}>
                            En riesgo (límite {MIN_REGULAR_PERCENT}%)
                          </span>
                        )}
                        {condition === "LIBRE" && (
                          <span className={styles.badgeLibre}>
                            Libre por inasistencias
                          </span>
                        )}
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

            {!inputsDisabled && (
              <div className={styles.footerActions}>
                <button type="submit" className={styles.saveBtn}>
                  {isEditingExisting
                    ? "Actualizar asistencia"
                    : "Guardar asistencia"}
                </button>
              </div>
            )}
          </form>
        </main>
      )}
    </div>
  );
}
