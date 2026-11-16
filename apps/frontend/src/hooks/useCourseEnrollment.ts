import { useState } from "react";
import {
  type CommissionOption,
  type SubjectOption,
} from "../components/enrollment/SubjectList";
import { type EnrollmentItem } from "../components/enrollment/EnrollmentSection";
import type { ToastMessage } from "../types";

interface ModalState {
  title: string;
  message: string;
  isConfirmation?: boolean;
  onConfirm?: () => void;
}

const INITIAL_SUBJECTS: SubjectOption[] = [
  { id: "mat-1", name: "Análisis Matemático I", year: 1, period: 1 },
  { id: "ayed", name: "Algoritmos y Estructuras de Datos", year: 1, period: 1 },
  { id: "sistemas", name: "Sistemas y Organizaciones", year: 1, period: 1 },
  { id: "fis-1", name: "Física I", year: 1, period: 1 },
  { id: "mat-2", name: "Análisis Matemático II", year: 2, period: 1 },
];

const INITIAL_COMMISSIONS: CommissionOption[] = [
  {
    id: "c1",
    subjectId: "mat-1",
    name: "1K1",
    scheduleText: "Lunes 18:00 a 22:00 hs",
    day: "Lunes",
    startHour: 18,
    endHour: 22,
    teacher: "Ing. Roberto Gómez",
    enrolledCount: 25,
    quota: 30,
  },
  {
    id: "c2",
    subjectId: "ayed",
    name: "1K2",
    scheduleText: "Martes 18:00 a 22:00 hs",
    day: "Martes",
    startHour: 18,
    endHour: 22,
    teacher: "Lic. Carla Pérez",
    enrolledCount: 18,
    quota: 30,
  },
  {
    id: "c3",
    subjectId: "sistemas",
    name: "1K3 (Choca con Algoritmos)",
    scheduleText: "Martes 19:00 a 22:00 hs",
    day: "Martes",
    startHour: 19,
    endHour: 22,
    teacher: "Ing. Laura Díaz",
    enrolledCount: 12,
    quota: 30,
  },
  {
    id: "c4",
    subjectId: "fis-1",
    name: "1K1 (Sin cupo)",
    scheduleText: "Miércoles 18:00 a 22:00 hs",
    day: "Miércoles",
    startHour: 18,
    endHour: 22,
    teacher: "Dr. Martín Silva",
    enrolledCount: 30,
    quota: 30,
  },
  {
    id: "c5",
    subjectId: "mat-2",
    name: "2K1",
    scheduleText: "Jueves 18:00 a 22:00 hs",
    day: "Jueves",
    startHour: 18,
    endHour: 22,
    teacher: "Ing. Roberto Gómez",
    enrolledCount: 10,
    quota: 30,
  },
];

const CORRELATIVITIES: Record<string, string> = {
  "mat-2": "Análisis Matemático I (Aprobada)",
};

