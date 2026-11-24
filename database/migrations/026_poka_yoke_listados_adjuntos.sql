-- Listados Poka Yoke adjuntos por Procesos (metadatos; archivo en disco en servidor)
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
