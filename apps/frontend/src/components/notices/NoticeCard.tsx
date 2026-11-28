import { formatNoticeDate } from "./formatNoticeDate";
import s from "./Notices.module.css";

interface NoticeCardProps {
  titulo: string;
  cuerpo: string;
  tipo: "info" | "importante";
  fecha: string;
  leido: boolean;
  onClick?: () => void;
  truncate?: boolean;
}

export default function NoticeCard({
  titulo,
  cuerpo,
  tipo,
  fecha,
  leido,
  onClick,
  truncate = false,
}: NoticeCardProps) {
  const className = [
    s.card,
    tipo === "importante" ? s.cardImportant : s.cardInfo,
    leido ? "" : s.cardUnread,
    onClick ? s.cardClickable : "",
  ].join(" ");

  const content = (
    <>
      <span className={s.cardHead}>
        <strong className={leido ? s.titleRead : s.titleUnread}>
          {tipo === "importante" ? "⚠️ " : ""}
          {titulo}
        </strong>
        <small className={s.date}>{formatNoticeDate(fecha)}</small>
      </span>
      <span className={`${s.body} ${truncate ? s.bodyTruncate : ""}`}>{cuerpo}</span>
      {!leido && <small className={s.newTag}>Nuevo</small>}
    </>
  );

  if (onClick) {
    // Nombre accesible corto: el cuerpo completo se lee al abrir el aviso.
    const label = `${tipo === "importante" ? "Aviso importante" : "Aviso"}: ${titulo}${leido ? "" : " (nuevo)"}`;
    return (
      <button type="button" className={className} onClick={onClick} aria-label={label}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}
