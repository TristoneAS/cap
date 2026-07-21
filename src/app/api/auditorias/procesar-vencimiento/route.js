import { jsonError, jsonOk } from "@/libs/api_helpers";
import { procesarVencimientosAuditorias } from "@/libs/auditoria_vencimiento";

function autorizado(request) {
  const secret = process.env.CRON_SECRET || process.env.AUDITORIAS_CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get("authorization");
  const query = new URL(request.url).searchParams.get("secret");
  return header === `Bearer ${secret}` || query === secret;
}

/**
 * Marca auditorías vencidas y envía correo a jefes (un correo por jefe/periodo
 * al llegar fecha_programada, con la lista completa de su equipo).
 * Programar con cron diario o invocar manualmente.
 * Opcional: CRON_SECRET o AUDITORIAS_CRON_SECRET en Authorization: Bearer …
 */
export async function GET(request) {
  if (!autorizado(request)) {
    return jsonError("No autorizado", 401);
  }

  try {
    const resultado = await procesarVencimientosAuditorias();
    return jsonOk(resultado);
  } catch (error) {
    return jsonError("Error al procesar vencimientos", 500, error.message);
  }
}

export async function POST(request) {
  return GET(request);
}
