-- Clientes Procesos + vínculo en listados Poka Yoke adjuntos
USE cap;

CREATE TABLE IF NOT EXISTS procesos_clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  cliente VARCHAR(200) NOT NULL,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_procesos_clientes_cliente (cliente)
) ENGINE=InnoDB;

ALTER TABLE poka_yoke_listados
  ADD COLUMN id_cliente INT NULL AFTER comentario,
  ADD KEY idx_poka_listado_cliente (id_cliente),
  ADD CONSTRAINT fk_poka_listado_cliente FOREIGN KEY (id_cliente)
    REFERENCES procesos_clientes (id_cliente) ON DELETE SET NULL;
