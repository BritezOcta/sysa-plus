import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  notificationsApi,
  type NotificationItem,
} from "../../api/notifications.api";

interface StudentNotificationsValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const StudentNotificationsContext =
  createContext<StudentNotificationsValue | null>(null);

/** Única fuente de verdad de los avisos del alumno: se carga una vez al entrar al área. */
export function StudentNotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  // Se toma del servidor: la lista viene limitada y puede no incluir todos los no leídos.
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    notificationsApi
      .getMyNotifications()
      .then((data) => {
        if (!active) return;
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {
        if (active) setError("No se pudieron cargar los avisos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await notificationsApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leido: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await notificationsApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, leido: true })));
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({ notifications, unreadCount, loading, error, markAsRead, markAllAsRead }),
    [notifications, unreadCount, loading, error, markAsRead, markAllAsRead],
  );

  return (
    <StudentNotificationsContext.Provider value={value}>
      {children}
    </StudentNotificationsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStudentNotifications():StudentNotificationsValue {
  const ctx = useContext(StudentNotificationsContext);
  if (!ctx) {
    throw new Error(
      "useStudentNotifications debe usarse dentro de <StudentNotificationsProvider>",
    );
  }
  return ctx;
}
