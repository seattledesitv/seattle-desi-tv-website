import * as repository from "../repositories/matrimonyRepository";
import type { MatrimonyProfile, MatrimonyProfileInput } from "../types";
function required(value: string, label: string, min = 2) {
  if (value.trim().length < min) throw new Error(`${label} is required.`);
  return value.trim();
}
async function withPhotos<T extends MatrimonyProfile>(profiles: T[]) {
  return Promise.all(
    profiles.map(async (profile) => ({
      ...profile,
      photo_urls: await repository.signPhotos(profile.photo_paths || []),
    })),
  );
}
export const MatrimonyService = {
  async getOwnProfile(userId: string, siteId: string) {
    const value = await repository.getOwnProfile(userId, siteId);
    if (!value) return null;
    const [profile] = await withPhotos([value]);
    return profile;
  },
  async listVisible(siteId: string) {
    return withPhotos(await repository.listVisibleProfiles(siteId));
  },
  async listAdminProfiles(siteId: string) {
    return withPhotos(await repository.listAdminProfiles(siteId));
  },
  saveProfile(
    input: MatrimonyProfileInput,
    userId: string,
    siteId: string,
    id?: string,
  ) {
    if (!input.consent_confirmed)
      throw new Error("Consent confirmation is required.");
    required(input.display_name, "Display name");
    required(input.city, "City");
    required(input.about, "About", 30);
    required(input.partner_preferences, "Partner preferences", 20);
    required(input.contact.full_name, "Full name");
    required(input.contact.email, "Email", 5);
    if (
      input.birth_year < 1900 ||
      input.birth_year > new Date().getFullYear() - 18
    )
      throw new Error("Profiles must be for adults age 18 or older.");
    return repository.saveProfile(input, userId, siteId, id);
  },
  requestAccess(userId: string, email: string, reason: string, siteId: string) {
    required(reason, "Access reason", 20);
    return repository.createAccess(userId, email, reason, siteId);
  },
  getOwnAccess: repository.getOwnAccess,
  listAdminAccess: repository.listAdminAccess,
  getPricing: repository.getPricing,
  updatePricing: repository.updatePricing,
  reviewProfile: repository.reviewProfile,
  reviewAccess: repository.reviewAccess,
  completePayment: repository.completePayment,
  uploadPhoto(file: File, userId: string) {
    if (!file.type.startsWith("image/"))
      throw new Error("Choose an image file.");
    if (file.size > 5 * 1024 * 1024)
      throw new Error("Images must be 5MB or smaller.");
    return repository.uploadPhoto(userId, file);
  },
};
