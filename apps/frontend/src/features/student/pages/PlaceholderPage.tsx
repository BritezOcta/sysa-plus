import { Icon } from "../../../components/Icon";
import { getNavItem } from "../nav";
import common from "../common.module.css";
import s from "./PlaceholderPage.module.css";

/** Pantalla provisoria para las opciones del menú que todavía no tienen contenido. */
export function PlaceholderPage({ id }: { id: string }) {
  const item = getNavItem(id);
  if (!item) return null;

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>{item.label}</h1>
          <p className={common.subtitle}>{item.description}</p>
        </div>
      </header>

      <section className={`${common.card} ${s.box}`}>
        <div className={s.icon}>
          <Icon name="construction" size={28} />
        </div>
        <h2>Pantalla en construcción</h2>
        <p>
          Esta opción ya está enlazada al menú en la ruta <code>{item.to}</code>. Reemplazá este
          componente por la pantalla real cuando esté lista.
        </p>
      </section>
    </div>
  );
}
