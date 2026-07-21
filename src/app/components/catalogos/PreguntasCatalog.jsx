"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function PreguntasCatalog() {
  return (
    <CatalogCrud
      menuItemId="preguntas"
      title="Preguntas"
      subtitle="Checklist de verificación vinculado a área, sub área y tipo de no conformidad. Al crear, puedes aplicar la misma pregunta a varias sub áreas. Al editar el texto/tipo, se actualizan todas las que digan exactamente lo mismo."
      apiBase="/api/preguntas"
      idField="id_pregunta"
      tableFilterFields={["id_area", "id_sub_area"]}
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
        {
          name: "id_sub_area",
          label: "Sub área",
          type: "select",
          required: true,
          optionsApi: "/api/sub-areas",
          optionValue: "id_sub_area",
          optionLabel: "nombre",
          dependsOn: { parentField: "id_area", queryParam: "id_area" },
          multiCreate: true,
          multiName: "id_sub_areas",
          multiLabel: "Varias sub áreas",
        },
        {
          name: "id_tipo_auditoria",
          label: "Tipo de auditoría",
          type: "select",
          required: true,
          optionsApi: "/api/tipos-auditoria",
          optionValue: "id_tipo_auditoria",
          optionLabel: "nombre",
        },
        {
          name: "texto",
          label: "Pregunta",
          type: "textarea",
          required: true,
          fullWidth: true,
        },
        {
          name: "id_tipo_nc",
          label: "Tipo de no conformidad",
          type: "select",
          required: true,
          optionsApi: "/api/tipos-no-conformidad",
          optionValue: "id_tipo_nc",
          optionLabel: "nombre",
        },
      ]}
      columns={[
        { key: "area_nombre", label: "Área" },
        { key: "sub_area_nombre", label: "Sub área" },
        { key: "tipo_nombre", label: "Tipo auditoría" },
        { key: "tipo_nc_nombre", label: "Tipo NC" },
        { key: "texto", label: "Pregunta" },
      ]}
    />
  );
}
