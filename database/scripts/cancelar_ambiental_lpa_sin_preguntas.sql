-- Ambiental + tipo LPA sin preguntas LPA activas (oct 2026 u otro periodo).
-- Seguimiento deja de mostrarlas al pasar a cancelado (y la app oculta canceladas).
USE cap;

-- 1) Vista previa
SELECT aud.id_auditoria, aud.periodo_mes, aud.turno, sa.nombre AS sub_area,
       t.nombre AS tipo, aud.emp_nombre, aud.estado
FROM auditorias aud
INNER JOIN areas a ON a.id_area = aud.id_area
INNER JOIN sub_areas sa ON sa.id_sub_area = aud.id_sub_area
INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = aud.id_tipo_auditoria
WHERE LOWER(a.nombre) LIKE '%ambiental%'
  AND t.nombre = 'LPA'
  AND aud.periodo_mes = '2026-10'
  AND aud.estado IN ('pendiente', 'en_progreso', 'vencida')
  AND NOT EXISTS (
    SELECT 1
    FROM preguntas p
    INNER JOIN pregunta_alcance pa
      ON pa.id_pregunta = p.id_pregunta AND pa.estado = 'activo'
    WHERE p.estado = 'activo'
      AND p.id_tipo_auditoria = aud.id_tipo_auditoria
      AND pa.id_area = aud.id_area
      AND pa.id_sub_area = aud.id_sub_area
  );

-- 2) Cancelar (ejecutar tras revisar el SELECT)
UPDATE auditorias aud
INNER JOIN areas a ON a.id_area = aud.id_area
INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = aud.id_tipo_auditoria
SET aud.estado = 'cancelado'
WHERE LOWER(a.nombre) LIKE '%ambiental%'
  AND t.nombre = 'LPA'
  AND aud.periodo_mes = '2026-10'
  AND aud.estado IN ('pendiente', 'en_progreso', 'vencida')
  AND NOT EXISTS (
    SELECT 1
    FROM preguntas p
    INNER JOIN pregunta_alcance pa
      ON pa.id_pregunta = p.id_pregunta AND pa.estado = 'activo'
    WHERE p.estado = 'activo'
      AND p.id_tipo_auditoria = aud.id_tipo_auditoria
      AND pa.id_area = aud.id_area
      AND pa.id_sub_area = aud.id_sub_area
  );

-- 3) Atajo: todas las LPA Ambiental del mes (si no quieres LPA ambiental, solo EA)
-- UPDATE auditorias aud
-- INNER JOIN areas a ON a.id_area = aud.id_area
-- INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = aud.id_tipo_auditoria
-- SET aud.estado = 'cancelado'
-- WHERE LOWER(a.nombre) LIKE '%ambiental%'
--   AND t.nombre = 'LPA'
--   AND aud.periodo_mes = '2026-10'
--   AND aud.estado IN ('pendiente', 'en_progreso', 'vencida');
