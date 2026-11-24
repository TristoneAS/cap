-- Poka Yoke: catálogo global, exención por auditoría y respuestas separadas de LPA
USE cap;

CREATE TABLE IF NOT EXISTS preguntas_poka_yoke (
  id_pregunta_poka INT AUTO_INCREMENT PRIMARY KEY,
  texto TEXT NOT NULL,
  id_tipo_nc INT NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_poka_tipo_nc FOREIGN KEY (id_tipo_nc) REFERENCES tipos_no_conformidad (id_tipo_nc)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auditoria_poka_yoke (
  id_auditoria INT NOT NULL PRIMARY KEY,
  exenta ENUM('si', 'no') NULL COMMENT 'si = área exenta, preguntas Poka no aplican',
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_apk_auditoria FOREIGN KEY (id_auditoria) REFERENCES auditorias (id_auditoria) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auditoria_poka_yoke_respuestas (
  id_respuesta INT AUTO_INCREMENT PRIMARY KEY,
  id_auditoria INT NOT NULL,
  id_pregunta_poka INT NOT NULL,
  cumple ENUM('si', 'no') NULL,
  hallazgo TEXT NULL,
  id_tipo_nc INT NULL,
  id_accion INT NULL,
  emp_id_responsable VARCHAR(50) NULL,
  emp_nombre_responsable VARCHAR(200) NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_apkr_auditoria FOREIGN KEY (id_auditoria) REFERENCES auditorias (id_auditoria) ON DELETE CASCADE,
  CONSTRAINT fk_apkr_pregunta FOREIGN KEY (id_pregunta_poka) REFERENCES preguntas_poka_yoke (id_pregunta_poka),
  CONSTRAINT fk_apkr_tipo_nc FOREIGN KEY (id_tipo_nc) REFERENCES tipos_no_conformidad (id_tipo_nc),
  CONSTRAINT fk_apkr_accion FOREIGN KEY (id_accion) REFERENCES acciones (id_accion),
  UNIQUE KEY uk_apkr_auditoria_pregunta (id_auditoria, id_pregunta_poka)
) ENGINE=InnoDB;
