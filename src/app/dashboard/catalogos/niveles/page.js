import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import NivelesCatalog from "@/app/components/catalogos/NivelesCatalog";

export default function Page() {
  return (
    <RequireAdminRoute>
      <NivelesCatalog />
    </RequireAdminRoute>
  );
}
