"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function TiposAuditoriaCatalog() {
  return (
    <CatalogCrud
      menuItemId="tipos-auditoria"
      title="Tipos de auditoría"
      subtitle="Clasificación de auditorías LPA vinculada a un nivel (SALARY, ING-AMBIENTAL, etc.)"
      apiBase="/api/tipos-auditoria"
      idField="id_tipo_auditoria"
      fields={[
        { name: "nombre", label: "Nombre", required: true },
        { name: "descripcion", label: "Descripción", type: "textarea" },
        {
          name: "id_nivel_usuario",
          label: "Nivel",
          type: "select",
          required: true,
          optionsApi: "/api/niveles-usuario",
          optionValue: "id_nivel_usuario",
          optionLabel: "nombre",
        },
      ]}
      columns={[
        { key: "nombre", label: "Nombre" },
        { key: "nivel_nombre", label: "Nivel" },
        { key: "descripcion", label: "Descripción" },
      ]}
    />
  );
}
