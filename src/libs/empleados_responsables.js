/** Categorías en del_empleados.emp_categoria para combo Responsable (LPA y Poka Yoke). */
export const RESPONSABLE_EMP_CATEGORIAS = [
  "ADMINISTRATIVOS",
  "ADMINISTRATIVE",
  "INDIRECT",
  "INDIRECTOS",
];

export function sqlFiltroCategoriaResponsable() {
  const list = RESPONSABLE_EMP_CATEGORIAS.map((c) => `'${c}'`).join(", ");
  return `UPPER(TRIM(emp_categoria)) IN (${list})`;
}