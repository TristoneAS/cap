"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function TiposNcCatalog() {
  return (
    <CatalogCrud
      menuItemId="tipos-nc"
      title="Tipos de no conformidad"
      subtitle="Clasificación de hallazgos detectados en auditoría"
      apiBase="/api/tipos-no-conformidad"
      idField="id_tipo_nc"
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
