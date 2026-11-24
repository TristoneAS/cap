-- Migración: pregunta maestra + alcance por sub área (elimina duplicación de texto)
USE cap;

CREATE TABLE IF NOT EXISTS pregunta_alcance (
  id_alcance INT AUTO_INCREMENT PRIMARY KEY,
  id_pregunta INT NOT NULL,
  id_area INT NOT NULL,
  id_sub_area INT NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alcance_pregunta FOREIGN KEY (id_pregunta) REFERENCES preguntas (id_pregunta),
  CONSTRAINT fk_alcance_area FOREIGN KEY (id_area) REFERENCES areas (id_area),
  CONSTRAINT fk_alcance_sub_area FOREIGN KEY (id_sub_area) REFERENCES sub_areas (id_sub_area),
  UNIQUE KEY uk_pregunta_sub_area (id_pregunta, id_sub_area)
) ENGINE=InnoDB;

-- Alcance inicial desde filas actuales de preguntas
INSERT IGNORE INTO pregunta_alcance (id_pregunta, id_area, id_sub_area)
SELECT p.id_pregunta, p.id_area, p.id_sub_area
FROM preguntas p
WHERE p.id_area IS NOT NULL AND p.id_sub_area IS NOT NULL;

-- Canonical: menor id_pregunta por (texto, tipo auditoría, tipo NC)
CREATE TEMPORARY TABLE tmp_pregunta_canonical AS
SELECT MIN(p.id_pregunta) AS canonical_id,
       p.texto,
       p.id_tipo_auditoria,
       p.id_tipo_nc
FROM preguntas p
GROUP BY p.texto, p.id_tipo_auditoria, p.id_tipo_nc;

CREATE TEMPORARY TABLE tmp_pregunta_id_map AS
SELECT p.id_pregunta AS old_id, c.canonical_id AS new_id
FROM preguntas p
INNER JOIN tmp_pregunta_canonical c
  ON c.texto = p.texto
 AND c.id_tipo_auditoria = p.id_tipo_auditoria
 AND c.id_tipo_nc = p.id_tipo_nc;

-- Respuestas históricas → id maestro
UPDATE auditoria_respuestas ar
INNER JOIN tmp_pregunta_id_map m ON m.old_id = ar.id_pregunta
SET ar.id_pregunta = m.new_id
WHERE m.old_id <> m.new_id;

-- Alcance → id maestro
UPDATE pregunta_alcance pa
INNER JOIN tmp_pregunta_id_map m ON m.old_id = pa.id_pregunta
SET pa.id_pregunta = m.new_id
WHERE m.old_id <> m.new_id;

-- Quitar alcance duplicado (misma pregunta + sub área)
DELETE pa1
FROM pregunta_alcance pa1
INNER JOIN pregunta_alcance pa2
  ON pa1.id_pregunta = pa2.id_pregunta
 AND pa1.id_sub_area = pa2.id_sub_area
 AND pa1.id_alcance > pa2.id_alcance;

-- Inactivar preguntas duplicadas (conservar histórico por FK)
UPDATE preguntas p
INNER JOIN tmp_pregunta_id_map m ON m.old_id = p.id_pregunta
SET p.estado = 'inactivo'
WHERE m.old_id <> m.new_id;

DROP TEMPORARY TABLE tmp_pregunta_canonical;
DROP TEMPORARY TABLE tmp_pregunta_id_map;

-- Quitar área/sub área de la tabla maestra
ALTER TABLE preguntas DROP FOREIGN KEY fk_preguntas_area;
ALTER TABLE preguntas DROP FOREIGN KEY fk_preguntas_sub_area;
ALTER TABLE preguntas DROP COLUMN id_area;
ALTER TABLE preguntas DROP COLUMN id_sub_area;
