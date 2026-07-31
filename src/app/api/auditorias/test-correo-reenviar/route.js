import { jsonError, jsonOk } from "@/libs/api_helpers";
import { getSmtpConfig } from "@/libs/mailer";
import {
  isEmailTestEnabled,
  reenviarCorreoPrueba,
} from "@/libs/test_correo_lote";

/**
 * Reenvía un correo de prueba (con reintentos normales).
 * POST { "to", "nombre", "num", "total_lote": 100 }
 */
export async function POST(request) {
  if (!isEmailTestEnabled()) {
    return jsonError("Prueba de correos deshabilitada", 403);
  }

  if (!getSmtpConfig().configured) {
    return jsonError("SMTP no configurado", 500);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const to = String(body.to ?? "").trim();
    const nombre = String(body.nombre ?? "").trim();
    const num = Number(body.num);
    const totalLote = Number(body.total_lote) || 100;

    if (!to || !Number.isFinite(num) || num < 1) {
      return jsonError("to y num son requeridos", 400);
    }

    const resultado = await reenviarCorreoPrueba({
      to,
      nombre,
      num,
      totalLote,
    });

    if (!resultado.enviado) {
      return jsonError(resultado.error || "No se pudo enviar", 400);
    }

    return jsonOk({ enviado: true, num }, "Correo de prueba enviado");
  } catch (error) {
    return jsonError("Error al reenviar correo de prueba", 500, error.message);
  }
}
