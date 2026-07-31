export type PublicationType = "monthly" | "quarterly" | "six_month" | "annual" | "custom" | "weekly_instagram";
export type PublicationStatus = "draft" | "review" | "approved" | "scheduled" | "published" | "archived";

export type PublicationRecord = {
  id: string;
  name: string;
  edition_label: string | null;
  publication_type: PublicationType;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  status: PublicationStatus;
  cover_image_url: string | null;
  settings: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicationSectionSeed = {
  section_key: string;
  title: string;
  introduction: string;
  included: boolean;
  sort_order: number;
  section_type: string;
};

export type PublicationDraftInput = {
  name: string;
  edition_label: string;
  publication_type: PublicationType;
  start_date: string;
  end_date: string;
  description: string;
};

export type SaveState = "idle" | "saving" | "saved" | "error";
