# Layout unificado para Administrador y Profesor

## Intención

Hoy SysA+ parece tres aplicaciones distintas:

- **Alumno:** barra lateral oscura, tarjetas y variables de tema `--sa-*`.
- **Administrador:** barra superior `TopNavbar` con botones sueltos y paleta gris pizarra propia.
- **Profesor:** sin layout; cada página arma su propio encabezado, con colores fijos.

El objetivo es que los tres roles se vean como **una sola aplicación**, tomando la vista del alumno como referencia.

**Condición de la persona: "que no rompa nada".** Todas las funciones que hoy existen en admin y profesor tienen que seguir disponibles y funcionando igual. La vista del alumno no tiene que cambiar.

## Objetivos

- Un único marco (`AppShell`) para los tres roles: barra lateral con menú propio del rol, barra superior con la ubicación actual, usuario, cambio de contraseña y salir, y menú móvil.
- Admin y profesor usan la paleta y la tipografía del alumno, en **modo claro**.
- El contenido de las páginas de admin y profesor (tablas, botones, formularios, modales, tarjetas) pasa a las variables `--sa-*`, para que no quede un "marco nuevo con contenido viejo".

## No objetivos

- **Modo oscuro para admin y profesor:** queda para una etapa posterior. En esos roles no se muestra el botón de tema.
- Cambiar lo que hace cualquier pantalla: datos, validaciones, flujos.
- Rediseñar la estructura interna de las páginas. El canvas curricular, los modales y las tablas conservan su disposición; solo cambian colores, bordes, radios y tipografía.
- Pantallas nuevas.

## Anti-objetivos (sería un fracaso aunque "funcione")

- Que se pierda alguna acción de la barra actual del admin: los accesos a las 7 secciones, "Recargar datos", "Auditoría (N)" con su contador de no leídos, cambio de contraseña y salir.
- Que se pierda alguna acción del encabezado del profesor: volver al panel, cambio de contraseña y cerrar sesión.
- Que cambie la vista del alumno.
- Que quede un rol a medio migrar: algunas páginas con el marco nuevo y otras con el viejo.
- Que el cambio obligatorio de contraseña, cuando el admin restableció la clave, deje navegar a otras pantallas.

## Estado actual relevante

| Elemento | Dónde | Notas |
|---|---|---|
| Layout del alumno | `features/student/StudentLayout.tsx` + `.module.css` | Lee el menú de `features/student/nav.ts` (constantes `NAV_GROUPS`, `ALL_ITEMS` y `HOME_ITEM`) y el tema de `useTheme`. |
| Variables de tema | `styles/theme.css` | Solo aplican dentro de `.sysa-student[data-theme=light/dark]`. |
| Barra del admin | `components/layout/TopNavbar.tsx` | La usan 6 páginas. "Recargar" y "Auditoría" son props opcionales que hoy solo usa `AcademicManagementPage`. |
| Píldora de usuario | `components/layout/UserProfilePill.tsx` | Muestra nombre y rol, y los enlaces "Contraseña" y "Salir". |
| Reportes | `pages/AdminReportsPage.tsx` | No usa `TopNavbar`. Tiene un encabezado con estilos inline y el enlace "← Volver a Gestión Académica". |
| Profesor | `pages/Teacher*Page.tsx` | El panel tiene un encabezado con contraseña y cerrar sesión. Las otras 3 páginas tienen "← Volver al Panel Docente". |
| Cambio de contraseña | `pages/ChangePasswordPage.tsx` | Se usa para admin y profesor, y ya se arma con los estilos del alumno. Cuando `mustChangePassword` es true, oculta "Volver". |
| Rutas | `App.tsx`, `constants/routes.constants.ts` | El inicio del admin es `/oferta-academica` y el del profesor, `/profesor`. |

**Volumen:** unas 2.300 líneas de CSS en `components/academic` (con unos 360 colores fijos), unas 1.950 en `pages` (unos 280) y unas 900 en `components/admin` y `teacherAssignment`.

**Fuera de alcance porque los usa el alumno** (decisión del implementador):

