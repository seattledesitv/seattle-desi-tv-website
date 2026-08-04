import * as repository from "../repositories/sponsorshipRepository";
import type { SponsorshipAgreementInput } from "../types";
function validate(input: SponsorshipAgreementInput) {
  if (!input.sponsor_name.trim()) throw new Error("Sponsor name is required.");
  if (!input.sponsor_email.includes("@"))
    throw new Error("A valid sponsor email is required.");
  if (!input.start_date || !input.end_date || input.end_date < input.start_date)
    throw new Error("Enter a valid agreement date range.");
  if (!input.agreement_content.trim())
    throw new Error("Agreement content is required.");
  const total = input.installments.reduce(
    (sum, row) => sum + Number(row.amount_cents || 0),
    0,
  );
  if (total !== input.final_amount_cents)
    throw new Error(
      "Installment amounts must equal the final agreement amount.",
    );
}
export const SponsorshipService = {
  listPackages: repository.listPackages,
  listBusinesses: repository.listBusinesses,
  updatePackage: repository.updatePackage,
  listAgreements: repository.listAgreements,
  async create(input: SponsorshipAgreementInput, userId: string) {
    validate(input);
    return repository.createAgreement(input, userId);
  },
  update: repository.updateAgreement,
  verifyInstallment: repository.verifyInstallment,
};
