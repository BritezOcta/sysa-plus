import { useState } from "react";
import { Icon } from "../../../components/Icon";
import { MESAS, formatFecha, getMateria } from "../../../data/mockStudentData";
import common from "../common.module.css";
import s from "./InscripcionExamenPage.module.css";

export function InscripcionExamenPage() {
  const [anotadas, setAnotadas] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState<string | null>(null);

  // TODO: reemplazar por POST/DELETE a tu API (Express + Prisma)
  const toggle = (id: string, nombre: string) => {
    const next = new Set(anotadas);
    if (next.has(id)) {
      next.delete(id);
      setMensaje(`Te diste de baja de la mesa de ${nombre}.`);
    } else {
      next.add(id);
      setMensaje(`Quedaste inscripto/a en la mesa de ${nombre}.`);
    }
    setAnotadas(next);
  };

  const mesas = [...MESAS].sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Inscripción a examen</h1>
          <p className={common.subtitle}>
            Mesas de diciembre 2026 · Podés anotarte hasta 48 horas antes
          </p>
        </div>
        <span className={`${common.chip} ${common.chipInfo}`}>
          {anotadas.size} {anotadas.size === 1 ? "inscripción" : "inscripciones"}
        </span>
      </header>

      {mensaje && (
        <div className={s.notice} role="status">
          <Icon name="check" size={18} />
          {mensaje}
        </div>
      )}

      <div className={s.list}>
        {mesas.map((mesa) => {
          const materia = getMateria(mesa.codigo);
          if (!materia) return null;
          const habilitada = materia.estado === "regular";
          const anotada = anotadas.has(mesa.id);
          const motivo =
            materia.estado === "aprobada"
              ? "Ya aprobaste esta materia"
              : materia.estado === "cursando"
                ? "Todavía estás cursando esta materia"
                : "Necesitás regularizar la materia";

          return (
            <article key={mesa.id} className={`${common.card} ${s.mesa} ${!habilitada ? s.off : ""}`}>
              <div className={s.fecha}>
                <span className={s.dia}>{formatFecha(mesa.fecha).split(" ")[0]}</span>
                <span className={s.mes}>{formatFecha(mesa.fecha, true).split(" ").slice(-1)[0]}</span>
              </div>
              <div className={s.info}>
                <div className={s.titulo}>
                  <span className={common.code}>{mesa.codigo}</span>
                  <strong>{materia.nombre}</strong>
                </div>
                <p className={s.meta}>
                  {formatFecha(mesa.fecha, true)} · {mesa.hora} hs · {mesa.aula} · {mesa.llamado}
                </p>
              </div>
              <div className={s.accion}>
                {habilitada ? (
                  <button
                    type="button"
                    className={`${common.btn} ${anotada ? common.btnGhost : common.btnPrimary}`}
                    onClick={() => toggle(mesa.id, materia.nombre)}
                  >
                    {anotada ? "Darme de baja" : "Inscribirme"}
                  </button>
                ) : (
                  <span className={`${common.chip} ${common.chipMuted}`}>{motivo}</span>
                )}
                {anotada && <span className={`${common.chip} ${common.chipOk}`}>Inscripto/a</span>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
