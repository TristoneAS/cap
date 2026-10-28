import fs from "fs/promises";
import path from "path";
import { capDb } from "@/libs/cap_db";

export const POKA_LISTADO_MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_EXT = new Set([
  ".pdf",
  ".xlsx",
  ".xls",
  ".csv",
  ".doc",
  ".docx",
]);

export function getPokaListadosUploadDir() {
  return path.join(process.cwd(), "uploads", "poka-yoke-listados");
}

export async function ensurePokaListadosUploadDir() {
  const dir = getPokaListadosUploadDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function sanitizeOriginalName(name) {
  const base = path.basename(String(name ?? "listado").trim()) || "listado";
  return base.replace(/[^\w.\- áéíóúÁÉÍÓÚñÑ()]/g, "_").slice(0, 200);
}

export function isAllowedListadoExtension(filename) {
  const ext = path.extname(String(filename ?? "")).toLowerCase();
  return ALLOWED_EXT.has(ext);
}

export async function listPokaYokeListados(limit = 100, idCliente = null) {
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const idCli = idCliente != null && idCliente !== "" ? Number(idCliente) : null;
  const params = [];
  let where = "";
  if (idCli) {
    where = "WHERE l.id_cliente = ?";
    params.push(idCli);
  }
  params.push(lim);
  const [rows] = await capDb.query(
    `SELECT l.id_listado, l.id_cliente, l.nombre_original, l.mime_type, l.tamano_bytes,
            l.emp_id_subio, l.emp_nombre_subio, l.comentario, l.fecha_creacion,
            c.id_cliente AS cliente_id, c.cliente AS cliente_nombre
     FROM poka_yoke_listados l
     LEFT JOIN procesos_clientes c ON c.id_cliente = l.id_cliente
     ${where}
     ORDER BY l.fecha_creacion DESC
     LIMIT ?`,
    params,
  );
  return rows;
}

export async function getPokaYokeListadoById(id) {
  const [rows] = await capDb.query(
    `SELECT id_listado, nombre_original, nombre_almacenado, mime_type, tamano_bytes,
            emp_id_subio, emp_nombre_subio, comentario, fecha_creacion
     FROM poka_yoke_listados WHERE id_listado = ?`,
    [id],
  );
  return rows[0] || null;
}

export async function insertPokaYokeListado(row) {
  const [result] = await capDb.query(
    `INSERT INTO poka_yoke_listados
     (nombre_original, nombre_almacenado, mime_type, tamano_bytes, emp_id_subio, emp_nombre_subio, comentario, id_cliente)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.nombre_original,
      row.nombre_almacenado,
      row.mime_type,
      row.tamano_bytes,
      row.emp_id_subio,
      row.emp_nombre_subio,
      row.comentario,
      row.id_cliente ?? null,
    ],
  );
  return result.insertId;
}

export function resolveListadoFilePath(nombreAlmacenado) {
  const safe = path.basename(String(nombreAlmacenado ?? ""));
  if (!safe || safe !== nombreAlmacenado) return null;
  return path.join(getPokaListadosUploadDir(), safe);
}

export async function deletePokaYokeListado(id) {
  const row = await getPokaYokeListadoById(id);
  if (!row) return { ok: false, status: 404, error: "Archivo no encontrado" };

  const filePath = resolveListadoFilePath(row.nombre_almacenado);
  if (filePath) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err?.code !== "ENOENT") {
        return { ok: false, status: 500, error: "No se pudo eliminar el archivo en disco" };
      }
    }
  }

  const [result] = await capDb.query(
    "DELETE FROM poka_yoke_listados WHERE id_listado = ?",
    [id],
  );
  if (!result.affectedRows) {
    return { ok: false, status: 404, error: "Archivo no encontrado" };
  }

  return { ok: true, nombre: row.nombre_original };
}
