"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function AreasPage() {
  return (
    <CatalogCrud
      menuItemId="areas"
      title="Áreas"
      subtitle="Zonas LPA. Opcional: nivel de auditor (p. ej. Ambiental solo ING-AMBIENTAL)."
      apiBase="/api/areas"
      idField="id_area"
      fields={[
        { name: "nombre", label: "Nombre", required: true },
        { name: "descripcion", label: "Descripción", type: "textarea" },
        {
          name: "id_nivel_usuario",
          label: "Nivel de auditor (opcional)",
          type: "select",
          optionsApi: "/api/niveles-usuario",
          optionValue: "id_nivel_usuario",
          optionLabel: "nombre",
        },
      ]}
      columns={[
        { key: "nombre", label: "Nombre" },
        { key: "nivel_nombre", label: "Nivel auditor" },
        { key: "descripcion", label: "Descripción" },
      ]}
    />
  );
}
