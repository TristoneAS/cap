-- Migración: auditorías por turno A y B (cada auditoría es obligatoria en ambos turnos)
USE cap;

ALTER TABLE auditorias
  ADD COLUMN turno ENUM('A', 'B') NOT NULL DEFAULT 'A' AFTER periodo_mes;

ALTER TABLE auditorias DROP INDEX uk_auditoria_unica_mes;

ALTER TABLE auditorias
  ADD UNIQUE KEY uk_auditoria_unica_mes (id_sub_area, id_tipo_auditoria, periodo_mes, emp_id, turno);
