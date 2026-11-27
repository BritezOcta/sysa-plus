import { useState } from "react";
import { Link } from "react-router";
import { useAuthenticatedUser } from "../auth/AuthContext";
import { ChangePasswordForm } from "../components/account/ChangePasswordForm";
import { ROLE_HOME_ROUTES } from "../constants";
import common from "../features/student/common.module.css";

/** Cambio de contraseña para Profesor y Administrador (el alumno lo tiene en su menú). */
export default function ChangePasswordPage() {
  const user = useAuthenticatedUser();
  // Misma decisión que AccountShell, tomada al entrar: el envoltorio no cambia al guardar,
  // así el formulario conserva el mensaje de éxito.
  const [bare] = useState(user.mustChangePassword);

  const content = (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Cambio de contraseña</h1>
          <p className={common.subtitle}>Actualizá la contraseña de tu cuenta</p>
        </div>
        {!user.mustChangePassword && (
          <Link to={ROLE_HOME_ROUTES[user.role]} className={`${common.btn} ${common.btnGhost}`}>
            Volver
          </Link>
        )}
      </header>
      <ChangePasswordForm />
    </div>
  );

  // Con la contraseña restablecida se muestra sin el marco común (ver AccountShell), así que trae su propio tema.
  if (bare) {
    return (
      <div className="sysa-student" data-theme="light" style={{ minHeight: "100vh", padding: 24 }}>
        {content}
      </div>
    );
  }
  return content;
}
