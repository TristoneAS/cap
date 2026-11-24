-- Quita columna orden si se aplicó una versión anterior de 020
USE cap;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'preguntas_poka_yoke'
    AND COLUMN_NAME = 'orden'
);

SET @sql = IF(
  @col_exists > 0,
  'ALTER TABLE preguntas_poka_yoke DROP COLUMN orden',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
