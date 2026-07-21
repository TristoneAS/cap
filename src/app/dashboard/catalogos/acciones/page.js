import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import AccionesCatalog from "@/app/components/catalogos/AccionesCatalog";

export default function Page() {
  return (
    <RequireAdminRoute>
      <AccionesCatalog />
    </RequireAdminRoute>
  );
}
