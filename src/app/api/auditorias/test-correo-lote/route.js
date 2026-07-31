import { jsonError } from "@/libs/api_helpers";
import { empleados } from "@/libs/empleados";
import { mapEmpleadoRow, nombreCompletoEmpleado } from "@/libs/empleado_mapper";
import { getSmtpConfig, isValidEmail } from "@/libs/mailer";
import {
  isEmailTestEnabled,
  iterarEnvioCorreosPrueba,
} from "@/libs/test_correo_lote";

/**
 * Prueba de carga SMTP: envía N correos al usuario indicado (máx. 100).
 * POST { "emp_id": "12345", "cantidad": 100 }
 * POST { "emp_id": "12345", "numeros": [6, 12, 18] } — reenvío parcial
 * Requiere EMAIL_TEST_ENABLED=true en el servidor (o NODE_ENV=development).
 */
export async function POST(request) {
  if (!isEmailTestEnabled()) {
    return jsonError(
      "Prueba de correos deshabilitada. Defina EMAIL_TEST_ENABLED=true en el servidor.",
      403,
    );
  }

  if (!getSmtpConfig().configured) {
    return jsonError(
      "SMTP no configurado. Defina EMAIL_HOST, EMAIL_USER y EMAIL_PASSWORD.",
      500,
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const emp_id = String(body.emp_id ?? "").trim();
    const cantidad = Math.min(Math.max(Number(body.cantidad) || 100, 1), 100);
    const numeros = Array.isArray(body.numeros) ? body.numeros : null;
    const totalReferencia = body.total_referencia ?? cantidad;

    if (!emp_id) {
      return jsonError("emp_id es requerido", 400);
    }

    const [rows] = await empleados.query(
      "SELECT * FROM del_empleados WHERE emp_id = ? LIMIT 1",
      [emp_id],
    );
    if (!rows.length) {
      return jsonError(`Empleado ${emp_id} no encontrado`, 404);
    }

    const emp = mapEmpleadoRow(rows[0]);
    const to = String(emp?.emp_correo ?? "").trim();
    const nombre = nombreCompletoEmpleado(emp) || emp?.emp_nombre || emp_id;

    if (!isValidEmail(to)) {
      return jsonError(
        `${emp_id} (${nombre}): sin correo válido registrado`,
        400,
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const evt of iterarEnvioCorreosPrueba({
            to,
            nombre,
            emp_id,
            cantidad,
            numeros,
            totalReferencia,
          })) {
            controller.enqueue(encoder.encode(`${JSON.stringify(evt)}\n`));
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                enviados: 0,
                omitidos: cantidad,
                procesados: 0,
                total: cantidad,
                terminado: true,
                errores: [error.message || "Error al enviar correos de prueba"],
                fallidos: [],
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
    return jsonError("Error en prueba de correos", 500, error.message);
  }
}
