export type BusinessOfferStatus = "draft" | "pending" | "approved" | "rejected" | "expired";
export type OfferPaymentStatus = "unpaid" | "pending" | "paid" | "waived" | "refunded";
export type OfferPlacement = "standard" | "premium" | "featured" | "hero";

export type OfferBusiness = { id: string; name: string; address?: string | null; website?: string | null; category?: string | null; image?: string | null; image_urls?: string[] | null };
export type BusinessOffer = { id: string; business_id: string; title: string; description?: string | null; terms?: string | null; offer_code?: string | null; destination_url?: string | null; image_url?: string | null; starts_at: string; ends_at?: string | null; status: BusinessOfferStatus; requested_placement: OfferPlacement; is_premium: boolean; premium_rank: number; is_featured: boolean; featured_rank: number; is_homepage_hero: boolean; homepage_rank: number; quoted_price_cents?: number | null; payment_status: OfferPaymentStatus; payment_reference?: string | null; created_by: string; approved_at?: string | null; created_at: string; updated_at: string; local_businesses?: OfferBusiness | null };
export type BusinessOfferInput = Pick<BusinessOffer, "business_id" | "title" | "description" | "terms" | "offer_code" | "destination_url" | "image_url" | "starts_at" | "ends_at" | "requested_placement"> & { status?: "draft" | "pending" };
