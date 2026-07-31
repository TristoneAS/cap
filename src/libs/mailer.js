import nodemailer from "nodemailer";
import { isValidEmail } from "@/libs/email_utils";

export { isValidEmail };

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Pausa entre correos solo si el SMTP lo exige (EMAIL_DELAY_MS). Por defecto 0. */
export function getEmailDelayMs() {
  const n = Number(process.env.EMAIL_DELAY_MS ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Límite SMTP: correos por lote antes de pausar (default 5/min). 0 = solo EMAIL_DELAY_MS. */
export function getEmailBatchSize() {
  const n = Number(process.env.EMAIL_BATCH_SIZE ?? 5);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Pausa entre lotes en ms (default 60 s). */
export function getEmailBatchPauseMs() {
  const n = Number(process.env.EMAIL_BATCH_PAUSE_MS ?? 60_000);
  return Number.isFinite(n) && n >= 0 ? n : 60_000;
}

/** Pausa tras completar un lote (no tras el último correo). */
export async function pauseEntreLotesSiAplica(indice, total, batchSize, batchPauseMs) {
  if (batchSize <= 0 || batchPauseMs <= 0) return;
  if ((indice + 1) % batchSize === 0 && indice + 1 < total) {
    await sleep(batchPauseMs);
  }
}

export function useSmtpPool() {
  const raw = String(process.env.EMAIL_POOL ?? "true").toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "no";
}

export function getSmtpConfig() {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || user;
  const domain = process.env.EMAIL_DOMAIN;
  const tlsRejectRaw = (
    process.env.EMAIL_TLS_REJECT_UNAUTHORIZED ?? ""
  ).toLowerCase();
  const tlsRejectUnauthorized =
    tlsRejectRaw !== "false" && tlsRejectRaw !== "0" && tlsRejectRaw !== "no";

  return {
    host,
    port,
    user,
    pass,
    from,
    domain,
    tlsRejectUnauthorized,
    configured: Boolean(host && user && pass),
  };
}

export function createMailTransporter(opts = {}) {
  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    throw new Error(
      "SMTP no configurado. Defina EMAIL_HOST, EMAIL_USER y EMAIL_PASSWORD (o SMTP_*) en el entorno del servidor.",
    );
  }

  const pooled = opts.pooled !== false && useSmtpPool();

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: cfg.tlsRejectUnauthorized },
    ...(cfg.domain ? { name: cfg.domain } : {}),
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    ...(pooled
      ? {
          pool: true,
          maxConnections: 10,
          maxMessages: 500,
        }
      : {}),
  });
}

/** Abre la conexión SMTP una vez antes de un lote de envíos. */
export async function warmMailTransporter(transporter) {
  if (!transporter || typeof transporter.verify !== "function") return;
  await transporter.verify();
}

/** Cierra el pool SMTP tras un lote. */
export function closeMailTransporter(transporter) {
  if (transporter && typeof transporter.close === "function") {
    transporter.close();
  }
}

export function isRateLimitError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("421") || msg.includes("rate") || msg.includes("limit");
}

/** Espera tras 421 / rate limit (independiente de EMAIL_DELAY_MS). */
export function getRateLimitBackoffMs() {
  const n = Number(process.env.EMAIL_RATE_LIMIT_BACKOFF_MS ?? 5000);
  return Number.isFinite(n) && n > 0 ? n : 5000;
}

/**
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 * @param {import('nodemailer').Transporter} [transporter]
 */
export async function sendMailMessage(opts, transporter) {
  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    throw new Error(
      "SMTP no configurado. Defina EMAIL_HOST, EMAIL_USER y EMAIL_PASSWORD (o SMTP_*) en el entorno del servidor.",
    );
  }

  const tx = transporter || createMailTransporter();
  const fromName = process.env.EMAIL_FROM_NAME || "CAP · Auditorías LPA";
  await tx.sendMail({
    from: `"${fromName}" <${cfg.from}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text || "(Sin contenido)",
    ...(opts.html ? { html: opts.html } : {}),
  });
}

/**
 * Reintenta si el SMTP responde límite de envío (421 / rate limit).
 * @param {{ maxRetries?: number }} [retryOpts] — maxRetries: 1 en lotes (fallar rápido).
 */
export async function sendMailMessageWithRetry(
  opts,
  transporter,
  retryOpts = {},
) {
  const maxRetries =
    retryOpts.maxRetries ?? Number(process.env.EMAIL_MAX_RETRIES || 3);
  const delayMs = getEmailDelayMs();
  const backoffMs = getRateLimitBackoffMs();

  for (let intento = 0; intento < maxRetries; intento += 1) {
    try {
      await sendMailMessage(opts, transporter);
      return;
    } catch (err) {
      if (intento < maxRetries - 1 && isRateLimitError(err)) {
        const wait = Math.max(
          delayMs * (intento + 2),
          backoffMs * (intento + 1),
        );
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
}
