import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import UsuariosCatalog from "@/app/components/usuarios/UsuariosCatalog";

export default function Page() {
  return (
    <RequireAdminRoute>
      <UsuariosCatalog />
    </RequireAdminRoute>
  );
}
