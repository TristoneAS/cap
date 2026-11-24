import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE_CAP || "cap",
});

async function hasTable(name) {
  const [r] = await conn.query("SHOW TABLES LIKE ?", [name]);
  return r.length > 0;
}

async function hasColumn(table, col) {
  const [r] = await conn.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [col]);
  return r.length > 0;
}

const checks = [
  ["pregunta_alcance", () => hasTable("pregunta_alcance")],
  ["preguntas sin id_area", () => hasTable("preguntas").then((ok) => ok && !hasColumn("preguntas", "id_area"))],
  ["turnos", () => hasTable("turnos")],
  ["preguntas_poka_yoke", () => hasTable("preguntas_poka_yoke")],
  ["tickets_mantenimiento", () => hasTable("tickets_mantenimiento")],
  ["tickets id_area", () => hasColumn("tickets_mantenimiento", "id_area")],
  ["tickets fecha_cierre", () => hasColumn("tickets_mantenimiento", "fecha_cierre")],
];

for (const [label, fn] of checks) {
  console.log(`${label}:`, (await fn()) ? "OK" : "no");
}

await conn.end();
