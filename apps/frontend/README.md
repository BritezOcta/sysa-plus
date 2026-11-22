# Menú del alumno · SysA+ (versión adaptada a tu proyecto)

## Cómo instalarlo (3 pasos)

1. **Descomprimí este zip en la raíz de tu proyecto de frontend** (la carpeta donde está `package.json`). Se va a fusionar con tu carpeta `src/`.
   Windows te va a preguntar si querés reemplazar 3 archivos: **decí que sí**.
   - `src/App.tsx`
   - `src/main.tsx`
   - `src/pages/EnrollmentPage.tsx` (solo se le agregó un parámetro `embedded`)
2. No hay que instalar nada: usa `react-router`, que ya tenés.
3. Corré el proyecto y entrá a `http://localhost:5173/alumno`.

## Qué hay

- `src/features/student/` → el menú, el layout y las pantallas.
- `src/data/mockStudentData.ts` → datos de ejemplo (después se reemplazan por tu API).
- `src/styles/theme.css` → colores claro/oscuro. Está aislado en `.sysa-student`, así que no toca tus `variables.css` ni `global.css`.
- "Inscripción a cursado" muestra tu `EnrollmentPage` real dentro del menú (sin su barra superior).

## Pendiente (necesito ver `LoginForm.tsx`)

- Que el login lleve al alumno a `/alumno` después de ingresar.
- En `src/App.tsx`, dentro de `logout`, borrar el token/sesión (hay un `TODO`).
- El usuario del menú es de ejemplo (`ESTUDIANTE`): hay que pasarle el usuario real del login.
