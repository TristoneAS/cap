-- Quitar comentario por pregunta si se aplicó la versión anterior de 016
USE cap;

ALTER TABLE auditoria_respuestas
  DROP COLUMN comentario;
