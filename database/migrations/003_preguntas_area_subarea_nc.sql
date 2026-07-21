-- Migración: área, sub área y tipo NC en preguntas
USE cap;

ALTER TABLE preguntas
  ADD COLUMN id_area INT NULL AFTER id_tipo_auditoria,
  ADD COLUMN id_sub_area INT NULL AFTER id_area,
  ADD COLUMN id_tipo_nc INT NULL AFTER id_sub_area;

-- Si ya hay preguntas, asigna valores por defecto del primer registro activo de cada catálogo
UPDATE preguntas p
SET
  id_area = COALESCE(p.id_area, (SELECT id_area FROM areas WHERE estado = 'activo' ORDER BY id_area LIMIT 1)),
  id_sub_area = COALESCE(p.id_sub_area, (SELECT id_sub_area FROM sub_areas WHERE estado = 'activo' ORDER BY id_sub_area LIMIT 1)),
  id_tipo_nc = COALESCE(p.id_tipo_nc, (SELECT id_tipo_nc FROM tipos_no_conformidad WHERE estado = 'activo' ORDER BY id_tipo_nc LIMIT 1))
WHERE p.id_area IS NULL OR p.id_sub_area IS NULL OR p.id_tipo_nc IS NULL;

ALTER TABLE preguntas
  MODIFY COLUMN id_area INT NOT NULL,
  MODIFY COLUMN id_sub_area INT NOT NULL,
  MODIFY COLUMN id_tipo_nc INT NOT NULL;

ALTER TABLE preguntas
  ADD CONSTRAINT fk_preguntas_area FOREIGN KEY (id_area) REFERENCES areas (id_area),
  ADD CONSTRAINT fk_preguntas_sub_area FOREIGN KEY (id_sub_area) REFERENCES sub_areas (id_sub_area),
  ADD CONSTRAINT fk_preguntas_tipo_nc FOREIGN KEY (id_tipo_nc) REFERENCES tipos_no_conformidad (id_tipo_nc);
