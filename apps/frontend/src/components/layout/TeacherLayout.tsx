// apps/frontend/src/components/layout/TeacherLayout.tsx
import { Link, Outlet } from "react-router";
import { APP_ROUTES } from "../../constants";
import { useAuth } from "../../auth/AuthContext";
import NotificationBell from "../ui/NotificationBell";

export default function TeacherLayout() {
  const { user, logout } = useAuth();

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1.5rem",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Link
          to="/profesor"
          style={{ textDecoration: "none", fontWeight: 700 }}
        >
          Panel Docente · {user ? `${user.firstName} ${user.lastName}` : ""}
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <NotificationBell />
          <Link to={APP_ROUTES.CHANGE_PASSWORD}>Cambiar contraseña</Link>
          <button type="button" onClick={() => void logout()}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
