export const MESES = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export function periodoActualParts() {
  const d = new Date();
  return {
    anio: String(d.getFullYear()),
    mes: String(d.getMonth() + 1).padStart(2, "0"),
  };
}

/** Parsea YYYY-MM a { anio, mes }. Si es inválido, año actual y mes vacío. */
export function parsePeriodoMes(periodoMes) {
  const raw = String(periodoMes || "").trim();
  if (/^\d{4}-\d{2}$/.test(raw)) {
    return { anio: raw.slice(0, 4), mes: raw.slice(5, 7) };
  }
  if (/^\d{4}$/.test(raw)) {
    return { anio: raw, mes: "" };
  }
  return { anio: periodoActualParts().anio, mes: "" };
}

export function aniosDisponibles(anioBase = periodoActualParts().anio, atras = 4) {
  const y = Number(anioBase);
  const list = [];
  for (let i = y; i >= y - atras; i -= 1) list.push(String(i));
  return list;
}

export function labelMes(mes) {
  if (!mes) return "Todos";
  return MESES.find((m) => m.value === mes)?.label || mes;
}

/** Etiqueta legible del filtro año/mes. */
export function labelPeriodo(anio, mes) {
  if (mes) return `${labelMes(mes)} ${anio}`;
  return `Año ${anio}`;
}

/** Agrega periodo_mes (YYYY-MM) o periodo_anio (YYYY) a URLSearchParams. */
export function appendPeriodoParams(params, { anio, mes }) {
  if (mes) params.set("periodo_mes", `${anio}-${mes}`);
  else params.set("periodo_anio", String(anio));
  return params;
}
