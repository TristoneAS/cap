import {
  sendMailMessageWithRetry,
  createMailTransporter,
  warmMailTransporter,
  closeMailTransporter,
  sleep,
  getEmailBatchSize,
  getEmailBatchPauseMs,
  pauseEntreLotesSiAplica,
} from "@/libs/mailer";

export function isEmailTestEnabled() {
  const raw = String(process.env.EMAIL_TEST_ENABLED ?? "").toLowerCase();
  return raw === "true" || raw === "1" || process.env.NODE_ENV === "development";
}

export function erroresDesdeFallidos(fallidos) {
  return (fallidos || []).map((f) => `${f.label}: ${f.error}`);
}

function buildNumerosPrueba({ cantidad = 100, numeros = null }) {
  if (Array.isArray(numeros) && numeros.length) {
    return [
      ...new Set(
        numeros
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= 100),
      ),
    ].sort((a, b) => a - b);
  }
  const total = Math.min(Math.max(Number(cantidad) || 0, 1), 100);
  return Array.from({ length: total }, (_, i) => i + 1);
}

/**
 * Envía correos de prueba (streaming NDJSON).
 * Respeta límite SMTP: 5 por minuto (5 seguidos + pausa 60 s).
 */
export async function* iterarEnvioCorreosPrueba({
  to,
  nombre,
  emp_id,
  cantidad = 100,
  numeros = null,
  totalReferencia = null,
}) {
  const nums = buildNumerosPrueba({ cantidad, numeros });
  const total = nums.length;
  const totalLote = totalReferencia ?? cantidad ?? total;

  if (!total) {
    yield {
      enviados: 0,
      omitidos: 0,
      procesados: 0,
      total: 0,
      terminado: true,
      errores: [],
      fallidos: [],
    };
    return;
  }

  const transporter = createMailTransporter({ pooled: true });
  const batchSize = getEmailBatchSize();
  const batchPauseMs = getEmailBatchPauseMs();
  let enviados = 0;
  let omitidos = 0;
  const fallidos = [];

  try {
    await warmMailTransporter(transporter);

    for (let i = 0; i < nums.length; i += 1) {
      const num = nums[i];
      const fallidoBase = {
        id: `prueba-${num}`,
        label: `Correo de prueba #${num}`,
        tipo: "prueba",
        emp_id: String(emp_id ?? ""),
        num,
        to,
        nombre,
        totalLote,
      };

      try {
        await sendMailMessageWithRetry(
          {
            to,
            subject: `CAP · Prueba SMTP ${num}/${totalLote}`,
            text: `Correo de prueba ${num} de ${totalLote} para ${nombre || to}.`,
            html: `<p>Correo de prueba <strong>${num}</strong> de <strong>${totalLote}</strong> para <strong>${nombre || to}</strong>.</p>`,
          },
          transporter,
          { maxRetries: 1 },
        );
        enviados += 1;
      } catch (err) {
        omitidos += 1;
        fallidos.push({
          ...fallidoBase,
          error: err.message || "Error al enviar correo",
        });
      }

      yield {
        enviados,
        omitidos,
        procesados: i + 1,
        total,
        terminado: i === nums.length - 1,
        errores: erroresDesdeFallidos(fallidos),
        fallidos: [...fallidos],
      };

      await pauseEntreLotesSiAplica(i, nums.length, batchSize, batchPauseMs);
    }
  } finally {
    closeMailTransporter(transporter);
  }
}

/** Reenvío manual de un correo de prueba (con reintentos normales). */
export async function reenviarCorreoPrueba({ to, nombre, num, totalLote = 100 }) {
  const transporter = createMailTransporter({ pooled: true });
  try {
    await warmMailTransporter(transporter);
    await sendMailMessageWithRetry(
      {
        to,
        subject: `CAP · Prueba SMTP ${num}/${totalLote}`,
        text: `Correo de prueba ${num} de ${totalLote} para ${nombre || to}.`,
        html: `<p>Correo de prueba <strong>${num}</strong> de <strong>${totalLote}</strong> para <strong>${nombre || to}</strong>.</p>`,
      },
      transporter,
    );
    return { enviado: true };
  } catch (err) {
    return { enviado: false, error: err.message || "Error al enviar correo" };
  } finally {
    closeMailTransporter(transporter);
  }
}
