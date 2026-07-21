"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function NivelesCatalog() {
  return (
    <CatalogCrud
      menuItemId="niveles"
      title="Niveles"
      subtitle="Niveles de usuario para auditorías LPA (ej. SALARY, ING-AMBIENTAL)"
      apiBase="/api/niveles-usuario"
      idField="id_nivel_usuario"
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
