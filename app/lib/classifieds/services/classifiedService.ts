import * as repo from "../repositories/classifiedRepository";
import type { ClassifiedInput, ClassifiedPlacement } from "../types";
function validate(i: ClassifiedInput) {
  if (i.title.trim().length < 5)
    throw new Error("Title must be at least 5 characters.");
  if (i.description.trim().length < 20)
    throw new Error("Description must be at least 20 characters.");
  if (!i.location.trim()) throw new Error("Location is required.");
  if (!i.contact_name.trim()) throw new Error("Contact name is required.");
  if (i.contact_method === "email" && !i.contact_email)
    throw new Error("Contact email is required.");
  if (i.contact_method === "phone" && !i.contact_phone)
    throw new Error("Contact phone is required.");
  if (i.destination_url && !/^https?:\/\//i.test(i.destination_url))
    throw new Error("External link must start with http:// or https://.");
}
export const ClassifiedService = {
  listPublic: repo.listPublic,
  getPublic: repo.getPublic,
  listOwner: repo.listOwner,
  listAdmin: repo.listAdmin,
  listPricing: repo.listPricing,
  async create(i: ClassifiedInput, u: string) {
    validate(i);
    return repo.create(
      { ...i, title: i.title.trim(), description: i.description.trim() },
      u,
    );
  },
  updateOwner: repo.updateOwner,
  review: (
    id: string,
    d: string,
    p: ClassifiedPlacement,
    price: number | null,
    n: string,
  ) => repo.review(id, d, p, price, n),
  updatePricing: repo.updatePricing,
  report: repo.report,
  uploadImage: repo.uploadImage,
};