- **`components/enrollment`:** solo lo importan `EnrollmentPage` (`/alumno/inscripcion-cursado`) e `InscripcionExamenPage`.
- **Estilos de los avisos flotantes:** viven en `pages/AcademicManagementPage.module.css` y los usan `ToastViewport` y `ToastCard`. Esos componentes aparecen en la inscripción del alumno y en `WelcomeToast`, que ven todos los roles. Estos estilos tienen que quedar **idénticos**. Si se pasa `AcademicManagementPage.module.css` a las variables, la parte de los avisos se separa a su propio módulo con los colores actuales.

## Enfoques considerados

- **A. Layout compartido (elegido):** `StudentLayout` se generaliza a un `AppShell` que recibe el menú del rol, el texto de la barra superior y si se ofrece el modo oscuro. Las variables pasan a aplicar a toda la app. Es la única opción que deja un solo marco y evita que los roles vuelvan a separarse.
- **B. Un layout por rol que copia el del alumno:** sale más rápido al principio, pero son tres copias del mismo CSS que se van a separar con el tiempo.
- **C. Solo cambiar los colores de la barra del admin y de los encabezados del profesor:** es lo más barato, pero el alumno seguiría con barra lateral y los demás con barra superior, así que el efecto de "otra app" se mantiene.

## Diseño

### 1. `AppShell` (marco compartido)

- Se crea en `components/layout/AppShell.tsx` a partir de `StudentLayout`. Recibe:
  - los grupos del menú (con la misma forma que `NAV_GROUPS`) y el ítem de inicio;
  - el texto raíz de la ubicación ("Autogestión alumno" / "Área docente" / "Administración");
  - `allowDarkMode: boolean`;
  - los datos del usuario y `onLogout`;
  - las insignias opcionales del menú (avisos y relevamiento, que hoy usa el alumno).
- **Alumno:** `StudentLayout` queda como envoltorio delgado de `AppShell` y le pasa exactamente lo mismo que hoy. El HTML y las clases resultantes tienen que ser equivalentes, para que el alumno se vea idéntico.
- **Tema:** con `allowDarkMode=false`, el marco fuerza `data-theme="light"` y no muestra el botón. Además no lee `useTheme`, para no heredar el oscuro que el alumno haya guardado en `localStorage`.
- **Variables:** `theme.css` pasa de `.sysa-student` a una clase general (por ejemplo `.sysa-app`) que aplica el marco. `.sysa-student` sigue funcionando como alias, para no romper nada que ya la use, como `ChangePasswordPage`.
- **Ubicación en la barra superior:** sale del ítem del menú que coincide con la ruta actual, igual que hoy en el alumno. Si ninguno coincide, se muestra el ítem de inicio del rol.

### 2. Menús por rol

Se definen en un módulo de navegación por rol, como `nav.ts` del alumno. Los textos y el orden son una propuesta que la persona puede corregir.

Como en el alumno, el ítem de inicio es el primer ítem de un grupo sin título, y no se repite en otro grupo. También es el valor por defecto de la ubicación en la barra superior. `AppShell` recibe los grupos con el inicio ya incluido, igual que `NAV_GROUPS` (decisión del implementador).

**Administración:**
- Inicio (grupo sin título): Oferta académica (`/oferta-academica`).
- Grupo "Gestión académica": Docentes (`/admin/asignacion-docentes`), Inscripciones y calendario (`/admin/inscripciones`).
- Grupo "Alumnos y actas": Alumnos (`/admin/alumnos`), Actas (`/admin/actas`).
- Grupo "Dirección": Reportes (`/admin/reportes`), Usuarios (`/admin/usuarios`).
- Grupo "Cuenta": Contraseña (`/cuenta/contrasena`).

**Área docente:**
- Inicio (grupo sin título): Panel docente (`/profesor`).
- Grupo "Mis comisiones": Asistencias (`/profesor/asistencias`), Notas y actas (`/profesor/notas`), Alumnos y observaciones (`/profesor/alumnos`).
- Grupo "Cuenta": Contraseña (`/cuenta/contrasena`).

"Salir" va en el pie de la barra lateral, como en el alumno.

### 3. Rutas

- Las rutas de admin y profesor se montan dentro de su `AppShell` como rutas anidadas con `<Outlet>`, igual que el alumno. Las URLs no cambian, y `ProtectedRoute` y los roles permitidos siguen igual.
- **`/cuenta/contrasena`:** se muestra dentro del marco del rol del usuario. Si `mustChangePassword` es true, se muestra sin el marco, igual que hoy, para no ofrecer navegación que el backend va a rechazar.

