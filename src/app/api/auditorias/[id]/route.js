import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import { PREGUNTAS_SELECT } from "@/libs/preguntas_helpers";
import {
  descripcionHorarioTurno,
  puedeAuditarEnHorario,
} from "@/libs/turno_horario";
import { calcularPorcentajeCumplimiento } from "@/libs/auditoria_score";

const AUDITORIA_SELECT = `
  SELECT aud.id_auditoria, aud.id_area, aud.id_sub_area, aud.id_tipo_auditoria,
         aud.emp_id, aud.emp_nombre, aud.periodo_mes, aud.turno, aud.estado, aud.fecha_programada,
         a.nombre AS area_nombre, sa.nombre AS sub_area_nombre,
         t.nombre AS tipo_nombre
  FROM auditorias aud
  INNER JOIN areas a ON a.id_area = aud.id_area
  INNER JOIN sub_areas sa ON sa.id_sub_area = aud.id_sub_area
  INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = aud.id_tipo_auditoria
  WHERE aud.id_auditoria = ?
`;

export async function GET(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const { searchParams } = new URL(request.url);
    const isAdmin =
      searchParams.get("is_admin") === "true" ||
      searchParams.get("is_admin") === "1";
    const [auditorias] = await capDb.query(AUDITORIA_SELECT, [id]);
    if (!auditorias.length) return jsonError("Auditoría no encontrada", 404);

    const aud = auditorias[0];
    const cerrada = aud.estado === "completada" || aud.estado === "cancelada";

    const [respuestas] = await capDb.query(
      `SELECT ar.id_respuesta, ar.id_pregunta, ar.cumple, ar.hallazgo, ar.id_tipo_nc,
              ar.id_accion, ar.emp_id_responsable, ar.emp_nombre_responsable,
              ac.nombre AS accion_nombre,
              nc.nombre AS tipo_nc_nombre
       FROM auditoria_respuestas ar
       LEFT JOIN acciones ac ON ac.id_accion = ar.id_accion
       LEFT JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = ar.id_tipo_nc
       WHERE ar.id_auditoria = ?`,
      [id],
    );

    const respByPregunta = Object.fromEntries(
      respuestas.map((r) => [r.id_pregunta, r]),
    );

    let checklist;

    if (cerrada) {
      // Congelar checklist a lo que se respondió: no mezclar preguntas nuevas del catálogo.
      const [preguntasCerradas] = await capDb.query(
        `SELECT p.id_pregunta, p.id_tipo_auditoria, p.id_area, p.id_sub_area, p.id_tipo_nc,
                p.texto, p.estado,
                t.nombre AS tipo_nombre,
                a.nombre AS area_nombre,
                sa.nombre AS sub_area_nombre,
                nc.nombre AS tipo_nc_nombre
         FROM auditoria_respuestas ar
         INNER JOIN preguntas p ON p.id_pregunta = ar.id_pregunta
         INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = p.id_tipo_auditoria
         INNER JOIN areas a ON a.id_area = p.id_area
         INNER JOIN sub_areas sa ON sa.id_sub_area = p.id_sub_area
         INNER JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = p.id_tipo_nc
         WHERE ar.id_auditoria = ?
           AND ar.cumple IS NOT NULL
         ORDER BY p.id_pregunta ASC`,
        [id],
      );
      checklist = preguntasCerradas.map((p) => ({
        ...p,
        respuesta: respByPregunta[p.id_pregunta] || null,
      }));
    } else {
      const [preguntas] = await capDb.query(
        `${PREGUNTAS_SELECT}
         AND p.id_tipo_auditoria = ?
         AND p.id_area = ?
         AND p.id_sub_area = ?
         ORDER BY p.id_pregunta ASC`,
        [aud.id_tipo_auditoria, aud.id_area, aud.id_sub_area],
      );
      checklist = preguntas.map((p) => ({
        ...p,
        respuesta: respByPregunta[p.id_pregunta] || null,
      }));
    }

    const horarioTurno = puedeAuditarEnHorario(aud.turno);
    const horario = isAdmin
      ? { ok: true, motivo: null }
      : horarioTurno;
    const totalPreguntas = checklist.length;
    const respuestasSi = checklist.filter((p) => p.respuesta?.cumple === "si").length;
    const respondidas = checklist.filter((p) => p.respuesta?.cumple).length;
    const porcentaje =
      aud.estado === "completada" ||
      (totalPreguntas > 0 && respondidas >= totalPreguntas)
        ? calcularPorcentajeCumplimiento({
            totalPreguntas,
            respuestasSi,
          })
        : null;

    return jsonOk({
      auditoria: aud,
      preguntas: checklist,
      porcentaje,
      respuestas_si: respuestasSi,
      total_preguntas: totalPreguntas,
      horario: {
        permitido: horario.ok,
        motivo: horario.motivo || null,
        descripcion: descripcionHorarioTurno(aud.turno),
      },
    });
  } catch (error) {
    return jsonError("Error al consultar auditoría", 500, error.message);
  }
}
