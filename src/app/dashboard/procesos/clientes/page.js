import ProcesosClientesCatalog from "@/app/components/procesos/ProcesosClientesCatalog";
import RequireCapAccess from "@/app/components/RequireCapAccess";

export default function ProcesosClientesPage() {
  return (
    <RequireCapAccess>
      <ProcesosClientesCatalog />
    </RequireCapAccess>
  );
}
