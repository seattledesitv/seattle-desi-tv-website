export type BusinessOfferStatus =
  | "draft"
  | "pending"
  | "approved_pending_payment"
  | "approved"
  | "rejected"
  | "expired";
export type OfferPaymentStatus =
  "unpaid" | "pending" | "paid" | "waived" | "refunded";
export type OfferPlacement = "standard" | "premium" | "featured" | "hero";
export type OfferPricing = {
  placement: OfferPlacement;
  label: string;
  description: string;
  price_cents: number;
  active: boolean;
  display_order: number;
  updated_at?: string;
};
export type OfferBusiness = {
  id: string;
  name: string;
  address?: string | null;
  website?: string | null;
  category?: string | null;
  image?: string | null;
  image_urls?: string[] | null;
  active_sponsorship_tier?: "platinum" | "gold" | "silver" | "bronze" | null;
};
export type BusinessOffer = {
  id: string;
  business_id?: string | null;
  advertiser_name?: string | null;
  advertiser_email?: string | null;
  title: string;
  description?: string | null;
  terms?: string | null;
  offer_code?: string | null;
  destination_url?: string | null;
  image_url?: string | null;
  starts_at: string;
  ends_at?: string | null;
  status: BusinessOfferStatus;
  requested_placement: OfferPlacement;
  is_premium: boolean;
  premium_rank: number;
  is_featured: boolean;
  featured_rank: number;
  is_homepage_hero: boolean;
  homepage_rank: number;
  quoted_price_cents?: number | null;
  payment_status: OfferPaymentStatus;
  payment_reference?: string | null;
  payment_link?: string | null;
  payment_requested_at?: string | null;
  paid_at?: string | null;
  sponsorship_agreement_id?: string | null;
  sponsor_waiver_tier?: "platinum" | "gold" | "silver" | "bronze" | null;
  created_by: string;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
  local_businesses?: OfferBusiness | null;
};
export type BusinessOfferInput = Pick<
  BusinessOffer,
  | "business_id"
  | "advertiser_name"
  | "advertiser_email"
  | "title"
  | "description"
  | "terms"
  | "offer_code"
  | "destination_url"
  | "image_url"
  | "starts_at"
  | "ends_at"
  | "requested_placement"
> & { status?: "draft" | "pending" };
