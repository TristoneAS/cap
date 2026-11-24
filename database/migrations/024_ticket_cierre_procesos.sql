-- Mantenimiento marca resuelto; Procesos cierra (cerrado) tras verificar
USE cap;

ALTER TABLE tickets_mantenimiento
  MODIFY COLUMN estado ENUM('abierto', 'en_proceso', 'resuelto', 'cancelado', 'cerrado')
    NOT NULL DEFAULT 'abierto',
  ADD COLUMN notas_cierre TEXT NULL AFTER notas_resolucion,
  ADD COLUMN fecha_cierre TIMESTAMP NULL AFTER fecha_resolucion;
