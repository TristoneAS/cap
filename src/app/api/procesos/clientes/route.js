import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";
import { listProcesosClientes, normalizeNombreCliente } from "@/libs/procesos_clientes";

export async function GET() {
  try {
    const rows = await listProcesosClientes({ soloActivos: true });
    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar clientes", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const cliente = normalizeNombreCliente(body.cliente);

    if (!cliente) return jsonError("El nombre de cliente es requerido", 400);

    const [result] = await capDb.query(
      `INSERT INTO procesos_clientes (cliente) VALUES (?)`,
      [cliente],
    );

    const id_cliente = result.insertId;

    return jsonOk(
      { id_cliente, cliente },
      "Cliente agregado correctamente",
      201,
    );
  } catch (error) {
    return jsonError("Error al crear cliente", 500, error.message);
  }
}
