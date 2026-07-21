import { jsonError, jsonOk } from "@/libs/api_helpers";
import { periodoMesPlanta } from "@/libs/auditoria_fechas";
import { consultarGeneracionPeriodo } from "@/libs/generar_auditorias";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo_mes = String(
      searchParams.get("periodo_mes") ?? periodoMesPlanta(),
    ).trim();

    if (!/^\d{4}-\d{2}$/.test(periodo_mes)) {
      return jsonError("periodo_mes inválido (YYYY-MM)", 400);
    }

    const data = await consultarGeneracionPeriodo(periodo_mes);
    return jsonOk(data);
  } catch (error) {
    return jsonError("Error al consultar generación del periodo", 500, error.message);
  }
}
