import { useMemo, useState } from "react";
import { Icon } from "../../../components/Icon";
import { useAcademicStatus } from "../../../hooks/useAcademicStatus";
import type { AcademicStatus, SubjectStatus, SubjectStatusRow } from "../../../types/academicStatus.types";
import { AcademicStatusFallback } from "../AcademicStatusFallback";
import { StatusChip } from "../StatusChip";
import { STATUS_LABELS } from "../statusLabels";
import common from "../common.module.css";

export function PlanMateriasPage() {
  const { state, retry } = useAcademicStatus();

  return (
    <div className={common.page}>
      {state.status === "ready" ? (
        <PlanMateriasContent data={state.data} />
      ) : (
        <>
          <PageHeader />
          <AcademicStatusFallback state={state} onRetry={retry} />
        </>
      )}
    </div>
  );
}

function PageHeader({ data }: { data?: AcademicStatus }) {
  const r = data?.summary;
  return (
    <header className={common.pageHeader}>
      <div>
        <h1 className={common.title}>Materias del plan</h1>
        <p className={common.subtitle}>
          {data ? `${data.student.studyPlan} · tu estado en cada materia` : "Plan de estudios y tu estado en cada materia"}
        </p>
      </div>
      {r && (
        <div className={common.toolbar}>
          <span className={`${common.chip} ${common.chipOk}`}>{r.approved} aprobadas</span>
          <span className={`${common.chip} ${common.chipInfo}`}>{r.regular} regulares</span>
          <span className={`${common.chip} ${common.chipWarn}`}>{r.inProgress} cursando</span>
          <span className={`${common.chip} ${common.chipMuted}`}>{r.pending} pendientes</span>
        </div>
      )}
    </header>
  );
}

function PlanMateriasContent({ data }: { data: AcademicStatus }) {
  const [texto, setTexto] = useState("");
  const [anio, setAnio] = useState("todos");
  const [estado, setEstado] = useState<"todos" | SubjectStatus>("todos");

  const plan = data.subjects;
  const todosLosAnios = [...new Set(plan.map((m) => m.year))].sort((a, b) => (a ?? 99) - (b ?? 99));

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return plan.filter(
      (m) =>
        (anio === "todos" || String(m.year) === anio) &&
        (estado === "todos" || m.status === estado) &&
        (q === "" || `${m.subjectCode} ${m.subjectName}`.toLowerCase().includes(q)),
    );
  }, [plan, texto, anio, estado]);

  const anios = todosLosAnios.filter((a) => filtradas.some((m) => m.year === a));

  return (
    <>
      <PageHeader data={data} />

      <div className={common.toolbar}>
        <label className={common.search}>
          <Icon name="search" size={18} />
          <input
            className={common.field}
            type="search"
            placeholder="Buscar por código o nombre"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Buscar materia"
          />
        </label>
        <select className={common.field} value={anio} onChange={(e) => setAnio(e.target.value)} aria-label="Filtrar por año">
          <option value="todos">Todos los años</option>
          {todosLosAnios.map((a) => (
            <option key={String(a)} value={String(a)}>
              {a === null ? "Sin año asignado" : `${a}° año`}
            </option>
          ))}
        </select>
        <select
          className={common.field}
          value={estado}
          onChange={(e) => setEstado(e.target.value as "todos" | SubjectStatus)}
          aria-label="Filtrar por estado"
        >
          <option value="todos">Todos los estados</option>
          {(Object.keys(STATUS_LABELS) as SubjectStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {plan.length === 0 && (
        <div className={`${common.card} ${common.empty}`}>Tu plan de estudios todavía no tiene materias cargadas.</div>
      )}
      {plan.length > 0 && anios.length === 0 && (
        <div className={`${common.card} ${common.empty}`}>No hay materias que coincidan con los filtros.</div>
      )}

      {anios.map((a) => {
        const delAnio = filtradas.filter((m) => m.year === a);
        return (
          <section key={String(a)} className={common.card}>
            <div className={common.sectionHead}>
              <h2>{a === null ? "Sin año asignado" : `${a}° año`}</h2>
              <span className={common.muted}>{delAnio.length} materias</span>
            </div>
            <div className={common.tableWrap}>
              <table className={common.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Materia</th>
                    <th>Cuatrimestre</th>
                    <th>Carga</th>
                    <th>Estado</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {delAnio.map((m) => (
                    <tr key={m.studyPlanSubjectId}>
                      <td>
                        <span className={common.code}>{m.subjectCode}</span>
                      </td>
                      <td>
                        <strong>{m.subjectName}</strong>
                      </td>
                      <td className={common.num}>{m.semester ? `${m.semester}° cuat.` : "—"}</td>
                      <td className={common.num}>{formatCarga(m)}</td>
                      <td>
                        <StatusChip estado={m.status} />
                        {m.approvedBy === "PROMOCION" && <div className={common.muted}>Promoción</div>}
                      </td>
                      <td className={common.num}>{m.grade ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}

function formatCarga(m: SubjectStatusRow): string {
  if (m.weeklyHours && m.totalHours) return `${m.weeklyHours} h/sem (${m.totalHours} h)`;
  if (m.weeklyHours) return `${m.weeklyHours} h/sem`;
  if (m.totalHours) return `${m.totalHours} h`;
  return "—";
}
