/**
 * % de cumplimiento: cada pregunta vale lo mismo.
 * Sí suma, No no suma.
 * Base = total de preguntas del checklist vigente (en completadas: las respondidas).
 */
export function calcularPorcentajeCumplimiento({
  totalPreguntas = 0,
  respuestasSi = 0,
}) {
  const total = Number(totalPreguntas) || 0;
  if (total <= 0) return null;
  const si = Number(respuestasSi) || 0;
  return Math.round((si / total) * 100);
}

export function formatPorcentaje(pct) {
  if (pct == null || Number.isNaN(pct)) return "—";
  return `${pct}%`;
}
