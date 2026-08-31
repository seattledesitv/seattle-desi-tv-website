export type PressReleaseStatus =
  "pending" | "changes_requested" | "approved" | "rejected" | "archived";

export type PressReleaseDocument = {
  url: string;
  name: string;
  mime_type: string;
  size_bytes: number;
};

export type PressRelease = {
  id: string;
  site_id: string;
  created_by: string;
  title: string;
  summary: string;
  body: string;
  organization_name: string | null;
  location: string | null;
  release_date: string;
  image_urls: string[];
  image_position_x: number;
  image_position_y: number;
  image_zoom: number;
  image_display_mode: "cover" | "contain" | "blur";
  documents: PressReleaseDocument[];
  contact_name: string | null;
  contact_email: string | null;
  source_url: string | null;
  status: PressReleaseStatus;
  admin_notes: string | null;
  approved_at: string | null;
  published_at: string | null;
  instagram_permalink: string | null;
  instagram_media_id: string | null;
  instagram_published_at: string | null;
  instagram_published_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PressReleaseInput = Pick<
  PressRelease,
  | "title"
  | "summary"
  | "body"
  | "organization_name"
  | "location"
  | "release_date"
  | "image_urls"
  | "image_position_x"
  | "image_position_y"
  | "image_zoom"
  | "image_display_mode"
  | "documents"
  | "contact_name"
  | "contact_email"
  | "source_url"
>;
