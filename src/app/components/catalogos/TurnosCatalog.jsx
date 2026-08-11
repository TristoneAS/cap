"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function TurnosCatalog() {
  return (
    <CatalogCrud
      menuItemId="turnos"
      title="Turnos"
      subtitle="Defina horarios de turno (A, B, AE, BE…). La validación de auditorías y la generación mensual usan estos horarios."
      apiBase="/api/turnos"
      idField="id_turno"
      fields={[
        {
          name: "codigo",
          label: "Código",
          required: true,
          createOnly: true,
        },
        { name: "nombre", label: "Nombre", required: true },
        { name: "hora_inicio", label: "Hora inicio", type: "time", required: true },
        { name: "hora_fin", label: "Hora fin", type: "time", required: true },
        { name: "orden", label: "Orden", type: "number", defaultValue: 0 },
      ]}
      columns={[
        { key: "codigo", label: "Código" },
        { key: "nombre", label: "Nombre" },
        { key: "hora_inicio", label: "Inicio" },
        { key: "hora_fin", label: "Fin" },
        { key: "label", label: "Resumen" },
      ]}
    />
  );
}
