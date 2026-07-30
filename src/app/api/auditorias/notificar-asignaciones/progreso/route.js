import { jsonError } from "@/libs/api_helpers";
import { fechaVencimientoPeriodo } from "@/libs/auditoria_fechas";
import { getSmtpConfig } from "@/libs/mailer";
import {
  iterarEnvioCorreosAsignacion,
  listarAsignacionesCorreoPeriodo,
} from "@/libs/notificar_usuarios_auditorias";

/**
 * Envía correos del periodo en un solo request y transmite progreso (NDJSON).
 * POST { "periodo_mes": "2026-07", "asignaciones": [...] }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const periodo_mes = String(body.periodo_mes ?? "").trim();

    if (!/^\d{4}-\d{2}$/.test(periodo_mes)) {
      return jsonError("periodo_mes inválido (YYYY-MM)", 400);
    }

    if (!getSmtpConfig().configured) {
      return jsonError(
        "SMTP no configurado. Reinicie npm run dev después de guardar .env.local (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD).",
        500,
      );
    }

    let asignaciones = Array.isArray(body.asignaciones) ? body.asignaciones : null;
    if (!asignaciones?.length) {
      asignaciones = await listarAsignacionesCorreoPeriodo(periodo_mes);
    }
    if (!asignaciones.length) {
      return jsonError(`No hay auditorías para el periodo ${periodo_mes}`, 404);
    }

    const fechaProgramada = fechaVencimientoPeriodo(periodo_mes);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const evt of iterarEnvioCorreosAsignacion({
            periodo: periodo_mes,
            fechaProgramada,
            asignaciones,
          })) {
            controller.enqueue(
              encoder.encode(`${JSON.stringify(evt)}\n`),
            );
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                enviados: 0,
                omitidos: 0,
                procesados: 0,
                total: asignaciones.length,
                terminado: true,
                errores: [error.message || "Error al enviar correos"],
              })}\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    return jsonError("Error al enviar correos de asignación", 500, error.message);
  }
}
