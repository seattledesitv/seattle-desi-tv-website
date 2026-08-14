export type PressReleaseStatus =
  | "pending"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "archived";

export type PressRelease = {
  id: string;
  created_by: string;
  title: string;
  summary: string;
  body: string;
  organization_name: string | null;
  location: string | null;
  release_date: string;
  image_urls: string[];
  contact_name: string | null;
  contact_email: string | null;
  source_url: string | null;
  status: PressReleaseStatus;
  admin_notes: string | null;
  approved_at: string | null;
  published_at: string | null;
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
  | "contact_name"
  | "contact_email"
  | "source_url"
>;
