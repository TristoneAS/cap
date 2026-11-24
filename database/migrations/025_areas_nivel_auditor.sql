-- Solo usuarios del nivel indicado pueden recibir auditorías de esa área (p. ej. Ambiental → ING-AMBIENTAL).
USE cap;

ALTER TABLE areas
  ADD COLUMN id_nivel_usuario INT NULL AFTER descripcion,
  ADD CONSTRAINT fk_areas_nivel_auditor FOREIGN KEY (id_nivel_usuario)
    REFERENCES niveles_usuario (id_nivel_usuario);

UPDATE areas a
INNER JOIN niveles_usuario nu
  ON nu.nombre = 'ING-AMBIENTAL' AND nu.estado = 'activo'
SET a.id_nivel_usuario = nu.id_nivel_usuario
WHERE a.estado = 'activo'
  AND LOWER(a.nombre) LIKE '%ambiental%';
