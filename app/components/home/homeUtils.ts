export function firstImage(row: any) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || row?.photo || row?.picture || row?.thumbnail_url || "";
}

export function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export function dateParts(value?: string | null) {
  const date = new Date(`${String(value || "").split("T")[0]}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { month: "TBD", day: "--" };
  return {
    month: date.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day: String(date.getDate()).padStart(2, "0"),
  };
}

export function formatNumber(value?: number | null) {
  return Number(value || 0).toLocaleString();
}

export function isExternal(href: string) {
  return href.startsWith("http");
}

export function isWithinDateWindow(row: any, today: string) {
  return (!row.start_date || row.start_date <= today) && (!row.end_date || row.end_date >= today);
}
