import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import TiposAuditoriaCatalog from "@/app/components/catalogos/TiposAuditoriaCatalog";

export default function Page() {
  return (
    <RequireAdminRoute>
      <TiposAuditoriaCatalog />
    </RequireAdminRoute>
  );
}
