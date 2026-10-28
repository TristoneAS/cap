import { capDb } from "@/libs/cap_db";

export async function listProcesosClientes({ soloActivos = true } = {}) {
  const where = soloActivos ? "WHERE c.estado = 'activo'" : "";
  const [rows] = await capDb.query(
    `SELECT c.id_cliente, c.cliente, c.estado, c.fecha_creacion
     FROM procesos_clientes c
     ${where}
     ORDER BY c.cliente ASC, c.id_cliente ASC`,
  );
  return rows;
}

export async function getProcesoClienteById(id) {
  const [rows] = await capDb.query(
    `SELECT id_cliente, cliente, estado FROM procesos_clientes WHERE id_cliente = ?`,
    [id],
  );
  return rows[0] || null;
}

export async function getProcesoClienteActivoById(id) {
  const [rows] = await capDb.query(
    `SELECT id_cliente, cliente FROM procesos_clientes
     WHERE id_cliente = ? AND estado = 'activo'`,
    [id],
  );
  return rows[0] || null;
}

export function normalizeNombreCliente(value) {
  return String(value ?? "").trim();
}
