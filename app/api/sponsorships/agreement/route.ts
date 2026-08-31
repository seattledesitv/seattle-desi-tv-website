import { NextResponse } from "next/server";
import {
  activateAgreementIfReady,
  agreementForToken,
  sponsorshipDb,
} from "../../../lib/sponsorships/server";
import { resolveCurrentSite } from "../../../lib/sites/siteResolver";

export async function GET(request: Request) {
  try {
    const site = await resolveCurrentSite();
    if (!site.id) return NextResponse.json({ error: "The current site is not configured." }, { status: 500 });
    const token = new URL(request.url).searchParams.get("token") || "";
    const agreement = await agreementForToken(token, site.id);
    if (!agreement)
      return NextResponse.json(
        { error: "This agreement link is invalid or expired." },
        { status: 404 },
      );
    if (agreement.status === "sent") {
      const now = new Date().toISOString();
      await sponsorshipDb()
        .from("sponsorship_agreements")
        .update({ status: "viewed", viewed_at: now })
        .eq("id", agreement.id);
      agreement.status = "viewed";
    }
    const safeAgreement = {
      id: agreement.id,
      agreement_number: agreement.agreement_number,
      tier: agreement.tier,
      sponsor_name: agreement.sponsor_name,
      sponsor_contact_name: agreement.sponsor_contact_name,
      start_date: agreement.start_date,
      end_date: agreement.end_date,
      base_amount_cents: agreement.base_amount_cents,
      discount_type: agreement.discount_type,
      discount_value: agreement.discount_value,
      final_amount_cents: agreement.final_amount_cents,
      currency: agreement.currency,
      agreement_content: agreement.agreement_content,
      status: agreement.status,
      sent_at: agreement.sent_at,
      viewed_at: agreement.viewed_at,
      accepted_at: agreement.accepted_at,
      signer_name: agreement.signer_name,
      signer_title: agreement.signer_title,
      activation_condition: agreement.activation_condition,
      created_at: agreement.created_at,
      installments: agreement.installments.map(
        (item: Record<string, unknown>) => ({
          id: item.id,
          installment_number: item.installment_number,
          amount_cents: item.amount_cents,
          due_date: item.due_date,
          status: item.status,
          zelle_recipient: item.zelle_recipient,
          confirmation_url: item.confirmation_url,
          confirmation_submitted_at: item.confirmation_submitted_at,
          rejection_reason: item.rejection_reason,
        }),
      ),
    };
    return NextResponse.json({ agreement: safeAgreement });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load agreement.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const site = await resolveCurrentSite();
    if (!site.id) return NextResponse.json({ error: "The current site is not configured." }, { status: 500 });
    const body = await request.json();
    const agreement = await agreementForToken(String(body.token || ""), site.id);
    if (!agreement)
      return NextResponse.json(
        { error: "This agreement link is invalid or expired." },
        { status: 404 },
      );
    if (!["sent", "viewed"].includes(agreement.status))
      return NextResponse.json(
        { error: "This agreement has already been completed." },
        { status: 409 },
      );
    const db = sponsorshipDb(),
      now = new Date().toISOString();
    if (body.action === "decline") {
      await db
        .from("sponsorship_agreements")
        .update({
          status: "declined",
          declined_at: now,
          decline_reason: String(body.reason || ""),
        })
        .eq("id", agreement.id);
      await db.from("sponsorship_agreement_events").insert({
        agreement_id: agreement.id,
        event_type: "declined",
        details: { reason: String(body.reason || "") },
      });
      return NextResponse.json({ ok: true, status: "declined" });
    }
    const signerName = String(body.signerName || "").trim();
    if (!signerName)
      return NextResponse.json(
        { error: "Signer name is required." },
        { status: 400 },
      );
    await db
      .from("sponsorship_agreements")
      .update({
        status: "accepted",
        accepted_at: now,
        signer_name: signerName,
        signer_title: String(body.signerTitle || ""),
        signer_ip: (request.headers.get("x-forwarded-for") || "").split(",")[0],
        signer_user_agent: request.headers.get("user-agent"),
      })
      .eq("id", agreement.id);
    await db.from("sponsorship_agreement_events").insert({
      agreement_id: agreement.id,
      event_type: "accepted",
      actor_email: agreement.sponsor_email,
      details: { signer_name: signerName },
    });
    await activateAgreementIfReady(db, agreement.id);
    return NextResponse.json({ ok: true, status: "accepted" });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update agreement.",
      },
      { status: 500 },
    );
  }
}
