export type MatrimonyProfileStatus =
  | "draft"
  | "pending"
  | "changes_requested"
  | "approved"
  | "on_hold"
  | "rejected"
  | "archived";
export type MatrimonyAccessStatus =
  | "pending"
  | "changes_requested"
  | "approved_pending_payment"
  | "active"
  | "rejected"
  | "expired"
  | "revoked";
export type MatrimonyProfile = {
  id: string;
  site_id: string;
  owner_user_id: string;
  display_name: string;
  birth_year: number;
  gender: string;
  seeking: string;
  marital_status: string;
  religion: string | null;
  community: string | null;
  languages: string[];
  education: string | null;
  occupation: string | null;
  city: string;
  state_region: string | null;
  country: string;
  about: string;
  partner_preferences: string;
  photo_paths: string[];
  photo_urls?: string[];
  status: MatrimonyProfileStatus;
  admin_notes: string | null;
  consent_confirmed: boolean;
  created_at: string;
  updated_at: string;
};
export type MatrimonyContact = {
  profile_id?: string;
  full_name: string;
  email: string;
  phone: string | null;
  preferred_contact: "email" | "phone" | "either";
};
export type MatrimonyProfileWithContact = MatrimonyProfile & {
  contact?: MatrimonyContact | null;
};
export type MatrimonyProfileInput = Omit<
  MatrimonyProfile,
  | "id"
  | "site_id"
  | "owner_user_id"
  | "status"
  | "admin_notes"
  | "created_at"
  | "updated_at"
  | "photo_urls"
> & { contact: MatrimonyContact };
export type MatrimonyAccessRequest = {
  id: string;
  site_id: string;
  requester_user_id: string;
  requester_email: string;
  reason: string;
  status: MatrimonyAccessStatus;
  quoted_price_cents: number | null;
  duration_days: number | null;
  payment_status: string;
  payment_link: string | null;
  payment_reference: string | null;
  access_starts_at: string | null;
  access_expires_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};
export type MatrimonyPricing = {
  plan_key: string;
  label: string;
  description: string | null;
  price_cents: number;
  duration_days: number;
  active: boolean;
  updated_at: string;
};
