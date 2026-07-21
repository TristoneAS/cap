"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function AccionesCatalog() {
  return (
    <CatalogCrud
      menuItemId="acciones"
      title="Acciones"
      subtitle="Acciones correctivas o preventivas ante no conformidades"
      apiBase="/api/acciones"
      idField="id_accion"
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
