import * as repo from "../repositories/pressReleaseRepository";
import type { PressReleaseInput, PressReleaseStatus } from "../types";

function clean(value: string | null) { return value?.trim() || null; }
function validate(input: PressReleaseInput) {
  if (input.title.trim().length < 5) throw new Error("Title must be at least 5 characters.");
  if (input.summary.trim().length < 20) throw new Error("Summary must be at least 20 characters.");
  if (input.body.trim().length < 100) throw new Error("Press release text must be at least 100 characters.");
  if (input.image_urls.length > 12) throw new Error("A press release can include up to 12 images.");
  if (input.source_url && !/^https?:\/\//i.test(input.source_url)) throw new Error("Source URL must start with http:// or https://.");
}
function normalize(input: PressReleaseInput): PressReleaseInput {
  validate(input);
  return { ...input, title: input.title.trim(), summary: input.summary.trim(), body: input.body.trim(), organization_name: clean(input.organization_name), location: clean(input.location), contact_name: clean(input.contact_name), contact_email: clean(input.contact_email), source_url: clean(input.source_url) };
}

export const PressReleaseService = {
  listPublic: repo.listPublic,
  getPublic: repo.getPublic,
  listOwner: repo.listOwner,
  listAdmin: repo.listAdmin,
  create: (input: PressReleaseInput, userId: string, status?: PressReleaseStatus) => repo.create(normalize(input), userId, status),
  updateOwner: (id: string, input: PressReleaseInput) => repo.updateOwner(id, normalize(input)),
  review: repo.review,
  uploadImage: repo.uploadImage,
};
