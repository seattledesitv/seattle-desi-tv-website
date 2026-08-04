import type { PublicationItemRecord } from "../repositories/publicationItemRepository";
import type { PublicationSectionRecord } from "../repositories/sectionRepository";
import type { PublicationRecord } from "../types";
export type PublicationPreviewSection = PublicationSectionRecord & { items: PublicationItemRecord[] };
export type PublicationPreviewModel = { publication: PublicationRecord; sections: PublicationPreviewSection[]; generatedAt: string };
export type PublicationPreviewChannel = "website" | "newsletter" | "instagram" | "facebook" | "linkedin" | "mobile" | "print";
