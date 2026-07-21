-- Migración: tipo NC se captura en la respuesta (solo aplica cuando cumple = 'no')
USE cap;

ALTER TABLE auditoria_respuestas
  ADD COLUMN id_tipo_nc INT NULL AFTER hallazgo;

ALTER TABLE auditoria_respuestas
  ADD CONSTRAINT fk_resp_tipo_nc
  FOREIGN KEY (id_tipo_nc) REFERENCES tipos_no_conformidad (id_tipo_nc);
