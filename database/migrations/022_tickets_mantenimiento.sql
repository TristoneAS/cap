-- Tickets de mantenimiento generados por respuestas Poka Yoke negativas en auditoría LPA
USE cap;

CREATE TABLE IF NOT EXISTS tickets_mantenimiento (
  id_ticket INT AUTO_INCREMENT PRIMARY KEY,
  id_respuesta_poka INT NOT NULL,
  id_auditoria INT NOT NULL,
  estado ENUM('abierto', 'en_proceso', 'resuelto', 'cancelado') NOT NULL DEFAULT 'abierto',
  emp_id_asignado VARCHAR(50) NULL,
  emp_nombre_asignado VARCHAR(200) NULL,
  notas_resolucion TEXT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_resolucion TIMESTAMP NULL,
  CONSTRAINT fk_tm_respuesta_poka FOREIGN KEY (id_respuesta_poka)
    REFERENCES auditoria_poka_yoke_respuestas (id_respuesta) ON DELETE CASCADE,
  CONSTRAINT fk_tm_auditoria FOREIGN KEY (id_auditoria) REFERENCES auditorias (id_auditoria) ON DELETE CASCADE,
  UNIQUE KEY uk_tm_respuesta_poka (id_respuesta_poka),
  KEY idx_tm_estado (estado),
  KEY idx_tm_auditoria (id_auditoria)
) ENGINE=InnoDB;
