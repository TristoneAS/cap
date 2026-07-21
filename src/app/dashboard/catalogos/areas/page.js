import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import AreasCatalog from "@/app/components/catalogos/AreasCatalog";

export default function Page() {
  return (
    <RequireAdminRoute>
      <AreasCatalog />
    </RequireAdminRoute>
  );
}
