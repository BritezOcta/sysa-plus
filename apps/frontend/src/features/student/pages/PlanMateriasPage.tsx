import { useMemo, useState } from "react";
import { Icon } from "../../../components/Icon";
import { PLAN, resumenAcademico, type EstadoMateria } from "../../../data/mockStudentData";
import { StatusChip } from "../StatusChip";
import common from "../common.module.css";

export function PlanMateriasPage() {
  const [texto, setTexto] = useState("");
  const [anio, setAnio] = useState("todos");
  const [estado, setEstado] = useState<"todos" | EstadoMateria>("todos");

  const r = resumenAcademico();

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return PLAN.filter(
      (m) =>
        (anio === "todos" || m.anio === Number(anio)) &&
        (estado === "todos" || m.estado === estado) &&
        (q === "" || `${m.codigo} ${m.nombre}`.toLowerCase().includes(q)),
    );
  }, [texto, anio, estado]);

  const anios = [...new Set(filtradas.map((m) => m.anio))].sort((a, b) => a - b);

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Materias del plan</h1>
          <p className={common.subtitle}>Plan de estudios y tu estado en cada materia</p>
        </div>
        <div className={common.toolbar}>
          <span className={`${common.chip} ${common.chipOk}`}>{r.aprobadas} aprobadas</span>
          <span className={`${common.chip} ${common.chipInfo}`}>{r.regulares} regulares</span>
          <span className={`${common.chip} ${common.chipWarn}`}>{r.cursando} cursando</span>
          <span className={`${common.chip} ${common.chipMuted}`}>{r.pendientes} pendientes</span>
        </div>
      </header>

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
        <select
          className={common.field}
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          aria-label="Filtrar por año"
        >
          <option value="todos">Todos los años</option>
          <option value="1">1° año</option>
          <option value="2">2° año</option>
        </select>
        <select
          className={common.field}
          value={estado}
          onChange={(e) => setEstado(e.target.value as "todos" | EstadoMateria)}
          aria-label="Filtrar por estado"
        >
          <option value="todos">Todos los estados</option>
          <option value="aprobada">Aprobadas</option>
          <option value="regular">Regulares</option>
          <option value="cursando">Cursando</option>
          <option value="pendiente">Pendientes</option>
        </select>
      </div>

      {anios.length === 0 && (
        <div className={`${common.card} ${common.empty}`}>
          No hay materias que coincidan con los filtros.
        </div>
      )}

      {anios.map((a) => (
        <section key={a} className={common.card}>
          <div className={common.sectionHead}>
            <h2>{a}° año</h2>
            <span className={common.muted}>
              {filtradas.filter((m) => m.anio === a).length} materias
            </span>
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
                {filtradas
                  .filter((m) => m.anio === a)
                  .map((m) => (
                    <tr key={m.codigo}>
                      <td>
                        <span className={common.code}>{m.codigo}</span>
                      </td>
                      <td>
                        <strong>{m.nombre}</strong>
                      </td>
                      <td className={common.num}>{m.cuatrimestre}° cuat.</td>
                      <td className={common.num}>
                        {m.horasSemana} h/sem ({m.horasSemana * 16} h)
                      </td>
                      <td>
                        <StatusChip estado={m.estado} />
                      </td>
                      <td className={common.num}>{m.nota ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
