import { getSupabaseBrowserClient } from "../../supabaseBrowser";
import type {
  SponsorBusiness,
  SponsorshipAgreement,
  SponsorshipAgreementInput,
  SponsorshipPackage,
} from "../types";
const supabase = getSupabaseBrowserClient();
const AGREEMENT_SELECT =
  "*,local_businesses(id,name),sponsorship_payment_installments(*),sponsorship_agreement_events(*)";
export async function listPackages(siteId: string) {
  const { data, error } = await supabase
    .from("sponsorship_package_templates")
    .select("*")
    .eq("site_id", siteId)
    .order("display_order");
  if (error) throw error;
  return (data || []) as SponsorshipPackage[];
}
export async function updatePackage(
  id: string,
  changes: Record<string, unknown>,
  siteId: string,
) {
  const { data, error } = await supabase
    .from("sponsorship_package_templates")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("site_id", siteId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as SponsorshipPackage;
}
export async function listBusinesses(siteId: string) {
  const { data, error } = await supabase
    .from("local_businesses")
    .select("id,name,website,image,image_urls")
    .eq("site_id", siteId)
    .eq("status", "approved")
    .order("name");
  if (error) throw error;
  return (data || []) as SponsorBusiness[];
}
export async function listAgreements(siteId: string) {
  const { data, error } = await supabase
    .from("sponsorship_agreements")
    .select(AGREEMENT_SELECT)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    installments: row.sponsorship_payment_installments || [],
    events: row.sponsorship_agreement_events || [],
  })) as unknown as SponsorshipAgreement[];
}
export async function createAgreement(
  input: SponsorshipAgreementInput,
  userId: string,
  siteId: string,
  siteCode: string,
  zelleRecipient: string,
) {
  const { installments, ...agreement } = input;
  const agreement_number = `${siteCode.toUpperCase()}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { data, error } = await supabase
    .from("sponsorship_agreements")
    .insert({
      ...agreement,
      site_id: siteId,
      agreement_number,
      status: "draft",
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  if (installments.length) {
    const rows = installments.map((row, index) => ({
      ...row,
      agreement_id: data.id,
      zelle_recipient: row.zelle_recipient || zelleRecipient,
      installment_number: index + 1,
      status: "scheduled",
    }));
    const result = await supabase
      .from("sponsorship_payment_installments")
      .insert(rows);
    if (result.error) throw result.error;
  }
  return data as SponsorshipAgreement;
}
export async function updateAgreement(
  id: string,
  changes: Record<string, unknown>,
  siteId: string,
) {
  const { data, error } = await supabase
    .from("sponsorship_agreements")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("site_id", siteId)
    .eq("id", id)
    .eq("status", "draft")
    .select()
    .single();
  if (error) throw error;
  return data as SponsorshipAgreement;
}
export async function verifyInstallment(
  id: string,
  changes: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("sponsorship_payment_installments")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
