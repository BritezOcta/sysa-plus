import { ChangePasswordForm } from "../../../components/account/ChangePasswordForm";
import common from "../common.module.css";

export function CambioPasswordPage() {
  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Cambio de contraseña</h1>
          <p className={common.subtitle}>Actualizá la contraseña de tu cuenta</p>
        </div>
      </header>
      <ChangePasswordForm />
    </div>
  );
}
