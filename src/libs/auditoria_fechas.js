import { TIMEZONE_PLANTA } from "@/libs/turno_horario";

/**
 * Vencimiento fijo: día 25 del periodo (YYYY-MM).
 */
export function fechaVencimientoPeriodo(periodoMes) {
  const periodo = String(periodoMes || "").trim();
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new Error("periodo_mes inválido (se espera YYYY-MM)");
  }
  return `${periodo}-25`;
}

/** Fecha local de planta en YYYY-MM-DD. */
export function hoyPlantaYYYYMMDD(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_PLANTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
}

/** Periodo YYYY-MM en zona planta. */
export function periodoMesPlanta(date = new Date()) {
  return hoyPlantaYYYYMMDD(date).slice(0, 7);
}

/** true si hoy es día 1 del mes (zona planta). */
export function esPrimerDiaDelMes(date = new Date()) {
  return hoyPlantaYYYYMMDD(date).slice(8, 10) === "01";
}

/**
 * Vencida si el estado es vencida o si pasó fecha_programada sin cerrar.
 * Sigue permitiendo auditar; es señal visual y dispara alertas al jefe.
 */
export function esAuditoriaVencida(auditoria, ahora = new Date()) {
  if (!auditoria) return false;
  const estado = String(auditoria.estado || "").toLowerCase();
  if (estado === "completada" || estado === "cancelada") return false;
  if (estado === "vencida") return true;

  const raw = auditoria.fecha_programada;
  if (!raw) return false;
  const vencimiento = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimiento)) return false;

  return vencimiento < hoyPlantaYYYYMMDD(ahora);
}

export const COLOR_VENCIDA = "#C62828";

export function colorEstadoAuditoria(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "completada") return "#2E7D32";
  if (e === "en_progreso") return "#1565C0";
  if (e === "vencida") return COLOR_VENCIDA;
  return "#78909C";
}

export const ESTADOS_AUDITORIA_ABIERTA = ["pendiente", "en_progreso", "vencida"];
