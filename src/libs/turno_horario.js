/** Zona horaria de planta (México). */
export const TIMEZONE_PLANTA = "America/Mexico_City";

/** Minutos desde medianoche. */
function toMinutes(h, m) {
  return h * 60 + m;
}

const HORARIO_DEFAULT = {
  aInicio: toMinutes(6, 0),
  aFin: toMinutes(15, 30),
  bInicio: toMinutes(15, 30),
  bFin: toMinutes(0, 30),
  descA: "Turno A: 06:00 – 15:30 (lunes a viernes)",
  descB: "Turno B: 15:30 – 00:30 (lunes a viernes)",
  motivoA:
    "El turno A solo se puede auditar de lunes a viernes, de 06:00 a 15:30.",
  motivoAFuera: "Fuera de horario del turno A (06:00 – 15:30, lunes a viernes).",
  motivoB:
    "Fuera de horario del turno B (15:30 – 00:30, lunes a viernes).",
};

const HORARIO_EXTRUSION = {
  aInicio: toMinutes(6, 0),
  aFin: toMinutes(18, 0),
  bInicio: toMinutes(18, 0),
  bFin: toMinutes(6, 0),
  descA: "Turno A: 06:00 – 18:00 (lunes a viernes)",
  descB: "Turno B: 18:00 – 06:00 (lunes a viernes)",
  motivoA:
    "El turno A solo se puede auditar de lunes a viernes, de 06:00 a 18:00.",
  motivoAFuera: "Fuera de horario del turno A (06:00 – 18:00, lunes a viernes).",
  motivoB:
    "Fuera de horario del turno B (18:00 – 06:00, lunes a viernes).",
};

/** Áreas cuyo nombre contiene "Extrusion" / "Extrusión" (p. ej. Extrusion - DEL, Extrusion - DELX). */
export function esAreaExtrusion(areaNombre) {
  const nombre = String(areaNombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return nombre.includes("extrusion");
}

function getConfigHorario(areaNombre) {
  return esAreaExtrusion(areaNombre) ? HORARIO_EXTRUSION : HORARIO_DEFAULT;
}

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
  return weekday >= 1 && weekday <= 5;
}

function turnoActivoEnConfig(turno, date, cfg) {
  const t = String(turno || "").toUpperCase();
  const { weekday, hour, minute } = getPartsMexico(date);
  const mins = toMinutes(hour, minute);

  if (t === "A") {
    if (!esDiaHabil(weekday)) {
      return { ok: false, motivo: cfg.motivoA };
    }
    if (mins >= cfg.aInicio && mins < cfg.aFin) {
      return { ok: true };
    }
    return { ok: false, motivo: cfg.motivoAFuera };
  }

  if (t === "B") {
    if (esDiaHabil(weekday) && mins >= cfg.bInicio) {
      return { ok: true };
    }
    if (weekday >= 2 && weekday <= 6 && mins < cfg.bFin) {
      return { ok: true };
    }
    return { ok: false, motivo: cfg.motivoB };
  }

  return { ok: false, motivo: "Turno no válido" };
}

/**
 * Turno A/B según horario del área.
 * Extrusión: A 06:00–18:00, B 18:00–06:00.
 * Resto: A 06:00–15:30, B 15:30–00:30.
 */
export function puedeAuditarEnHorario(turno, date = new Date(), areaNombre = null) {
  return turnoActivoEnConfig(turno, date, getConfigHorario(areaNombre));
}

export function descripcionHorarioTurno(turno, areaNombre = null) {
  const t = String(turno || "").toUpperCase();
  const cfg = getConfigHorario(areaNombre);
  if (t === "A") return cfg.descA;
  if (t === "B") return cfg.descB;
  return "Turno no definido";
}

/** Turno vigente ahora para un área, o null si no hay ventana de auditoría. */
export function turnoActualAhora(date = new Date(), areaNombre = null) {
  if (puedeAuditarEnHorario("A", date, areaNombre).ok) return "A";
  if (puedeAuditarEnHorario("B", date, areaNombre).ok) return "B";
  return null;
}

export function mensajeTurnoActual(date = new Date()) {
  const turnoGeneral = turnoActualAhora(date);
  const turnoExtrusion = turnoActualAhora(date, "Extrusion");

  if (turnoGeneral === turnoExtrusion) {
    if (turnoGeneral === "A") {
      return {
        turno: "A",
        titulo: "Ahora es turno A",
        detalle:
          "Extrusión: turno A 06:00–18:00. Otras áreas: turno A 06:00–15:30. Solo auditorías de turno A disponibles ahora.",
      };
    }
    if (turnoGeneral === "B") {
      return {
        turno: "B",
        titulo: "Ahora es turno B",
        detalle:
          "Extrusión: turno B 18:00–06:00. Otras áreas: turno B 15:30–00:30. Solo auditorías de turno B disponibles ahora.",
      };
    }
  }

  if (turnoGeneral && turnoExtrusion && turnoGeneral !== turnoExtrusion) {
    return {
      turno: null,
      titulo: "Turno vigente según área",
      detalle: `Extrusión: turno ${turnoExtrusion} (${turnoExtrusion === "A" ? "06:00–18:00" : "18:00–06:00"}). Otras áreas: turno ${turnoGeneral} (${turnoGeneral === "A" ? "06:00–15:30" : "15:30–00:30"}). Revise cada auditoría según su área.`,
    };
  }

  if (turnoExtrusion && !turnoGeneral) {
    return {
      turno: turnoExtrusion,
      titulo: `Ahora es turno ${turnoExtrusion} (Extrusión)`,
      detalle:
        "Solo áreas Extrusión tienen ventana de auditoría ahora (A 06:00–18:00 · B 18:00–06:00). Otras áreas están fuera de horario.",
    };
  }

  if (turnoGeneral && !turnoExtrusion) {
    return {
      turno: turnoGeneral,
      titulo: `Ahora es turno ${turnoGeneral}`,
      detalle:
        "Otras áreas: " +
        (turnoGeneral === "A" ? "turno A 06:00–15:30" : "turno B 15:30–00:30") +
        ". Extrusión usa horario distinto (A 06:00–18:00 · B 18:00–06:00).",
    };
  }

  return {
    turno: null,
    titulo: "Fuera de horario de auditoría",
    detalle:
      "Extrusión — Turno A: 06:00–18:00 · Turno B: 18:00–06:00. Otras áreas — Turno A: 06:00–15:30 · Turno B: 15:30–00:30 (lun–vie, hora México).",
  };
}
