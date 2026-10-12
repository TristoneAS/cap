import { jsonError, jsonOk } from "@/libs/api_helpers";
import { listTickets } from "@/libs/tickets_mantenimiento";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = String(searchParams.get("estado") || "").trim().toLowerCase();
    const conDetalle = searchParams.get("detalle") === "1";
    const limit = searchParams.get("limit");

    const rows = await listTickets({
      estado,
      conDetalle,
      limit,
    });

    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar tickets", 500, error.message);
  }
}
