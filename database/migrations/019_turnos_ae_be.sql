-- Renombrar turnos C/D a AE/BE y ampliar columna de código
USE cap;

ALTER TABLE turnos
  MODIFY COLUMN codigo VARCHAR(4) NOT NULL;

ALTER TABLE auditorias
  MODIFY COLUMN turno VARCHAR(4) NOT NULL DEFAULT 'A';

UPDATE turnos SET codigo = 'AE' WHERE codigo = 'C' AND estado = 'activo';
UPDATE turnos SET codigo = 'BE' WHERE codigo = 'D' AND estado = 'activo';

UPDATE auditorias SET turno = 'AE' WHERE turno = 'C';
UPDATE auditorias SET turno = 'BE' WHERE turno = 'D';

INSERT IGNORE INTO turnos (codigo, nombre, hora_inicio, hora_fin, orden) VALUES
  ('AE', 'Extrusión día', '06:00:00', '18:00:00', 3),
  ('BE', 'Extrusión noche', '18:00:00', '06:00:00', 4);
