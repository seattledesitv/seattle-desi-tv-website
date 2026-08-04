import * as repository from "../repositories/businessOfferRepository";
import type { BusinessOfferInput, OfferPlacement } from "../types";

function validate(input: BusinessOfferInput) {
  if (!input.business_id && !input.advertiser_name?.trim())
    throw new Error("Choose a business or enter the advertiser name.");
  if (input.title.trim().length < 3)
    throw new Error("Offer title must be at least 3 characters.");
  if (!input.starts_at) throw new Error("Offer start date is required.");
  if (input.ends_at && input.ends_at < input.starts_at)
    throw new Error("Offer end date cannot be before its start date.");
  if (input.destination_url && !/^https?:\/\//i.test(input.destination_url))
    throw new Error("Offer link must begin with http:// or https://.");
  if (
    !["standard", "premium", "featured", "hero"].includes(
      input.requested_placement,
    )
  )
    throw new Error("Choose a valid offer placement.");
  if (input.requested_placement === "hero" && !input.image_url)
    throw new Error("A homepage hero request requires an image.");
}
export const BusinessOfferService = {
  listPublic: repository.listPublicOffers,
  async ownerWorkspace(userId: string) {
    const businesses = await repository.listManagedBusinesses(userId);
    const [offers, sponsorships] = await Promise.all([
      repository.listOffersForOwner(
        userId,
        businesses.map((business) => business.id),
      ),
      repository.listActiveSponsorships(
        businesses.map((business) => business.id),
      ),
    ]);
    const tierByBusiness = new Map(
      sponsorships.map((row) => [row.business_id, row.tier]),
    );
    return {
      businesses: businesses.map((business) => ({
        ...business,
        active_sponsorship_tier: tierByBusiness.get(business.id) || null,
      })),
      offers,
    };
  },
  listForAdmin: repository.listAllOffers,
  async adminWorkspace() {
    const [offers, businesses] = await Promise.all([
      repository.listAllOffers(),
      repository.listApprovedBusinesses(),
    ]);
    return { offers, businesses };
  },
  async create(input: BusinessOfferInput, userId: string) {
    validate(input);
    return repository.createOffer(
      {
        ...input,
        advertiser_name: input.advertiser_name?.trim() || null,
        advertiser_email: input.advertiser_email?.trim() || null,
        title: input.title.trim(),
      },
      userId,
    );
  },
  async update(id: string, input: Partial<BusinessOfferInput>) {
    return repository.updateOwnerOffer(id, input);
  },
  remove: repository.deleteOwnerOffer,
  moderate: repository.updateOfferAdmin,
  async approveForPayment(id: string, placement: OfferPlacement) {
    const [tiers, offer] = await Promise.all([
      repository.listOfferPricing(true),
      repository.getOffer(id),
    ]);
    const pricing = tiers.find(
      (item) => item.placement === placement && item.active,
    );
    if (!pricing)
      throw new Error(
        "This placement tier is not active or has no pricing configuration.",
      );
    const sponsorship = offer.business_id
      ? await repository.getActiveSponsorship(offer.business_id)
      : null;
    const included: Record<string, OfferPlacement[]> = {
      bronze: ["standard", "premium"],
      silver: ["standard", "premium", "featured"],
      gold: ["standard", "premium", "featured", "hero"],
      platinum: ["standard", "premium", "featured", "hero"],
    };
    const sponsorWaiver = Boolean(
      sponsorship && included[sponsorship.tier]?.includes(placement),
    );
    const free = pricing.price_cents === 0 || sponsorWaiver;
    return repository.updateOfferAdmin(id, {
      status: free ? "approved" : "approved_pending_payment",
      quoted_price_cents: free ? 0 : pricing.price_cents,
      payment_status: free ? "waived" : "pending",
      payment_requested_at: free ? null : new Date().toISOString(),
      approved_at: new Date().toISOString(),
      sponsorship_agreement_id: sponsorWaiver ? sponsorship?.id : null,
      sponsor_waiver_tier: sponsorWaiver ? sponsorship?.tier : null,
      is_premium: ["premium", "featured", "hero"].includes(placement),
      is_featured: ["featured", "hero"].includes(placement),
      is_homepage_hero: placement === "hero",
    });
  },
  async confirmPaymentAndActivate(id: string, paymentReference?: string) {
    return repository.updateOfferAdmin(id, {
      status: "approved",
      payment_status: "paid",
      payment_reference: paymentReference || null,
      paid_at: new Date().toISOString(),
    });
  },
  listPricing: repository.listOfferPricing,
  listAllPricing: () => repository.listOfferPricing(true),
  updatePricing: (
    placement: OfferPlacement,
    changes: Record<string, unknown>,
  ) => repository.updateOfferPricing(placement, changes),
};
