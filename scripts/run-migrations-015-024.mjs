import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const FILES = [
  "015_pregunta_alcance.sql",
  "016_auditoria_comentario.sql",
  "017_auditoria_respuesta_quitar_comentario.sql",
  "018_turnos_config.sql",
  "019_turnos_ae_be.sql",
  "020_poka_yoke.sql",
  "021_poka_yoke_sin_orden.sql",
  "022_tickets_mantenimiento.sql",
  "023_tickets_mantenimiento_por_area.sql",
  "024_ticket_cierre_procesos.sql",
];

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE_CAP || "cap",
  multipleStatements: true,
});

console.log(
  `Conectado a ${process.env.MYSQL_HOST}/${process.env.MYSQL_DATABASE_CAP || "cap"}\n`,
);

for (const file of FILES) {
  const sqlPath = path.join(root, "database/migrations", file);
  if (!fs.existsSync(sqlPath)) {
    console.error(`Falta archivo: ${file}`);
    process.exitCode = 1;
    break;
  }
  const sql = fs.readFileSync(sqlPath, "utf8");
  process.stdout.write(`Aplicando ${file} ... `);
  try {
    await conn.query(sql);
    console.log("OK");
  } catch (err) {
    console.log("ERROR");
    console.error(err.message);
    process.exitCode = 1;
    break;
  }
}

await conn.end();
console.log(process.exitCode ? "\nTerminado con errores." : "\nMigraciones 015–024 completadas.");
