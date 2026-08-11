/** Zona horaria de planta (México). */
export const TIMEZONE_PLANTA = "America/Mexico_City";

/** Minutos desde medianoche. */
export function toMinutes(h, m) {
  return h * 60 + m;
}

export function timeToMinutes(timeValue) {
  const [h, m] = String(timeValue ?? "0:0").split(":").map(Number);
  return toMinutes(h || 0, m || 0);
}

export function formatHora(timeValue) {
  const raw = String(timeValue ?? "").trim();
  if (!raw) return "00:00";
  const parts = raw.split(":");
  const h = String(Number(parts[0] || 0)).padStart(2, "0");
  const m = String(Number(parts[1] || 0)).padStart(2, "0");
  return `${h}:${m}`;
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

function buildMotivosTurno(turnoCfg) {
  const codigo = String(turnoCfg.codigo || "").toUpperCase();
  const hi = formatHora(turnoCfg.hora_inicio);
  const hf = formatHora(turnoCfg.hora_fin);
  return {
    desc: `Turno ${codigo}: ${hi} – ${hf} (lunes a viernes)`,
    motivoDia: `El turno ${codigo} solo se puede auditar de lunes a viernes, de ${hi} a ${hf}.`,
    motivoFuera: `Fuera de horario del turno ${codigo} (${hi} – ${hf}, lunes a viernes).`,
  };
}

function turnoActivoEnHorario(turnoCfg, date = new Date()) {
  if (!turnoCfg) {
    return { ok: false, motivo: "Turno no configurado" };
  }

  const { weekday, hour, minute } = getPartsMexico(date);
  const mins = toMinutes(hour, minute);
  const inicio = timeToMinutes(turnoCfg.hora_inicio);
  const fin = timeToMinutes(turnoCfg.hora_fin);
  const motivos = buildMotivosTurno(turnoCfg);

  if (fin > inicio) {
    if (!esDiaHabil(weekday)) {
      return { ok: false, motivo: motivos.motivoDia };
    }
    if (mins >= inicio && mins < fin) {
      return { ok: true };
    }
    return { ok: false, motivo: motivos.motivoFuera };
  }

  if (esDiaHabil(weekday) && mins >= inicio) {
    return { ok: true };
  }
  if (weekday >= 2 && weekday <= 6 && mins < fin) {
    return { ok: true };
  }
  return { ok: false, motivo: motivos.motivoFuera };
}

export function puedeAuditarEnHorario(turnoCodigo, date = new Date(), turnosByCodigo = null) {
  const codigo = String(turnoCodigo || "").toUpperCase();
  const cfg = turnosByCodigo?.[codigo];
  return turnoActivoEnHorario(cfg, date);
}

export function descripcionHorarioTurno(turnoCodigo, turnosByCodigo = null) {
  const codigo = String(turnoCodigo || "").toUpperCase();
  const cfg = turnosByCodigo?.[codigo];
  if (!cfg) return "Turno no definido";
  return buildMotivosTurno(cfg).desc;
}

export function turnosOrdenados(turnosByCodigo = {}) {
  return Object.values(turnosByCodigo).sort((a, b) => {
    const orden = Number(a.orden || 0) - Number(b.orden || 0);
    if (orden !== 0) return orden;
    return String(a.codigo).localeCompare(String(b.codigo));
  });
}

/** Turno vigente ahora según catálogo, o null si no hay ventana. */
export function turnoActualAhora(date = new Date(), turnosByCodigo = null) {
  for (const turno of turnosOrdenados(turnosByCodigo || {})) {
    if (puedeAuditarEnHorario(turno.codigo, date, turnosByCodigo).ok) {
      return turno.codigo;
    }
  }
  return null;
}

export function mensajeTurnoActual(date = new Date(), turnosByCodigo = null) {
  const turnos = turnosOrdenados(turnosByCodigo || {});
  const activos = turnos.filter((t) =>
    puedeAuditarEnHorario(t.codigo, date, turnosByCodigo).ok,
  );
  const resumen = turnos
    .map((t) => `${t.codigo}: ${formatHora(t.hora_inicio)}–${formatHora(t.hora_fin)}`)
    .join(" · ");

  if (activos.length === 1) {
    const t = activos[0];
    return {
      turno: t.codigo,
      titulo: `Ahora es turno ${t.codigo}`,
      detalle: `${buildMotivosTurno(t).desc}. Solo auditorías de turno ${t.codigo} disponibles ahora.`,
    };
  }

  if (activos.length > 1) {
    return {
      turno: null,
      titulo: "Varios turnos activos",
      detalle: `Turnos vigentes ahora: ${activos.map((t) => t.codigo).join(", ")}. Revise cada auditoría según su turno asignado.`,
    };
  }

  return {
    turno: null,
    titulo: "Fuera de horario de auditoría",
    detalle: resumen
      ? `${resumen} (lun–vie, hora México).`
      : "Configure los turnos en Configuración → Turnos.",
  };
}

export function turnosByCodigoFromList(turnos = []) {
  return Object.fromEntries(
    turnos.map((t) => [String(t.codigo || "").toUpperCase(), t]),
  );
}
