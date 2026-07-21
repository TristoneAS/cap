-- Migración: permitir que la misma auditoría (área/tipo/mes) se asigne a más de un usuario
-- Nota: uk_auditoria_unica_mes puede estar sosteniendo FKs; se crean índices de apoyo primero.
USE cap;

-- 1. Índices para que las FK no dependan del unique antiguo
ALTER TABLE auditorias
  ADD INDEX idx_auditorias_area (id_area),
  ADD INDEX idx_auditorias_sub_area (id_sub_area),
  ADD INDEX idx_auditorias_tipo (id_tipo_auditoria);

-- 2. Quitar unique antiguo (ahora ya no lo necesitan las FK)
ALTER TABLE auditorias DROP INDEX uk_auditoria_unica_mes;

-- 3. Nuevo unique: misma auditoría puede asignarse a varios usuarios (emp_id diferente)
ALTER TABLE auditorias
  ADD UNIQUE KEY uk_auditoria_unica_mes (id_sub_area, id_tipo_auditoria, periodo_mes, emp_id);
