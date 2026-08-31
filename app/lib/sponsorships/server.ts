import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../roles";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const service =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";

export function sponsorshipDb() {
  if (!url || !service)
    throw new Error("Sponsorship server configuration is incomplete.");
  return createClient(url, service);
}

export function hashSponsorToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requireSponsorshipAdmin(request: Request) {
  if (!url || !anon) return null;
  const client = createClient(url, anon, {
    global: {
      headers: { Authorization: request.headers.get("authorization") || "" },
    },
  });
  const { data } = await client.auth.getUser();
  if (!data.user || !isAdminRole(await resolveUserRole(client, data.user)))
    return null;
  return data.user;
}

export async function agreementForToken(token: string, siteId: string) {
  const hash = hashSponsorToken(token);
  const db = sponsorshipDb();
  const { data, error } = await db
    .from("sponsorship_agreements")
    .select("*,sponsorship_payment_installments(*)")
    .eq("site_id", siteId)
    .eq("access_token_hash", hash)
    .maybeSingle();
  if (error) throw error;
  if (
    !data ||
    (data.access_token_expires_at &&
      new Date(data.access_token_expires_at) < new Date())
  )
    return null;
  return { ...data, installments: data.sponsorship_payment_installments || [] };
}

export async function activateAgreementIfReady(
  db: ReturnType<typeof sponsorshipDb>,
  agreementId: string,
) {
  const { data: agreement } = await db
    .from("sponsorship_agreements")
    .select("*,sponsorship_payment_installments(*)")
    .eq("id", agreementId)
    .single();
  if (!agreement || !["accepted", "active"].includes(agreement.status))
    return false;
  const payments = agreement.sponsorship_payment_installments || [];
  const verified = payments.filter((item: { status: string }) =>
    ["verified", "waived"].includes(item.status),
  );
  const ready =
    agreement.activation_condition === "acceptance" ||
    (agreement.activation_condition === "first_payment" &&
      verified.length > 0) ||
    (agreement.activation_condition === "full_payment" &&
      payments.length > 0 &&
      verified.length === payments.length);
  if (!ready || agreement.activation_condition === "manual") return false;
  let homepageSponsorId = agreement.homepage_sponsor_id;
  if (!homepageSponsorId) {
    const business = agreement.business_id
      ? (
          await db
            .from("local_businesses")
            .select("name,website,image,image_urls,site_id")
            .eq("id", agreement.business_id)
            .maybeSingle()
        ).data
      : null;
    const tier = `${agreement.tier.charAt(0).toUpperCase()}${agreement.tier.slice(1)} Contributor`;
    const logo = business?.image_urls?.[0] || business?.image || null;
    const { data: sponsor, error } = await db
      .from("homepage_sponsors")
      .insert({
        business_id: agreement.business_id || null,
        site_id: business?.site_id || agreement.site_id,
        name: business?.name || agreement.sponsor_name,
        website: business?.website || null,
        logo_url: logo,
        tier,
        active: true,
        start_date: agreement.start_date,
        end_date: agreement.end_date,
        contribution_reference: agreement.agreement_number,
      })
      .select("id")
      .single();
    if (error) throw error;
    homepageSponsorId = sponsor.id;
  } else
    await db
      .from("homepage_sponsors")
      .update({
        active: true,
        start_date: agreement.start_date,
        end_date: agreement.end_date,
      })
      .eq("id", homepageSponsorId);
  if (agreement.business_id) {
    await db
      .from("local_businesses")
      .update({
        is_premium: true,
        premium_starts_at: agreement.start_date,
        premium_ends_at: agreement.end_date,
        premium_label: `${agreement.tier.charAt(0).toUpperCase()}${agreement.tier.slice(1)} Sponsor`,
        premium_payment_reference: agreement.agreement_number,
        premium_notes: `Included with active sponsorship ${agreement.agreement_number}.`,
        premium_updated_at: new Date().toISOString(),
      })
      .eq("id", agreement.business_id);
  }
  await db
    .from("sponsorship_agreements")
    .update({
      status: "active",
      homepage_sponsor_id: homepageSponsorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agreementId);
  await db.from("sponsorship_agreement_events").insert({
    agreement_id: agreementId,
    event_type: "activated",
    details: { activation_condition: agreement.activation_condition },
  });
  return true;
}
