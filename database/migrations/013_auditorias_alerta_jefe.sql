-- Evita reenviar el mismo aviso al jefe en el mismo periodo
USE cap;

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
