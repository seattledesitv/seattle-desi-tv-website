export type ClassifiedPlacement = "standard" | "featured" | "homepage";
export type ClassifiedStatus =
  | "draft"
  | "pending"
  | "changes_requested"
  | "approved_pending_payment"
  | "active"
  | "sold"
  | "filled"
  | "expired"
  | "rejected"
  | "suspended"
  | "removed";
export type ClassifiedAd = {
  id: string;
  created_by: string;
  category: string;
  title: string;
  description: string;
  price_cents: number | null;
  price_type: string;
  item_condition: string | null;
  location: string;
  image_urls: string[];
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_method: string;
  destination_url: string | null;
  requested_placement: ClassifiedPlacement;
  status: ClassifiedStatus;
  quoted_price_cents: number | null;
  payment_status: string;
  payment_link: string | null;
  admin_notes: string | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};
export type ClassifiedPricing = {
  placement: ClassifiedPlacement;
  label: string;
  description: string | null;
  price_cents: number;
  duration_days: number;
  active: boolean;
  display_order: number;
};
export type ClassifiedInput = Pick<
  ClassifiedAd,
  | "category"
  | "title"
  | "description"
  | "price_cents"
  | "price_type"
  | "item_condition"
  | "location"
  | "image_urls"
  | "contact_name"
  | "contact_email"
  | "contact_phone"
  | "contact_method"
  | "destination_url"
  | "requested_placement"
>;
