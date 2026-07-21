-- Migración: usuarios, tipos y niveles
USE cap;

CREATE TABLE IF NOT EXISTS tipos_usuario (
  id_tipo_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  UNIQUE KEY uk_tipos_usuario_nombre (nombre, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS niveles_usuario (
  id_nivel_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) NULL,
  orden INT NOT NULL DEFAULT 0,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  UNIQUE KEY uk_niveles_usuario_nombre (nombre, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  emp_nombre VARCHAR(150) NOT NULL,
  emp_apellido_paterno VARCHAR(150) NULL,
  emp_apellido_materno VARCHAR(150) NULL,
  id_tipo_usuario INT NOT NULL,
  id_nivel_usuario INT NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_tipo FOREIGN KEY (id_tipo_usuario) REFERENCES tipos_usuario (id_tipo_usuario),
  CONSTRAINT fk_usuarios_nivel FOREIGN KEY (id_nivel_usuario) REFERENCES niveles_usuario (id_nivel_usuario),
  UNIQUE KEY uk_usuarios_emp_id_activo (emp_id, estado)
) ENGINE=InnoDB;

INSERT IGNORE INTO tipos_usuario (nombre, descripcion) VALUES
  ('Auditor', 'Realiza auditorías LPA en planta'),
  ('Supervisor', 'Supervisa y valida auditorías'),
  ('Administrador', 'Configura catálogos y usuarios');

INSERT IGNORE INTO niveles_usuario (nombre, descripcion, orden) VALUES
  ('Nivel 1', 'Auditoría de primer nivel', 1),
  ('Nivel 2', 'Auditoría de segundo nivel', 2),
  ('Nivel 3', 'Auditoría de tercer nivel', 3);
