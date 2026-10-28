import AdjuntarListadoPokaYoke from "@/app/components/procesos/AdjuntarListadoPokaYoke";
import RequireCapAccess from "@/app/components/RequireCapAccess";

export default function AdjuntarListadoPokaYokePage() {
  return (
    <RequireCapAccess>
      <AdjuntarListadoPokaYoke />
    </RequireCapAccess>
  );
}
