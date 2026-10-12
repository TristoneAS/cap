import GraficasPokaYoke from "@/app/components/procesos/GraficasPokaYoke";
import RequireCapAccess from "@/app/components/RequireCapAccess";

export default function GraficasPokaYokePage() {
  return (
    <RequireCapAccess>
      <GraficasPokaYoke />
    </RequireCapAccess>
  );
}
