import * as repository from "../repositories/businessOfferRepository";
import type { BusinessOfferInput } from "../types";

function validate(input: BusinessOfferInput) { if (!input.business_id) throw new Error("Choose a business."); if (input.title.trim().length < 3) throw new Error("Offer title must be at least 3 characters."); if (!input.starts_at) throw new Error("Offer start date is required."); if (input.ends_at && input.ends_at < input.starts_at) throw new Error("Offer end date cannot be before its start date."); if (input.destination_url && !/^https?:\/\//i.test(input.destination_url)) throw new Error("Offer link must begin with http:// or https://."); if (!["standard", "premium", "featured", "hero"].includes(input.requested_placement)) throw new Error("Choose a valid offer placement."); if (input.requested_placement === "hero" && !input.image_url) throw new Error("A homepage hero request requires an image."); }
export const BusinessOfferService = {
  listPublic: repository.listPublicOffers,
  async ownerWorkspace(userId: string) { const businesses = await repository.listManagedBusinesses(userId); const offers = await repository.listOffersForBusinesses(businesses.map((business) => business.id)); return { businesses, offers }; },
  listForAdmin: repository.listAllOffers,
  async create(input: BusinessOfferInput, userId: string) { validate(input); return repository.createOffer({ ...input, title: input.title.trim() }, userId); },
  async update(id: string, input: Partial<BusinessOfferInput>) { return repository.updateOwnerOffer(id, input); },
  remove: repository.deleteOwnerOffer,
  moderate: repository.updateOfferAdmin,
};
