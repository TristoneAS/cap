import PreguntasPokaYokeCatalog from "@/app/components/catalogos/PreguntasPokaYokeCatalog";
import RequireCapAccess from "@/app/components/RequireCapAccess";

export default function Page() {
  return (
    <RequireCapAccess>
      <PreguntasPokaYokeCatalog />
    </RequireCapAccess>
  );
}
