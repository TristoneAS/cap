-- Migración: quitar tipo de usuario, dejar solo nivel (SALARY / ING-AMBIENTAL)
USE cap;

-- Niveles permitidos
INSERT IGNORE INTO niveles_usuario (nombre, descripcion, orden) VALUES
  ('SALARY', 'Nivel Salary', 1),
  ('ING-AMBIENTAL', 'Ingeniero Ambiental', 2);

-- Reasignar usuarios existentes a SALARY si tenían nivel anterior
UPDATE usuarios u
INNER JOIN niveles_usuario nu ON nu.nombre = 'SALARY' AND nu.estado = 'activo'
SET u.id_nivel_usuario = nu.id_nivel_usuario
WHERE u.estado = 'activo';

-- Desactivar niveles antiguos
UPDATE niveles_usuario
SET estado = 'inactivo'
WHERE nombre IN ('Nivel 1', 'Nivel 2', 'Nivel 3');

-- Quitar columna y tabla de tipo de usuario
ALTER TABLE usuarios DROP FOREIGN KEY fk_usuarios_tipo;
ALTER TABLE usuarios DROP COLUMN id_tipo_usuario;

DROP TABLE IF EXISTS tipos_usuario;
