-- Migración: nivel requerido en tipos de auditoría (idempotente)
-- Si ya ejecutaste parte del script, puedes volver a correrlo completo.
USE cap;

SET @db = DATABASE();

-- 1. Agregar columna solo si no existe
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tipos_auditoria' AND COLUMN_NAME = 'id_nivel_usuario') = 0,
  'ALTER TABLE tipos_auditoria ADD COLUMN id_nivel_usuario INT NULL AFTER descripcion',
  'SELECT ''Columna id_nivel_usuario ya existe, se omite ADD COLUMN'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Asignar nivel a tipos que aún no lo tengan
UPDATE tipos_auditoria ta
SET ta.id_nivel_usuario = (
  SELECT nu.id_nivel_usuario
  FROM niveles_usuario nu
  WHERE nu.estado = 'activo'
  ORDER BY nu.nombre ASC
  LIMIT 1
)
WHERE ta.id_nivel_usuario IS NULL;

-- 3. Quitar FK temporalmente para poder cambiar la columna
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'tipos_auditoria'
     AND CONSTRAINT_NAME = 'fk_tipos_auditoria_nivel') > 0,
  'ALTER TABLE tipos_auditoria DROP FOREIGN KEY fk_tipos_auditoria_nivel',
  'SELECT ''FK fk_tipos_auditoria_nivel no existe, se omite DROP'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Obligar NOT NULL
ALTER TABLE tipos_auditoria
  MODIFY COLUMN id_nivel_usuario INT NOT NULL;

-- 5. Volver a crear la FK
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'tipos_auditoria'
     AND CONSTRAINT_NAME = 'fk_tipos_auditoria_nivel') = 0,
  'ALTER TABLE tipos_auditoria ADD CONSTRAINT fk_tipos_auditoria_nivel FOREIGN KEY (id_nivel_usuario) REFERENCES niveles_usuario (id_nivel_usuario)',
  'SELECT ''FK fk_tipos_auditoria_nivel ya existe, se omite ADD'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