### 4. Migración de las páginas

- **`TopNavbar`:** se saca de las 6 páginas.
  - Los accesos a las secciones pasan al menú lateral.
  - "Recargar datos" y "Auditoría (N)" con el punto de no leídos pasan al encabezado de `AcademicManagementPage`, como botones de la página, con la misma lógica.
  - Si `TopNavbar` y `UserProfilePill` quedan sin uso, se borran.
- **Profesor:**
  - Se sacan los encabezados propios con "Cerrar sesión", "Cambiar contraseña" y "← Volver al Panel Docente": esas funciones pasan al marco.
  - Cada página conserva un encabezado de contenido (título y subtítulo) con el estilo `common.pageHeader` del alumno.
  - El panel docente conserva sus tarjetas de accesos rápidos.
- **Reportes:** se saca "← Volver a Gestión Académica" y el encabezado inline pasa al estilo `pageHeader`.

### 5. Contenido en la paleta del alumno (modo claro)

- En los CSS modules de admin y profesor, cada color fijo se reemplaza por la variable `--sa-*` equivalente:
  - fondos y superficies → `--sa-bg`, `--sa-surface`, `--sa-surface-2`;
  - bordes → `--sa-border`;
  - texto → `--sa-text`, `--sa-text-muted`;
  - acento y azules primarios → `--sa-accent` (y `-strong` / `-soft`);
  - estados → `--sa-ok`, `--sa-warn`, `--sa-danger` y sus `-soft`.
- Los radios pasan a `--sa-radius` y las sombras a `--sa-shadow`.
- **Colores con significado propio**, como los colores de los tipos de correlatividad en el canvas: se mantienen si no tienen una variable equivalente. Si hay dudas, se mantiene el color original.
- **Componentes compartidos con el alumno** (por ejemplo `components/academic/Modals.module.css` y `FormField`): solo se tocan si el alumno no cambia visualmente. Si cambiaría, se deja el color.
- **Orden:**
  1. El marco y los menús de los dos roles, en una entrega que ya se puede usar.
  2. Las páginas del profesor.
  3. Las páginas del admin, de la más simple a la más compleja. Oferta académica y su canvas van al final.

### 6. Verificación ("que no rompa nada")

- **Build y lint:** `pnpm --filter sysaplus build` y `pnpm --filter sysaplus lint`, sin errores nuevos. Hoy hay 3 errores preexistentes.
- **Lista de chequeo de funciones, por rol, recorrida en la app levantada:**
  - **Admin:** se llega a las 7 secciones desde el menú; "Recargar datos" y "Auditoría (N)" funcionan en Oferta académica; cambio de contraseña; salir.
  - **Profesor:** se llega a las 4 páginas; cambio de contraseña; salir.
  - **Alumno:** todas sus páginas se ven igual que antes.
  - **Contraseña obligatoria:** con un usuario al que se le restableció la clave, solo se ve el formulario de cambio.
  - **Celular:** el menú se abre y se cierra en un ancho angosto.
- **Revisión visual, decidida por la persona:** **revisa ella las pantallas al final de cada etapa.**
  - Hay tres etapas: (1) el marco y los menús, (2) las páginas del profesor, (3) las páginas del admin.
  - Cada etapa termina en un punto de control. El implementador entrega la lista de pantallas a revisar por rol, con usuario y contraseña demo, y no avanza a la siguiente etapa hasta que la persona dé el visto bueno.
  - No se agrega ninguna herramienta de capturas.
- **Cuidado con el alumno:** como la garantía de que el alumno no cambió depende de esa revisión, en cada etapa el implementador revisa en el diff que no se modificó ningún archivo que use el alumno, más allá del envoltorio `StudentLayout` → `AppShell` y del alias de `theme.css`.

## Lo que queda al implementador

- Los nombres exactos de los componentes y módulos.
- La correspondencia exacta de cada color con su variable, dentro de las reglas de la sección 5.
- El ícono de cada ítem del menú, elegido entre los que ya tiene `components/Icon.tsx`.
