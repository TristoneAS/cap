"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function SubAreasCatalog() {
  return (
    <CatalogCrud
      menuItemId="sub-areas"
      title="Sub áreas"
      subtitle="Subdivisiones dentro de cada área para asignar auditorías"
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
      ]}
      columns={[
        { key: "area_nombre", label: "Área" },
        { key: "nombre", label: "Sub área" },
        { key: "descripcion", label: "Descripción" },
      ]}
    />
  );
}
