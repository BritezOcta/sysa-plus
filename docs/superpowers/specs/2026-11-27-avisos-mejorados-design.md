# Avisos mejorados — diseño corto

## Intención
La creación de avisos se siente "sosa" (visual débil, no sigue el tema) y el admin no ve cómo le va a quedar al alumno. Del lado del alumno, algunos avisos no llevan a ningún lado al hacer clic.

## Objetivos
- Modal de creación con visual fuerte, integrado al sistema de temas, con vista previa en vivo.
- Avisos sin página asociada se abren en una ventana flotante con el contenido completo.
- Arreglar el link roto `/alumno/cursadas`.

## No-objetivos
- Elegir destinatarios (sigue siendo "todos los alumnos activos").
- Cambios de esquema en la base de datos.
- Conteo previo de destinatarios (requeriría un endpoint nuevo).

## Enfoques considerados
- **A. Modal ancho de dos columnas con vista previa en vivo** — elegido. Se ve el resultado mientras se escribe.
- B. Modal en dos pasos (escribir → previsualizar → enviar). Descartado: no hay feedback mientras se escribe.
- C. A + pestañas "En la lista / Al abrirlo". Descartado: más trabajo sin beneficio claro.

## Diseño
1. **`NoticeCard`** (nuevo, componente compartido): la tarjeta de aviso que hoy está inline en `AvisosPage`. La usan `AvisosPage` y la vista previa del modal, así la vista previa es idéntica a lo que ve el alumno.
2. **`NoticeDetailModal`** (nuevo): ventana flotante sobre `ModalShell` con tipo (tono `warning` si es importante), título, fecha y cuerpo completo.
3. **Regla de clic** (`AvisosPage` y `NotificationBell`): si el aviso tiene `link` y no es `/alumno/avisos` → navegar como hoy; si no → abrir `NoticeDetailModal`. Se mantiene la comparación con `/alumno/avisos` para que los avisos ya guardados funcionen.
4. **Backend**: avisos generales (`broadcastToStudents`) y observaciones del docente pasan a `link: null`. `/alumno/cursadas` → `/alumno/cursado`.
5. **`BroadcastNoticeModal` rediseñado** sobre `ModalShell` (`wide`), estilos en CSS module con variables del tema:
   - Izquierda: selector de tipo con dos tarjetas grandes (ℹ️ Informativo / ⚠️ Importante), título con contador `n/120`, mensaje con contador `n/1000`.
   - Derecha: "Así lo verá el alumno" con `NoticeCard` en vivo (placeholders si está vacío).
   - Tono del encabezado cambia con el tipo. Botón "Enviar a todos los alumnos".
   - En pantallas angostas las columnas se apilan.
6. **Feedback de envío**: el `alert()` de `AcademicManagementPage` se reemplaza por el toast existente.

## Decisiones mías (a revisar)
- Sin conteo previo de destinatarios; el conteo real se muestra en el toast tras enviar.
- Reemplazo del `alert()` por toast.
- `NotificationBell` también usa la ventana flotante (aplica a todos los roles que lo usen).
