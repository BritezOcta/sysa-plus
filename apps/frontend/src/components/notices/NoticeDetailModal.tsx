import { useRef } from "react";
import type { NotificationItem } from "../../api/notifications.api";
import ModalShell from "../ui/ModalShell";
import modalStyles from "../academic/Modals.module.css";
import { formatNoticeDate } from "./formatNoticeDate";
import s from "./Notices.module.css";

interface NoticeDetailModalProps {
  notice: NotificationItem;
  onClose: () => void;
}

export default function NoticeDetailModal({ notice, onClose }: NoticeDetailModalProps) {
  const okBtnRef = useRef<HTMLButtonElement>(null);
  const importante = notice.tipo === "importante";

  return (
    <ModalShell
      titleId="notice-detail-title"
      describedById="notice-detail-body"
      title={`${importante ? "⚠️ " : ""}${notice.titulo}`}
      subtitle={`${importante ? "Aviso importante" : "Aviso informativo"} · ${formatNoticeDate(notice.fecha)}`}
      closeAriaLabel="Cerrar aviso"
      tone={importante ? "warning" : "default"}
      initialFocusRef={okBtnRef}
      onRequestClose={onClose}
    >
      <div className={modalStyles.formBody}>
        <p id="notice-detail-body" className={s.detailBody}>
          {notice.cuerpo}
        </p>
        <div className={modalStyles.modalFooter}>
          <button
            ref={okBtnRef}
            type="button"
            className={modalStyles.primaryBtn}
            onClick={onClose}
          >
            Entendido
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
