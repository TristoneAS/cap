import { jsonError, jsonOk } from "@/libs/api_helpers";
import { generarAuditoriasAutomatico } from "@/libs/auditoria_generacion_automatica";

function autorizado(request) {
  const secret = process.env.CRON_SECRET || process.env.AUDITORIAS_CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get("authorization");
  const query = new URL(request.url).searchParams.get("secret");
  return header === `Bearer ${secret}` || query === secret;
}

/**
 * Generación automática de auditorías el día 1 de cada mes.
 * Programar llamada diaria (Task Scheduler / cron); solo genera si hoy es día 1.
 *
 * GET /api/auditorias/generar-automatico
 * GET /api/auditorias/generar-automatico?forzar=1   (prueba, ignora día 1)
 * Opcional: CRON_SECRET en Authorization: Bearer … o ?secret=
 */
export async function GET(request) {
  if (!autorizado(request)) {
    return jsonError("No autorizado", 401);
  }

  const { searchParams } = new URL(request.url);
  const forzar =
    searchParams.get("forzar") === "1" ||
    searchParams.get("force") === "1";

  try {
    const resultado = await generarAuditoriasAutomatico({ forzar });

    if (resultado.omitido) {
      return jsonOk(resultado, resultado.motivo);
    }

    if (!resultado.ok) {
      return jsonError(resultado.error || "Error al generar", resultado.status || 400, resultado.data);
    }

    return jsonOk(resultado.data, resultado.message);
  } catch (error) {
    return jsonError("Error en generación automática", 500, error.message);
  }
}

export async function POST(request) {
  return GET(request);
}
