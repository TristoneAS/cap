/** Validación de correo usable en cliente y servidor (sin nodemailer). */
export function isValidEmail(s) {
  if (typeof s !== "string" || !s.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
