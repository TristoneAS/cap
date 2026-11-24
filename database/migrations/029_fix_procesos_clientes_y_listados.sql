-- Un solo script: deja Procesos (clientes + adjuntos Poka Yoke) como debe quedar.
-- Seguro de ejecutar más de una vez.
USE cap;

CREATE TABLE IF NOT EXISTS poka_yoke_listados (
  id_listado INT AUTO_INCREMENT PRIMARY KEY,
  nombre_original VARCHAR(255) NOT NULL,
  nombre_almacenado VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  tamano_bytes INT UNSIGNED NULL,
  emp_id_subio VARCHAR(50) NULL,
  emp_nombre_subio VARCHAR(200) NULL,
  comentario TEXT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_poka_listado_almacenado (nombre_almacenado),
  KEY idx_poka_listado_fecha (fecha_creacion)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS procesos_clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  cliente VARCHAR(200) NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_procesos_clientes_cliente (cliente)
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS cap_fix_procesos_clientes_y_listados;

DELIMITER $$

CREATE PROCEDURE cap_fix_procesos_clientes_y_listados()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'procesos_clientes'
      AND COLUMN_NAME = 'codigo'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'procesos_clientes'
        AND INDEX_NAME = 'uk_procesos_clientes_codigo'
    ) THEN
      ALTER TABLE procesos_clientes DROP INDEX uk_procesos_clientes_codigo;
    END IF;
    ALTER TABLE procesos_clientes DROP COLUMN codigo;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'poka_yoke_listados'
      AND COLUMN_NAME = 'id_cliente'
  ) THEN
    ALTER TABLE poka_yoke_listados
      ADD COLUMN id_cliente INT NULL AFTER comentario;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'poka_yoke_listados'
      AND INDEX_NAME = 'idx_poka_listado_cliente'
  ) THEN
    ALTER TABLE poka_yoke_listados
      ADD KEY idx_poka_listado_cliente (id_cliente);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'poka_yoke_listados'
      AND CONSTRAINT_NAME = 'fk_poka_listado_cliente'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE poka_yoke_listados
      ADD CONSTRAINT fk_poka_listado_cliente FOREIGN KEY (id_cliente)
        REFERENCES procesos_clientes (id_cliente) ON DELETE SET NULL;
  END IF;
END$$

DELIMITER ;

CALL cap_fix_procesos_clientes_y_listados();
DROP PROCEDURE IF EXISTS cap_fix_procesos_clientes_y_listados;
