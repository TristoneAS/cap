import { jsonError, jsonOk } from "@/libs/api_helpers";
import { fechaVencimientoPeriodo } from "@/libs/auditoria_fechas";
import { getSmtpConfig } from "@/libs/mailer";
import {
  listarAsignacionesCorreoPeriodo,
  notificarUsuariosAuditoriasAsignadas,
} from "@/libs/notificar_usuarios_auditorias";

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Lista auditores del periodo para envío de correos (sin enviar).
 * GET ?periodo_mes=2026-07
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo_mes = String(searchParams.get("periodo_mes") ?? currentPeriod()).trim();

    if (!/^\d{4}-\d{2}$/.test(periodo_mes)) {
      return jsonError("periodo_mes inválido (YYYY-MM)", 400);
    }

    const asignaciones = await listarAsignacionesCorreoPeriodo(periodo_mes);
    if (!asignaciones.length) {
      return jsonError(`No hay auditorías para el periodo ${periodo_mes}`, 404);
    }

    return jsonOk({
      periodo_mes,
      usuarios: asignaciones.length,
      asignaciones,
      fecha_programada: fechaVencimientoPeriodo(periodo_mes),
    });
  } catch (error) {
    return jsonError("Error al listar destinatarios", 500, error.message);
  }
}

/**
 * Reenvía correos de asignación del periodo (un correo por auditor con sus auditorías).
 * POST { "periodo_mes": "2026-07" }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const periodo_mes = String(body.periodo_mes ?? currentPeriod()).trim();

    if (!/^\d{4}-\d{2}$/.test(periodo_mes)) {
      return jsonError("periodo_mes inválido (YYYY-MM)", 400);
    }

    const asignaciones = await listarAsignacionesCorreoPeriodo(periodo_mes);
    if (!asignaciones.length) {
      return jsonError(`No hay auditorías para el periodo ${periodo_mes}`, 404);
    }

    if (!getSmtpConfig().configured) {
      return jsonError(
        "SMTP no configurado. Reinicie npm run dev después de guardar .env.local (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD).",
        500,
      );
    }

    const fechaProgramada = fechaVencimientoPeriodo(periodo_mes);
    const correos = await notificarUsuariosAuditoriasAsignadas({
      periodo: periodo_mes,
      fechaProgramada,
      asignaciones,
    });

    return jsonOk({
      periodo_mes,
      usuarios: asignaciones.length,
      asignaciones,
      ...correos,
    });
  } catch (error) {
    return jsonError("Error al enviar correos de asignación", 500, error.message);
  }
}
