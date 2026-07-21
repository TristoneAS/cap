import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import PreguntasCatalog from "@/app/components/catalogos/PreguntasCatalog";

export default function Page() {
  return (
    <RequireAdminRoute>
      <PreguntasCatalog />
    </RequireAdminRoute>
  );
}
