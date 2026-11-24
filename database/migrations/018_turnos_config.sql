-- Catálogo de turnos (horarios) y asignación por sub área
USE cap;

CREATE TABLE IF NOT EXISTS turnos (
  id_turno INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(4) NOT NULL,
  nombre VARCHAR(100) NOT NULL DEFAULT '',
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_turnos_codigo_activo (codigo, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sub_area_turnos (
  id_sub_area INT NOT NULL,
  id_turno INT NOT NULL,
  PRIMARY KEY (id_sub_area, id_turno),
  CONSTRAINT fk_sat_sub_area FOREIGN KEY (id_sub_area) REFERENCES sub_areas (id_sub_area),
  CONSTRAINT fk_sat_turno FOREIGN KEY (id_turno) REFERENCES turnos (id_turno)
) ENGINE=InnoDB;

ALTER TABLE auditorias
  MODIFY COLUMN turno VARCHAR(4) NOT NULL DEFAULT 'A';

INSERT IGNORE INTO turnos (codigo, nombre, hora_inicio, hora_fin, orden) VALUES
  ('A', 'Turno día', '06:00:00', '15:30:00', 1),
  ('B', 'Turno tarde/noche', '15:30:00', '00:30:00', 2),
  ('AE', 'Extrusión día', '06:00:00', '18:00:00', 3),
  ('BE', 'Extrusión noche', '18:00:00', '06:00:00', 4);

INSERT IGNORE INTO sub_area_turnos (id_sub_area, id_turno)
SELECT sa.id_sub_area, t.id_turno
FROM sub_areas sa
CROSS JOIN turnos t
WHERE sa.estado = 'activo'
  AND t.estado = 'activo'
  AND t.codigo IN ('A', 'B');
