-- Migración: respuestas de checklist por auditoría
USE cap;

CREATE TABLE IF NOT EXISTS auditoria_respuestas (
  id_respuesta INT AUTO_INCREMENT PRIMARY KEY,
  id_auditoria INT NOT NULL,
  id_pregunta INT NOT NULL,
  cumple ENUM('si', 'no') NULL,
  hallazgo TEXT NULL,
  id_accion INT NULL,
  emp_id_responsable VARCHAR(50) NULL,
  emp_nombre_responsable VARCHAR(200) NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resp_auditoria FOREIGN KEY (id_auditoria) REFERENCES auditorias (id_auditoria),
  CONSTRAINT fk_resp_pregunta FOREIGN KEY (id_pregunta) REFERENCES preguntas (id_pregunta),
  CONSTRAINT fk_resp_accion FOREIGN KEY (id_accion) REFERENCES acciones (id_accion),
  UNIQUE KEY uk_resp_auditoria_pregunta (id_auditoria, id_pregunta)
) ENGINE=InnoDB;
