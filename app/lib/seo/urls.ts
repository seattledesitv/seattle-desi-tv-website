const UUID_AT_END = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function seoSlug(value: unknown) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "view";
}

export function seoEntityPath(prefix: string, title: unknown, id: unknown) {
  return `/${prefix}/${seoSlug(title)}--${String(id || "")}`;
}

/** Accepts both legacy UUID parameters and the canonical title--UUID format. */
export function entityIdFromParam(value: unknown) {
  const decoded = decodeURIComponent(String(value || ""));
  const uuid = decoded.match(UUID_AT_END)?.[1];
  if (uuid) return uuid;
  const separator = decoded.lastIndexOf("--");
  return separator >= 0 ? decoded.slice(separator + 2) : decoded;
}
