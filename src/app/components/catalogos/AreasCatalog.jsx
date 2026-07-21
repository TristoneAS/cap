"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function AreasPage() {
  return (
    <CatalogCrud
      menuItemId="areas"
      title="Áreas"
      subtitle="Departamentos o zonas de planta donde se realizan auditorías LPA"
      apiBase="/api/areas"
      idField="id_area"
      fields={[
        { name: "nombre", label: "Nombre", required: true },
        { name: "descripcion", label: "Descripción", type: "textarea" },
      ]}
      columns={[
        { key: "nombre", label: "Nombre" },
        { key: "descripcion", label: "Descripción" },
      ]}
    />
  );
}
