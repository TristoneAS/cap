import { jsonError, jsonOk } from "@/libs/api_helpers";
import { fechaVencimientoPeriodo } from "@/libs/auditoria_fechas";
import { getSmtpConfig } from "@/libs/mailer";
import {
  listarAsignacionesCorreoPeriodo,
  notificarAsignacionUsuario,
} from "@/libs/notificar_usuarios_auditorias";

/**
 * Envía el correo de asignación a un solo auditor del periodo.
 * POST { "periodo_mes": "2026-07", "emp_id": "12345" }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const periodo_mes = String(body.periodo_mes ?? "").trim();
    const emp_id = String(body.emp_id ?? "").trim();

    if (!/^\d{4}-\d{2}$/.test(periodo_mes)) {
      return jsonError("periodo_mes inválido (YYYY-MM)", 400);
    }
    if (!emp_id) {
      return jsonError("emp_id es requerido", 400);
    }

    if (!getSmtpConfig().configured) {
      return jsonError(
        "SMTP no configurado. Reinicie npm run dev después de guardar .env.local (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD).",
        500,
      );
    }

    const asignaciones = await listarAsignacionesCorreoPeriodo(periodo_mes);
    const asignacion = asignaciones.find((a) => String(a.emp_id) === emp_id);
    if (!asignacion) {
      return jsonError(`No hay auditorías asignadas a ${emp_id} en ${periodo_mes}`, 404);
    }

    const fechaProgramada = fechaVencimientoPeriodo(periodo_mes);
    const resultado = await notificarAsignacionUsuario({
      periodo: periodo_mes,
      fechaProgramada,
      asignacion,
    });

    if (!resultado.enviado) {
      return jsonError(resultado.error || "No se pudo enviar el correo", 400);
    }

    return jsonOk(resultado, "Correo enviado");
  } catch (error) {
    return jsonError("Error al enviar correo", 500, error.message);
  }
}