export function useCourseEnrollment() {
  const [studentStatus, setStudentStatus] = useState<"ACTIVO" | "INACTIVO">(
    "ACTIVO",
  );
  const [periodOpen, setPeriodOpen] = useState<boolean>(true);
  const [simulateServerError, setSimulateServerError] =
    useState<boolean>(false);

  const [approvedSubjects] = useState<string[]>([]);

  const [commissions, setCommissions] =
    useState<CommissionOption[]>(INITIAL_COMMISSIONS);
  const [myEnrollments, setMyEnrollments] = useState<
    (EnrollmentItem & { commissionData: CommissionOption })[]
  >([]);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  // 1. Validar reglas antes de pedir confirmación de inscripción
  function handleRequestEnroll(
    subject: SubjectOption,
    commission: CommissionOption,
  ) {
    if (!periodOpen) {
      setModalState({
        title: "Período de inscripción cerrado",
        message:
          "La inscripción a cursadas no se encuentra habilitada en este momento.",
      });
      return;
    }

    if (studentStatus !== "ACTIVO") {
      setModalState({
        title: "Alumno dado de baja o inactivo",
        message:
          "Tu estado académico no permite realizar inscripciones. Comunicate con Departamento de Alumnos.",
      });
      return;
    }

    const requiredSubject = CORRELATIVITIES[subject.id];
    if (requiredSubject && !approvedSubjects.includes("mat-1")) {
      setModalState({
        title: "Correlatividades no cumplidas",
        message: `No podés inscribirte a ${subject.name}. Debés tener previamente: ${requiredSubject}.`,
      });
      return;
    }

    if (commission.enrolledCount >= commission.quota) {
      setModalState({
        title: "Cupo completo en la comisión",
        message: `La comisión ${commission.name} de ${subject.name} ya no cuenta con vacantes disponibles.`,
      });
      return;
    }

    const conflictingEnrollment = myEnrollments.find(
      (item) =>
        item.commissionData.day === commission.day &&
        commission.startHour < item.commissionData.endHour &&
        commission.endHour > item.commissionData.startHour,
    );

    if (conflictingEnrollment) {
      setModalState({
        title: "Superposición de horarios",
        message: `El horario de esta comisión (${commission.scheduleText}) se superpone con ${conflictingEnrollment.subject.name}. Por favor elegí otra comisión.`,
      });
      return;
    }

    setModalState({
      title: "Confirmar inscripción a cursada",
      message: `¿Confirmás tu inscripción a ${subject.name} en la comisión ${commission.name} (${commission.scheduleText}) con ${commission.teacher}?`,
      isConfirmation: true,
      onConfirm: () => executeEnrollment(subject, commission),
    });
  }

  function executeEnrollment(
    subject: SubjectOption,
    commission: CommissionOption,
  ) {
    if (simulateServerError) {
      setModalState({
        title: "Error de conexión con el servidor",
        message:
          "No se pudo registrar la inscripción por un problema de red. ¿Querés reintentar?",
        isConfirmation: true,
        onConfirm: () => {
          setSimulateServerError(false);
          executeEnrollment(subject, commission);
        },
      });
      return;
    }

    setMyEnrollments((prev) => [
      ...prev,
      {
        id: subject.id,
        subject: { name: subject.name },
        commission: {
          id: commission.id,
          name: commission.name,
          scheduleText: commission.scheduleText,
          teacher: commission.teacher,
        },
        commissionData: commission,
      },
    ]);

    setCommissions((prev) =>
      prev.map((c) =>
        c.id === commission.id
          ? { ...c, enrolledCount: c.enrolledCount + 1 }
          : c,
      ),
    );

    setModalState(null);

    setToasts((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        title: "Inscripción exitosa",
        message: `${subject.name} - Comisión ${commission.name} (${commission.scheduleText}) - Docente: ${commission.teacher}`,
        type: "success",
      },
    ]);
  }

  function handleRequestCancel(item: EnrollmentItem) {
    if (!periodOpen) {
      setModalState({
        title: "Período cerrado",
        message:
          "No podés darte de baja porque el período de inscripción ya cerró.",
      });
      return;
    }

    setModalState({
      title: "Cancelar inscripción",
      message: `¿Estás seguro de que querés cancelar tu inscripción a ${item.subject.name} (Comisión ${item.commission.name})?`,
      isConfirmation: true,
      onConfirm: () => executeCancel(item),
    });
  }

  function executeCancel(item: EnrollmentItem) {
    setMyEnrollments((prev) => prev.filter((e) => e.id !== item.id));

    setCommissions((prev) =>
      prev.map((c) =>
        c.id === item.commission.id
          ? { ...c, enrolledCount: Math.max(0, c.enrolledCount - 1) }
          : c,
      ),
    );

    setModalState(null);

    setToasts((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        title: "Inscripción cancelada",
        message: `Se dio de baja tu inscripción en ${item.subject.name}.`,
        type: "info",
      },
    ]);
  }

  return {
    subjects: INITIAL_SUBJECTS,
    commissions,
    myEnrollments,
    modalState,
    dismissModal: () => setModalState(null),
    toasts,
    dismissToast,
    studentStatus,
    toggleStudentStatus: () =>
      setStudentStatus((prev) => (prev === "ACTIVO" ? "INACTIVO" : "ACTIVO")),
    periodOpen,
    togglePeriodOpen: () => setPeriodOpen((prev) => !prev),
    simulateServerError,
    setSimulateServerError,
    toggleServerError: () => setSimulateServerError((prev) => !prev),
    handleRequestEnroll,
    handleRequestCancel,
  };
}
