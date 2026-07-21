import { NextResponse } from "next/server";

export function jsonOk(data, message, status = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function jsonError(error, status = 500, details) {
  return NextResponse.json(
    { success: false, error, ...(details ? { details } : {}) },
    { status },
  );
}

export function parseId(params, key) {
  return String(params?.[key] ?? "").trim();
}

export async function listActive(conn, table, orderBy = "nombre ASC") {
  const [rows] = await conn.query(
    `SELECT * FROM ${table} WHERE estado = 'activo' ORDER BY ${orderBy}`,
  );
  return rows;
}

export async function softDelete(conn, table, idField, id) {
  const [existing] = await conn.query(
    `SELECT * FROM ${table} WHERE ${idField} = ? AND estado = 'activo'`,
    [id],
  );
  if (!existing.length) return null;
  await conn.query(`UPDATE ${table} SET estado = 'inactivo' WHERE ${idField} = ?`, [
    id,
  ]);
  return existing[0];
}
