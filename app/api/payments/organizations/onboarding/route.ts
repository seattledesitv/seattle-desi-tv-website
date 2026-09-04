import { NextResponse } from "next/server";
import { resolveSiteForHostname } from "../../../../lib/sites/siteResolver";
import {
  acceptedCheckoutOrigin,
  adminDb,
  authenticatedUser,
  providerMessage,
  swirepayConfiguration,
} from "../../../../lib/swirepay/server/classifiedPaymentIntentServer";

async function context(request: Request, organizationId: string) {
  const user = await authenticatedUser(request.headers.get("authorization"));
  const site = await resolveSiteForHostname(
    request.headers.get("x-forwarded-host") || request.headers.get("host"),
  );
  if (!site.id) throw new Error("The active site could not be resolved.");
  const db = adminDb();
  const { data: manager } = await db
    .from("organization_managers")
    .select("id")
    .eq("site_id", site.id)
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  const { data: admin } = await db
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!manager && !admin) throw new Error("Organization manager access is required.");
  return { db, site };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { organizationId?: unknown };
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error("Organization is required.");
    const { db, site } = await context(request, organizationId);
    const { secretKey, accountGid } = swirepayConfiguration();
    const acceptedDomain = acceptedCheckoutOrigin(new URL(request.url).origin, site.primaryHostname);
    const response = await fetch("https://api.swirepay.com/v3/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": secretKey },
      body: JSON.stringify({ scope: "transfer", acceptedDomain }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const result = (await response.json().catch(() => null)) as { entity?: { encryption?: unknown } } | null;
    if (!response.ok) throw new Error(providerMessage(result));
    const secureToken = result?.entity?.encryption;
    if (typeof secureToken !== "string" || !secureToken)
      throw new Error("Swirepay returned an incomplete onboarding session.");
    const saved = await db.from("organization_payment_accounts").upsert(
      {
        site_id: site.id,
        organization_id: organizationId,
        provider: "swirepay",
        onboarding_status: "in_progress",
        last_error: null,
      },
      { onConflict: "site_id,organization_id,provider" },
    );
    if (saved.error) throw saved.error;
    return NextResponse.json({ secureToken, accountGid });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Onboarding could not be started." },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
    const contactGid = typeof body.contactGid === "string" ? body.contactGid.slice(0, 150) : null;
    const fundingSourceGid = typeof body.fundingSourceGid === "string" ? body.fundingSourceGid.slice(0, 150) : null;
    const fundingSourceStatus = typeof body.fundingSourceStatus === "string" ? body.fundingSourceStatus.slice(0, 80) : null;
    const contactType = typeof body.contactType === "string" ? body.contactType.slice(0, 80) : null;
    if (!organizationId || !contactGid || !fundingSourceGid)
      throw new Error("Swirepay did not return complete payout registration references.");
    const { db, site } = await context(request, organizationId);
    const saved = await db.from("organization_payment_accounts").upsert(
      {
        site_id: site.id,
        organization_id: organizationId,
        provider: "swirepay",
        onboarding_reference: contactGid,
        provider_account_gid: fundingSourceGid,
        onboarding_status: "submitted",
        payouts_enabled: false,
        provider_metadata: { contactType, fundingSourceStatus },
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "site_id,organization_id,provider" },
    );
    if (saved.error) throw saved.error;
    return NextResponse.json({ ok: true, status: "submitted" });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Onboarding result could not be saved." },
      { status: 400 },
    );
  }
}
