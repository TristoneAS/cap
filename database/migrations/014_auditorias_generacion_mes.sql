-- Una sola generación de auditorías por periodo (mes)
USE cap;

CREATE TABLE IF NOT EXISTS auditorias_generacion_mes (
  periodo_mes CHAR(7) NOT NULL PRIMARY KEY,
  fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creadas INT NOT NULL DEFAULT 0,
  omitidas INT NOT NULL DEFAULT 0,
  automatica TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;
