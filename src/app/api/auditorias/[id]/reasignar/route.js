import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import {
  puedeReasignarAuditoria,
  reasignarAuditoria,
} from "@/libs/reasignar_auditoria";

export async function GET(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const result = await puedeReasignarAuditoria(id);
    return jsonOk(result);
  } catch (error) {
    return jsonError("Error al validar reasignación", 500, error.message);
  }
}

export async function POST(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const result = await reasignarAuditoria(id, {
      id_area: body.id_area,
      id_sub_area: body.id_sub_area,
      id_tipo_auditoria: body.id_tipo_auditoria,
      turno: body.turno,
    });

    if (!result.ok) {
      return jsonError(result.error, result.status || 400, result.data);
    }

    return jsonOk(result.data, result.message);
  } catch (error) {
    return jsonError("Error al reasignar auditoría", 500, error.message);
  }
}
