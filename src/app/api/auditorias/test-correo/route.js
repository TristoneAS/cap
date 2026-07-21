import { jsonError, jsonOk } from "@/libs/api_helpers";
import { getSmtpConfig, isValidEmail, sendMailMessage } from "@/libs/mailer";
import { procesarVencimientosAuditorias } from "@/libs/auditoria_vencimiento";

function permitidoEnDev() {
  return process.env.NODE_ENV === "development";
}

function errorSmtpNoConfigurado() {
  return jsonError(
    "SMTP no configurado en el servidor. Reinicie npm run dev después de guardar .env.local (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD).",
    500,
  );
}

/**
 * Prueba de correo en desarrollo.
 *
 * SMTP simple:
 *   GET /api/auditorias/test-correo?to=tu@correo.com
 *
 * Flujo real de jefes (misma lógica que producción):
 *   GET /api/auditorias/test-correo?modo=jefes
 */
export async function GET(request) {
  if (!permitidoEnDev()) {
    return jsonError("Solo disponible en desarrollo", 403);
  }

  const { searchParams } = new URL(request.url);
  const modo = String(searchParams.get("modo") || "smtp").toLowerCase();

  if (modo === "jefes") {
    if (!getSmtpConfig().configured) return errorSmtpNoConfigurado();
    try {
      const resultado = await procesarVencimientosAuditorias();
      return jsonOk({
        ...resultado,
        smtp_configurado: true,
        ayuda:
          "Si correos_enviados=0: verifique fecha_programada <= hoy, auditorías abiertas, emp_correo del jefe y que no exista registro en auditorias_alerta_jefe.",
      });
    } catch (error) {
      return jsonError("Error al procesar avisos a jefes", 500, error.message);
    }
  }

  if (!getSmtpConfig().configured) {
    return errorSmtpNoConfigurado();
  }

  const to = String(searchParams.get("to") || "").trim();
  if (!isValidEmail(to)) {
    return jsonError(
      "Indique ?to=correo@valido.com o use ?modo=jefes para probar el flujo completo",
      400,
    );
  }

  try {
    await sendMailMessage({
      to,
      subject: "CAP · Prueba de correo",
      text: "Si recibes este mensaje, el SMTP de CAP está configurado correctamente.",
      html: "<p>Si recibes este mensaje, el <strong>SMTP de CAP</strong> está configurado correctamente.</p>",
    });
    return jsonOk({ enviado: true, to, smtp_configurado: true });
  } catch (error) {
    return jsonError("Error al enviar correo de prueba", 500, error.message);
  }
}
