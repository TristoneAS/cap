import { capDb } from "@/libs/cap_db";

export function formatHora(timeValue) {
  const raw = String(timeValue ?? "").trim();
  if (!raw) return "00:00";
  const parts = raw.split(":");
  const h = String(Number(parts[0] || 0)).padStart(2, "0");
  const m = String(Number(parts[1] || 0)).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatTurnoRow(row) {
  const codigo = String(row.codigo || "").toUpperCase();
  const horaInicio = formatHora(row.hora_inicio);
  const horaFin = formatHora(row.hora_fin);
  const nombre = String(row.nombre || "").trim();
  return {
    id_turno: row.id_turno,
    codigo,
    nombre,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    orden: Number(row.orden || 0),
    estado: row.estado,
    descripcion: `Turno ${codigo}: ${horaInicio} – ${horaFin} (lunes a viernes)`,
    label: nombre
      ? `${codigo} · ${horaInicio} – ${horaFin} (${nombre})`
      : `${codigo} · ${horaInicio} – ${horaFin}`,
  };
}

export async function listTurnosActivos(db = capDb) {
  const [rows] = await db.query(
    `SELECT id_turno, codigo, nombre, hora_inicio, hora_fin, orden, estado
     FROM turnos
     WHERE estado = 'activo'
     ORDER BY orden ASC, codigo ASC`,
  );
  return rows.map(formatTurnoRow);
}

export async function loadTurnosByCodigo(db = capDb) {
  const turnos = await listTurnosActivos(db);
  return Object.fromEntries(turnos.map((t) => [t.codigo, t]));
}

export async function getTurnosCodigosPorSubArea(db = capDb) {
  const [rows] = await db.query(
    `SELECT sat.id_sub_area, t.codigo
     FROM sub_area_turnos sat
     INNER JOIN turnos t ON t.id_turno = sat.id_turno AND t.estado = 'activo'
     ORDER BY t.orden ASC, t.codigo ASC`,
  );
  const map = new Map();
  for (const row of rows) {
    const key = Number(row.id_sub_area);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(String(row.codigo).toUpperCase());
  }
  return map;
}

export async function loadTurnosPorSubArea(db = capDb, idSubArea) {
  const [rows] = await db.query(
    `SELECT t.id_turno, t.codigo, t.nombre, t.hora_inicio, t.hora_fin, t.orden
     FROM sub_area_turnos sat
     INNER JOIN turnos t ON t.id_turno = sat.id_turno AND t.estado = 'activo'
     WHERE sat.id_sub_area = ?
     ORDER BY t.orden ASC, t.codigo ASC`,
    [idSubArea],
  );
  return rows.map(formatTurnoRow);
}

export async function loadSubAreaTurnoIds(db = capDb, idSubArea) {
  const [rows] = await db.query(
    `SELECT sat.id_turno
     FROM sub_area_turnos sat
     INNER JOIN turnos t ON t.id_turno = sat.id_turno AND t.estado = 'activo'
     WHERE sat.id_sub_area = ?
     ORDER BY t.orden ASC, t.codigo ASC`,
    [idSubArea],
  );
  return rows.map((r) => Number(r.id_turno));
}

export async function syncSubAreaTurnos(db = capDb, idSubArea, idTurnos = []) {
  const ids = [...new Set(idTurnos.map(Number).filter(Boolean))];
  await db.query("DELETE FROM sub_area_turnos WHERE id_sub_area = ?", [idSubArea]);
  if (!ids.length) return;

  const placeholders = ids.map(() => "?").join(", ");
  const [valid] = await db.query(
    `SELECT id_turno FROM turnos WHERE estado = 'activo' AND id_turno IN (${placeholders})`,
    ids,
  );
  const validIds = valid.map((r) => Number(r.id_turno));
  for (const idTurno of validIds) {
    await db.query(
      "INSERT INTO sub_area_turnos (id_sub_area, id_turno) VALUES (?, ?)",
      [idSubArea, idTurno],
    );
  }
}

export async function getDefaultTurnoIds(db = capDb) {
  const [rows] = await db.query(
    `SELECT id_turno FROM turnos WHERE estado = 'activo' AND codigo IN ('A', 'B') ORDER BY orden ASC`,
  );
  return rows.map((r) => Number(r.id_turno));
}

export async function attachTurnosToSubAreas(rows, db = capDb) {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id_sub_area);
  const placeholders = ids.map(() => "?").join(", ");
  const [turnoRows] = await db.query(
    `SELECT sat.id_sub_area, t.id_turno, t.codigo, t.nombre, t.hora_inicio, t.hora_fin, t.orden
     FROM sub_area_turnos sat
     INNER JOIN turnos t ON t.id_turno = sat.id_turno AND t.estado = 'activo'
     WHERE sat.id_sub_area IN (${placeholders})
     ORDER BY t.orden ASC, t.codigo ASC`,
    ids,
  );

  const bySubArea = new Map();
  for (const row of turnoRows) {
    const key = Number(row.id_sub_area);
    if (!bySubArea.has(key)) bySubArea.set(key, []);
    bySubArea.get(key).push(formatTurnoRow(row));
  }

  return rows.map((row) => {
    const turnos = bySubArea.get(Number(row.id_sub_area)) || [];
    return {
      ...row,
      turnos,
      id_turnos: turnos.map((t) => t.id_turno),
      turnos_label: turnos.map((t) => t.codigo).join(", ") || "—",
    };
  });
}
