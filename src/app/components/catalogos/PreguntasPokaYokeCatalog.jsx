"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function PreguntasPokaYokeCatalog() {
  return (
    <CatalogCrud
      menuItemId="preguntas-poka-yoke"
      title="Preguntas Poka Yoke"
      subtitle="Checklist global que aplica a todas las áreas cuando el área no está exenta"
      apiBase="/api/preguntas-poka-yoke"
      idField="id_pregunta_poka"
      fields={[
        { name: "texto", label: "Pregunta", required: true, type: "textarea" },
        {
          name: "id_tipo_nc",
          label: "Tipo NC sugerido",
          type: "select",
          required: true,
          optionsApi: "/api/tipos-no-conformidad",
          optionValue: "id_tipo_nc",
          optionLabel: "nombre",
        },
      ]}
      columns={[
        { key: "texto", label: "Pregunta" },
        { key: "tipo_nc_nombre", label: "Tipo NC" },
      ]}
    />
  );
}
