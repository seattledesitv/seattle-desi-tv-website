export type SponsorshipTier = "platinum" | "gold" | "silver" | "bronze";
export type SponsorshipStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "active"
  | "completed"
  | "cancelled";
export type PaymentStatus =
  | "scheduled"
  | "due"
  | "overdue"
  | "proof_submitted"
  | "verified"
  | "rejected"
  | "waived";
export type SponsorshipPackage = {
  id: string;
  tier: SponsorshipTier;
  name: string;
  price_cents: number | null;
  benefits: string[];
  agreement_template: string;
  active: boolean;
  display_order: number;
};
export type SponsorBusiness = {
  id: string;
  name: string;
  website?: string | null;
  image?: string | null;
  image_urls?: string[] | null;
};
export type SponsorshipInstallment = {
  id?: string;
  agreement_id?: string;
  installment_number: number;
  amount_cents: number;
  due_date: string;
  status: PaymentStatus;
  zelle_recipient?: string;
  confirmation_url?: string | null;
  confirmation_submitted_at?: string | null;
  submitted_note?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
};
export type SponsorshipAgreementEvent = {
  id: string;
  agreement_id: string;
  event_type: string;
  actor_email?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
};
export type SponsorshipAgreement = {
  id: string;
  agreement_number: string;
  business_id?: string | null;
  homepage_sponsor_id?: string | null;
  package_template_id?: string | null;
  tier: SponsorshipTier;
  sponsor_name: string;
  sponsor_email: string;
  sponsor_contact_name?: string | null;
  sponsor_contact_title?: string | null;
  start_date: string;
  end_date: string;
  base_amount_cents: number;
  discount_type: "none" | "fixed" | "percent";
  discount_value: number;
  final_amount_cents: number;
  currency: string;
  agreement_content: string;
  status: SponsorshipStatus;
  sent_at?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  signer_name?: string | null;
  signer_title?: string | null;
  activation_condition:
    "acceptance" | "first_payment" | "full_payment" | "manual";
  internal_notes?: string | null;
  created_at: string;
  installments?: SponsorshipInstallment[];
  events?: SponsorshipAgreementEvent[];
  local_businesses?: { id: string; name: string } | null;
};
export type SponsorshipAgreementInput = Omit<
  SponsorshipAgreement,
  | "id"
  | "agreement_number"
  | "status"
  | "created_at"
  | "installments"
  | "events"
  | "local_businesses"
  | "sent_at"
  | "viewed_at"
  | "accepted_at"
  | "signer_name"
  | "signer_title"
> & {
  installments: Array<Omit<SponsorshipInstallment, "id" | "agreement_id">>;
};
