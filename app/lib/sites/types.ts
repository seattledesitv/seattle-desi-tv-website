export type SiteStatus = "planned" | "active" | "on_hold" | "archived";
export type SiteResolutionSource = "domain" | "preview" | "default" | "fallback";

export type SiteSettings = {
  contact_email?: string;
  whatsapp_number?: string;
  phone_display?: string;
  whatsapp_group_url?: string;
  logo_url?: string;
  tagline?: string;
  region_description?: string;
  youtube_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  [key: string]: unknown;
};

export type SiteConfig = {
  id: string | null;
  code: string;
  slug: string;
  name: string;
  shortName: string;
  city: string;
  stateCode: string;
  timezone: string;
  status: SiteStatus;
  settings: SiteSettings;
  hostname: string;
  primaryHostname: string;
  source: SiteResolutionSource;
};
