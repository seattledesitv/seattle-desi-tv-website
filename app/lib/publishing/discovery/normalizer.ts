import type { PublishingContentItem, PublishingSourceType } from "../core/content";

type UnknownRow = Record<string, any>;

type NormalizerConfig = {
  sourceType: PublishingSourceType;
  publicPath: string;
  titleFields: string[];
  descriptionFields: string[];
  imageFields: string[];
  dateFields: string[];
  urlFields?: string[];
};

function firstText(row: UnknownRow, fields: string[]) {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function sourceDate(row: UnknownRow, fields: string[]) {
  const value = firstText(row, fields);
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function isApprovedRow(row: UnknownRow) {
  const status = String(row.status || row.approval_status || "approved").toLowerCase();
  return ["approved", "published", "active"].includes(status);
}

export function isWithinRange(date: string | null, startDate: string | null, endDate: string | null) {
  if (!date) return true;
  const timestamp = new Date(date).getTime();
  if (startDate && timestamp < new Date(`${startDate}T00:00:00`).getTime()) return false;
  if (endDate && timestamp > new Date(`${endDate}T23:59:59`).getTime()) return false;
  return true;
}

export function normalizeRow(row: UnknownRow, config: NormalizerConfig): PublishingContentItem {
  const sourceId = String(row.id || row.slug || "");
  const externalUrl = firstText(row, config.urlFields || []);
  return {
    sourceType: config.sourceType,
    sourceId,
    title: firstText(row, config.titleFields) || "Untitled",
    description: firstText(row, config.descriptionFields),
    imageUrl: firstText(row, config.imageFields),
    destinationUrl: externalUrl || `${config.publicPath}/${sourceId}`,
    sourceDate: sourceDate(row, config.dateFields),
    status: String(row.status || row.approval_status || "approved"),
    featured: Boolean(row.featured || row.is_featured || row.premium || row.is_premium),
    metadata: row,
  };
}
