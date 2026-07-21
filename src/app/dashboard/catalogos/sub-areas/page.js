import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import SubAreasCatalog from "@/app/components/catalogos/SubAreasCatalog";

export default function Page() {
  return (
    <RequireAdminRoute>
      <SubAreasCatalog />
    </RequireAdminRoute>
  );
}
