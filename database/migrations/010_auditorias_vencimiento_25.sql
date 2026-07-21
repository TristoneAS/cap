-- Vencimiento: fecha_programada = día 25 del periodo
USE cap;

UPDATE auditorias
SET fecha_programada = CONCAT(periodo_mes, '-25')
WHERE periodo_mes REGEXP '^[0-9]{4}-[0-9]{2}$';
