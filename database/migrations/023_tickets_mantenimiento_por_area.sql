-- Un ticket por área + sub área + periodo (agrupa todos los hallazgos Poka del mes)
USE cap;

DROP TABLE IF EXISTS ticket_mantenimiento_items;
DROP TABLE IF EXISTS tickets_mantenimiento;

CREATE TABLE tickets_mantenimiento (
  id_ticket INT AUTO_INCREMENT PRIMARY KEY,
  id_area INT NOT NULL,
  id_sub_area INT NOT NULL,
  periodo_mes CHAR(7) NOT NULL,
  estado ENUM('abierto', 'en_proceso', 'resuelto', 'cancelado') NOT NULL DEFAULT 'abierto',
  emp_id_asignado VARCHAR(50) NULL,
  emp_nombre_asignado VARCHAR(200) NULL,
  notas_resolucion TEXT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_resolucion TIMESTAMP NULL,
  CONSTRAINT fk_tm_area FOREIGN KEY (id_area) REFERENCES areas (id_area),
  CONSTRAINT fk_tm_sub_area FOREIGN KEY (id_sub_area) REFERENCES sub_areas (id_sub_area),
  UNIQUE KEY uk_tm_area_sub_periodo (id_area, id_sub_area, periodo_mes),
  KEY idx_tm_estado (estado),
  KEY idx_tm_periodo (periodo_mes)
) ENGINE=InnoDB;

CREATE TABLE ticket_mantenimiento_items (
  id_item INT AUTO_INCREMENT PRIMARY KEY,
  id_ticket INT NOT NULL,
  id_respuesta_poka INT NOT NULL,
  id_auditoria INT NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tmi_ticket FOREIGN KEY (id_ticket) REFERENCES tickets_mantenimiento (id_ticket) ON DELETE CASCADE,
  CONSTRAINT fk_tmi_respuesta FOREIGN KEY (id_respuesta_poka)
    REFERENCES auditoria_poka_yoke_respuestas (id_respuesta) ON DELETE CASCADE,
  CONSTRAINT fk_tmi_auditoria FOREIGN KEY (id_auditoria) REFERENCES auditorias (id_auditoria) ON DELETE CASCADE,
  UNIQUE KEY uk_tmi_respuesta (id_respuesta_poka),
  KEY idx_tmi_ticket (id_ticket)
) ENGINE=InnoDB;
