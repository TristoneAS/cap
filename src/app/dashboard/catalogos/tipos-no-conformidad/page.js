import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import TiposNcCatalog from "@/app/components/catalogos/TiposNcCatalog";

export default function Page() {
  return (
    <RequireAdminRoute>
      <TiposNcCatalog />
    </RequireAdminRoute>
  );
}
