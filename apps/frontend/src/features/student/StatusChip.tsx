import type { EstadoMateria } from "../../data/mockStudentData";
import common from "./common.module.css";

const MAP: Record<EstadoMateria, { label: string; cls: string }> = {
  aprobada: { label: "Aprobada", cls: common.chipOk },
  regular: { label: "Regular", cls: common.chipInfo },
  cursando: { label: "Cursando", cls: common.chipWarn },
  pendiente: { label: "Pendiente", cls: common.chipMuted },
};

export function StatusChip({ estado }: { estado: EstadoMateria }) {
  const { label, cls } = MAP[estado];
  return <span className={`${common.chip} ${cls}`}>{label}</span>;
}
