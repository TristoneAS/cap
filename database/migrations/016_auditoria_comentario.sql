-- Comentario general de la auditoría (no por pregunta)
USE cap;

ALTER TABLE auditorias
  ADD COLUMN comentario TEXT NULL AFTER fecha_programada;
