import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type {
  BusinessOffer,
  BusinessOfferInput,
  OfferBusiness,
  OfferPricing,
} from "../types";

const supabase = getSupabaseBrowserClient();
const OFFER_SELECT =
  "id,business_id,advertiser_name,advertiser_email,title,description,terms,offer_code,destination_url,image_url,starts_at,ends_at,status,requested_placement,is_premium,premium_rank,is_featured,featured_rank,is_homepage_hero,homepage_rank,quoted_price_cents,payment_status,payment_reference,payment_link,payment_requested_at,paid_at,sponsorship_agreement_id,sponsor_waiver_tier,created_by,approved_at,created_at,updated_at,local_businesses(id,name,address,website,category,image,image_urls)";

export async function listPublicOffers() {
  const { data, error } = await supabase
    .from("business_offers")
    .select(OFFER_SELECT)
    .eq("status", "approved")
    .lte("starts_at", new Date().toISOString().slice(0, 10))
    .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString().slice(0, 10)}`)
    .order("is_featured", { ascending: false })
    .order("featured_rank")
    .order("is_premium", { ascending: false })
    .order("premium_rank")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as BusinessOffer[];
}
export async function listOffersForBusinesses(businessIds: string[]) {
  if (!businessIds.length) return [];
  const { data, error } = await supabase
    .from("business_offers")
    .select(OFFER_SELECT)
    .in("business_id", businessIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as BusinessOffer[];
}
export async function listOffersForOwner(
  userId: string,
  businessIds: string[],
) {
  const submitted = await supabase
    .from("business_offers")
    .select(OFFER_SELECT)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (submitted.error) throw submitted.error;
  if (!businessIds.length)
    return (submitted.data || []) as unknown as BusinessOffer[];
  const managed = await listOffersForBusinesses(businessIds);
  const map = new Map<string, BusinessOffer>();
  [
    ...((submitted.data || []) as unknown as BusinessOffer[]),
    ...managed,
  ].forEach((offer) => map.set(offer.id, offer));
  return Array.from(map.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}
export async function listManagedBusinesses(userId: string) {
  const columns = "id,name,address,website,category,image,image_urls";
  const [submitted, managed] = await Promise.all([
    supabase
      .from("local_businesses")
      .select(columns)
      .eq("created_by", userId)
      .order("name"),
    supabase
      .from("business_managers")
      .select(`local_businesses(${columns})`)
      .eq("user_id", userId)
      .eq("active", true),
  ]);
  if (submitted.error) throw submitted.error;
  if (managed.error) throw managed.error;
  const map = new Map<string, OfferBusiness>();
  ((submitted.data || []) as OfferBusiness[]).forEach((row) =>
    map.set(row.id, row),
  );
  (managed.data || []).forEach((row) => {
    const related = row.local_businesses as unknown as
      OfferBusiness | OfferBusiness[] | null;
    const business = Array.isArray(related) ? related[0] : related;
    if (business?.id) map.set(business.id, business);
  });
  return Array.from(map.values());
}
export async function listActiveSponsorships(businessIds: string[]) {
  if (!businessIds.length) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("sponsorship_agreements")
    .select("id,business_id,tier")
    .in("business_id", businessIds)
    .eq("status", "active")
    .lte("start_date", today)
    .gte("end_date", today)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Array<{
    id: string;
    business_id: string;
    tier: "platinum" | "gold" | "silver" | "bronze";
  }>;
}
export async function listAllOffers() {
  const { data, error } = await supabase
    .from("business_offers")
    .select(OFFER_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as BusinessOffer[];
}
export async function getOffer(id: string) {
  const { data, error } = await supabase
    .from("business_offers")
    .select(OFFER_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as BusinessOffer;
}
export async function getActiveSponsorship(businessId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("sponsorship_agreements")
    .select("id,tier,start_date,end_date,status")
    .eq("business_id", businessId)
    .eq("status", "active")
    .lte("start_date", today)
    .gte("end_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as {
    id: string;
    tier: "platinum" | "gold" | "silver" | "bronze";
  } | null;
}
export async function createOffer(input: BusinessOfferInput, userId: string) {
  const { data, error } = await supabase
    .from("business_offers")
    .insert({ ...input, created_by: userId, status: input.status || "pending" })
    .select(OFFER_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as BusinessOffer;
}
export async function updateOwnerOffer(
  id: string,
  input: Partial<BusinessOfferInput>,
) {
  const { data, error } = await supabase
    .from("business_offers")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(OFFER_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as BusinessOffer;
}
export async function deleteOwnerOffer(id: string) {
  const { error } = await supabase
    .from("business_offers")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
export async function updateOfferAdmin(
  id: string,
  changes: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("business_offers")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(OFFER_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as BusinessOffer;
}
export async function listOfferPricing(includeInactive = false) {
  let query = supabase
    .from("business_offer_pricing")
    .select(
      "placement,label,description,price_cents,active,display_order,updated_at",
    )
    .order("display_order");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as OfferPricing[];
}
export async function updateOfferPricing(
  placement: string,
  changes: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("business_offer_pricing")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("placement", placement)
    .select(
      "placement,label,description,price_cents,active,display_order,updated_at",
    )
    .single();
  if (error) throw error;
  return data as OfferPricing;
}
