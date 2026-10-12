import TicketsMantenimiento from "@/app/components/mantenimiento/TicketsMantenimiento";
import RequireCapAccess from "@/app/components/RequireCapAccess";

export default function Page() {
  return (
    <RequireCapAccess>
      <TicketsMantenimiento />
    </RequireCapAccess>
  );
}
