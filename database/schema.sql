-- Base de datos CAP · Auditorías LPA
-- Ejecutar: mysql -u root < database/schema.sql

CREATE DATABASE IF NOT EXISTS cap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cap;

CREATE TABLE IF NOT EXISTS areas (
  id_area INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_areas_nombre_activo (nombre, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sub_areas (
  id_sub_area INT AUTO_INCREMENT PRIMARY KEY,
  id_area INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_areas_area FOREIGN KEY (id_area) REFERENCES areas (id_area),
  UNIQUE KEY uk_sub_areas_area_nombre (id_area, nombre, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS niveles_usuario (
  id_nivel_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL,
  orden INT NOT NULL DEFAULT 0,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  UNIQUE KEY uk_niveles_usuario_nombre (nombre, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipos_auditoria (
  id_tipo_auditoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  id_nivel_usuario INT NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tipos_auditoria_nivel FOREIGN KEY (id_nivel_usuario) REFERENCES niveles_usuario (id_nivel_usuario),
  UNIQUE KEY uk_tipos_auditoria_nombre (nombre, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS preguntas (
  id_pregunta INT AUTO_INCREMENT PRIMARY KEY,
  id_tipo_auditoria INT NOT NULL,
  id_area INT NOT NULL,
  id_sub_area INT NOT NULL,
  id_tipo_nc INT NOT NULL,
  texto TEXT NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_preguntas_tipo FOREIGN KEY (id_tipo_auditoria) REFERENCES tipos_auditoria (id_tipo_auditoria),
  CONSTRAINT fk_preguntas_area FOREIGN KEY (id_area) REFERENCES areas (id_area),
  CONSTRAINT fk_preguntas_sub_area FOREIGN KEY (id_sub_area) REFERENCES sub_areas (id_sub_area),
  CONSTRAINT fk_preguntas_tipo_nc FOREIGN KEY (id_tipo_nc) REFERENCES tipos_no_conformidad (id_tipo_nc)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipos_no_conformidad (
  id_tipo_nc INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tipos_nc_nombre (nombre, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS acciones (
  id_accion INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_acciones_nombre (nombre, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auditorias (
  id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
  id_area INT NOT NULL,
  id_sub_area INT NOT NULL,
  id_tipo_auditoria INT NOT NULL,
  emp_id VARCHAR(50) NOT NULL,
  emp_nombre VARCHAR(200) NULL,
  periodo_mes CHAR(7) NOT NULL COMMENT 'YYYY-MM',
  turno ENUM('A', 'B') NOT NULL DEFAULT 'A',
  estado ENUM('pendiente', 'en_progreso', 'completada', 'cancelada', 'vencida') NOT NULL DEFAULT 'pendiente',
  fecha_programada DATE NOT NULL COMMENT 'Vencimiento: día 25 del periodo_mes',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditorias_area FOREIGN KEY (id_area) REFERENCES areas (id_area),
  CONSTRAINT fk_auditorias_sub_area FOREIGN KEY (id_sub_area) REFERENCES sub_areas (id_sub_area),
  CONSTRAINT fk_auditorias_tipo FOREIGN KEY (id_tipo_auditoria) REFERENCES tipos_auditoria (id_tipo_auditoria),
  KEY idx_auditorias_area (id_area),
  KEY idx_auditorias_sub_area (id_sub_area),
  KEY idx_auditorias_tipo (id_tipo_auditoria),
  UNIQUE KEY uk_auditoria_unica_mes (id_sub_area, id_tipo_auditoria, periodo_mes, emp_id, turno)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auditorias_alerta_jefe (
  id_alerta INT AUTO_INCREMENT PRIMARY KEY,
  emp_id_jefe VARCHAR(50) NOT NULL,
  periodo_mes CHAR(7) NOT NULL,
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  correo_destino VARCHAR(255) NULL,
  total_subordinados INT NOT NULL DEFAULT 0,
  total_auditorias INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_alerta_jefe_periodo (emp_id_jefe, periodo_mes)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auditorias_generacion_mes (
  periodo_mes CHAR(7) NOT NULL PRIMARY KEY,
  fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creadas INT NOT NULL DEFAULT 0,
  omitidas INT NOT NULL DEFAULT 0,
  automatica TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auditoria_respuestas (
  id_respuesta INT AUTO_INCREMENT PRIMARY KEY,
  id_auditoria INT NOT NULL,
  id_pregunta INT NOT NULL,
  cumple ENUM('si', 'no') NULL,
  hallazgo TEXT NULL,
  id_tipo_nc INT NULL,
  id_accion INT NULL,
  emp_id_responsable VARCHAR(50) NULL,
  emp_nombre_responsable VARCHAR(200) NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resp_auditoria FOREIGN KEY (id_auditoria) REFERENCES auditorias (id_auditoria),
  CONSTRAINT fk_resp_pregunta FOREIGN KEY (id_pregunta) REFERENCES preguntas (id_pregunta),
  CONSTRAINT fk_resp_tipo_nc FOREIGN KEY (id_tipo_nc) REFERENCES tipos_no_conformidad (id_tipo_nc),
  CONSTRAINT fk_resp_accion FOREIGN KEY (id_accion) REFERENCES acciones (id_accion),
  UNIQUE KEY uk_resp_auditoria_pregunta (id_auditoria, id_pregunta)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  emp_nombre VARCHAR(150) NOT NULL,
  emp_apellido_paterno VARCHAR(150) NULL,
  emp_apellido_materno VARCHAR(150) NULL,
  id_nivel_usuario INT NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_nivel FOREIGN KEY (id_nivel_usuario) REFERENCES niveles_usuario (id_nivel_usuario),
  UNIQUE KEY uk_usuarios_emp_id_activo (emp_id, estado)
) ENGINE=InnoDB;

INSERT IGNORE INTO niveles_usuario (nombre, descripcion, orden) VALUES
  ('SALARY', 'Nivel Salary', 1),
  ('ING-AMBIENTAL', 'Ingeniero Ambiental', 2);
