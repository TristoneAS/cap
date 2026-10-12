import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import { cerrarTicketProcesos } from "@/libs/tickets_mantenimiento";

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const notas = body.notas_cierre;

    const result = await cerrarTicketProcesos(id, { notas_cierre: notas });

    if (result.error) {
      return jsonError(result.error, result.status || 400);
    }

    return jsonOk({ id_ticket: Number(id), estado: result.estado }, "Ticket cerrado");
  } catch (error) {
    return jsonError("Error al cerrar ticket", 500, error.message);
  }
}
