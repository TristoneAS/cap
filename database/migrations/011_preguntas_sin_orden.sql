-- Quitar columna orden de preguntas
USE cap;

ALTER TABLE preguntas
  DROP COLUMN orden;
