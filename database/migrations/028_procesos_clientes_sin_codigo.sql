-- Si ya aplicó 027 con columna codigo: ID pasa a ser solo id_cliente (AUTO_INCREMENT)
USE cap;

ALTER TABLE procesos_clientes DROP INDEX uk_procesos_clientes_codigo;

ALTER TABLE procesos_clientes DROP COLUMN codigo;
