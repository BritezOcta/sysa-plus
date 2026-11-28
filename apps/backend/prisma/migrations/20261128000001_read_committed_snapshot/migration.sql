-- Lecturas sin esperar a escrituras sin confirmar: con READ COMMITTED por defecto, una consulta
-- que lee filas que otra transacción está modificando espera a que esta termine. Con
-- READ_COMMITTED_SNAPSHOT lee la última versión confirmada. Las secciones críticas siguen
-- protegidas con UPDLOCK, que bloquea igual. Medido con loadtest/ (Fase 2): el pico de inscripción
-- bajó de 4,27 s a 3,66 s de p95.
--
-- ALTER DATABASE no puede ir dentro de una transacción; ROLLBACK IMMEDIATE corta las conexiones
-- abiertas (al desplegar, el backend todavía no arrancó).
IF (SELECT is_read_committed_snapshot_on FROM sys.databases WHERE name = DB_NAME()) = 0
BEGIN
    DECLARE @sql NVARCHAR(300) = N'ALTER DATABASE ' + QUOTENAME(DB_NAME()) + N' SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE';
    EXEC sp_executesql @sql;
END
