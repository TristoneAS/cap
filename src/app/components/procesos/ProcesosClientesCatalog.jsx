"use client";

import CatalogCrud from "@/app/components/CatalogCrud";

export default function ProcesosClientesCatalog() {
  return (
    <CatalogCrud
      menuItemId="procesos-clientes"
      title="Clientes"
      subtitle="El ID se asigna automáticamente. Capture solo el nombre del cliente."
      apiBase="/api/procesos/clientes"
      idField="id_cliente"
      fields={[{ name: "cliente", label: "Cliente", required: true }]}
      columns={[
        { key: "id_cliente", label: "ID" },
        { key: "cliente", label: "Cliente" },
      ]}
    />
  );
}
