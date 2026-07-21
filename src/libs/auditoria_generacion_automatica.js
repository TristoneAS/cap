import { esPrimerDiaDelMes, hoyPlantaYYYYMMDD, periodoMesPlanta } from "@/libs/auditoria_fechas";
import { generarAuditoriasMes } from "@/libs/generar_auditorias";

/**
 * Generación automática: solo el día 1 de cada mes (hora México).
 * Ejecuta la misma lógica que el botón "Generar auditorías".
 */
export async function generarAuditoriasAutomatico({ forzar = false } = {}) {
  const hoy = hoyPlantaYYYYMMDD();
  const periodo = periodoMesPlanta();

  if (!forzar && !esPrimerDiaDelMes()) {
    return {
      ejecutado: false,
      omitido: true,
      hoy,
      periodo_mes: periodo,
      motivo: "Hoy no es día 1 del mes (zona planta). Use forzar=1 para prueba.",
    };
  }

  const resultado = await generarAuditoriasMes(periodo, { automatica: true, forzar });

  return {
    ejecutado: true,
    omitido: false,
    hoy,
    periodo_mes: periodo,
    forzado: forzar,
    ...resultado,
  };
}
