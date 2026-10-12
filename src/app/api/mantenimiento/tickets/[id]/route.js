import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import { actualizarTicketMantenimiento } from "@/libs/tickets_mantenimiento";

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const estado = String(body.estado ?? "").trim().toLowerCase();
    const notas = body.notas_resolucion;

    const result = await actualizarTicketMantenimiento(id, {
      estado: estado || undefined,
      notas_resolucion: notas,
    });

    if (result.error) {
      return jsonError(result.error, result.status || 400);
    }

    return jsonOk({ id_ticket: Number(id), estado: result.estado }, "Ticket actualizado");
  } catch (error) {
    return jsonError("Error al actualizar ticket", 500, error.message);
  }
}
