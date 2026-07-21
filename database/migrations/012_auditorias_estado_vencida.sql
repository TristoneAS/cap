-- Estado vencida cuando pasó fecha_programada sin completar
USE cap;

ALTER TABLE auditorias
  MODIFY COLUMN estado ENUM('pendiente', 'en_progreso', 'completada', 'cancelada', 'vencida')
  NOT NULL DEFAULT 'pendiente';

-- Marcar existentes vencidas (día 25 del periodo ya pasó)
UPDATE auditorias
SET estado = 'vencida'
WHERE estado IN ('pendiente', 'en_progreso')
  AND fecha_programada < CURDATE();
