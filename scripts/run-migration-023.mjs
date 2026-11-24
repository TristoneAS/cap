import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const sqlPath = path.join(
  root,
  "database/migrations/023_tickets_mantenimiento_por_area.sql",
);
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
  "SHOW COLUMNS FROM tickets_mantenimiento LIKE 'id_area'",
);
console.log("023 applied. id_area column:", cols.length ? "yes" : "no");
await conn.end();
