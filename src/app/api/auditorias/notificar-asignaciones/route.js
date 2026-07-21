import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";
import { getSmtpConfig } from "@/libs/mailer";
import { fechaVencimientoPeriodo } from "@/libs/auditoria_fechas";
import { notificarUsuariosAuditoriasAsignadas } from "@/libs/notificar_usuarios_auditorias";

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

    const [rows] = await capDb.query(
      `SELECT aud.emp_id, aud.emp_nombre, aud.turno,
              a.nombre AS area_nombre, sa.nombre AS sub_area_nombre
       FROM auditorias aud
       INNER JOIN areas a ON a.id_area = aud.id_area
       INNER JOIN sub_areas sa ON sa.id_sub_area = aud.id_sub_area
       WHERE aud.periodo_mes = ?
       ORDER BY aud.emp_nombre ASC, a.nombre ASC, sa.nombre ASC, aud.turno ASC`,
      [periodo_mes],
    );

    if (!rows.length) {
      return jsonError(`No hay auditorías para el periodo ${periodo_mes}`, 404);
    }

    if (!getSmtpConfig().configured) {
      return jsonError(
        "SMTP no configurado. Reinicie npm run dev después de guardar .env.local (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD).",
        500,
      );
    }

    const porUsuario = new Map();
    for (const row of rows) {
      const empId = String(row.emp_id);
      if (!porUsuario.has(empId)) {
        porUsuario.set(empId, {
          emp_id: empId,
          nombre: row.emp_nombre,
          auditorias: [],
        });
      }
      porUsuario.get(empId).auditorias.push({
        area_nombre: row.area_nombre,
        sub_area_nombre: row.sub_area_nombre,
        turno: row.turno,
      });
    }

    const fechaProgramada = fechaVencimientoPeriodo(periodo_mes);
    const correos = await notificarUsuariosAuditoriasAsignadas({
      periodo: periodo_mes,
      fechaProgramada,
      asignaciones: [...porUsuario.values()],
    });

    return jsonOk({
      periodo_mes,
      usuarios: porUsuario.size,
      ...correos,
    });
  } catch (error) {
    return jsonError("Error al enviar correos de asignación", 500, error.message);
  }
}
