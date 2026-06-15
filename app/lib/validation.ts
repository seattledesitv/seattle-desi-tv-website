export type ValidationResult = { ok: boolean; message?: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,}$/;

export function cleanText(value: unknown) {
  return String(value || "").trim();
}

export function requireText(value: unknown, label: string, minLength = 2): ValidationResult {
  const text = cleanText(value);
  if (!text) return { ok: false, message: `${label} is required.` };
  if (text.length < minLength) return { ok: false, message: `${label} must be at least ${minLength} characters.` };
  return { ok: true };
}

export function validateEmail(value: unknown, label = "Email"): ValidationResult {
  const text = cleanText(value).toLowerCase();
  if (!text) return { ok: false, message: `${label} is required.` };
  if (!EMAIL_REGEX.test(text)) return { ok: false, message: `Enter a valid ${label.toLowerCase()}.` };
  return { ok: true };
}

export function validateOptionalEmail(value: unknown, label = "Email"): ValidationResult {
  const text = cleanText(value);
  return text ? validateEmail(text, label) : { ok: true };
}

export function validatePhone(value: unknown, label = "Phone number"): ValidationResult {
  const text = cleanText(value);
  if (!text) return { ok: false, message: `${label} is required.` };
  const digits = text.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15 || !PHONE_REGEX.test(text)) return { ok: false, message: `Enter a valid ${label.toLowerCase()} with 10 to 15 digits.` };
  return { ok: true };
}

export function validateOptionalPhone(value: unknown, label = "Phone number"): ValidationResult {
  const text = cleanText(value);
  return text ? validatePhone(text, label) : { ok: true };
}

export function normalizeUrl(value: unknown) {
  const text = cleanText(value);
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
}

export function validateUrl(value: unknown, label = "URL"): ValidationResult {
  const normalized = normalizeUrl(value);
  if (!normalized) return { ok: false, message: `${label} is required.` };
  try {
    const parsed = new URL(normalized);
    if (!["http:", "https:"].includes(parsed.protocol)) return { ok: false, message: `${label} must be a web URL.` };
    if (!parsed.hostname.includes(".")) return { ok: false, message: `${label} must include a valid domain.` };
    return { ok: true };
  } catch {
    return { ok: false, message: `Enter a valid ${label.toLowerCase()}.` };
  }
}

export function validateOptionalUrl(value: unknown, label = "URL"): ValidationResult {
  const text = cleanText(value);
  return text ? validateUrl(text, label) : { ok: true };
}

export function validateImageFile(file: File | undefined | null, label = "Image", maxMb = 5): ValidationResult {
  if (!file) return { ok: false, message: `${label} is required.` };
  if (!file.type.startsWith("image/")) return { ok: false, message: `${label} must be an image file.` };
  if (file.size > maxMb * 1024 * 1024) return { ok: false, message: `${label} must be ${maxMb}MB or smaller.` };
  return { ok: true };
}

export function validateOptionalImageFile(file: File | undefined | null, label = "Image", maxMb = 5): ValidationResult {
  return file ? validateImageFile(file, label, maxMb) : { ok: true };
}

export function firstError(...results: ValidationResult[]) {
  const failed = results.find((item) => !item.ok);
  return failed?.message || null;
}
