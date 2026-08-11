import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import TurnosCatalog from "@/app/components/catalogos/TurnosCatalog";

export default function TurnosPage() {
  return (
    <RequireAdminRoute>
      <TurnosCatalog />
    </RequireAdminRoute>
  );
}
