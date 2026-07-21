/** Zona horaria de planta (México). */
export const TIMEZONE_PLANTA = "America/Mexico_City";

/** Minutos desde medianoche. */
function toMinutes(h, m) {
  return h * 60 + m;
}

const TURNO_A_INICIO = toMinutes(6, 0); // 06:00
const TURNO_A_FIN = toMinutes(15, 30); // 15:30
const TURNO_B_INICIO = toMinutes(15, 30); // 15:30
const TURNO_B_FIN = toMinutes(0, 30); // 00:30 (cruza medianoche)

function getPartsMexico(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE_PLANTA,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    weekday: weekdayMap[parts.weekday] ?? 0,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function esDiaHabil(weekday) {
  return weekday >= 1 && weekday <= 5; // lun–vie
}

/**
 * Turno A: lun–vie 06:00–15:30
 * Turno B: lun–vie 15:30–24:00 y mar–sáb 00:00–00:30
 *   (el tramo de medianoche es continuación del turno B del día hábil anterior;
 *    viernes 15:30 puede extenderse hasta sábado 00:30)
 */
export function puedeAuditarEnHorario(turno, date = new Date()) {
  const t = String(turno || "").toUpperCase();
  const { weekday, hour, minute } = getPartsMexico(date);
  const mins = toMinutes(hour, minute);

  if (t === "A") {
    if (!esDiaHabil(weekday)) {
      return {
        ok: false,
        motivo:
          "El turno A solo se puede auditar de lunes a viernes, de 06:00 a 15:30.",
      };
    }
    if (mins >= TURNO_A_INICIO && mins < TURNO_A_FIN) {
      return { ok: true };
    }
    return {
      ok: false,
      motivo: "Fuera de horario del turno A (06:00 – 15:30, lunes a viernes).",
    };
  }

  if (t === "B") {
    // Tarde/noche: lun–vie desde 15:30 hasta medianoche
    if (esDiaHabil(weekday) && mins >= TURNO_B_INICIO) {
      return { ok: true };
    }
    // Justo después de medianoche: mar–sáb 00:00–00:30 (continuación del día hábil anterior)
    if (weekday >= 2 && weekday <= 6 && mins < TURNO_B_FIN) {
      return { ok: true };
    }
    return {
      ok: false,
      motivo:
        "Fuera de horario del turno B (15:30 – 00:30, lunes a viernes).",
    };
  }

  return { ok: false, motivo: "Turno no válido" };
}

export function descripcionHorarioTurno(turno) {
  const t = String(turno || "").toUpperCase();
  if (t === "A") return "Turno A: 06:00 – 15:30 (lunes a viernes)";
  if (t === "B") return "Turno B: 15:30 – 00:30 (lunes a viernes)";
  return "Turno no definido";
}

/** Turno vigente ahora en planta, o null si no hay ventana de auditoría. */
export function turnoActualAhora(date = new Date()) {
  if (puedeAuditarEnHorario("A", date).ok) return "A";
  if (puedeAuditarEnHorario("B", date).ok) return "B";
  return null;
}

export function mensajeTurnoActual(date = new Date()) {
  const turno = turnoActualAhora(date);
  if (turno === "A") {
    return {
      turno,
      titulo: "Ahora es turno A",
      detalle:
        "Solo puedes ejecutar auditorías de turno A (06:00 – 15:30). Las de turno B quedan bloqueadas hasta las 15:30.",
    };
  }
  if (turno === "B") {
    return {
      turno,
      titulo: "Ahora es turno B",
      detalle:
        "Solo puedes ejecutar auditorías de turno B (15:30 – 00:30). Las de turno A quedan bloqueadas hasta mañana 06:00.",
    };
  }
  return {
    turno: null,
    titulo: "Fuera de horario de auditoría",
    detalle:
      "Ninguna auditoría se puede ejecutar ahora. Turno A: 06:00–15:30 · Turno B: 15:30–00:30 (lun–vie, hora México).",
  };
}
