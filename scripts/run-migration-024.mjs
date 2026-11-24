import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const sqlPath = path.join(root, "database/migrations/024_ticket_cierre_procesos.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE_CAP || "cap",
  multipleStatements: true,
});

await conn.query(sql);
const [cols] = await conn.query(
  "SHOW COLUMNS FROM tickets_mantenimiento LIKE 'fecha_cierre'",
);
console.log("024 applied. fecha_cierre:", cols.length ? "yes" : "no");
await conn.end();
