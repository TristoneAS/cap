import nodemailer from "nodemailer";
import { isValidEmail } from "@/libs/email_utils";

export { isValidEmail };

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Pausa entre correos (SMTP interno suele limitar ráfagas). */
export function getEmailDelayMs() {
  const n = Number(process.env.EMAIL_DELAY_MS || 2500);
  return Number.isFinite(n) && n >= 0 ? n : 2500;
}

export function getSmtpConfig() {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
  const from =
    process.env.EMAIL_FROM || process.env.SMTP_FROM || user;
  const domain = process.env.EMAIL_DOMAIN;
  const tlsRejectRaw = (
    process.env.EMAIL_TLS_REJECT_UNAUTHORIZED ?? ""
  ).toLowerCase();
  const tlsRejectUnauthorized =
    tlsRejectRaw !== "false" &&
    tlsRejectRaw !== "0" &&
    tlsRejectRaw !== "no";

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

export function createMailTransporter() {
  const cfg = getSmtpConfig();
  if (!cfg.configured) {
    throw new Error(
      "SMTP no configurado. Defina EMAIL_HOST, EMAIL_USER y EMAIL_PASSWORD (o SMTP_*) en el entorno del servidor.",
    );
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: cfg.tlsRejectUnauthorized },
    ...(cfg.domain ? { name: cfg.domain } : {}),
  });
}

function isRateLimitError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("421") || msg.includes("rate") || msg.includes("limit");
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
 */
export async function sendMailMessageWithRetry(opts, transporter) {
  const maxRetries = Number(process.env.EMAIL_MAX_RETRIES || 3);
  const delayMs = getEmailDelayMs();

  for (let intento = 0; intento < maxRetries; intento += 1) {
    try {
      await sendMailMessage(opts, transporter);
      return;
    } catch (err) {
      if (intento < maxRetries - 1 && isRateLimitError(err)) {
        await sleep(delayMs * (intento + 2));
        continue;
      }
      throw err;
    }
  }
}
