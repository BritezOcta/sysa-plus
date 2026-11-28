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
      <div className={s.cardHead}>
        <strong className={leido ? s.titleRead : s.titleUnread}>
          {tipo === "importante" ? "⚠️ " : ""}
          {titulo}
        </strong>
        <small className={s.date}>{formatNoticeDate(fecha)}</small>
      </div>
      <p className={`${s.body} ${truncate ? s.bodyTruncate : ""}`}>{cuerpo}</p>
      {!leido && <small className={s.newTag}>Nuevo</small>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}
