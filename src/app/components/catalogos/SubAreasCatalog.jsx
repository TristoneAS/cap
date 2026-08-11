"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function SubAreasCatalog() {
  return (
    <CatalogCrud
      menuItemId="sub-areas"
      title="Sub áreas"
      subtitle="Subdivisiones dentro de cada área. Asigne qué turnos generan auditorías en cada sub área."
      apiBase="/api/sub-areas"
      idField="id_sub_area"
      fields={[
        {
          name: "id_area",
          label: "Área",
          type: "select",
          required: true,
          optionsApi: "/api/areas",
          optionValue: "id_area",
          optionLabel: "nombre",
        },
        { name: "nombre", label: "Nombre", required: true },
        { name: "descripcion", label: "Descripción", type: "textarea" },
        {
          name: "id_turnos",
          label: "Turnos para auditorías",
          type: "multiselect",
          required: true,
          fullWidth: true,
          optionsApi: "/api/turnos",
          optionValue: "id_turno",
          optionLabel: "label",
          helperText: "Solo se generan auditorías en los turnos seleccionados",
        },
      ]}
      columns={[
        { key: "area_nombre", label: "Área" },
        { key: "nombre", label: "Sub área" },
        { key: "turnos_label", label: "Turnos" },
        { key: "descripcion", label: "Descripción" },
      ]}
    />
  );
}
