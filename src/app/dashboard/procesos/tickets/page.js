import TicketsProcesos from "@/app/components/procesos/TicketsProcesos";
import RequireCapAccess from "@/app/components/RequireCapAccess";

export default function ProcesosTicketsPage() {
  return (
    <RequireCapAccess>
      <TicketsProcesos />
    </RequireCapAccess>
  );
}
