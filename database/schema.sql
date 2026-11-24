-- Base de datos CAP · Auditorías LPA
-- Ejecutar: mysql -u root < database/schema.sql

CREATE DATABASE IF NOT EXISTS cap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cap;

CREATE TABLE IF NOT EXISTS areas (
  id_area INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  id_nivel_usuario INT NULL COMMENT 'Si se define, solo ese nivel recibe auditorías del área',
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_areas_nombre_activo (nombre, estado),
  CONSTRAINT fk_areas_nivel_auditor FOREIGN KEY (id_nivel_usuario)
    REFERENCES niveles_usuario (id_nivel_usuario)
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
  id_tipo_nc INT NOT NULL,
  texto TEXT NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_preguntas_tipo FOREIGN KEY (id_tipo_auditoria) REFERENCES tipos_auditoria (id_tipo_auditoria),
  CONSTRAINT fk_preguntas_tipo_nc FOREIGN KEY (id_tipo_nc) REFERENCES tipos_no_conformidad (id_tipo_nc)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pregunta_alcance (
  id_alcance INT AUTO_INCREMENT PRIMARY KEY,
  id_pregunta INT NOT NULL,
  id_area INT NOT NULL,
  id_sub_area INT NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alcance_pregunta FOREIGN KEY (id_pregunta) REFERENCES preguntas (id_pregunta),
  CONSTRAINT fk_alcance_area FOREIGN KEY (id_area) REFERENCES areas (id_area),
  CONSTRAINT fk_alcance_sub_area FOREIGN KEY (id_sub_area) REFERENCES sub_areas (id_sub_area),
  UNIQUE KEY uk_pregunta_sub_area (id_pregunta, id_sub_area)
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
  turno VARCHAR(4) NOT NULL DEFAULT 'A',
  estado ENUM('pendiente', 'en_progreso', 'completada', 'cancelada', 'vencida') NOT NULL DEFAULT 'pendiente',
  fecha_programada DATE NOT NULL COMMENT 'Vencimiento: día 25 del periodo_mes',
  comentario TEXT NULL,
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

CREATE TABLE IF NOT EXISTS tickets_mantenimiento (
  id_ticket INT AUTO_INCREMENT PRIMARY KEY,
  id_area INT NOT NULL,
  id_sub_area INT NOT NULL,
  periodo_mes CHAR(7) NOT NULL,
  estado ENUM('abierto', 'en_proceso', 'resuelto', 'cancelado', 'cerrado') NOT NULL DEFAULT 'abierto',
  emp_id_asignado VARCHAR(50) NULL,
  emp_nombre_asignado VARCHAR(200) NULL,
  notas_resolucion TEXT NULL,
  notas_cierre TEXT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_resolucion TIMESTAMP NULL,
  fecha_cierre TIMESTAMP NULL,
  CONSTRAINT fk_tm_area FOREIGN KEY (id_area) REFERENCES areas (id_area),
  CONSTRAINT fk_tm_sub_area FOREIGN KEY (id_sub_area) REFERENCES sub_areas (id_sub_area),
  UNIQUE KEY uk_tm_area_sub_periodo (id_area, id_sub_area, periodo_mes),
  KEY idx_tm_estado (estado),
  KEY idx_tm_periodo (periodo_mes)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_mantenimiento_items (
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

CREATE TABLE IF NOT EXISTS procesos_clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  cliente VARCHAR(200) NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_procesos_clientes_cliente (cliente)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS poka_yoke_listados (
  id_listado INT AUTO_INCREMENT PRIMARY KEY,
  nombre_original VARCHAR(255) NOT NULL,
  nombre_almacenado VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  tamano_bytes INT UNSIGNED NULL,
  emp_id_subio VARCHAR(50) NULL,
  emp_nombre_subio VARCHAR(200) NULL,
  comentario TEXT NULL,
  id_cliente INT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_poka_listado_almacenado (nombre_almacenado),
  KEY idx_poka_listado_fecha (fecha_creacion),
  KEY idx_poka_listado_cliente (id_cliente),
  CONSTRAINT fk_poka_listado_cliente FOREIGN KEY (id_cliente)
    REFERENCES procesos_clientes (id_cliente) ON DELETE SET NULL
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
