import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import GenerarAuditorias from "@/app/components/auditorias/GenerarAuditorias";

export default function Page() {
  return (
    <RequireAdminRoute>
      <GenerarAuditorias />
    </RequireAdminRoute>
  );
}
