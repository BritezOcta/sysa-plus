import type { SubjectStatus } from "../../types/academicStatus.types";
import common from "./common.module.css";
import { STATUS_LABELS } from "./statusLabels";

const CLASSES: Record<SubjectStatus, string> = {
  APROBADA: common.chipOk,
  REGULAR: common.chipInfo,
  CURSANDO: common.chipWarn,
  LIBRE: common.chipDanger,
  DESAPROBADA: common.chipDanger,
  PENDIENTE: common.chipMuted,
};

export function StatusChip({ estado }: { estado: SubjectStatus }) {
  return <span className={`${common.chip} ${CLASSES[estado]}`}>{STATUS_LABELS[estado]}</span>;
}
