import type { PressReleaseDocument } from "./types";

export type PressReleaseAttachmentKind = "image" | "pdf" | "word" | "file";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const WORD_EXTENSIONS = [".doc", ".docx"];

export function pressReleaseAttachmentKind(document: PressReleaseDocument): PressReleaseAttachmentKind {
  const mime = String(document.mime_type || "").toLowerCase().split(";")[0].trim();
  const name = String(document.name || "").toLowerCase();
  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.some((extension) => name.endsWith(extension))) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime === "application/msword" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || WORD_EXTENSIONS.some((extension) => name.endsWith(extension))) return "word";
  return "file";
}

export function pressReleaseAttachmentLabel(document: PressReleaseDocument) {
  const kind = pressReleaseAttachmentKind(document);
  if (kind === "image") return "Image";
  if (kind === "pdf") return "PDF";
  if (kind === "word") return "Word";
  return "File";
}

export function attachmentMimeType(file: File) {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (/\.jpe?g$/.test(name)) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}
